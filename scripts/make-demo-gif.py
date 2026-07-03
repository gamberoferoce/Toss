"""ponytail: one-off demo GIF from lv_0_20260703194208.mp4 — run: python scripts/make-demo-gif.py [video]"""
import sys
from pathlib import Path

import cv2
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEFAULT = Path(r"c:\Users\giuli\Downloads\lv_0_20260703194208.mp4")
OUT = ROOT / "docs" / "demo.gif"
MAX_W = 400
TARGET_FPS = 6
PALETTE_COLORS = 48


def _quantize(frames: list[Image.Image]) -> list[Image.Image]:
  # ponytail: one global palette — smaller GIF than per-frame adaptive
  ref = frames[0].resize((MAX_W, MAX_W)).quantize(
    colors=PALETTE_COLORS, method=Image.Quantize.MEDIANCUT
  )
  pal = ref.getpalette()
  out: list[Image.Image] = []
  for img in frames:
    q = img.quantize(palette=ref, dither=Image.Dither.FLOYDSTEINBERG)
    if pal:
      q.putpalette(pal)
    out.append(q)
  return out


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT
    if not src.is_file():
        raise SystemExit(f"video not found: {src}")

    cap = cv2.VideoCapture(str(src))
    if not cap.isOpened():
        raise SystemExit(f"cannot open: {src}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    step = max(1, round(fps / TARGET_FPS))
    frames: list[Image.Image] = []

    i = 0
    while True:
        ok, bgr = cap.read()
        if not ok:
            break
        if i % step == 0:
            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            img = Image.fromarray(rgb)
            if img.width > MAX_W:
                h = round(img.height * MAX_W / img.width)
                img = img.resize((MAX_W, h), Image.Resampling.LANCZOS)
            frames.append(img)
        i += 1
    cap.release()

    if not frames:
        raise SystemExit("no frames")

    frames = _quantize(frames)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    duration = int(1000 / TARGET_FPS)
    frames[0].save(
        OUT,
        save_all=True,
        append_images=frames[1:],
        duration=duration,
        loop=0,
        optimize=True,
        disposal=2,
    )
    print(f"wrote {OUT} ({len(frames)} frames, {OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
