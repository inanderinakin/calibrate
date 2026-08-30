import asyncio
import os
import tempfile
import jwt
from datetime import date, datetime, timezone
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

from agent import get_cv_bullet, get_project_steps, get_recommendations, verify_skills
from handlecv import compute_gaps, extract_skill_candidates, extract_cv_text, extract_docx_text
from normalize import normalize
from models import Analysis, BulletRequest, CompletedProjects, CompletedSkills, ConsentInfo, ContactMessage, ForgotPasswordInfo, GapResult, GapRequest, LoginInfo, NormalizedSkill, PasswordChange, PasswordReset, ProfileInfo, ResendCodeInfo, SignUpInfo, VerifyEmailInfo
from skills import PATTERNS, SKILL_CATEGORIES, base_skill_name
from handleposting import load_demand_profile, load_postings, load_trends
from postings_rules import drop_expired
from storage import delete_user_data, read_analysis, read_completed_projects, read_completed_skills, read_profile, write_analysis, write_completed_projects, write_completed_skills, write_consent, write_profile
from auth import verify_token, verify_token_claims

profile = load_demand_profile()
trends = load_trends()
postings = load_postings()
agent_timeout_seconds = 240
verifier_timeout_seconds = 30
briefs_timeout_seconds = 180
app = FastAPI()
security = HTTPBearer()
cognito_client = boto3.client("cognito-idp")
ses_client = boto3.client("ses")

origins = [
    "http://localhost:3000",
    "http://localhost",
    "http://127.0.0.1",
    "http://127.0.0.1:3000",
    "https://main.d1nc4zzbkovnjv.amplifyapp.com",
    "https://usecalibrate.dev",
    "https://www.usecalibrate.dev",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

def consent_record(version: str, locale: str):
    return {
        "accepted": True,
        "accepted_at": datetime.now(timezone.utc).isoformat(),
        "version": version,
        "locale": locale,
    }


async def verify_token_dependency(credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)]):
    try:
        user_id = verify_token(credentials.credentials)
    except jwt.PyJWTError as error:
        print(f"Token rejected: {type(error).__name__}: {error}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your session is no longer valid. Please sign in again")
    return user_id


async def verify_claims_dependency(credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)]):
    try:
        claims = verify_token_claims(credentials.credentials)
    except jwt.PyJWTError as error:
        print(f"Token rejected: {type(error).__name__}: {error}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your session is no longer valid. Please sign in again")
    return claims


@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/me")
async def read_current_user(claims: Annotated[dict, Depends(verify_claims_dependency)]):
    user_id = claims.get("sub")

    # admin APIs want the pool username, which is not the sub for a federated user.
    username = claims.get("cognito:username")

    if not username:
        return {"user_id": user_id}

    try:
        user = await run_in_threadpool(
            cognito_client.admin_get_user,
            UserPoolId = os.getenv('USER_POOL'),
            Username = username,
        )
    except cognito_client.exceptions.UserNotFoundException:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your session is no longer valid. Please sign in again")
    except ClientError as err:
        print(f"Could not confirm the account still exists: {err}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="We could not confirm your session right now")

    if not user.get("Enabled", True):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your session is no longer valid. Please sign in again")

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

    country = profile.country.strip()
    study_field = profile.study_field.strip()

    try:
        await run_in_threadpool(
            write_profile, user_id, {"country": country, "study_field": study_field}
        )
    except ClientError as err:
        print(f"Could not save the profile details: {err}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="We could not save your details right now")

    return {
        "first_name": first_name,
        "last_name": last_name,
        "country": country,
        "study_field": study_field,
    }

@app.get("/profile")
async def get_profile(user_id: Annotated[str, Depends(verify_token_dependency)]):
    try:
        saved = await run_in_threadpool(read_profile, user_id)
    except ClientError as err:
        print(f"Could not read the profile details: {err}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="We could not load your details right now")

    return {
        "country": saved.get("country", ""),
        "study_field": saved.get("study_field", ""),
    }

@app.post("/change_password")
async def change_password(
    change: PasswordChange,
    claims: Annotated[dict, Depends(verify_claims_dependency)],
):
    email = claims.get("email")

    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This account has no email to sign in with")

    if len(change.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Your new password must be at least 8 characters")

    # Signing in again is the verification: a wrong current password fails here,
    # and a right one hands back the access token change_password needs. Google
    # accounts have no password to sign in with, so they land in the same branch.
    try:
        signed_in = await run_in_threadpool(
            lambda: cognito_client.initiate_auth(
                ClientId = os.getenv('APP_CLIENT'),
                AuthFlow = 'USER_PASSWORD_AUTH',
                AuthParameters = {'USERNAME': email, 'PASSWORD': change.current_password},
            )
        )
    except ClientError as err:
        code = err.response["Error"]["Code"]

        if code in ("NotAuthorizedException", "UserNotFoundException"):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="That current password is not right")

        print(f"Could not verify the current password: {err}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="We could not change your password right now")

    result = signed_in.get("AuthenticationResult")

    if result is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="That current password is not right")

    try:
        await run_in_threadpool(
            cognito_client.change_password,
            AccessToken = result['AccessToken'],
            PreviousPassword = change.current_password,
            ProposedPassword = change.new_password,
        )
    except ClientError as err:
        code = err.response["Error"]["Code"]

        if code == "InvalidPasswordException":
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="That new password does not meet the requirements")

        if code == "LimitExceededException":
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts. Please try again later")

        print(f"Could not change the password: {err}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="We could not change your password right now")

    return {"changed": True}

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

    if result and signup_info.consent_version:
        try:
            await run_in_threadpool(write_consent, result, consent_record(signup_info.consent_version, signup_info.consent_locale))
        except ClientError as err:
            print(f"Could not save the consent record: {err}")

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
        cognito_client.confirm_sign_up(
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


@app.post("/forgot_password")
async def forgot_password(info: ForgotPasswordInfo):
    try:
        response = cognito_client.forgot_password(
            ClientId = os.getenv('APP_CLIENT'),
            Username = info.email,
        )
    except ClientError as err:
        code = err.response["Error"]["Code"]

        # Answering "no such account" would turn this form into a way of asking which
        # addresses are registered, so an email we do not know gets the same reply as
        # one we do and simply never receives a code.
        if code == "UserNotFoundException":
            return {"detail": None}

        if code == "NotAuthorizedException":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="There is no password to reset on this account. If you signed up with Google, use the Google button to sign in")

        # Cognito has nowhere to send the code until the address is verified, which for
        # an account that never finished sign up means confirming it first.
        if code == "InvalidParameterException":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This account has not been confirmed yet. Please confirm it before resetting the password")

        if code == "LimitExceededException":
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts. Please wait a little before asking for another code")

        print(f"Could not start the password reset: {err}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Password reset is unavailable right now")

    return {"detail": response.get("CodeDeliveryDetails")}

@app.post("/reset_password")
async def reset_password(reset: PasswordReset):
    if len(reset.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Your new password must be at least 8 characters")

    try:
        cognito_client.confirm_forgot_password(
            ClientId = os.getenv('APP_CLIENT'),
            Username = reset.email,
            ConfirmationCode = reset.code,
            Password = reset.new_password,
        )
    except ClientError as err:
        code = err.response["Error"]["Code"]

        if code == "ExpiredCodeException":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Code has expired. Please ask for a new one")

        if code == "InvalidPasswordException":
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="That new password does not meet the requirements")

        if code in ("LimitExceededException", "TooManyFailedAttemptsException"):
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts. Please try again later")

        # An address with no account behind it fails here as well, and it gets the same
        # answer as a wrong code for the same reason /forgot_password stays quiet about it.
        if code in ("CodeMismatchException", "UserNotFoundException", "NotAuthorizedException"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That code is not correct")

        print(f"Could not reset the password: {err}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Password reset is unavailable right now")

    return {"reset": True}

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

    verify_token(result['IdToken'])

    return {"id_token": result["IdToken"], "refresh_token": result["RefreshToken"]}

@app.post("/upload_cv")
async def upload_cv(user_id: Annotated[str, Depends(verify_token_dependency)], file: UploadFile = File(...)):
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

    original_name = file.filename
    # Taken from the same check that let the file through, not from content_type,
    # which browsers sometimes report as application/octet-stream for a real PDF.
    cv_type = "PDF" if is_pdf else "DOCX"

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

    return {
        "filename": safe_name,
        "skills": skills,
        "cv_filename": original_name,
        "cv_size": size,
        "cv_type": cv_type,
        "cv_uploaded_at": datetime.now(timezone.utc).isoformat(),
    }

@app.post("/compute_gaps")
async def get_gaps(gap_request: GapRequest, user_id: Annotated[str, Depends(verify_token_dependency)]):
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
    role: list[str] | None = Query(None),
    city: str | None = None,
    work_model: str | None = None,
    source: str | None = None,
    skill: list[str] | None = Query(None),
    my_skills: str | None = None,
    min_match: float = Query(0.6, ge=0.0, le=1.0),
    search: str | None = None,
    sort: Literal["newest", "closing"] = "newest",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
):
    matches = drop_expired(postings["postings"], date.today().isoformat())

    if role:
        matches = [posting for posting in matches if posting["role"] in role]
    if city:
        matches = [posting for posting in matches if posting["city"] == city]
    if work_model:
        matches = [posting for posting in matches if posting["work_model"] == work_model]
    if source:
        matches = [posting for posting in matches if posting["source"] == source]
    if skill:
        # All of the picked skills, not any: a second skill is read as a further
        # requirement, so the board narrows rather than widening.
        matches = [
            posting for posting in matches
            if all(name in posting["skills"] for name in skill)
        ]

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
                covered.append({
                    **posting,
                    "matched_skills": len(have),
                    # What stands between the CV and this posting. Empty means every
                    # skill it asks for is already on the CV.
                    "missing_skills": [name for name in wanted if name not in owned],
                })

        # Ready to apply first, then the ones a skill or two away, nearest first.
        matches = sorted(covered, key=lambda posting: len(posting["missing_skills"]))

    if search:
        needle = search.casefold()
        matches = [
            posting for posting in matches
            if needle in posting["title"].casefold() or needle in posting["company"].casefold()
        ]

    if sort == "closing":
        # Postings with no closing date go last, since there is nothing to count down to.
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

@app.get("/completed_projects")
async def get_completed_projects(user_id: Annotated[str, Depends(verify_token_dependency)]):
    try:
        skills = await run_in_threadpool(read_completed_projects, user_id)
    except ClientError as err:
        print(f"Could not read completed projects: {err}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="We could not load your project progress right now")

    return {"completed_projects": skills}

@app.post("/completed_projects")
async def set_completed_projects(completed: CompletedProjects, user_id: Annotated[str, Depends(verify_token_dependency)]):
    try:
        await run_in_threadpool(write_completed_projects, user_id, completed.skills)
    except ClientError as err:
        print(f"Could not save completed projects: {err}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="We could not save your project progress right now")

    return {"completed_projects": completed.skills}

@app.post("/cv_bullet")
async def cv_bullet(request: BulletRequest, user_id: Annotated[str, Depends(verify_token_dependency)]):
    try:
        bullet = await asyncio.wait_for(
            run_in_threadpool(get_cv_bullet, request),
            timeout = agent_timeout_seconds,
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="Writing the bullet took too long. Please try again.")

    return {"bullet": bullet}

@app.post("/recommendations")
async def recommend_with_agent(report: GapResult, user_id: Annotated[str, Depends(verify_token_dependency)], language: Literal["tr", "en"] = "en"):
    try:
        result = await asyncio.wait_for(run_in_threadpool(get_recommendations, report, language), timeout=agent_timeout_seconds)
    except asyncio.TimeoutError:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="The roadmap took too long to build. Please try again.")

    # The project steps are part of the roadmap, not a separate errand: they slot in
    # after the skills they make you combine. If they fail, the roadmap still stands.
    try:
        result.projects = await asyncio.wait_for(
            run_in_threadpool(get_project_steps, result.recommendations, language),
            timeout = briefs_timeout_seconds,
        )
    except asyncio.TimeoutError:
        print("Project steps timed out, returning the roadmap without them")
    except Exception as err:
        print(f"Project steps failed: {type(err).__name__}: {err}")

    return {"recommendations": result}

@app.post("/consent")
async def record_consent(info: ConsentInfo, user_id: Annotated[str, Depends(verify_token_dependency)]):
    try:
        await run_in_threadpool(write_consent, user_id, consent_record(info.version, info.locale))
    except ClientError as err:
        print(f"Could not save the consent record: {err}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="We could not record your consent right now")

    return {"saved": True}

@app.post("/contact")
async def contact(message: ContactMessage):
    if message.website:
        return {"sent": True}

    address = message.email.strip()

    if "@" not in address or "." not in address.rsplit("@", 1)[-1]:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Please check the email address you entered")

    destination = os.getenv("CONTACT_EMAIL")

    if not destination:
        print("CONTACT_EMAIL is not set, dropping a contact message")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="The contact form is unavailable right now")

    sender = " ".join(message.name.split())

    try:
        await run_in_threadpool(
            ses_client.send_email,
            Source = "Calibrate <contact@usecalibrate.dev>",
            Destination = {"ToAddresses": [destination]},
            ReplyToAddresses = [address],
            Message = {
                "Subject": {"Data": f"Calibrate contact from {sender}"},
                "Body": {"Text": {"Data": f"{sender} <{address}>\n\n{message.message}"}},
            },
        )
    except ClientError as err:
        print(f"Could not send the contact message: {err}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="We could not send your message right now")

    return {"sent": True}

handler = Mangum(app, lifespan="off")