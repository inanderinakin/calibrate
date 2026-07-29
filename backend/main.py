import os
import uuid
from pathlib import Path

from aiohttp import ClientError
from fastapi.concurrency import run_in_threadpool
from agent import get_recommendations
from handlecv import compute_gaps
from normalize import normalize
from models import GapResult, GapRequest

from fastapi import FastAPI, HTTPException, UploadFile, status
from fastapi.params import File
from fastapi.middleware.cors import CORSMiddleware

import boto3
from handlecv import extract_skill_candidates, extract_cv_text

from handleposting import load_demand_profile
profile = load_demand_profile()
app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://localhost",
    "http://127.0.0.1",
    "http://127.0.0.1:3000",
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
    
    path = Path("uploads")
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
                if size > 10*1024*1024:
                    buffer.close()
                    os.remove(cv_dest)
                    raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large (max 10 MB)")
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

@app.post("/recommendations")
async def recommend_with_agent(report: GapResult):
    # we use run_in_threadpool because bedrock takes couple of seconds to output 
    # and we do not want our app to freeze while waiting for it
    result = await run_in_threadpool(get_recommendations, report)
    return {"recommendations": result}
    
