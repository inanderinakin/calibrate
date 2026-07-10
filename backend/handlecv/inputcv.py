import boto3
from dotenv import load_dotenv
import re
import time

load_dotenv()

client = boto3.client("textract")

def extract_cv_text(bucket: str, key: str) -> list[str]:
    response = client.start_document_text_detection(
        DocumentLocation = {
            'S3Object': {
            'Bucket': bucket,
            'Name': key
            }
        }
    )

    isSuccess = ""
    attemptCount= 0
    print("Waiting for results...")
    while (isSuccess != "SUCCEEDED"):
        attemptCount += 1
        if (attemptCount< 30):
            result = client.get_document_text_detection(JobId=response["JobId"])
            isSuccess = result["JobStatus"]

            if isSuccess == "SUCCEEDED":
                print("Success!")
                break

            elif isSuccess == "FAILED":
                raise RuntimeError(f"Request failed: {result.get("StatusMessage")}") 

            time.sleep(5)
        else:
            raise RuntimeError("Max attempt reached. Please try again later...")

    # this helps us extract sidebar but breaks some texts on single column cvs.
    sidebar_lines = [block["Text"] for block in result["Blocks"] if block["BlockType"] == "LINE" and block["Geometry"]["BoundingBox"]["Left"] < 0.2]
    main_lines = [block["Text"] for block in result["Blocks"] if block["BlockType"] == "LINE" and block["Geometry"]["BoundingBox"]["Left"] >= 0.2]
    return main_lines + sidebar_lines

def extract_skill_candidates(lines: list[str]) -> list[str]:
# TODO: multiword skills gets split up because we evaluate texts line by line.
    potential_candidates = []
    for line in lines:
        for fragment in re.split(r"[:,/()]", line):
            fragment = fragment.strip()
            # TODO: skills that are inside long separator-less lines get skipped out.
            if (len(fragment) > 2 and len(fragment) < 40):
                    potential_candidates.append(fragment)
    
    return list(dict.fromkeys(potential_candidates)) 


if __name__ == "__main__":
    print(extract_skill_candidates(extract_cv_text("calibrate-teamthrow", "dev/test-cv-tr.pdf")))
    print(extract_skill_candidates(extract_cv_text("calibrate-teamthrow", "dev/test-cv.pdf")))
    