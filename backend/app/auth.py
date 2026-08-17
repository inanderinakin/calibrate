import os
import jwt
from dotenv import load_dotenv

load_dotenv()

pool_id = os.getenv('USER_POOL')
app_client_id = os.getenv('APP_CLIENT')

issuer = f"https://cognito-idp.eu-central-1.amazonaws.com/{pool_id}"
jwks_url = f"{issuer}/.well-known/jwks.json"

jwks_client = jwt.PyJWKClient(uri=jwks_url)

def verify_token(token: str):
    signing_key = jwks_client.get_signing_key_from_jwt(token = token)
    claims = jwt.decode(jwt=token, key=signing_key, algorithms=["RS256"], audience=app_client_id, issuer=issuer)
    return claims.get('sub')

if __name__ == "__main__":
    import boto3

    cognito = boto3.client('cognito-idp')

    response = cognito.initiate_auth(
        ClientId= app_client_id,
        AuthFlow='USER_PASSWORD_AUTH',
        AuthParameters= {
            'USERNAME': 'inandakin@gmail.com',
            'PASSWORD': '123456789',
        }
    )

    result = response.get('AuthenticationResult')
    user_id = verify_token(result.get('IdToken'))

    print(user_id)
