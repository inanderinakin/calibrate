import shutil

from fastapi import FastAPI, HTTPException, Path, UploadFile, status
from fastapi.params import File

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.post("/upload_cv")
async def upload_cv(file: UploadFile = File(...)):
    if file.content_type != "application/pdf" and file.content_type != "application/docx":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type")
    
    path = Path("uploads")
    path.mkdir(exist_ok = True)

    cvDest = path / file.filename

    with cvDest.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"message": "Got the CV!", "filename": file.filename}