import os
import boto3
from dotenv import load_dotenv

load_dotenv()
user_table = os.getenv('USER_TABLE')
resource = boto3.resource("dynamodb")
table = resource.Table(user_table)
completed_skills = "completedSkills"

def read_completed_skills(userId: str):
    response = table.get_item(
            Key = {
            'userId': userId
        }
    )
    item = response.get('Item', {})
    return item.get(completed_skills, [])


def write_completed_skills(userId: str, skills: list[str]):
    table.put_item(
        Item={
            'userId': userId,
            completed_skills: skills
        }
    )
