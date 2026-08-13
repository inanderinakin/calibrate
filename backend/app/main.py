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

from agent import get_recommendations
from handlecv import compute_gaps, extract_skill_candidates, extract_cv_text
from normalize import normalize
from models import CompletedSkills, GapResult, GapRequest, LoginInfo, NormalizedSkill, SignUpInfo, VerifyEmailInfo
from skills import PATTERNS, SKILL_CATEGORIES
from handleposting import load_demand_profile, load_trends
from storage import read_completed_skills, write_completed_skills
from auth import verify_token

profile = load_demand_profile()
trends = load_trends()
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

        if code == "UsernameExistsException":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This email is already used")
        elif code == "InvalidPasswordException":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password doesn't fit the requirements")
        elif code == "InvalidParameterException":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please check the email and password you entered")

        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Sign up is unavailable right now")

    result = response.get("UserSub")
    delivery_detail = response.get("CodeDeliveryDetails")

    return {"result": result, "detail": delivery_detail}

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
    if file.content_type not in {"application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type")
    
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
    if (file.content_type == "application/pdf"):
        try:
            await run_in_threadpool(s3_client.upload_file, str(cv_dest), bucket, f"uploads/{safe_name}")
        except ClientError as e:
            print(f"S3 Upload failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail="Failed to upload document to secure storage."
            )
        finally:
            if cv_dest.exists():
                os.remove(cv_dest)
    else:
        return {"error": "We only accept PDF at the moment. Please check back later."}

    lines = await run_in_threadpool(extract_cv_text, "calibrate-teamthrow", f"uploads/{safe_name}")
    candidates = extract_skill_candidates(lines)
    skills = normalize(candidates = candidates)
    skills_set = set(skill.skill for skill in skills)
    joined_lines = "\n".join(lines)

    for term, pattern in PATTERNS.items():
        if pattern.search(joined_lines) and term not in skills_set:
            skills.append(NormalizedSkill(skill=term, esco_category=SKILL_CATEGORIES[term]))

    
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
    return {role: [skill.model_dump() for skill in profile.get(role, [])] for role in roles}

@app.get("/trends")
async def get_trends():
    return trends

@app.post("/recommendations")
async def recommend_with_agent(report: GapResult, language: Literal["tr", "en"] = "en"):
    # we use run_in_threadpool because bedrock takes couple of seconds to output
    # and we do not want our app to freeze while waiting for it
    result = await run_in_threadpool(get_recommendations, report, language)
    return {"recommendations": result}

handler = Mangum(app, lifespan="off")
    
