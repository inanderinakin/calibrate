import os
import uuid
from pathlib import Path
from agent import get_recommendations, GapResult

from fastapi import FastAPI, HTTPException, UploadFile, status
from fastapi.params import File

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

    return {"message": "Got the CV!", "filename": safe_name}

@app.post("/recommendations")
async def recommendWithAgent(report: GapResult):
    result = get_recommendations(report)
    return {"recommendations": result}
    
