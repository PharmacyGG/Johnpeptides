"""
Color-key out the cream #F5EDE3 background of generated part PNGs and
write transparent versions. Uses a soft alpha falloff between the
"definitely cream" zone (fully transparent) and "definitely part" zone
(fully opaque) so edges aren't jagged.

Usage:  python scripts/make-transparent.py
"""
from pathlib import Path
from PIL import Image

PARTS = [
    "part-cap.png",
    "part-ring.png",
    "part-stopper.png",
    "part-body.png",
    "vial-assembled-cream.png",
]
IMG_DIR = Path(__file__).resolve().parent.parent / "assets" / "img"

# Background target color (was cream #F5EDE3, now off-white #F2F4F7 per brand v2).
# Try both — whichever a given image was generated against.
BG_TARGETS = [(0xF5, 0xED, 0xE3), (0xF2, 0xF4, 0xF7)]
TR, TG, TB = BG_TARGETS[1]   # default for new generations
# Chebyshev-distance thresholds:
HARD_CUT = 14   # <= this distance from cream → fully transparent
SOFT_END = 36   # >= this distance from cream → fully opaque
                # (linear alpha ramp in between)


def keyed_alpha(r: int, g: int, b: int) -> int:
    # Distance to the NEAREST of the candidate backgrounds
    d = min(
        max(abs(r - tr), abs(g - tg), abs(b - tb))
        for (tr, tg, tb) in BG_TARGETS
    )
    if d <= HARD_CUT:
        return 0
    if d >= SOFT_END:
        return 255
    return int(round(((d - HARD_CUT) / (SOFT_END - HARD_CUT)) * 255))


def process(src: Path, dst: Path) -> None:
    im = Image.open(src).convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            px[x, y] = (r, g, b, keyed_alpha(r, g, b))
    im.save(dst, optimize=True)
    print(f"  {src.name} -> {dst.name} ({w}x{h})")


def main() -> None:
    print(f"Processing in {IMG_DIR}")
    for name in PARTS:
        src = IMG_DIR / name
        if not src.exists():
            print(f"  skip {name} (missing)")
            continue
        process(src, src)  # overwrite in place
    print("done")


if __name__ == "__main__":
    main()
