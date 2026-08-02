# Calibrate backend

## Setup

```
cd backend
python3.13 -m venv .venv
source .venv/bin/activate
pip install -r app/requirements.txt -r requirements-dev.txt
```

Use 3.13 — Lambda runs 3.13 and Mangum breaks on 3.14.

## Environment

Create `backend/.env`. Ask İnan for the values:

```
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=eu-central-1
AWS_DEFAULT_REGION=eu-central-1
```

## Run the API

```
cd backend/app
fastapi dev main.py
```

Docs at http://127.0.0.1:8000/docs

## Run the frontend against it

```
cd frontend
bun install
bun dev
```

## Rebuild the demand profile

```
cd backend
PYTHONPATH=app:. python pipeline/build_demand_profile.py
```

## Deploy

```
cd backend
sam build --use-container
sam deploy
```

Needs Docker running. Imports inside `app/` must stay bare (`from models import ...`) —
`CodeUri: app/` puts the contents of `app/` at the Lambda root, so `from backend.app.models import ...`
fails there. Editors rewrite these on file moves; check before deploying.
