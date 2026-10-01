"""Generates public/hero-flow.svg: flowing strands over a smooth vector field.

Run: python3 scripts/generate-hero-pattern.py
Deterministic (fixed seed), so the committed SVG can be regenerated exactly.
"""

import math
import random
from pathlib import Path

W, H = 1600, 900
STEP, REACH = 10, 22  # px per step, steps each way from a seed
rng = random.Random(7)


def angle(x: float, y: float) -> float:
    return (
        2.4 * math.sin(x * 0.0034 + 1.4 * math.sin(y * 0.0029))
        + 1.7 * math.cos(y * 0.0041 - x * 0.0017)
        + 0.9 * math.sin((x + y) * 0.0021)
    )


def trace(x: float, y: float, sign: int) -> list[tuple[float, float]]:
    pts = []
    for _ in range(REACH):
        a = angle(x, y)
        x += sign * STEP * math.cos(a)
        y += sign * STEP * math.sin(a)
        if not (-40 <= x <= W + 40 and -40 <= y <= H + 40):
            break
        pts.append((x, y))
    return pts


paths = []
for gy in range(-20, H + 20, 64):
    for gx in range(-20, W + 20, 64):
        sx, sy = gx + rng.uniform(-26, 26), gy + rng.uniform(-26, 26)
        back = trace(sx, sy, -1)[::-1]
        pts = back + [(sx, sy)] + trace(sx, sy, 1)
        if len(pts) < 8:
            continue
        d = "M" + " ".join(f"{round(px)} {round(py)}" for px, py in pts)
        opacity = round(rng.uniform(0.22, 0.85), 2)
        width = round(rng.uniform(0.8, 1.7), 1)
        paths.append(f'<path d="{d}" stroke-opacity="{opacity}" stroke-width="{width}"/>')

svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="{W}" y2="{H}">
<stop offset="0" stop-color="#6f64ff"/><stop offset="0.55" stop-color="#4aa3ff"/><stop offset="1" stop-color="#3fe0c5"/>
</linearGradient></defs>
<rect width="{W}" height="{H}" fill="#06070c"/>
<g fill="none" stroke="url(#g)" stroke-linecap="round" stroke-linejoin="round">
{chr(10).join(paths)}
</g>
</svg>
"""
out = Path(__file__).resolve().parent.parent / "public" / "hero-flow.svg"
out.write_text(svg)
print(f"{len(paths)} strands, {len(svg) // 1024} KB -> {out}")
