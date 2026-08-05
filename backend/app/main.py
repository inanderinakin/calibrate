import os
import tempfile
import uuid
from pathlib import Path

from fastapi.concurrency import run_in_threadpool
from agent import get_recommendations
from handlecv import compute_gaps
from normalize import normalize
from models import GapResult, GapRequest, NormalizedSkill
from skills import PATTERNS, SKILL_CATEGORIES

from fastapi import FastAPI, HTTPException, Query, UploadFile, status
from fastapi.params import File
from fastapi.middleware.cors import CORSMiddleware
import boto3
from botocore.exceptions import ClientError
from handlecv import extract_skill_candidates, extract_cv_text

from handleposting import load_demand_profile, load_trends
from mangum import Mangum

profile = load_demand_profile()
trends = load_trends()
app = FastAPI()

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

@app.get("/")
async def root():
    return {"message": "Hello World"}

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
            os.remove(cv_dest)
        except ClientError as e:
            print("Error")
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
async def recommend_with_agent(report: GapResult):
    # we use run_in_threadpool because bedrock takes couple of seconds to output 
    # and we do not want our app to freeze while waiting for it
    result = await run_in_threadpool(get_recommendations, report)
    return {"recommendations": result}

handler = Mangum(app, lifespan="off")
    
