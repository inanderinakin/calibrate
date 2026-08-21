import os
import jwt
from dotenv import load_dotenv

load_dotenv()

pool_id = os.getenv('USER_POOL')
app_client_id = os.getenv('APP_CLIENT')

issuer = f"https://cognito-idp.eu-central-1.amazonaws.com/{pool_id}"
jwks_url = f"{issuer}/.well-known/jwks.json"

jwks_client = jwt.PyJWKClient(uri=jwks_url)

def verify_token_claims(token: str):
    signing_key = jwks_client.get_signing_key_from_jwt(token = token)
    return jwt.decode(jwt=token, key=signing_key, algorithms=["RS256"], audience=app_client_id, issuer=issuer)

def verify_token(token: str):
    return verify_token_claims(token).get('sub')
