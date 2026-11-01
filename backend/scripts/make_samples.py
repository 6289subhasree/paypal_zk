"""Generate mock SPECIMEN identity cards for the demo.

These are fictional test documents with plain layouts: no government emblems,
logos or real-person data. Every card is watermarked SPECIMEN / TEST DOCUMENT.
Run: python scripts/make_samples.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[2] / "samples"
FONT_PATHS = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
]


def font(size: int):
    for p in FONT_PATHS:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default(size)


def card(filename: str, title: str, rows: list[tuple[str, str]], accent: str):
    img = Image.new("RGB", (1400, 880), "white")
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 1400, 130], fill=accent)
    d.text((50, 38), title, fill="white", font=font(54))
    y = 200
    for label, value in rows:
        d.text((70, y), f"{label}: {value}", fill="#111111", font=font(46))
        y += 95
    d.rectangle([0, 790, 1400, 880], fill="#f3f3f3")
    d.text((50, 808), "SPECIMEN - TEST DOCUMENT - NOT VALID FOR ANY PURPOSE", fill="#b00020", font=font(38))
    # Diagonal watermark
    wm = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(wm).text((300, 380), "SPECIMEN", fill=(176, 0, 32, 50), font=font(190))
    img = Image.alpha_composite(img.convert("RGBA"), wm.rotate(18, center=(700, 440))).convert("RGB")
    OUT.mkdir(exist_ok=True)
    img.save(OUT / filename)
    print("wrote", OUT / filename)


if __name__ == "__main__":
    card("specimen_pan_card.png", "TEST TAX ID CARD (PAN FORMAT)",
         [("Name", "Asha Verma"), ("Father's Name", "Rakesh Verma"),
          ("Date of Birth", "14/08/1999"), ("Number", "ABCPV1234K")], "#1d4e89")
    card("specimen_id_card.png", "TEST RESIDENT ID CARD (AADHAAR FORMAT)",
         [("Name", "Asha Verma"), ("Date of Birth", "14/08/1999"),
          ("Gender", "Female"), ("Number", "4567 8901 2345")], "#2e7d4f")
    # Name and DOB differ from the demo user, used to show the failed-check path
    card("mismatch_name_card.png", "TEST TAX ID CARD (PAN FORMAT)",
         [("Name", "Rohan Mehta"), ("Father's Name", "Anil Mehta"),
          ("Date of Birth", "02/01/2001"), ("Number", "ABCPM5678Q")], "#6a3d9a")
