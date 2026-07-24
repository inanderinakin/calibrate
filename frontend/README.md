# Calibrate — Frontend

AI-powered CV analysis platform. Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Bun.

## Install & run

```bash
bun install
bun dev
```

## Flow

```
/  (landing/loading)  →  /upload_cv  →  /select_role  →  /analyse_cv  →  /dashboard
                      ↳  /login                                       ↳  /profile, /settings
```

- Landing page's **Get Started** goes straight to `/upload_cv`; **Signin** goes to `/login`.
- `analyse_cv`'s **Continue to Dashboard** button is disabled until the (currently simulated)
  analysis reaches 100%, then unlocks along with a **Check Profile Settings** link.
- The sidebar's "CV Analysis" group (Upload CV / Select Role / Analyse CV) auto-highlights
  the current step; Dashboard / Road Map / Settings sit below it as flat links.

## Structure

```
frontend/
├── app/
│   ├── layout.tsx        # ThemeProvider + AuthProvider, loads Inter
│   ├── page.tsx           # Landing/loading screen — real Figma frame (node 92:1113 / 92:3378)
│   ├── globals.css        # Tailwind v4 import + all light/dark CSS variable tokens
│   ├── login/page.tsx
│   ├── signup/page.tsx    # Writes firstName/lastName/email/studyField to AuthContext
│   ├── upload_cv/page.tsx     # Real Figma frame (92:1173 / 92:3438) — drag/drop + simulated progress
│   ├── select_role/page.tsx   # Real Figma frame (92:1198) — 6 selectable role cards
│   ├── analyse_cv/page.tsx    # Simulated analysis progress → Dashboard / Profile CTAs
│   ├── dashboard/page.tsx     # Real Figma frame (92:1222 / 92:3487)
│   ├── roadmap/page.tsx       # placeholder — send a Figma link when ready
│   ├── settings/page.tsx      # Real Figma frame (92:1279 / 92:3544), wired to Auth/ThemeContext
│   └── profile/page.tsx       # Real Figma frame (92:1288 / 92:3553), reads AuthContext
├── components/
│   ├── Sidebar.tsx        # Nav + active route + live user name/study field
│   │                        Hover/active color: pink in light mode, light-blue in dark (--nav-active)
│   ├── AppShell.tsx       # Sidebar + content wrapper, reused by every authenticated page
│   └── StepIndicator.tsx  # Shared 1-2-3 step bar for the upload/select-role/analyse flow
├── contexts/
│   ├── AuthContext.tsx    # user, isAuthenticated, login(), logout(), updateUser()
│   └── ThemeContext.tsx   # light/dark theme, persisted, toggles the `.dark` class
└── public/
    └── bg/                # see public/bg/README.md — 5 background images needed total
```

## Known TODOs

- **`roadmap` still needs a Figma link.**
- **5 background images needed in `public/bg/`** — see `public/bg/README.md` for exact
  filenames and sources (2 you're generating yourself for the landing page, 3 pulled from Figma).
- **Auth is client-side only** (`localStorage`) until a backend exists — swap `login()`
  calls for real API calls, and the rehydration effect in `AuthContext.tsx` for a
  `/api/me` session check. Same for the simulated upload/analysis progress bars.
- **Icons**: `@iconify/react` with names from the Iconify Figma plugin. Only export SVG
  (not PNG) for custom, non-Iconify glyphs, into `public/icons/custom/`.
- Consider moving `AppShell` into an `app/(app)/layout.tsx` route group so the sidebar
  isn't re-mounted on every navigation.
