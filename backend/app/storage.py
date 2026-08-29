import json
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
    table.update_item(
        Key = {
            'userId': userId
        },
        UpdateExpression = "SET #completed = :skills",
        ExpressionAttributeNames = {'#completed': completed_skills},
        ExpressionAttributeValues = {':skills': skills}
    )


analysis = "analysis"

def read_analysis(userId: str):
    response = table.get_item(
            Key = {
            'userId': userId
        }
    )
    item = response.get('Item', {})
    saved = item.get(analysis)

    return json.loads(saved) if saved else None


def delete_user_data(userId: str):
    table.delete_item(
        Key = {
            'userId': userId
        }
    )


def write_analysis(userId: str, payload: dict):
    table.update_item(
        Key = {
            'userId': userId
        },
        UpdateExpression = "SET #analysis = :payload",
        ExpressionAttributeNames = {'#analysis': analysis},
        ExpressionAttributeValues = {':payload': json.dumps(payload)}
    )


profile = "profile"

def read_profile(userId: str):
    response = table.get_item(
            Key = {
            'userId': userId
        }
    )
    item = response.get('Item', {})
    return item.get(profile, {})


def write_profile(userId: str, payload: dict):
    table.update_item(
        Key = {
            'userId': userId
        },
        UpdateExpression = "SET #profile = :payload",
        ExpressionAttributeNames = {'#profile': profile},
        ExpressionAttributeValues = {':payload': payload}
    )


completed_projects = "completedProjects"

def read_completed_projects(userId: str):
    response = table.get_item(
            Key = {
            'userId': userId
        }
    )
    item = response.get('Item', {})
    return item.get(completed_projects, [])


def write_completed_projects(userId: str, skills: list[str]):
    table.update_item(
        Key = {
            'userId': userId
        },
        UpdateExpression = "SET #completed = :skills",
        ExpressionAttributeNames = {'#completed': completed_projects},
        ExpressionAttributeValues = {':skills': skills}
    )


consent = "kvkkConsent"

def write_consent(userId: str, payload: dict):
    table.update_item(
        Key = {
            'userId': userId
        },
        UpdateExpression = "SET #consent = :payload",
        ExpressionAttributeNames = {'#consent': consent},
        ExpressionAttributeValues = {':payload': payload}
    )
