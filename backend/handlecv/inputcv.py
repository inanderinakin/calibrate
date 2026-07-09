import boto3
from dotenv import load_dotenv
import time
from collections import Counter

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
                raise RuntimeError("Please try again later...") 

            time.sleep(5)
        else:
            raise RuntimeError("Max attempt reached. Please try again later...")
    
    line_list = [b["Text"] for b in result["Blocks"] if b["BlockType"] == "LINE"]
    return line_list

if __name__ == "__main__":
    print(extract_cv_text("calibrate-teamthrow", "dev/test-cv.pdf"))