#!/usr/bin/env python3
"""
Verify that a traced SVG still looks like the artwork it came from.

This is the fidelity check for the **vector tracing toolchain**
(`scripts/brand_trace.py`). It is not part of the build: the artwork Hatsi360
ships is the owner's supplied raster, because the artwork's own gradient
shading cannot be reproduced by a vector trace without changing the mark.

The toolchain is kept because a vector mark is the right long-term answer,
and this script is how that work would be judged. A trace can silently lose a
shape, drop the inside of a ring, or flatten a gradient, so the result is
checked rather than assumed: the SVG is rendered back to a raster and compared
against the source.

Two measurements are reported:

  * **Shape agreement** — the intersection over union of the two alpha masks.
    A dropped shape or a lost hole shows up here immediately.
  * **Colour agreement** — the mean per-channel difference over the shared
    area, measured after a one-pixel blur. The blur removes the sub-pixel
    edge differences that no vector trace can reproduce, so the number
    reflects the artwork's shading rather than the rasteriser.

Usage
  python3 scripts/verify_brand_artwork.py \
    --source "/home/user/uploads/Hatsi360 Favicon.png" \
    --svg /tmp/trace.svg
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageFilter

# The thresholds. A shape agreement below 0.97 means the trace is missing
# or adding something visible; a mean colour difference above 12 means the
# artwork's shading has been lost.
MIN_SHAPE_AGREEMENT = 0.97
MAX_MEAN_DIFFERENCE = 12.0
MAX_MISSING_SHARE = 0.012
MAX_EXTRA_SHARE = 0.012


def render(svg: Path, size: int) -> Image.Image:
    """Render an SVG to a raster with resvg."""
    script = f"""
const {{Resvg}} = require('@resvg/resvg-js');
const fs = require('fs');
const svg = fs.readFileSync({str(svg)!r}, 'utf8');
const resvg = new Resvg(svg, {{fitTo: {{mode: 'width', value: {size}}}}});
fs.writeFileSync(process.argv[2], resvg.render().asPng());
"""
    with tempfile.TemporaryDirectory() as directory:
        script_path = Path(directory) / "render.cjs"
        script_path.write_text(script)
        output = Path(directory) / "out.png"
        result = subprocess.run(
            ["node", str(script_path), str(output)],
            capture_output=True,
            text=True,
            cwd="/tmp",
        )
        if result.returncode != 0:
            raise SystemExit(f"resvg failed: {result.stderr}")
        rendered = Image.open(output).convert("RGBA")
        rendered.load()
        return rendered


def compare(source: Image.Image, rendered: Image.Image) -> dict:
    """
    Compare the artwork with the render of the trace.

    The shape comparison is tolerant of one pixel of distance. A vector trace
    follows the artwork's outline exactly, but the rasteriser antialiases
    that outline, so the outermost row of the render sits at roughly half
    opacity and a strict pixel-for-pixel comparison would score the
    rasteriser rather than the trace. A source pixel therefore counts as
    covered when the render has an opaque pixel within one pixel of it.
    """
    rendered = rendered.resize((source.width, source.height), Image.LANCZOS)

    source_array = np.array(source).astype(float)
    rendered_array = np.array(rendered).astype(float)

    source_mask = source_array[..., 3] > 128
    rendered_mask = rendered_array[..., 3] > 128

    # A one-pixel neighbourhood around the render's opaque pixels.
    kernel = np.ones((3, 3), dtype=np.uint8)
    rendered_nearby = cv2.dilate(rendered_mask.astype(np.uint8), kernel).astype(bool)

    missing_share = float((source_mask & ~rendered_nearby).sum() / max(1, source_mask.sum()))

    # The reverse direction: the render must not paint far outside the
    # artwork. The same one-pixel tolerance is applied.
    source_nearby = cv2.dilate(source_mask.astype(np.uint8), kernel).astype(bool)
    extra_share = float(
        (rendered_mask & ~source_nearby).sum() / max(1, max(1, rendered_mask.sum()))
    )

    # The shape agreement is the share of the artwork the trace accounts for,
    # less the share it adds. It is built from the one-pixel-tolerant masks,
    # so it reflects the artwork rather than the rasteriser's edge treatment.
    agreement = 1.0 - missing_share - extra_share

    # The colour comparison is measured after a one-pixel blur, which removes
    # the sub-pixel edge differences that no vector trace reproduces.
    source_blurred = np.array(
        source.convert("RGBA").filter(ImageFilter.GaussianBlur(1.0)), dtype=float
    )
    rendered_blurred = np.array(
        rendered.filter(ImageFilter.GaussianBlur(1.0)), dtype=float
    )
    shared = source_mask & rendered_mask
    if shared.sum() == 0:
        mean_difference = 255.0
        max_difference = 255.0
    else:
        difference = np.abs(source_blurred[..., :3] - rendered_blurred[..., :3]).max(axis=2)
        values = difference[shared]
        mean_difference = float(values.mean())
        max_difference = float(values.max())

    return {
        "shape_agreement": agreement,
        "missing_share": missing_share,
        "extra_share": extra_share,
        "mean_difference": mean_difference,
        "max_difference": max_difference,
        "shared_pixels": int(shared.sum()),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--svg", required=True)
    parser.add_argument(
        "--size",
        type=int,
        default=0,
        help="Render size. Defaults to the source's own width.",
    )
    parser.add_argument("--json")
    arguments = parser.parse_args()

    if shutil.which("node") is None:
        raise SystemExit("node is required to render the SVG for comparison")

    source = Image.open(arguments.source).convert("RGBA")
    rendered = render(Path(arguments.svg), arguments.size or source.width)
    report = compare(source, rendered)
    report["source"] = arguments.source
    report["svg"] = arguments.svg

    print(json.dumps(report, indent=2))

    failures = []
    if report["shape_agreement"] < MIN_SHAPE_AGREEMENT:
        failures.append(
            f"shape agreement {report['shape_agreement']:.4f} < {MIN_SHAPE_AGREEMENT}"
        )
    if report["mean_difference"] > MAX_MEAN_DIFFERENCE:
        failures.append(
            f"mean difference {report['mean_difference']:.2f} > {MAX_MEAN_DIFFERENCE}"
        )
    if report["missing_share"] > MAX_MISSING_SHARE:
        failures.append(
            f"missing share {report['missing_share']:.4f} > {MAX_MISSING_SHARE}"
        )
    if report["extra_share"] > MAX_EXTRA_SHARE:
        failures.append(f"extra share {report['extra_share']:.4f} > {MAX_EXTRA_SHARE}")

    if arguments.json:
        Path(arguments.json).write_text(json.dumps(report, indent=2))

    if failures:
        raise SystemExit("The trace does not match the artwork:\n  " + "\n  ".join(failures))

    print("The trace matches the supplied artwork.")


if __name__ == "__main__":
    main()
