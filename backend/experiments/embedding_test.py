import json
import boto3
from dotenv import load_dotenv
import numpy as np

load_dotenv()
client = boto3.client("bedrock-runtime")

test_list = ["Veri Bilimi", "Data Science", "Veritabanı Yönetimi", "Database Management", "React.js", "ReactJS", "Java", "JavaScript", "Next.js", "NextJS"]

def embed_list(text_list: list[str]):
    response = client.invoke_model(
        modelId="cohere.embed-multilingual-v3", 
        body=json.dumps({"texts": text_list, "input_type": "search_document"})
    )
    return json.loads(response["body"].read())["embeddings"]

vectors = embed_list(test_list)

for i in range(0, len(test_list), 2):
    text1, text2 = test_list[i], test_list[i+1]
    vec1, vec2 = np.array(vectors[i]), np.array(vectors[i+1])
    score = vec1 @ vec2 
    
    print(f"{text1} and {text2}: {score}")
