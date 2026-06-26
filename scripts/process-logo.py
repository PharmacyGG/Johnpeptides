"""
Take the user-provided JPG logo and produce two transparent PNGs:
  logo.png        — original colors, white background → alpha 0
  logo-white.png  — dark navy 'P' letter recolored white (for dark surfaces)

Usage:  python scripts/process-logo.py
"""
from pathlib import Path
from PIL import Image

IMG_DIR = Path(__file__).resolve().parent.parent / "assets" / "img"
SRC = IMG_DIR / "logo.jpg"

# White background — anything close to pure white becomes transparent
WHITE_HARD = 18    # |R-255|, |G-255|, |B-255| <= this  → fully transparent
WHITE_SOFT = 40    # softer ramp to fully opaque

# Dark navy detector — channel-by-channel max ~ 60 is "dark"
DARK_MAX = 80

def is_dark(r, g, b):
    return max(r, g, b) < DARK_MAX

def white_alpha(r, g, b):
    d = max(255 - r, 255 - g, 255 - b)
    if d <= WHITE_HARD:
        return 0
    if d >= WHITE_SOFT:
        return 255
    return int(round(((d - WHITE_HARD) / (WHITE_SOFT - WHITE_HARD)) * 255))


def main() -> None:
    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    print(f"Source {SRC.name}: {w}x{h}")

    # Pass 1: transparent-bg color version
    color = im.copy()
    cpx = color.load()
    for y in range(h):
        for x in range(w):
            r, g, b, _ = cpx[x, y]
            cpx[x, y] = (r, g, b, white_alpha(r, g, b))
    out_color = IMG_DIR / "logo.png"
    color.save(out_color, optimize=True)
    print(f"  wrote {out_color.name}")

    # Pass 2: white-P variant for dark backgrounds
    white_p = im.copy()
    wpx = white_p.load()
    for y in range(h):
        for x in range(w):
            r, g, b, _ = wpx[x, y]
            a = white_alpha(r, g, b)
            if is_dark(r, g, b):
                # Recolor dark pixel → white, keep alpha from luminosity
                # (so the antialiased dark edges blend cleanly)
                wpx[x, y] = (255, 255, 255, a if a else 255)
            else:
                wpx[x, y] = (r, g, b, a)
    out_white = IMG_DIR / "logo-white.png"
    white_p.save(out_white, optimize=True)
    print(f"  wrote {out_white.name}")


if __name__ == "__main__":
    main()
