# Background images

Two separate sets of background assets live here:

## 1. Landing / loading page — you're supplying these yourself
| File | Used by |
|---|---|
| `light-picture.png` | `app/page.tsx`, light mode (`.landing-texture` in `globals.css`) |
| `dark-picture.png`  | `app/page.tsx`, dark mode |

Just drop your two generated images in here with those exact names — the CSS
already points at `/bg/light-picture.png` and `/bg/dark-picture.png` via the
`--landing-texture` variable.

## 2. Dashboard / analyse_cv / settings / profile — pulled from Figma
My sandbox can't reach `figma.com` (network is locked to package registries),
so these still need to be saved manually. Links are valid ~7 days from
July 24, 2026:

| File | Source |
|---|---|
| `white-bg.png`    | https://www.figma.com/api/mcp/asset/482168f7-d35a-47bd-af05-323ac5cf4495 |
| `blue-bg.png`      | https://www.figma.com/api/mcp/asset/9ec4c55a-ef6a-4c63-9324-15f334046864 |
| `burgundy-bg.png`  | https://www.figma.com/api/mcp/asset/21a37e9d-cc1f-487f-9d63-6393c7480ff6 |

If a link has expired, re-pull the dashboard frame (light `92:1222` / dark
`92:3487`) and I'll hand you fresh ones.
