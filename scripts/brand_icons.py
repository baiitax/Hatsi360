#!/usr/bin/env python3
"""
Rasterise the GonaPulse mark into the PNG sizes a browser, an iOS home screen
and an installable web app need.

The vector mark in `public/brand/gonapulse-mark.svg` is the canonical artwork.
This script draws the same geometry with the same numbers and writes PNGs, so
the raster icons cannot drift from the vector original.

    python3 scripts/brand_icons.py

Requires Pillow (a build-time-only dependency; the application does not use
it). Outputs into `public/brand/`.
"""

from __future__ import annotations

import os

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "brand")

# The artwork is defined on a 64x64 grid, exactly as the SVG.
GRID = 64.0
RADIUS = 16.0
CORNER = 2.0
SUPERSAMPLE = 4

DEEP_TOP = (0x17, 0x51, 0x2F)
DEEP_BOTTOM = (0x0D, 0x2C, 0x1B)
LEAF_TOP = (0x4F, 0xC9, 0x8C)
LEAF_BOTTOM = (0x2A, 0x8A, 0x4E)
GOLD = (0xE8, 0xA3, 0x3D)

# The leaf outline: two mirrored cubic segments.
LEAF = [
    ((32.0, 11.0), (44.0, 20.5), (44.0, 34.0), (32.0, 53.0)),
    ((32.0, 53.0), (20.0, 34.0), (20.0, 20.5), (32.0, 11.0)),
]

# The market-signal line: a polyline with a rounded stroke.
PULSE = [
    (11.0, 34.0),
    (20.5, 34.0),
    (23.5, 23.0),
    (28.0, 42.0),
    (32.0, 34.0),
    (53.0, 34.0),
]
PULSE_WIDTH = 3.4


def cubic(p0, p1, p2, p3, steps=48):
    """Flatten a cubic Bezier into a polyline."""
    points = []
    for i in range(steps + 1):
        t = i / steps
        mt = 1 - t
        points.append(
            (
                mt**3 * p0[0]
                + 3 * mt**2 * t * p1[0]
                + 3 * mt * t**2 * p2[0]
                + t**3 * p3[0],
                mt**3 * p0[1]
                + 3 * mt**2 * t * p1[1]
                + 3 * mt * t**2 * p2[1]
                + t**3 * p3[1],
            )
        )
    return points


def vertical_gradient(height: int, top, bottom) -> Image.Image:
    """A vertical gradient, `height` pixels tall and one pixel wide."""
    strip = Image.new("RGB", (1, height))
    for y in range(height):
        t = y / max(height - 1, 1)
        strip.putpixel(
            (0, y),
            tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)),
        )
    return strip


def render(px: int) -> Image.Image:
    """Render the mark at `px` pixels square."""
    canvas = px * SUPERSAMPLE
    scale = canvas / GRID

    def pt(x: float, y: float):
        return (x * scale, y * scale)

    base = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    draw = ImageDraw.Draw(base)

    # 1. The rounded square, filled with the deep-field gradient.
    mask = Image.new("L", (canvas, canvas), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(
        [pt(CORNER, CORNER), pt(GRID - CORNER, GRID - CORNER)],
        radius=RADIUS * scale,
        fill=255,
    )
    gradient = vertical_gradient(canvas, DEEP_TOP, DEEP_BOTTOM).convert("RGBA").resize(
        (canvas, canvas)
    )
    base.paste(gradient, (0, 0), mask)

    # 2. The leaf, filled with the leaf gradient.
    leaf_points = []
    for segment in LEAF:
        leaf_points.extend(cubic(*segment))
    leaf_mask = Image.new("L", (canvas, canvas), 0)
    ImageDraw.Draw(leaf_mask).polygon([pt(x, y) for x, y in leaf_points], fill=255)
    leaf_gradient = (
        vertical_gradient(canvas, LEAF_TOP, LEAF_BOTTOM).convert("RGBA").resize((canvas, canvas))
    )
    base.paste(leaf_gradient, (0, 0), leaf_mask)

    # 3. The market-signal line, with round joins and round caps.
    pulse_draw = ImageDraw.Draw(base)
    scaled = [pt(x, y) for x, y in PULSE]
    pulse_draw.line(scaled, fill=GOLD + (255,), width=int(PULSE_WIDTH * scale), joint="curve")
    radius = PULSE_WIDTH * scale / 2
    for x, y in scaled:
        pulse_draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=GOLD + (255,))

    return base.resize((px, px), Image.LANCZOS)


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    targets = {
        "gonapulse-icon-192.png": 192,
        "gonapulse-icon-512.png": 512,
        "gonapulse-favicon-32.png": 32,
        "gonapulse-apple-touch-icon.png": 180,
    }
    for name, size in targets.items():
        path = os.path.join(OUT, name)
        render(size).save(path, "PNG", optimize=True)
        print(f"wrote {name} ({size}x{size})")


if __name__ == "__main__":
    main()
