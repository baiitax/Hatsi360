#!/usr/bin/env python3
"""Build the Hatsi360 image library.

Reads the semantic catalogue (`src/lib/images/catalogue.json`), which names
every asset, its source original, its licence, its subject and its alternative
text, and produces:

  1. the optimised derivative served by the application, at the exact
     dimensions the catalogue declares, under
     `public/images/hatsi360/<folder>/<name>.jpg`;
  2. `src/lib/images/generated-manifest.ts`, which records the real width,
     height and byte weight of every served file plus a small neutral blur
     placeholder for `next/image`;
  3. `docs/IMAGE_LIBRARY_MANIFEST.md`, the human-readable licence,
     attribution, alternative-text and dimensions manifest.

The originals live in `assets/image-sources/` and are never served — they are
kept so the library can be rebuilt from scratch.

Run:  python3 scripts/build_image_library.py
"""

from __future__ import annotations

import base64
import io
import json
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover - the build environment provides Pillow
    sys.exit("Pillow is required: pip install pillow")

ROOT = Path(__file__).resolve().parents[1]
CATALOGUE = ROOT / "src" / "lib" / "images" / "catalogue.json"
SOURCE_DIR = ROOT / "assets" / "image-sources"
OUTPUT_DIR = ROOT / "public" / "images" / "hatsi360"
GENERATED = ROOT / "src" / "lib" / "images" / "generated-manifest.ts"
MANIFEST_DOC = ROOT / "docs" / "IMAGE_LIBRARY_MANIFEST.md"

JPEG_QUALITY = 78
BLUR_WIDTH = 20

# The byte budget the image suite enforces on every served file. A derivative
# that misses it is re-encoded at a lower quality rather than shipped large —
# the library must stay light enough to serve over a slow mobile connection.
BYTE_BUDGET = 320 * 1024


def encode_within_budget(image: Image.Image, destination: Path) -> int:
    """Write `image` as a JPEG no larger than BYTE_BUDGET.

    Returns the quality actually used. The first attempt uses JPEG_QUALITY; if
    that misses the budget the quality steps down in increments of 6 until the
    file fits, and the loop gives up rather than destroying the picture. A
    library that silently ships a 600 KB hero on a 320 KB budget is worse than
    one that reports the failure.
    """
    quality = JPEG_QUALITY
    while True:
        buffer = io.BytesIO()
        image.save(
            buffer,
            format="JPEG",
            quality=quality,
            optimize=True,
            progressive=True,
        )
        if buffer.tell() <= BYTE_BUDGET or quality <= 40:
            destination.write_bytes(buffer.getvalue())
            return quality
        quality -= 6


def crop_to(im: Image.Image, width: int, height: int) -> Image.Image:
    """Resize and centre-crop to exactly `width` x `height`."""
    target_ratio = width / height
    source_ratio = im.width / im.height

    if source_ratio > target_ratio:
        # Too wide — trim the sides.
        new_width = int(round(im.height * target_ratio))
        left = (im.width - new_width) // 2
        im = im.crop((left, 0, left + new_width, im.height))
    else:
        # Too tall — trim the top and bottom, keeping a little more of the
        # top so a face or a headline in the upper third survives.
        new_height = int(round(im.width / target_ratio))
        top = int((im.height - new_height) * 0.4)
        im = im.crop((0, top, im.width, top + new_height))

    return im.resize((width, height), Image.LANCZOS)


def neutral_blur(im: Image.Image) -> str:
    """A tiny, low-saturation placeholder in the brand's neutral range."""
    small = im.copy()
    small.thumbnail((BLUR_WIDTH, BLUR_WIDTH * 4), Image.LANCZOS)
    small = small.convert("RGB")
    # Pull the saturation down so the placeholder reads as a neutral panel
    # rather than as a colour flash while the real image arrives.
    grey = small.convert("L").convert("RGB")
    small = Image.blend(small, grey, 0.72)
    buffer = io.BytesIO()
    small.save(buffer, format="JPEG", quality=40, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")


def main() -> int:
    catalogue = json.loads(CATALOGUE.read_text())
    assets = catalogue["assets"]

    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    entries: list[dict] = []
    missing: list[str] = []
    over_budget: list[str] = []

    for asset_id, asset in sorted(assets.items()):
        source = SOURCE_DIR / asset["source"]
        if not source.exists():
            missing.append(f"{asset_id} (source: {asset['source']})")
            continue

        folder = OUTPUT_DIR / asset["folder"]
        folder.mkdir(parents=True, exist_ok=True)
        destination = folder / f"{asset['name']}.jpg"

        with Image.open(source) as im:
            im = im.convert("RGB")
            final = crop_to(im, int(asset["width"]), int(asset["height"]))
            used_quality = encode_within_budget(final, destination)
            placeholder = neutral_blur(final)

        width, height = final.size
        size_bytes = destination.stat().st_size
        if size_bytes > BYTE_BUDGET:
            over_budget.append(
                f"{asset_id} ({size_bytes // 1024} KB at quality {used_quality})"
            )
        entries.append(
            {
                "id": asset_id,
                "path": f"/images/hatsi360/{asset['folder']}/{asset['name']}.jpg",
                "width": width,
                "height": height,
                "bytes": size_bytes,
                "blur": placeholder,
            }
        )

    if missing:
        print("Missing source originals:", file=sys.stderr)
        for item in missing:
            print(f"  - {item}", file=sys.stderr)

    if over_budget:
        print("Over the byte budget:", file=sys.stderr)
        for item in over_budget:
            print(f"  - {item}", file=sys.stderr)

    # --- the generated TypeScript manifest ---------------------------------
    lines = [
        "/**",
        " * Generated by `scripts/build_image_library.py` — do not edit by hand.",
        " *",
        " * Every entry records the real intrinsic size of a served image and a",
        " * small neutral blur placeholder, so `next/image` can reserve the right",
        " * box before the file arrives and never reflow the page.",
        " */",
        "",
        "export interface ServedImage {",
        "  width: number;",
        "  height: number;",
        "  bytes: number;",
        "  blur: string;",
        "}",
        "",
        "export const SERVED_IMAGES: Record<string, ServedImage> = {",
    ]
    for entry in entries:
        lines.append(f"  {json.dumps(entry['path'])}: {{")
        lines.append(f"    width: {entry['width']},")
        lines.append(f"    height: {entry['height']},")
        lines.append(f"    bytes: {entry['bytes']},")
        lines.append(f"    blur: {json.dumps(entry['blur'])},")
        lines.append("  },")
    lines.append("};")
    lines.append("")
    lines.append("/** The served path for a given catalogue asset id. */")
    lines.append("export const SERVED_IMAGE_PATHS: Record<string, string> = {")
    for entry in entries:
        lines.append(f"  {json.dumps(entry['id'])}: {json.dumps(entry['path'])},")
    lines.append("};")
    lines.append("")
    GENERATED.write_text("\n".join(lines))

    # --- the human-readable manifest ---------------------------------------
    by_id = {entry["id"]: entry for entry in entries}
    doc = [
        "# Hatsi360 image library manifest",
        "",
        "Every image the platform serves, with its dimensions, byte weight, subject,",
        "alternative text, licence and attribution.",
        "",
        "All assets in this library are **Hatsi360 original assets**: editorial",
        "illustrations generated for this platform and owned by Hatsi360. No image in",
        "the library is scraped, borrowed from a third-party site, or used under an",
        "uncleared licence. The originals are retained under `assets/image-sources/`",
        "so the library can be rebuilt at any time by running",
        "`python3 scripts/build_image_library.py`.",
        "",
        "## How the library is organised",
        "",
        "| Folder | Purpose |",
        "| --- | --- |",
        "| `hero/` | Full-bleed photographic hero imagery for the homepage and section openers. |",
        "| `commodities/` | One image per catalogue commodity, matched by commodity slug. |",
        "| `markets/` | One representative image per registered market. |",
        "| `agriculture/` | Crops, fields and harvest activity. |",
        "| `infrastructure/` | Storage, grading, bagging, transport and export handling. |",
        "| `professionals/` | Traders, agents, inspectors and analysts. |",
        "| `insights/` | Editorial feature images, one per published article. |",
        "| `reports/` | Report and coverage cover imagery. |",
        "| `ui/` | Neutral placeholder panels. |",
        "",
        "## Market images and truthfulness",
        "",
        "Hatsi360 does not hold licensed photographs of every market it reports on.",
        "Where a market-specific photograph is unavailable, the market image is a",
        "**representative** image of that kind of trading environment and is labelled",
        "as such in the interface. The registry marks these assets with",
        "`representation: \"representative\"`, and the interface renders a visible",
        "\"Representative image\" caption. No image is ever presented as a verified",
        "photograph of a named market.",
        "",
        "## Licence and attribution",
        "",
        "| Asset | Path | Size | Bytes | Subject | Alternative text | Licence | Attribution |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for asset_id, asset in sorted(assets.items()):
        entry = by_id.get(asset_id)
        if not entry:
            continue
        alt = asset.get("alt") or "(decorative — empty alt attribute)"
        alt = alt.replace("|", "\\|")
        doc.append(
            f"| `{asset_id}` | `{entry['path']}` | {entry['width']}×{entry['height']} | "
            f"{entry['bytes'] // 1024} KB | {asset['subject']} | {alt} | "
            f"{asset['licence']} | {asset.get('credit', '—')} |"
        )
    doc.append("")
    doc.append("## Source originals")
    doc.append("")
    doc.append("| Source file | Assets produced |")
    doc.append("| --- | --- |")
    source_usage: dict[str, list[str]] = {}
    for asset_id, asset in sorted(assets.items()):
        source_usage.setdefault(asset["source"], []).append(asset_id)
    for source, ids in sorted(source_usage.items()):
        doc.append(f"| `assets/image-sources/{source}` | {', '.join(f'`{i}`' for i in ids)} |")
    doc.append("")
    MANIFEST_DOC.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_DOC.write_text("\n".join(doc))

    total = sum(entry["bytes"] for entry in entries)
    print(f"Built {len(entries)} of {len(assets)} assets, {total // 1024} KB in total.")
    if missing:
        print(f"{len(missing)} asset(s) still waiting on a source original.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
