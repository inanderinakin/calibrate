# Calibrate — Frontend

The web app for Calibrate: a student uploads a CV, picks the roles they are aiming
for, and gets back their skill gaps against the live Turkish job market plus a
learning roadmap. Live at [usecalibrate.dev](https://usecalibrate.dev).

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4, built and run
with Bun.

## Install & run

```bash
bun install
bun dev
```

The app needs the backend running. See `backend/README.md`, then point
`NEXT_PUBLIC_API_URL` at it.

## Environment

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL="http://127.0.0.1:8000"
NEXT_PUBLIC_COGNITO_DOMAIN="https://calibrate-auth.auth.eu-central-1.amazoncognito.com"
NEXT_PUBLIC_APP_CLIENT_ID="ar9ujl2ru4lvcoe4g5gblq507"
```

In production the same three are set in the Amplify console, with the API URL
pointing at the deployed Lambda.

## Flow

```
/  landing
├── /signup → /verify_email → /account_created → /complete_profile
├── /login   (or Google, which returns through /auth/callback)
└── /forgot_password → /reset_password

signed in:
/upload_cv → /select_role → /analyse_cv → /dashboard → /roadmap
                                          /postings, /profile, /settings
```

Every page under `app/(app)/` is behind auth and shares one layout, so the
sidebar survives navigation instead of remounting. `useRequireAuth` redirects
anyone without a session; `useRestoreAnalysis` pulls the last saved analysis back
out of the backend so a returning user doesn't re-upload their CV.

## Structure

```
frontend/
├── app/
│   ├── layout.tsx              # Theme, Auth, Language and Sidebar providers
│   ├── page.tsx                # Landing
│   ├── (app)/layout.tsx        # AppShell for every signed-in page
│   ├── (app)/upload_cv         # PDF/DOCX upload, then the extracted skills to correct
│   ├── (app)/select_role       # Target roles — more than one allowed
│   ├── (app)/analyse_cv        # Gap computation progress
│   ├── (app)/dashboard         # Gaps, demand percentages, market trend chart
│   ├── (app)/roadmap           # AI roadmap, progress ticks, PDF export
│   ├── (app)/postings          # Job board with filters
│   ├── (app)/profile           # Account details
│   ├── (app)/settings          # Theme, language, password, delete account
│   └── signup, login, verify_email, forgot_password, reset_password,
│       account_created, complete_profile, auth/callback
├── components/
│   ├── AppShell.tsx            # Sidebar + content wrapper
│   ├── Sidebar.tsx             # Nav, active route, live user details
│   ├── SearchableSelect.tsx    # Type-to-filter dropdown (job board filters)
│   ├── SuggestInput.tsx        # Type-ahead for adding a skill by hand
│   ├── TrendingSkillsChart.tsx # Demand over the trend windows
│   └── StepIndicator, Skeleton, Icon, BackButton, AuthBanner, PasswordRules,
│       PrefsControls
├── contexts/                   # Auth, Theme, Language, Sidebar
├── lib/
│   ├── api.ts                  # Every backend call, with per-request timeouts
│   ├── session.ts, hostedUi.ts # Cognito tokens and the hosted UI redirect
│   ├── roadmapPdf.ts           # jsPDF export, styled like the app
│   ├── rankSkills.ts           # Gap ordering
│   ├── fold.ts                 # Turkish-aware text folding for search
│   ├── translations/           # TR/EN strings, one file per page
│   └── escoMapper, skillCategories, iconBundle, countries, studyFields
└── scripts/build-icons.ts      # Bundles the Iconify icons used, so the app
                                # ships them instead of fetching at runtime
```

## Things worth knowing

- **Static export.** `next.config.ts` sets `output: "export"`, so there is no
  Node server and no SSR — Amplify serves the built files. Anything needing a
  server has to go to the backend instead.
- **Auth is real.** Cognito, with tokens in `lib/session.ts`. Sign-up sends a
  verification code through SES, and Google sign-in comes back via
  `/auth/callback`. Every call that costs AWS money carries a token.
- **Icons are offline.** Run `bun run scripts/build-icons.ts` after using a new
  Iconify name, or it won't render in the build.
- **Both languages, everywhere.** New user-facing copy needs an entry in the
  matching `lib/translations/*.ts` file. There is no fallback to English.

## Lint

```bash
bun lint
```

ESLint 9 flat config. This one is not in CI — only the backend is — so run it
yourself before pushing.
