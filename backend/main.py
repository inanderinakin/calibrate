import os
import uuid
from pathlib import Path

from aiohttp import ClientError
from fastapi.concurrency import run_in_threadpool
from agent import get_recommendations
from handlecv import compute_gaps
from normalize import normalize_skill
from models import GapResult, NormalizedSkill

from fastapi import FastAPI, Form, HTTPException, UploadFile, status
from fastapi.params import File

import boto3
from handlecv import extract_skill_candidates, extract_cv_text

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.post("/upload_cv")
async def upload_cv(target_roles_raw: str = Form(...), file: UploadFile = File(...)):
    java_normalized = NormalizedSkill(skill = "java", esco_category="programming languages")
    c_normalized = NormalizedSkill(skill = "c", esco_category="programming languages")
    sql_normalized = NormalizedSkill(skill = "sql", esco_category="database management")
    profile = {
        "Data Scientist": [c_normalized, sql_normalized],
        "Software Engineer": [java_normalized, c_normalized]
        }
    
    target_roles = [role.strip() for role in target_roles_raw.split(",")]

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
            # reading the file in 1 MB chunks to not use much memory and check file size
            while chunk := await file.read(1024*1024): 
                size += len(chunk)
                if size > 10*1024*1024: # 10 MB is max size
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
    skills = list(filter(None, (normalize_skill(candidate) for candidate in candidates)))

    gaps = compute_gaps(cv_skills = skills, target_roles = target_roles, demand_profile = profile)
    
    return {"filename": safe_name, "target_roles": target_roles, "skills": skills, "gaps": gaps.dict()}

@app.post("/recommendations")
async def recommend_with_agent(report: GapResult):
    # we use run_in_threadpool because bedrock takes couple of seconds to output 
    # and we do not want our app to freeze while waiting for it
    result = await run_in_threadpool(get_recommendations, report)
    return {"recommendations": result}
    
