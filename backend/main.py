import os
import uuid
from pathlib import Path

from aiohttp import ClientError
from fastapi.concurrency import run_in_threadpool
from agent import get_recommendations, GapResult

from fastapi import FastAPI, HTTPException, UploadFile, status
from fastapi.params import File

import boto3
from handlecv import extract_skill_candidates, extract_cv_text

app = FastAPI()

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

    return {"filename": safe_name, "candidates": candidates}

@app.post("/recommendations")
async def recommend_with_agent(report: GapResult):
    # we use run_in_threadpool because bedrock takes couple of seconds to output 
    # and we do not want our app to freeze while waiting for it
    result = await run_in_threadpool(get_recommendations, report)
    return {"recommendations": result}
    
