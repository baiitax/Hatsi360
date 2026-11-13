#!/usr/bin/env python3
"""
Build the Hatsi360 brand asset set from the artwork supplied by its owner.

The artwork is the source of truth. Nothing here redraws, redraws-by-hand or
reinterprets it: every asset is derived from the supplied pixels, so the mark
that appears on the site is the mark its owner supplied.

Four families of asset are produced:

  * the lockup and the mark in full colour, cropped to the artwork's own
    bounds;
  * a reversed variant for dark surfaces, where the green body becomes white
    so it reads on a deep green panel while the gold accent is kept;
  * monochrome variants, for single-ink printing and for surfaces that
    demand one colour;
  * the raster icons — favicon, installable app icons, Apple touch icon and
    the social card.

Usage
  python3 scripts/brand_assets.py \
    --favicon "/home/user/uploads/Hatsi360 Favicon.png" \
    --logo "/home/user/uploads/HATSI360 Logo.png"
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

REPO = Path(__file__).resolve().parent.parent
BRAND_DIRECTORY = REPO / "public" / "brand"

# The ink of the monochrome variants, drawn from the product's own palette.
INK_DARK = (18, 59, 42)  # Deep Harvest Green
INK_LIGHT = (255, 255, 255)
GOLD = (245, 183, 42)

# The tagline, set under the wordmark on the social card.
TAGLINE = "Know the harvest. Understand the market. Trade with confidence."


def gold_weight(rgb: np.ndarray) -> np.ndarray:
    """
    How much of a pixel is the gold accent rather than the green body.

    The artwork separates its two materials cleanly: the green has a red
    channel far below its green channel, the gold has a red channel above
    it. The measure is a soft ramp so that the antialiased pixels along the
    boundary between the two keep a blended colour rather than a hard edge.
    """
    red = rgb[..., 0].astype(float)
    green = rgb[..., 1].astype(float)
    separation = red - green
    weight = np.clip((separation + 25.0) / 105.0, 0.0, 1.0)
    return weight


# Where the supplied lockup's parts sit, measured from the artwork itself.
# The supplied logo is 2075 x 758 and these are its own pixel coordinates.
LOCKUP = {
    "symbol": (40, 145, 468, 560),
    "divider": (496, 205, 514, 527),
    "wordmark": (538, 208, 2011, 432),
}


def compose_compact_lockup(source: Image.Image) -> Image.Image:
    """
    Build the compact lockup: the mark, the rule, and the wordmark.

    The supplied artwork is one block that carries the category line and the
    endorsement as well as the name. Those two lines sit inside the symbol's
    own height, so a straight crop cannot remove them. The three parts are
    therefore lifted from the artwork at their original positions and laid out
    again in the same order and the same relationships, which leaves only the
    mark, the rule and the name — the lockup that belongs in a header.
    """
    origin_x = LOCKUP["symbol"][0]
    origin_y = LOCKUP["symbol"][1]
    width = LOCKUP["wordmark"][2] - origin_x
    height = LOCKUP["symbol"][3] - origin_y

    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    for name, box in LOCKUP.items():
        canvas.alpha_composite(
            source.crop(box), (box[0] - origin_x, box[1] - origin_y)
        )
    return canvas


def compose_wordmark(source: Image.Image) -> Image.Image:
    """The name alone, lifted from the supplied lockup."""
    box = LOCKUP["wordmark"]
    return source.crop(box)


def limit(image: Image.Image, edge: int) -> Image.Image:
    """Scale an artwork down so its longest edge is at most the given size."""
    width, height = image.size
    longest = max(width, height)
    if longest <= edge:
        return image
    factor = edge / longest
    return image.resize(
        (round(width * factor), round(height * factor)), Image.LANCZOS
    )


def crop_to_artwork(image: Image.Image) -> Image.Image:
    """Trim the transparent margin the artwork is supplied with."""
    bounds = image.getchannel("A").getbbox()
    if not bounds:
        raise SystemExit("The supplied artwork has no visible pixels")
    return image.crop(bounds)


def recolour(image: Image.Image, green: tuple[int, int, int], gold: tuple[int, int, int]) -> Image.Image:
    """Repaint an artwork, keeping its alpha, using its own two materials."""
    array = np.array(image).astype(float)
    weight = gold_weight(array[..., :3])
    base = np.array(green, dtype=float)
    accent = np.array(gold, dtype=float)
    blended = base[None, None, :] * (1.0 - weight[..., None]) + accent[None, None, :] * weight[..., None]
    array[..., :3] = blended
    return Image.fromarray(np.clip(array, 0, 255).astype(np.uint8), "RGBA")


def mono(image: Image.Image, ink: tuple[int, int, int]) -> Image.Image:
    """Flatten an artwork to a single ink, keeping its alpha."""
    array = np.array(image).astype(float)
    array[..., :3] = np.array(ink, dtype=float)[None, None, :]
    return Image.fromarray(np.clip(array, 0, 255).astype(np.uint8), "RGBA")


def save(image: Image.Image, name: str, quantise: bool = False) -> Path:
    """Write a PNG, keeping it as small as it can be without losing the mark."""
    path = BRAND_DIRECTORY / name
    if quantise:
        image = image.convert("RGBA")
        quantised = image.quantize(colors=200, method=Image.FASTOCTREE)
        quantised.save(path, optimize=True)
    else:
        image.save(path, optimize=True)
    print(f"  {name}  {path.stat().st_size // 1024} KB")
    return path


def load_font(size: int) -> ImageFont.FreeTypeFont:
    """The best available system font for the social card's tagline."""
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            try:
                return ImageFont.truetype(candidate, size)
            except OSError:
                continue
    return ImageFont.load_default()


def fit_font(
    draw: ImageDraw.ImageDraw,
    text: str,
    max_width: int,
    start_size: int,
    minimum_size: int = 18,
):
    """
    The largest font at which `text` fits inside `max_width`.

    The original card rendered the tagline at a fixed 34px and centred it
    without ever checking the result, so the line ran off both edges of the
    1200px canvas and was clipped. Any text drawn on the card now goes through
    here first.
    """
    size = start_size
    while size > minimum_size:
        font = load_font(size)
        try:
            box = draw.textbbox((0, 0), text, font=font)
            width = box[2] - box[0]
        except AttributeError:
            width = draw.textlength(text, font=font)
        if width <= max_width:
            return font, width
        size -= 1
    return load_font(minimum_size), max_width


def centred(
    draw: ImageDraw.ImageDraw,
    text: str,
    canvas_width: int,
    y: int,
    font,
    fill,
    max_width: int,
):
    """Draw `text` centred, fitted to `max_width`, and return its width."""
    font, text_width = fit_font(draw, text, max_width, font.size)
    draw.text(((canvas_width - text_width) / 2, y), text, font=font, fill=fill)
    return text_width


def social_card(mark: Image.Image) -> None:
    """
    Build the social card.

    A shared link is often the first thing anyone sees of the platform, so the
    card has to answer three questions without the page being opened: what is
    this, who is it for, and who stands behind it.

      - the mark, on the deep harvest green field;
      - the tagline, fitted so it can never be clipped;
      - one concrete line about what the platform does;
      - the category, and the corporate endorsement.

    Everything is measured and fitted before it is drawn.
    """
    width, height = 1200, 630
    card = Image.new("RGBA", (width, height), INK_DARK + (255,))

    # A soft harvest glow behind the mark, so the card is not a flat panel.
    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    draw.ellipse((-160, -260, width + 160, height - 40), fill=(91, 154, 87, 46))
    card = Image.alpha_composite(card, glow.filter(ImageFilter.GaussianBlur(120)))

    draw = ImageDraw.Draw(card)

    # The mark, in its reversed form so it reads on the deep green field.
    size = 210
    resized = mark.resize((size, int(size * mark.height / mark.width)), Image.LANCZOS)
    card.alpha_composite(resized, ((width - size) // 2, 66))

    # The safe width every line must fit inside. 80px of margin each side is
    # what keeps text clear of the rounded corners some clients apply.
    safe_width = width - 160

    # 1. The tagline, fitted.
    tagline = TAGLINE.upper()
    centred(draw, tagline, width, 320, load_font(34), INK_LIGHT, safe_width)

    # 2. What the platform does, in one concrete line.
    proposition = (
        "Verified agricultural prices from Nigerian markets, "
        "collected by field agents"
    )
    centred(
        draw,
        proposition,
        width,
        392,
        load_font(25),
        (233, 216, 181),
        safe_width,
    )

    # 3. A gold rule, separating the promise from the attribution.
    rule_width = 120
    draw.rectangle(
        ((width - rule_width) // 2, 452, (width + rule_width) // 2, 456),
        fill=GOLD,
    )

    # 4. The category.
    category = "HATSI360  ·  AGRICULTURAL MARKET INTELLIGENCE"
    centred(draw, category, width, 486, load_font(26), (233, 216, 181), safe_width)

    # 5. The corporate endorsement. Hatsi360 must be independently
    #    identifiable, with Pluck Agro visible but subordinate.
    endorsement = "POWERED BY PLUCK AGRO"
    centred(
        draw,
        endorsement,
        width,
        546,
        load_font(19),
        (233, 216, 181),
        safe_width,
    )

    # Guard: assert nothing was clipped. A social card that loses its own
    # words is worse than no card.
    for label, y in [("tagline", 320), ("proposition", 392), ("category", 486)]:
        row = [
            card.getpixel((x, y + 8))
            for x in range(width)
            if sum(card.getpixel((x, y + 8))[:3]) / 3 > 140
        ]
        if row:
            xs = [
                x
                for x in range(width)
                if sum(card.getpixel((x, y + 8))[:3]) / 3 > 140
            ]
            assert min(xs) > 4 and max(xs) < width - 5, (
                f"{label} is clipped: x {min(xs)}..{max(xs)} of {width}"
            )

    save(card.convert("RGB"), "hatsi360-social-1200x630.png")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--favicon", required=True, help="The supplied mark artwork.")
    parser.add_argument("--logo", required=True, help="The supplied wordmark artwork.")
    arguments = parser.parse_args()

    BRAND_DIRECTORY.mkdir(parents=True, exist_ok=True)

    source_logo = Image.open(arguments.logo).convert("RGBA")
    logo = crop_to_artwork(source_logo)
    favicon = crop_to_artwork(Image.open(arguments.favicon).convert("RGBA"))

    print("The supplied artwork:")
    save(logo, "hatsi360-logo-horizontal.png")
    mark = limit(favicon, 1024)
    save(mark, "hatsi360-mark.png")
    save(compose_compact_lockup(source_logo), "hatsi360-lockup-compact.png")
    save(compose_wordmark(source_logo), "hatsi360-wordmark.png")

    print("Reversed for dark surfaces:")
    save(recolour(logo, INK_LIGHT, GOLD), "hatsi360-logo-horizontal-light.png")
    save(recolour(mark, INK_LIGHT, GOLD), "hatsi360-mark-light.png")
    save(
        recolour(compose_compact_lockup(source_logo), INK_LIGHT, GOLD),
        "hatsi360-lockup-compact-light.png",
    )

    print("Monochrome:")
    save(mono(logo, INK_DARK), "hatsi360-logo-horizontal-mono.png")
    save(mono(logo, INK_LIGHT), "hatsi360-logo-horizontal-mono-light.png")
    save(
        mono(compose_compact_lockup(source_logo), INK_DARK),
        "hatsi360-lockup-compact-mono.png",
    )
    save(mono(mark, INK_DARK), "hatsi360-mark-mono.png")
    save(mono(mark, INK_LIGHT), "hatsi360-mark-mono-light.png")

    print("The raster icons:")
    for name, size in (
        ("hatsi360-favicon-16.png", 16),
        ("hatsi360-favicon-32.png", 32),
        ("hatsi360-apple-touch-icon.png", 180),
        ("hatsi360-icon-192.png", 192),
        ("hatsi360-icon-512.png", 512),
    ):
        save(favicon.resize((size, size), Image.LANCZOS), name, quantise=size <= 192)

    print("The social card:")
    social_card(favicon)

    print("The brand assets are built.")


if __name__ == "__main__":
    main()
