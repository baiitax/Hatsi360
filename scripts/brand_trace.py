#!/usr/bin/env python3
"""
Trace the supplied Hatsi360 brand artwork into scalable SVG.

The mark and the wordmark are supplied as raster artwork by the brand owner.
This script converts that artwork into SVG by:

  1. splitting the image into its two materials — the deep-green body and the
     gold accent — by hue;
  2. tracing every connected shape of each material as a single outline,
     with its holes preserved through `fill-rule="evenodd"`;
  3. describing the artwork's own shading as an SVG gradient per shape, so
     the depth of the original survives the conversion instead of being
     flattened to one flat colour.

The output is verified, not assumed: `scripts/verify_brand_artwork.py`
renders the generated SVG back to a raster and compares it against the source
artwork, reporting the mean and maximum per-channel difference.

Usage
  python3 scripts/brand_trace.py \
    --source "/home/user/uploads/Hatsi360 Favicon.png" \
    --out /tmp/trace.svg \
    --width 1024
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt

# The two materials in the artwork. The split is by hue, not by a fixed
# brightness: the gold accent is shaded from a bright amber down to a deep
# ochre, and a brightness test would classify the darker gold as green and
# punch holes in the artwork.
#
# Hue is expressed in OpenCV's 0-179 range: gold sits around 15-30 and green
# around 35-90.
GOLD_HUE_MIN = 8
GOLD_HUE_MAX = 32
GREEN_HUE_MIN = 32
GREEN_HUE_MAX = 95
MIN_SATURATION = 70

# The artwork's edges are antialiased, so a hard alpha cut leaves a fringe of
# half-transparent pixels that classify as neither material and punch holes in
# the trace. The shape is taken from a permissive alpha cut, and the colour of
# the fringe is taken from the nearest solid pixel.
SHAPE_ALPHA_MIN = 8
SOLID_ALPHA_MIN = 160


# --------------------------------------------------------------------- masks


def nearest_core_labels(core: np.ndarray) -> np.ndarray:
    """
    For every pixel, the flat index of the nearest pixel in `core`.

    This is how the antialiased fringe is resolved: the fringe is too
    transparent to trust its own colour, so it takes the colour of the
    nearest solid pixel instead of being classified as nothing at all.
    """
    if not core.any():
        return np.full(core.shape, -1, dtype=int)

    _, indices = distance_transform_edt(~core, return_indices=True)
    nearest = indices[0] * core.shape[1] + indices[1]
    return np.where(core, np.arange(core.size).reshape(core.shape), nearest)


def absorb_fringing(gold: np.ndarray, green: np.ndarray, max_area: int) -> tuple[np.ndarray, np.ndarray]:
    """
    Absorb small islands of one material that sit inside the other.

    The supplied artwork is a raster with antialiased, chromatically fringed
    edges: where the gold meets the green, a few pixels of green bleed into
    the gold and a few of gold bleed into the green. Left in place they trace
    as speckle inside a letterform. An island is only absorbed when it is
    fully enclosed by the other material — the counter of a letter, or the
    space inside the ring, is transparent and is never touched.
    """
    result_gold = gold.copy()
    result_green = green.copy()

    for island, host, other in ((green, gold, result_green), (gold, green, result_gold)):
        count, labels, stats, _ = cv2.connectedComponentsWithStats(island.astype(np.uint8), 4)
        for label in range(1, count):
            if stats[label, cv2.CC_STAT_AREA] > max_area:
                continue
            component = labels == label
            # Enclosed when the component's surroundings are all host.
            padded = np.pad(component, 1, constant_values=False)
            neighbours = (
                padded[:-2, 1:-1] | padded[2:, 1:-1] | padded[1:-1, :-2] | padded[1:-1, 2:]
            )
            if neighbours.all():
                other[component] = False
                host[component] = True

    return result_gold, result_green


def material_masks(rgba: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Split the artwork into the gold accent and the green body."""
    alpha = rgba[..., 3]
    shape = alpha >= SHAPE_ALPHA_MIN
    solid = alpha >= SOLID_ALPHA_MIN

    hsv = cv2.cvtColor(rgba[..., :3], cv2.COLOR_RGB2HSV)
    hue = hsv[..., 0].astype(int)
    saturation = hsv[..., 1].astype(int)
    saturated = saturation > MIN_SATURATION

    gold_core = solid & saturated & (hue >= GOLD_HUE_MIN) & (hue <= GOLD_HUE_MAX)
    green_core = solid & saturated & (hue >= GREEN_HUE_MIN) & (hue <= GREEN_HUE_MAX)
    # Anything solid that neither classifier claimed is closer to grey than to
    # either material. Give it to the green body so no pixel is lost.
    green_core = green_core | (solid & ~gold_core & ~green_core)

    # Extend both materials over the antialiased fringe. The fringe is
    # extended slightly past the shape so the traced outline sits on the
    # outer edge of the artwork's own antialiasing, which is where the
    # renderer will put its own antialiasing.
    fringe = shape & ~solid
    gold = gold_core.copy()
    green = green_core.copy()
    if fringe.any():
        gold_labels = nearest_core_labels(gold_core)
        green_labels = nearest_core_labels(green_core)
        gold_takes = (gold_labels >= 0) & (green_labels < 0 | (gold_labels <= green_labels))
        gold = gold | (fringe & gold_takes)
        green = green | (fringe & ~gold_takes)

    return gold, green


# ------------------------------------------------------------------ tracing


def path_data(points: np.ndarray) -> str:
    """
    Emit a closed path.

    The points come from a contour that has already been simplified, so they
    are joined with straight segments. The artwork's curves are large enough
    that a straight join every few pixels is invisible at display size, and
    it keeps the file a fraction of the size a smoothed path would be.
    """
    if len(points) < 3:
        return ""
    rounded = [(round(float(x), 1), round(float(y), 1)) for x, y in points]
    commands = [f"M{rounded[0][0]} {rounded[0][1]}"]
    for x, y in rounded[1:]:
        commands.append(f"L{x} {y}")
    commands.append("Z")
    return "".join(commands)


def trace_outline(mask: np.ndarray, epsilon_ratio: float) -> tuple[str, list[np.ndarray]]:
    """
    Trace one connected shape.

    Returns the path data and the individual contours, so the caller can
    work out the gradient direction from the shape's own geometry.
    """
    binary = (mask.astype(np.uint8) * 255)
    contours, _ = cv2.findContours(binary, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    if not contours:
        return "", []

    subpaths: list[str] = []
    kept: list[np.ndarray] = []
    for contour in contours:
        if len(contour) < 8:
            continue
        if abs(cv2.contourArea(contour)) < 12:
            continue
        epsilon = epsilon_ratio * cv2.arcLength(contour, True)
        simplified = cv2.approxPolyDP(contour, epsilon, True)
        if len(simplified) < 3:
            continue
        points = simplified.reshape(-1, 2)
        subpaths.append(path_data(points))
        kept.append(points)

    return " ".join(subpaths), kept


def shading_axis(
    component: np.ndarray, rgba: np.ndarray
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    The axis along which a shape's colour changes, and the colour along it.

    Returns the unit direction, a full-size map of every pixel's projection
    onto that axis, the solid pixels of the shape, and their colours.
    """
    alpha = rgba[..., 3]
    solid = component & (alpha >= SOLID_ALPHA_MIN)
    if solid.sum() < 12:
        solid = component
    if solid.sum() == 0:
        return (
            np.array([1.0, 0.0]),
            np.zeros(component.shape),
            np.zeros((0, 2), dtype=int),
            np.zeros((0, 3)),
        )

    colours = rgba[..., :3].astype(float)
    luminance = colours.mean(axis=2)

    ys, xs = np.nonzero(solid)
    positions = np.stack([xs, ys], axis=1).astype(float)
    values = luminance[solid]

    centred_positions = positions - positions.mean(axis=0)
    centred_values = values - values.mean()

    # The direction of steepest colour change inside the shape.
    combined = np.concatenate([centred_positions, centred_values[:, None]], axis=1)
    covariance = np.cov(combined.T)
    eigenvalues, eigenvectors = np.linalg.eigh(covariance)
    direction = eigenvectors[:2, int(np.argmax(eigenvalues))].astype(float)
    norm = float(np.linalg.norm(direction))
    if norm < 1e-9:
        direction = np.array([1.0, 0.0])
    else:
        direction = direction / norm

    # Orient the axis so the colour runs from the darker end to the lighter.
    if float(np.corrcoef(centred_positions @ direction, centred_values)[0, 1]) < 0:
        direction = -direction

    # The projection map covers the whole image, so a split can cut the shape
    # along the axis without rebuilding the projection.
    grid_y, grid_x = np.mgrid[0 : component.shape[0], 0 : component.shape[1]]
    projection_map = (grid_x - positions.mean(axis=0)[0]) * direction[0] + (
        grid_y - positions.mean(axis=0)[1]
    ) * direction[1]

    return direction, projection_map, np.stack([xs, ys], axis=1), colours[solid]


def fit_gradient(
    component: np.ndarray,
    rgba: np.ndarray,
    gradient_id: str,
    depth: int = 0,
) -> list[tuple[str, str]]:
    """
    Fit a gradient to a shape, splitting it where one gradient cannot follow.

    A shape is first fitted with a single linear gradient along its axis of
    steepest colour change. If the fit leaves a visible residual — a curved
    shape, or a shape whose shading runs around its own outline — the shape is
    split along that axis and each half is fitted on its own. The split is
    repeated until the fit is good enough or the depth limit is reached.

    Each entry is a `(gradient definition, fill)` pair; the definition may be
    empty when the shape is flat enough to take a flat fill.
    """
    direction, projection_map, positions, colours = shading_axis(component, rgba)
    if len(colours) == 0:
        return []

    solid = component & (rgba[..., 3] >= SOLID_ALPHA_MIN)
    if solid.sum() < 12:
        solid = component
    projection = projection_map[solid]
    spread = float(projection.max() - projection.min())
    if spread < 5:
        flat = "#%02X%02X%02X" % tuple(
            int(round(c)) for c in np.median(colours, axis=0)
        )
        return [("", flat, component)]

    # The residual of the linear fit: how far each pixel's colour sits from
    # the colour the gradient would give it.
    order = np.argsort(projection)
    sorted_projection = projection[order]
    sorted_colours = colours[order]
    positions = np.linspace(sorted_projection[0], sorted_projection[-1], 64)
    expected = np.stack(
        [np.interp(positions, sorted_projection, sorted_colours[:, channel]) for channel in range(3)],
        axis=1,
    )
    predicted = np.stack(
        [np.interp(projection, positions, expected[:, channel]) for channel in range(3)],
        axis=1,
    )
    residual = float(np.abs(predicted - colours).max())

    if residual > 16 and depth < 3:
        # Split the shape along the shading axis and fit each half.
        midpoint = float(np.median(projection))
        lower = component & (projection_map <= midpoint)
        upper = component & (projection_map > midpoint)
        pieces: list[tuple[str, str, np.ndarray]] = []
        for index, piece in enumerate((lower, upper)):
            if piece.sum() < 40:
                continue
            pieces.extend(
                fit_gradient(piece, rgba, f"{gradient_id}s{index}", depth + 1)
            )
        if len(pieces) >= 2:
            return pieces

    centre = positions.mean(axis=0)
    half = spread / 2.0
    start = centre - direction * half
    end = centre + direction * half

    stops: list[tuple[float, str]] = []
    for fraction in (0.0, 0.34, 0.67, 1.0):
        target = projection.min() + spread * fraction
        index = int(np.argmin(np.abs(projection - target)))
        colour = colours[index]
        stops.append((fraction, "#%02X%02X%02X" % tuple(int(round(c)) for c in colour)))

    definition = (
        f'<linearGradient id="{gradient_id}" gradientUnits="userSpaceOnUse" '
        f'x1="{start[0]:.1f}" y1="{start[1]:.1f}" x2="{end[0]:.1f}" y2="{end[1]:.1f}">'
        + "".join(
            f'<stop offset="{fraction:.2f}" stop-color="{colour}"/>' for fraction, colour in stops
        )
        + "</linearGradient>"
    )
    return [(definition, f"url(#{gradient_id})", component)]


def trace_material(
    mask: np.ndarray,
    rgba: np.ndarray,
    epsilon_ratio: float,
    min_area: int,
) -> tuple[list[str], list[dict]]:
    """Trace every connected shape of one material."""
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), 8)
    order = np.argsort(-stats[1:, cv2.CC_STAT_AREA]) + 1

    definitions: list[str] = []
    shapes: list[dict] = []
    for label in order:
        if stats[label, cv2.CC_STAT_AREA] < min_area:
            continue
        component = labels == label
        data, _ = trace_outline(component, epsilon_ratio)
        if not data:
            continue

        # The shape may need more than one gradient. Each piece is traced
        # against its own outline so the pieces cover the shape exactly.
        pieces = fit_gradient(component, rgba, f"h360g{len(shapes)}")
        for definition, fill, piece_mask in pieces:
            piece_data, _ = trace_outline(piece_mask, epsilon_ratio)
            if not piece_data:
                continue
            if definition:
                definitions.append(definition)
            shapes.append({"d": piece_data, "fill": fill})
    return definitions, shapes


# ------------------------------------------------------------------ output


def build_svg(
    definitions: list[str], shapes: list[dict], width: int, height: int, viewbox, label: str
) -> str:
    vb_x, vb_y, vb_w, vb_h = viewbox
    defs = "\n".join(f"  {d}" for d in definitions)
    defs_block = f"  <defs>\n{defs}\n  </defs>\n" if definitions else ""
    body = "\n".join(
        f'    <path fill-rule="evenodd" d="{s["d"]}" fill="{s["fill"]}"/>' for s in shapes
    )
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb_x} {vb_y} {vb_w} {vb_h}" width="{width}" height="{height}" role="img" aria-label="{label}">
{defs_block}{body}
</svg>
"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--width", type=int, default=1024)
    parser.add_argument("--height", type=int, default=0, help="Defaults to the width.")
    parser.add_argument(
        "--epsilon",
        type=float,
        default=0.0012,
        help="Contour simplification ratio. Smaller is more faithful and larger.",
    )
    parser.add_argument(
        "--min-area",
        type=int,
        default=90,
        help="The smallest shape worth tracing, in pixels.",
    )
    parser.add_argument("--label", default="Hatsi360")
    parser.add_argument(
        "--fringe-area",
        type=int,
        default=900,
        help="The largest fringing island that is absorbed into its host.",
    )
    parser.add_argument("--json", help="Also write the traced shapes as JSON.")
    arguments = parser.parse_args()

    source = Path(arguments.source)
    image = Image.open(source).convert("RGBA")
    rgba = np.array(image)

    gold, green = material_masks(rgba)
    gold, green = absorb_fringing(gold, green, arguments.fringe_area)

    gold_definitions, gold_shapes = trace_material(
        gold, rgba, arguments.epsilon, arguments.min_area
    )
    green_definitions, green_shapes = trace_material(
        green, rgba, arguments.epsilon, arguments.min_area
    )

    # The green body is painted first; the gold accent sits on top of it.
    definitions = green_definitions + gold_definitions
    shapes = green_shapes + gold_shapes

    height = arguments.height or arguments.width
    svg = build_svg(
        definitions,
        shapes,
        arguments.width,
        height,
        (0, 0, rgba.shape[1], rgba.shape[0]),
        arguments.label,
    )
    out = Path(arguments.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(svg)

    if arguments.json:
        Path(arguments.json).write_text(json.dumps(shapes, indent=2))

    print(f"traced {len(shapes)} shapes -> {out}")


if __name__ == "__main__":
    main()
