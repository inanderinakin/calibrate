# Calibrate — Backend

FastAPI application plus the job-market data pipeline behind
[usecalibrate.dev](https://usecalibrate.dev). The API runs on AWS Lambda through
Mangum; the pipeline runs nightly on GitHub Actions and publishes its results to
S3, so collecting job postings never happens on a user's request path.

## Setup

```
cd backend
python3.13 -m venv .venv
source .venv/bin/activate
pip install -r app/requirements.txt -r requirements-dev.txt
```

Use 3.13 — Lambda runs 3.13 and Mangum breaks on 3.14.

You also need the [AWS CLI][d8] and the [AWS SAM CLI][d9] for the environment
lookups below and for [Deploy](#deploy), plus Docker running for
`sam build --use-container`.

## Environment

Copy `.env.example` to `.env` and fill it in:

```
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=eu-central-1
AWS_DEFAULT_REGION=eu-central-1

USER_TABLE=
USER_POOL=
APP_CLIENT=
CONTACT_EMAIL=
```

The bottom four name resources in your own AWS account, so they are per-deployment
rather than shared here. Deploy the stack first (see [Deploy](#deploy) below), then
read them back:

```bash
aws cloudformation describe-stacks --stack-name calibrate-sam \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'||OutputKey=='AppClientId'||OutputKey=='HostedUiDomain']"
aws cloudformation describe-stack-resources --stack-name calibrate-sam \
  --query "StackResources[?ResourceType=='AWS::DynamoDB::Table'].PhysicalResourceId"
```

`CONTACT_EMAIL` is whichever inbox you want contact-page messages delivered to.

The AWS references behind these: [`sam deploy`][d1], [`describe-stacks`][d2],
[`describe-stack-resources`][d3], [CloudFormation stack outputs][d4] and
[Cognito user pools][d5].

[d1]: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-deploy.html
[d2]: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/describe-stacks.html
[d3]: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/describe-stack-resources.html
[d4]: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/outputs-section-structure.html
[d5]: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html
[d8]: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
[d9]: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html


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

## Layout

```
backend/
├── app/
│   ├── main.py            # Every route
│   ├── auth.py            # Cognito sign-up, sign-in, token verification
│   ├── storage.py         # DynamoDB and S3
│   ├── normalize.py       # Skill extraction and ESCO/embedding matching
│   ├── skills.py          # The bilingual keyword vocabulary
│   ├── handleposting.py   # Reads the pipeline artifacts, serves the job board
│   ├── postings_rules.py  # Role and facet rules for the board
│   ├── agent/
│   │   ├── agent.py       # Roadmap and project steps (Strands + Claude Sonnet 4.6)
│   │   └── verifier.py    # Checks extracted skills against the CV text
│   └── *.json             # Bundled fallbacks for the pipeline artifacts
├── pipeline/
│   ├── build_trends.py    # Demand over time, from the corpus
│   ├── build_demand_profile.py  # Per-role skill demand and sample size
│   ├── check_links.py     # Is the posting still open?
│   └── build_postings.py  # The job board artifact
├── scraper/               # Four job boards, merged through merge_new.py
└── tests/                 # Data integrity checks — see below
```

## The data pipeline

`.github/workflows/scrape.yml` runs at 03:00 UTC and takes around three hours.
It scrapes the four boards, rebuilds the trend and demand artifacts, checks
posting links, runs the tests, and only then uploads to S3. The API reads those
artifacts from S3 at request time and falls back to the copies bundled in `app/`
if S3 is unreachable — which means the files in `app/*.json` are stale by design.
Do not rebuild them locally and commit the result; the nightly is the only thing
that should be writing them.

The upload is gated on `pytest` passing. That gate exists because a schema change
once shipped a demand profile the deployed API couldn't read and took the site
down. If the tests fail, the old data stays live.

Rebuild a single artifact locally (for inspection, not for committing):

```
cd backend
PYTHONPATH=app:. python pipeline/build_demand_profile.py
```

## Tests

```
cd backend
pytest
```

These are data checks rather than unit tests. They assert that every skill in the
demand profile exists in the keyword vocabulary and has a learning resource, that
no posting is shown without a link that was checked and reached, that no shown
posting is past its closing date, and that the trends aren't uniformly flat.

Adding a skill to `app/skills.py` therefore means adding it to
`app/resources.json` too, or the nightly stops publishing.

## Deploy

```
cd backend
sam build --use-container
sam deploy
```

Needs Docker running. Imports inside `app/` must stay bare
(`from models import ...`) — `CodeUri: app/` puts the contents of `app/` at the
Lambda root, so `from backend.app.models import ...` fails there. Editors rewrite
these on file moves; check before deploying.

Note that the S3 lifecycle rule expiring uploaded CVs after a day was set on the
bucket directly and is not in `template.yaml`, so it will not be recreated by a
stack rebuild.

## Lint

```
ruff check .
```

Runs in CI on every PR that touches `backend/`, together with the tests above.
