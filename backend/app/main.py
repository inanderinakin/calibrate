import asyncio
import os
import tempfile
import jwt
from typing_extensions import Annotated
import uuid
from pathlib import Path
from typing import Literal
import boto3
from botocore.exceptions import ClientError
from mangum import Mangum

from fastapi import Depends, FastAPI, HTTPException, Query, UploadFile, status
from fastapi.params import File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from agent import get_recommendations, verify_skills
from handlecv import compute_gaps, extract_skill_candidates, extract_cv_text, extract_docx_text
from normalize import normalize
from models import Analysis, CompletedSkills, GapResult, GapRequest, LoginInfo, NormalizedSkill, ProfileInfo, ResendCodeInfo, SignUpInfo, VerifyEmailInfo
from skills import PATTERNS, SKILL_CATEGORIES, base_skill_name
from handleposting import load_demand_profile, load_postings, load_trends
from storage import delete_user_data, read_analysis, read_completed_skills, write_analysis, write_completed_skills
from auth import verify_token

profile = load_demand_profile()
trends = load_trends()
postings = load_postings()
agent_timeout_seconds = 240
verifier_timeout_seconds = 30
app = FastAPI()
security = HTTPBearer()
cognito_client = boto3.client("cognito-idp")

origins = [
    "http://localhost:3000",
    "http://localhost",
    "http://127.0.0.1",
    "http://127.0.0.1:3000",
    "https://main.d1nc4zzbkovnjv.amplifyapp.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

async def verify_token_dependency(credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)]):
    try:
        user_id = verify_token(credentials.credentials)
    except jwt.PyJWTError as error:
        print(f"Token rejected: {type(error).__name__}: {error}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your session is no longer valid. Please sign in again")
    return user_id


@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/me")
def read_current_user(user_id: Annotated[str, Depends(verify_token_dependency)]):
    return {"user_id": user_id}

@app.post("/profile")
async def update_profile(profile: ProfileInfo, user_id: Annotated[str, Depends(verify_token_dependency)]):
    first_name = profile.first_name.strip()
    last_name = profile.last_name.strip()

    if not first_name or not last_name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="First and last name cannot be empty")

    try:
        await run_in_threadpool(
            cognito_client.admin_update_user_attributes,
            UserPoolId = os.getenv('USER_POOL'),
            Username = user_id,
            UserAttributes = [
                {"Name": "given_name", "Value": first_name},
                {"Name": "family_name", "Value": last_name},
            ],
        )
    except ClientError as err:
        print(f"Could not update the profile: {err}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="We could not save your name right now")

    return {"first_name": first_name, "last_name": last_name}

@app.delete("/account")
async def delete_account(user_id: Annotated[str, Depends(verify_token_dependency)]):
    # the saved data goes first: if the Cognito user went first and this failed,
    # the row would be left behind with no way left to sign in and reach it.
    try:
        await run_in_threadpool(delete_user_data, user_id)
    except ClientError as err:
        print(f"Could not delete the saved data: {err}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="We could not delete your account right now")

    try:
        await run_in_threadpool(
            cognito_client.admin_delete_user,
            UserPoolId = os.getenv('USER_POOL'),
            Username = user_id,
        )
    except ClientError as err:
        print(f"Could not delete the Cognito user: {err}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Your saved data was removed but the account itself could not be deleted. Please contact us.")

    return {"deleted": True}

@app.get("/completed_skills")
async def get_completed_skills(user_id: Annotated[str, Depends(verify_token_dependency)]):
    try:
        skills = await run_in_threadpool(read_completed_skills, user_id)
    except ClientError as err:
        print(f"Could not read completed skills: {err}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="We could not load your progress right now")

    return {"completed_skills": skills}

@app.post("/completed_skills")
async def set_completed_skills(completed: CompletedSkills, user_id: Annotated[str, Depends(verify_token_dependency)]):
    try:
        await run_in_threadpool(write_completed_skills, user_id, completed.skills)
    except ClientError as err:
        print(f"Could not save completed skills: {err}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="We could not save your progress right now")

    return {"completed_skills": completed.skills}

@app.get("/analysis")
async def get_analysis(user_id: Annotated[str, Depends(verify_token_dependency)]):
    try:
        saved = await run_in_threadpool(read_analysis, user_id)
    except ClientError as err:
        print(f"Could not read analysis: {err}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="We could not load your saved analysis")

    return {"analysis": saved}

@app.post("/analysis")
async def set_analysis(analysis: Analysis, user_id: Annotated[str, Depends(verify_token_dependency)]):
    try:
        await run_in_threadpool(write_analysis, user_id, analysis.model_dump())
    except ClientError as err:
        print(f"Could not save analysis: {err}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="We could not save your analysis")

    return {"saved": True}

@app.post("/sign_up")
async def sign_up(signup_info: SignUpInfo):
    try:
        response = cognito_client.sign_up(
            ClientId = os.getenv('APP_CLIENT'),
            Username= signup_info.email,
            Password= signup_info.password,
            UserAttributes= [
                {"Name": "given_name", "Value": signup_info.first_name},
                {"Name": "family_name", "Value": signup_info.last_name},
            ],
        )
    except ClientError as err:
        code = err.response["Error"]["Code"]

        # Cognito creates the user on sign_up, before the code is confirmed. Someone who
        # closed the tab on the verification screen owns an unconfirmed account they can
        # neither confirm nor sign up again with, so send them a fresh code instead.
        if code == "UsernameExistsException":
            # Resending only works on an unconfirmed account. A confirmed one throws
            # here, which is exactly the case where the email really is taken, so the
            # call doubles as the status check and needs no admin permission.
            try:
                resent = cognito_client.resend_confirmation_code(
                    ClientId = os.getenv('APP_CLIENT'),
                    Username = signup_info.email,
                )
            except ClientError as resend_err:
                print(f"Could not resend the confirmation code: {resend_err}")
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This email is already used")

            return {"result": None, "detail": resent.get("CodeDeliveryDetails")}

        elif code == "InvalidPasswordException":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password doesn't fit the requirements")
        elif code == "InvalidParameterException":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please check the email and password you entered")

        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Sign up is unavailable right now")

    result = response.get("UserSub")
    delivery_detail = response.get("CodeDeliveryDetails")

    return {"result": result, "detail": delivery_detail}

@app.post("/resend_code")
async def resend_code(info: ResendCodeInfo):
    try:
        response = cognito_client.resend_confirmation_code(
            ClientId = os.getenv('APP_CLIENT'),
            Username = info.email,
        )
    except ClientError as err:
        code = err.response["Error"]["Code"]

        if code == "LimitExceededException":
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts. Please wait a little before asking for another code")

        print(f"Could not resend the confirmation code: {err}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="We could not send a new code to that address")

    return {"detail": response.get("CodeDeliveryDetails")}

@app.post("/verify_email")
async def verify_email(verify_info: VerifyEmailInfo):
    try:
        response = cognito_client.confirm_sign_up(
            ClientId= os.getenv("APP_CLIENT"),
            Username= verify_info.email,
            ConfirmationCode= verify_info.code
        )
    except ClientError as err:
        code = err.response["Error"]["Code"]

        if code == "ExpiredCodeException":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Code has expired. Please regenerate it")

        if code == "CodeMismatchException":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That code is not correct")

        if code == "NotAuthorizedException":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This account is already confirmed. You can sign in")

        if code in ("UserNotFoundException", "TooManyFailedAttemptsException", "LimitExceededException"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="We could not confirm this account. Please request a new code")

        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Confirmation is unavailable right now")

    return {"confirmed": True}


@app.post("/login")
async def login(login_info: LoginInfo):
    try:
        response = cognito_client.initiate_auth(
            ClientId= os.getenv('APP_CLIENT'),
            AuthFlow='USER_PASSWORD_AUTH',
            AuthParameters= {
                'USERNAME': login_info.email,
                'PASSWORD': login_info.password,
            }
        )
    except ClientError as err:
        code = err.response["Error"]["Code"]

        if code in ("NotAuthorizedException", "UserNotFoundException"):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

        if code == "UserNotConfirmedException":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Please confirm your account before signing in")

        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Sign in is unavailable right now")

    result = response.get("AuthenticationResult")

    if result is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in could not be completed")

    user_id = verify_token(result['IdToken'])

    return {"id_token": result["IdToken"], "refresh_token": result["RefreshToken"]}

@app.post("/upload_cv")
async def upload_cv(file: UploadFile = File(...)):
    is_docx = (
        file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
        or (file.filename and file.filename.lower().endswith(".docx"))
    )
    is_pdf = (
        file.content_type == "application/pdf" 
        or (file.filename and file.filename.lower().endswith(".pdf"))
    )

    if not is_pdf and not is_docx:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type. Only PDF and DOCX files are supported.")
    
    path = Path(tempfile.gettempdir())
    path.mkdir(exist_ok = True)

    ext = Path(file.filename).suffix if file.filename else ""
    safe_name = f"{uuid.uuid4()}{ext}"
    cv_dest = path / safe_name

    bucket = "calibrate-teamthrow"

    try:
        size = 0
        with cv_dest.open("wb") as buffer:
            while chunk := await file.read(1024*1024): 
                size += len(chunk)
                if size > 25*1024*1024:
                    buffer.close()
                    os.remove(cv_dest)
                    raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large (max 25 MB)")
                buffer.write(chunk)
    finally:
        await file.close()
    
    s3_client = boto3.client('s3')
    try:
        await run_in_threadpool(s3_client.upload_file, str(cv_dest), bucket, f"uploads/{safe_name}")
        
        if is_pdf:
            lines = await run_in_threadpool(extract_cv_text, bucket, f"uploads/{safe_name}")
        else:
            lines = await run_in_threadpool(extract_docx_text, str(cv_dest))
    except ClientError as e:
        print(f"S3 Upload failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to upload document to secure storage."
        )
    finally:
        if cv_dest.exists():
            os.remove(cv_dest)

    candidates = extract_skill_candidates(lines)
    normalized = normalize(candidates = candidates)
    joined_lines = "\n".join(lines)

    # The keyword terms are the vocabulary the demand profile is written in, and
    # compute_gaps compares names exactly, so when a skill arrives from both places
    # the keyword name is the one to keep: a CV holding "Java (computer programming)"
    # never matches a role demanding "Java", and the skill reads as a gap the person
    # already filled. Deduping the other way round would have hidden that.
    skills = [
        NormalizedSkill(skill = term, esco_category = SKILL_CATEGORIES[term])
        for term, pattern in PATTERNS.items() if pattern.search(joined_lines)
    ]
    covered = {base_skill_name(skill.skill) for skill in skills}

    for skill in normalized:
        if base_skill_name(skill.skill) in covered:
            continue

        skills.append(skill)
        covered.add(base_skill_name(skill.skill))

    # Similarity is not the same thing as truth: a Turkish word fragment can score
    # higher against an ESCO label than a real skill does. The verifier reads the CV
    # and drops anything it cannot quote for. It only ever removes, so if it is
    # unavailable the honest fallback is the unverified list -- a noisier CV beats a
    # failed upload.
    try:
        skills, _ = await asyncio.wait_for(
            run_in_threadpool(verify_skills, skills, lines),
            timeout = verifier_timeout_seconds,
        )
    except asyncio.TimeoutError:
        print("Skill verification timed out, returning the unverified skills")
    except Exception as err:
        print(f"Skill verification failed: {type(err).__name__}: {err}")

    return {"filename": safe_name, "skills": skills}

@app.post("/compute_gaps")
async def get_gaps(gap_request: GapRequest):
    target_roles = gap_request.target_roles
    skills = gap_request.cv_skills

    unsupported_roles = []
    for role in target_roles:
        if role not in profile:
            unsupported_roles.append(role)
    
    if unsupported_roles:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail={
                "message": "Some roles are not supported.",
                "unsupported_roles": unsupported_roles,
                "supported_roles": [role for role in profile]
            })

    gaps = compute_gaps(cv_skills = skills, target_roles = target_roles, demand_profile = profile)

    return {"gaps": gaps.model_dump()}

@app.get("/demand_profile")
async def get_demand_profile(roles: list[str] = Query(...)):
    demand_profile = {}
    unsupported_roles = []

    for role in roles:
        if role not in profile:
            unsupported_roles.append(role)
    
    if unsupported_roles:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail={
            "message": "Some roles are not supported.",
            "unsupported_roles": unsupported_roles,
            "supported_roles": [role for role in profile]
        })

    for role in roles:
        demand_profile[role] = {'postings_count': profile[role].get('postings_count'), 'skills': [skill.model_dump() for skill in profile[role].get('skills')]}  
    return demand_profile

@app.get("/trends")
async def get_trends():
    return trends

@app.get("/skills")
async def get_skills():
    """The vocabulary gaps are measured against, so a skill someone adds by hand
    can match the demand profile instead of sitting there as loose text."""
    return {"skills": [{"skill": skill, "esco_category": SKILL_CATEGORIES[skill]} for skill in sorted(PATTERNS)]}

@app.get("/postings")
async def get_postings(
    role: str | None = None,
    city: str | None = None,
    work_model: str | None = None,
    source: str | None = None,
    skill: str | None = None,
    my_skills: str | None = None,
    min_match: float = Query(0.6, ge=0.0, le=1.0),
    search: str | None = None,
    sort: Literal["newest", "closing"] = "newest",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
):
    matches = postings["postings"]

    if role:
        matches = [posting for posting in matches if posting["role"] == role]
    if city:
        matches = [posting for posting in matches if posting["city"] == city]
    if work_model:
        matches = [posting for posting in matches if posting["work_model"] == work_model]
    if source:
        matches = [posting for posting in matches if posting["source"] == source]
    if skill:
        matches = [posting for posting in matches if skill in posting["skills"]]

    # "Jobs I could apply to now": keep postings where the CV already covers
    # enough of what they ask for, and tell the page how much of it is covered
    # so a row can show "you have 4 of 5" instead of an unexplained badge.
    if my_skills:
        owned = {name.strip() for name in my_skills.split(",") if name.strip()}
        covered = []

        for posting in matches:
            wanted = posting["skills"]
            if not wanted:
                continue
            have = [name for name in wanted if name in owned]
            if len(have) / len(wanted) >= min_match:
                covered.append({**posting, "matched_skills": len(have)})

        matches = covered

    if search:
        needle = search.casefold()
        matches = [
            posting for posting in matches
            if needle in posting["title"].casefold() or needle in posting["company"].casefold()
        ]

    if sort == "closing":
        # Postings with no closing date go last — there is nothing to count down to.
        matches = sorted(matches, key=lambda posting: (posting["days_open"] is None, posting["days_open"]))

    start = (page - 1) * page_size

    return {
        "total": len(matches),
        "page": page,
        "page_size": page_size,
        "generated_at": postings["generated_at"],
        "roles": postings["roles"],
        "cities": postings["cities"],
        "sources": postings["sources"],
        "skills": postings["skills"],
        "postings": matches[start:start + page_size],
    }

@app.post("/recommendations")
async def recommend_with_agent(report: GapResult, language: Literal["tr", "en"] = "en"):
    try:
        result = await asyncio.wait_for(run_in_threadpool(get_recommendations, report, language), timeout=agent_timeout_seconds)
    except asyncio.TimeoutError:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="The roadmap took too long to build. Please try again.")

    return {"recommendations": result}

handler = Mangum(app, lifespan="off")