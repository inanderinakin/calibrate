import boto3
from dotenv import load_dotenv
import time, sys

load_dotenv()

client = boto3.client("textract")

print(client.meta.region_name)

response = client.start_document_text_detection(
DocumentLocation={
    'S3Object': {
        'Bucket': 'calibrate-teamthrow',
        'Name': 'dev/test-cv.pdf'
    }
},
)

isSuccess = ""
attemptCount= 0

while (isSuccess != "SUCCEEDED"):
    attemptCount += 1
    if (attemptCount< 30):

        result = client.get_document_text_detection(JobId=response["JobId"])
        isSuccess = result["JobStatus"]

        print("Checking success... " + isSuccess)

        if isSuccess == "SUCCEEDED":
            print("Success!")
            break
        elif isSuccess == "FAILED":
            sys.exit("Please try again later")

        time.sleep(5)
    else:
        sys.exit("Max attempt reached. Please try again later.")


print(len(result["Blocks"]))