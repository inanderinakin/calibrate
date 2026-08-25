#!/usr/bin/env python3
"""Generates the Calibrate 'career journey' workflow diagram as SVG.

Run from frontend/:  python3 scripts/build-career-workflow.py
Emits en/tr x light/dark into public/bg/.

One geometry source, every locale and theme variant, so the files can never drift
apart the way the two PNGs did (they were byte-identical).
"""
import io

W, H = 1200, 420
CY = 130          # circle centre line
R = 82            # outer circle radius
RING = 70         # dashed inner ring
CX = [150, 450, 750, 1050]

FONT = "Haskoy, 'Segoe UI', ui-sans-serif, system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif"

LOCALES = {
    "en": dict(
        title_size=27,
        footer="Your Career Journey",
        pct=lambda n: f"{n}%",
        alt="How Calibrate works: upload your CV, AI analysis, career matching, learning roadmap.",
        steps=[
            ("Upload Your CV",   ["Drop in your PDF and let",   "our AI take it from there."]),
            ("AI Analysis",      ["We read your skills,",       "experience and background."]),
            ("Career Matching",  ["Matched to the tech roles",  "that fit your profile best."]),
            ("Learning Roadmap", ["A personal learning plan",   "to close your skill gaps."]),
        ],
    ),
    # Turkish sets longer words against the same 300px column, so the headings step
    # down a size. Percentages lead with the sign, as Turkish writes them.
    "tr": dict(
        title_size=24,
        footer="Kariyer Yolculuğunuz",
        pct=lambda n: f"%{n}",
        alt="Calibrate nasıl çalışır: CV yükleme, yapay zeka analizi, "
            "kariyer eşleştirme, öğrenme yol haritası.",
        steps=[
            ("CV'nizi Yükleyin",     ["PDF'inizi yükleyin, gerisini", "yapay zekamıza bırakın."]),
            ("Yapay Zeka Analizi",   ["Becerilerinizi, deneyiminizi", "ve geçmişinizi okuruz."]),
            ("Kariyer Eşleştirme",   ["Profilinize en uygun",         "teknoloji rollerini görün."]),
            ("Öğrenme Yol Haritası", ["Beceri eksiklerinizi kapatan", "kişisel bir öğrenme planı."]),
        ],
    ),
}

THEMES = {
    # light-on-navy: for the dark landing page (--page-bg #0d1620)
    "dark": dict(
        ink="#F8F1E7",
        body="#F8F1E7", body_op=0.74,
        accent="#8FB0DC",
        ring="#8FB0DC", ring_op=0.40,
        disc="#8FB0DC", disc_op=0.10,
        surface="#8FB0DC", surface_op=0.16,
        badge_fg="#0D1620",
        rail="#8FB0DC", rail_op=0.38,
    ),
    # burgundy-on-light: for the light landing page
    "light": dict(
        ink="#001D39",
        body="#001D39", body_op=0.72,
        accent="#0A4174",
        ring="#0A4174", ring_op=0.34,
        disc="#0A4174", disc_op=0.07,
        surface="#FFFFFF", surface_op=0.62,
        badge_fg="#F8F1E7",
        rail="#0A4174", rail_op=0.32,
    ),
}


def bez(p0, p1, p2, p3, t):
    """Point on a cubic bezier."""
    u = 1 - t
    x = u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0]
    y = u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]
    return x, y


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def icon_upload(cx, T, L):
    """Step 1 — a CV page with a PDF tag and an upload chip on the corner."""
    a, s = T["accent"], T["surface"]
    o = []
    o.append(f'<rect x="{cx-30}" y="{CY-40}" width="60" height="82" rx="8" '
             f'fill="{s}" fill-opacity="{T["surface_op"]}" stroke="{a}" stroke-width="3"/>')
    # header block + two short rules
    o.append(f'<rect x="{cx-18}" y="{CY-28}" width="15" height="15" rx="3.5" fill="{a}"/>')
    o.append(f'<rect x="{cx+1}" y="{CY-26}" width="16" height="4" rx="2" fill="{a}" fill-opacity="0.5"/>')
    o.append(f'<rect x="{cx+1}" y="{CY-17}" width="11" height="4" rx="2" fill="{a}" fill-opacity="0.5"/>')
    # body rules
    for i, w in enumerate((36, 36, 24)):
        o.append(f'<rect x="{cx-18}" y="{CY-4+i*9}" width="{w}" height="4" rx="2" '
                 f'fill="{a}" fill-opacity="0.5"/>')
    # PDF tag
    o.append(f'<rect x="{cx-18}" y="{CY+22}" width="36" height="15" rx="4.5" fill="{a}"/>')
    o.append(f'<text x="{cx}" y="{CY+33.2}" font-family="{FONT}" font-size="10" font-weight="700" '
             f'letter-spacing="0.4" text-anchor="middle" fill="{T["badge_fg"]}">PDF</text>')
    # upload chip riding the ring
    o.append(f'<circle cx="{cx+31}" cy="{CY-43}" r="16" fill="{a}"/>')
    o.append(f'<path d="M{cx+31} {CY-51} V{CY-35} M{cx+25} {CY-45} L{cx+31} {CY-51} L{cx+37} {CY-45}" '
             f'fill="none" stroke="{T["badge_fg"]}" stroke-width="3" '
             f'stroke-linecap="round" stroke-linejoin="round"/>')
    return o


def icon_analysis(cx, T, L):
    """Step 2 — the CV read under a lens, with an AI spark in it."""
    a, s = T["accent"], T["surface"]
    o = []
    o.append(f'<rect x="{cx-36}" y="{CY-44}" width="56" height="78" rx="8" '
             f'fill="{s}" fill-opacity="{T["surface_op"]}" stroke="{a}" stroke-width="3"/>')
    for i, w in enumerate((32, 32, 22, 32)):
        o.append(f'<rect x="{cx-24}" y="{CY-30+i*11}" width="{w}" height="4" rx="2" '
                 f'fill="{a}" fill-opacity="0.5"/>')
    # lens handle first, so the ring caps it
    o.append(f'<path d="M{cx+27} {CY+22} L{cx+44} {CY+39}" stroke="{a}" stroke-width="7" '
             f'stroke-linecap="round"/>')
    o.append(f'<circle cx="{cx+13}" cy="{CY+8}" r="25" fill="{s}" fill-opacity="{T["surface_op"]}"/>')
    o.append(f'<circle cx="{cx+13}" cy="{CY+8}" r="25" fill="none" stroke="{a}" stroke-width="4"/>')
    # four-point spark
    sx, sy, k = cx + 13, CY + 8, 13
    o.append(f'<path d="M{sx} {sy-k} Q{sx+2.6} {sy-2.6} {sx+k} {sy} '
             f'Q{sx+2.6} {sy+2.6} {sx} {sy+k} Q{sx-2.6} {sy+2.6} {sx-k} {sy} '
             f'Q{sx-2.6} {sy-2.6} {sx} {sy-k} Z" fill="{a}"/>')
    return o


def icon_matching(cx, T, L):
    """Step 3 — role rows with match scores, every chip inside its row."""
    a, s = T["accent"], T["surface"]
    o = []
    rows = [(94, 40, 1.0), (88, 36, 0.62), (80, 31, 0.62)]
    for i, (pct, barw, op) in enumerate(rows):
        y = CY - 37 + i * 30
        o.append(f'<rect x="{cx-47}" y="{y}" width="94" height="23" rx="11.5" '
                 f'fill="{s}" fill-opacity="{T["surface_op"]}" stroke="{a}" '
                 f'stroke-opacity="0.4" stroke-width="1.6"/>')
        o.append(f'<circle cx="{cx-34}" cy="{y+11.5}" r="6" fill="{a}" fill-opacity="{op}"/>')
        o.append(f'<rect x="{cx-22}" y="{y+8.5}" width="{barw}" height="6" rx="3" '
                 f'fill="{a}" fill-opacity="{0.85 if op == 1.0 else 0.45}"/>')
        o.append(f'<rect x="{cx+18}" y="{y+3.5}" width="27" height="16" rx="5" '
                 f'fill="{a}" fill-opacity="{op}"/>')
        o.append(f'<text x="{cx+31.5}" y="{y+15}" font-family="{FONT}" font-size="9.5" '
                 f'font-weight="700" text-anchor="middle" fill="{T["badge_fg"]}">{L["pct"](pct)}</text>')
    return o


def icon_roadmap(cx, T, L):
    """Step 4 — a path climbing through milestones to a flag."""
    a = T["accent"]
    p0 = (cx - 40, CY + 46)
    p1 = (cx - 12, CY + 34)
    p2 = (cx - 36, CY + 4)
    p3 = (cx - 6, CY - 5)
    q1 = (cx + 22, CY - 14)
    q2 = (cx + 20, CY - 26)
    q3 = (cx + 30, CY - 32)
    o = []
    o.append(f'<path d="M{p0[0]} {p0[1]} C{p1[0]} {p1[1]}, {p2[0]} {p2[1]}, {p3[0]} {p3[1]} '
             f'C{q1[0]} {q1[1]}, {q2[0]} {q2[1]}, {q3[0]} {q3[1]}" fill="none" stroke="{a}" '
             f'stroke-opacity="0.75" stroke-width="5.5" stroke-linecap="round"/>')
    # milestones sampled straight off the curve so they sit on the line
    for t, r, op in ((0.0, 7, 0.9), (0.55, 6.5, 0.6)):
        x, y = bez(p0, p1, p2, p3, t)
        o.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{a}" fill-opacity="{op}"/>')
    x, y = bez(p3, q1, q2, q3, 0.5)
    o.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="6.5" fill="{a}" fill-opacity="0.6"/>')
    # flag on the summit
    o.append(f'<path d="M{cx+30} {CY-30} V{CY-58}" stroke="{a}" stroke-width="4" stroke-linecap="round"/>')
    o.append(f'<path d="M{cx+31} {CY-57} L{cx+53} {CY-49} L{cx+31} {CY-41} Z" fill="{a}"/>')
    return o


ICONS = [icon_upload, icon_analysis, icon_matching, icon_roadmap]


def build(theme, locale):
    T = THEMES[theme]
    L = LOCALES[locale]
    a = T["accent"]
    o = ['<?xml version="1.0" encoding="UTF-8"?>',
         f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
         f'role="img" aria-label="{esc(L["alt"])}">']

    # ---- connectors: full solid shafts with a real head, one per gap
    for i in range(3):
        mid = (CX[i] + CX[i + 1]) / 2
        x0, x1 = mid - 58, mid + 58
        o.append(f'<g><path d="M{x0} {CY} H{x1-13}" stroke="{a}" stroke-opacity="0.75" '
                 f'stroke-width="3.5" stroke-linecap="round"/>'
                 f'<path d="M{x1-14} {CY-8.5} L{x1} {CY} L{x1-14} {CY+8.5} Z" fill="{a}" '
                 f'fill-opacity="0.75"/></g>')

    # ---- steps
    for i, cx in enumerate(CX):
        title, caption = L["steps"][i]
        o.append('<g>')
        o.append(f'<circle cx="{cx}" cy="{CY}" r="{R}" fill="{T["disc"]}" fill-opacity="{T["disc_op"]}"/>')
        o.append(f'<circle cx="{cx}" cy="{CY}" r="{RING}" fill="none" stroke="{T["ring"]}" '
                 f'stroke-opacity="{T["ring_op"]}" stroke-width="1.6" stroke-dasharray="5 8" '
                 f'stroke-linecap="round"/>')
        o.extend(ICONS[i](cx, T, L))
        # step number, bottom-left on the rim
        bx, by = cx - 58, CY + 58
        o.append(f'<rect x="{bx-20}" y="{by-20}" width="40" height="40" rx="13" fill="{a}"/>')
        o.append(f'<text x="{bx}" y="{by+7.5}" font-family="{FONT}" font-size="21" font-weight="800" '
                 f'text-anchor="middle" fill="{T["badge_fg"]}">{i+1}</text>')
        # labels
        o.append(f'<text x="{cx}" y="256" font-family="{FONT}" font-size="{L["title_size"]}" '
                 f'font-weight="800" letter-spacing="-0.5" text-anchor="middle" '
                 f'fill="{T["ink"]}">{esc(title)}</text>')
        for j, line in enumerate(caption):
            o.append(f'<text x="{cx}" y="{291 + j*24}" font-family="{FONT}" font-size="17" '
                     f'font-weight="500" text-anchor="middle" fill="{T["body"]}" '
                     f'fill-opacity="{T["body_op"]}">{esc(line)}</text>')
        o.append('</g>')

    # ---- footer rail: stops either side of the label instead of running through it
    ry = 374
    chip_w, chip_h = 306, 46
    lx, rx = 600 - chip_w / 2, 600 + chip_w / 2
    for x0, x1 in ((96, lx - 22), (rx + 22, 1104)):
        o.append(f'<path d="M{x0} {ry} H{x1}" stroke="{T["rail"]}" stroke-opacity="{T["rail_op"]}" '
                 f'stroke-width="2" stroke-linecap="round" stroke-dasharray="2 9"/>')
    o.append(f'<rect x="{lx}" y="{ry-chip_h/2}" width="{chip_w}" height="{chip_h}" rx="{chip_h/2}" '
             f'fill="{T["surface"]}" fill-opacity="{T["surface_op"]}" stroke="{a}" '
             f'stroke-opacity="0.55" stroke-width="1.8"/>')
    o.append(f'<text x="600" y="{ry+7}" font-family="{FONT}" font-size="20" font-weight="700" '
             f'letter-spacing="-0.2" text-anchor="middle" fill="{T["ink"]}">{esc(L["footer"])}</text>')

    o.append('</svg>')
    return "\n".join(o)


for locale in LOCALES:
    for theme in THEMES:
        path = f"public/bg/career_workflow_{locale}_{theme}.svg"
        with io.open(path, "w", encoding="utf-8") as f:
            f.write(build(theme, locale))
        print("wrote", path)
