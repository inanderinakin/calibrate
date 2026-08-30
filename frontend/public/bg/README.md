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

## 2. Page and sidebar backgrounds — removed, they are CSS colours now

`white-bg.png`, `blue-bg.png` and `burgundy-bg.png` used to live here. Each was
3360x5716, and every pixel in all three was a single flat colour:

| File | Colour | Now |
|---|---|---|
| `white-bg.png` | `#bdd8e9` | `--bg-texture`, light mode |
| `blue-bg.png` | `#001d39` | `--bg-texture`, dark mode |
| `burgundy-bg.png` | `#001d39` | dropped, `--sidebar-bg` was already the same colour |

`blue-bg.png` and `burgundy-bg.png` were byte-identical, so the light sidebar was
painting an image of exactly the colour underneath it.

Do not re-add them as images: two 19-megapixel decodes cost ~154MB of RGBA and a
chunk of load time to paint two flat colours. They were not what pinned those screens
at ~10fps, though. Measured in Chromium, the background costs nothing per frame once
decoded; the blur on top of it carried that on its own.

## 3. Landing hero — career workflow diagram

Generated, not hand-drawn. Edit `scripts/build-career-workflow.py` and re-run it
from `frontend/`; never edit the SVGs directly, they get overwritten.

    python3 scripts/build-career-workflow.py

| File | Used by |
|---|---|
| `career_workflow_en_light.svg` | `app/page.tsx`, English + light mode |
| `career_workflow_en_dark.svg`  | English + dark mode |
| `career_workflow_tr_light.svg` | Turkish + light mode |
| `career_workflow_tr_dark.svg`  | Turkish + dark mode |

One geometry source, four outputs, so the variants cannot drift apart — which is
exactly what went wrong before: `career_workflow_navy_blue 2 (1).png` and
`career_workflow_red 2 (1).png` were byte-identical, so the light/dark swap was a
no-op and dark mode rendered navy text on a navy page. The step labels were baked
into the raster as well, so Turkish never reached them.
