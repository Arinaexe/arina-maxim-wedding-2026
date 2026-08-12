from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFont
import qrcode


ROOT = Path(__file__).resolve().parents[1]
BACKGROUND = ROOT / "assets" / "invitation" / "dark-charcoal-background.png"
OUTPUT = ROOT / "output" / "arina-maxim-invitation-qr.png"
SITE_URL = "https://arinaexe.github.io/arina-maxim-wedding-2026/"

WIDTH, HEIGHT = 1536, 2304
IVORY = (243, 238, 228, 255)
MUTED = (198, 187, 171, 255)
CHAMPAGNE = (190, 158, 118, 255)
CHARCOAL = (31, 31, 29, 255)

SERIF = Path(r"C:\Windows\Fonts\times.ttf")
SERIF_ITALIC = Path(r"C:\Windows\Fonts\timesi.ttf")
SANS = Path(r"C:\Windows\Fonts\arial.ttf")


def font(path: Path, size: int):
    return ImageFont.truetype(str(path), size)


def centered(draw: ImageDraw.ImageDraw, y: int, text: str, face, fill, spacing=4):
    box = draw.multiline_textbbox((0, 0), text, font=face, spacing=spacing, align="center")
    x = (WIDTH - (box[2] - box[0])) / 2
    draw.multiline_text((x, y), text, font=face, fill=fill, spacing=spacing, align="center")


def tracked(draw: ImageDraw.ImageDraw, y: int, text: str, face, fill, tracking: int):
    widths = [draw.textlength(ch, font=face) for ch in text]
    total = sum(widths) + tracking * (len(text) - 1)
    x = (WIDTH - total) / 2
    for ch, char_width in zip(text, widths):
        draw.text((x, y), ch, font=face, fill=fill)
        x += char_width + tracking


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    bg = Image.open(BACKGROUND).convert("RGB")
    scale = max(WIDTH / bg.width, HEIGHT / bg.height)
    resized = bg.resize((round(bg.width * scale), round(bg.height * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - WIDTH) // 2
    top = (resized.height - HEIGHT) // 2
    canvas = resized.crop((left, top, left + WIDTH, top + HEIGHT)).convert("RGBA")
    canvas = ImageEnhance.Contrast(canvas).enhance(1.03)
    draw = ImageDraw.Draw(canvas)

    tracked(draw, 205, "ПРИГЛАШЕНИЕ НА СВАДЬБУ", font(SANS, 22), MUTED, 10)

    centered(draw, 340, "Арина", font(SERIF, 174), IVORY)
    centered(draw, 510, "&", font(SERIF_ITALIC, 75), CHAMPAGNE)
    centered(draw, 590, "Максим", font(SERIF, 174), IVORY)

    draw.line((566, 835, 970, 835), fill=(154, 132, 105, 190), width=1)
    tracked(draw, 875, "09  •  09  •  2026", font(SANS, 27), IVORY, 8)
    centered(draw, 960, "Мы будем счастливы разделить\nс вами этот особенный день", font(SERIF_ITALIC, 45), IVORY, 12)

    centered(draw, 1160, "12:30", font(SERIF, 73), IVORY)
    tracked(draw, 1248, "КУРСК  ·  УЛ. РАДИЩЕВА, 66А", font(SANS, 21), MUTED, 5)

    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=16, border=4)
    qr.add_data(SITE_URL)
    qr.make(fit=True)
    qr_image = qr.make_image(fill_color="#1f1f1d", back_color="#f3eee4").convert("RGBA")
    qr_size = 395
    qr_image = qr_image.resize((qr_size, qr_size), Image.Resampling.NEAREST)
    qr_x = (WIDTH - qr_size) // 2
    qr_y = 1460
    draw.rounded_rectangle((qr_x - 26, qr_y - 26, qr_x + qr_size + 26, qr_y + qr_size + 26), radius=8, fill=(243, 238, 228, 255), outline=(190, 158, 118, 255), width=2)
    canvas.alpha_composite(qr_image, (qr_x, qr_y))

    tracked(draw, 1935, "ОТКРОЙТЕ НАШЕ ПРИГЛАШЕНИЕ", font(SANS, 19), MUTED, 6)
    centered(draw, 2010, "А  ∞  М", font(SERIF, 62), CHAMPAGNE)

    canvas.convert("RGB").save(OUTPUT, quality=96)
    print(OUTPUT)


if __name__ == "__main__":
    main()
