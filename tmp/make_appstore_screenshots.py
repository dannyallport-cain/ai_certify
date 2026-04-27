from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path("/Users/admin/Development/ai_certify")
SOURCE_DIR = ROOT / "public" / "screenshots"
OUTPUT_DIR = SOURCE_DIR / "app-store"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

TARGET_SIZE = (1290, 2796)
CARD_SIZE = (1140, 1520)
CARD_X = (TARGET_SIZE[0] - CARD_SIZE[0]) // 2
CARD_Y = 690

FILES = [
    {
        "source": "01-dashboard.png",
        "output": "01-dashboard.png",
        "headline": "Run inspections from one clean dashboard",
        "subhead": "Track jobs, certificates, and customer records without bouncing between tools.",
        "chips": ["Jobs", "Certificates", "Customers"],
        "accent": (37, 99, 235),
    },
    {
        "source": "02-certificates.png",
        "output": "02-certificates.png",
        "headline": "Create certificates faster in the field",
        "subhead": "Draft, review, and share reports while the job is still fresh.",
        "chips": ["Draft faster", "Review notes", "Share instantly"],
        "accent": (79, 70, 229),
    },
    {
        "source": "03-servicem8-integration.png",
        "output": "03-servicem8-integration.png",
        "headline": "Keep ServiceM8 connected on site",
        "subhead": "Job and customer data stays in sync so your team can keep moving.",
        "chips": ["Live sync", "Jobs", "Customers"],
        "accent": (16, 185, 129),
    },
    {
        "source": "04-certificate-detail.png",
        "output": "04-certificate-detail.png",
        "headline": "Review evidence before you submit",
        "subhead": "Capture the final checks, notes, and proof in one place.",
        "chips": ["Field review", "Evidence", "Final checks"],
        "accent": (124, 58, 237),
    },
    {
        "source": "05-customers.png",
        "output": "05-customers.png",
        "headline": "Customer history at your fingertips",
        "subhead": "Search past jobs and contacts quickly when you're back on the move.",
        "chips": ["Search fast", "Job history", "Contact details"],
        "accent": (249, 115, 22),
    },
]

FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Supplemental/Helvetica Neue Bold.ttf",
    "/System/Library/Fonts/Supplemental/Helvetica Neue.ttf",
    "/Library/Fonts/Arial.ttf",
]

def load_font(size, bold=False):
    preferred = list(FONT_CANDIDATES)
    if bold:
        preferred = [
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/System/Library/Fonts/Supplemental/Helvetica Neue Bold.ttf",
        ] + preferred
    for path in preferred:
        font_path = Path(path)
        if font_path.exists():
            try:
                return ImageFont.truetype(str(font_path), size=size)
            except OSError:
                pass
    return ImageFont.load_default()

def text_width(draw, text, font):
    return draw.textbbox((0, 0), text, font=font)[2]

def wrap_text(draw, text, font, max_width):
    lines = []
    for paragraph in text.split("\n"):
        words = paragraph.split()
        if not words:
            lines.append("")
            continue
        current = words[0]
        for word in words[1:]:
            candidate = f"{current} {word}"
            if text_width(draw, candidate, font) <= max_width:
                current = candidate
            else:
                lines.append(current)
                current = word
        lines.append(current)
    return lines

def draw_wrapped_text(draw, text, x, y, font, fill, max_width, line_gap=10):
    lines = wrap_text(draw, text, font, max_width)
    ascent, descent = font.getmetrics() if hasattr(font, "getmetrics") else (0, 0)
    cursor_y = y
    for line in lines:
        draw.text((x, cursor_y), line, font=font, fill=fill)
        cursor_y += ascent + descent + line_gap
    return cursor_y

def make_gradient(size, top, bottom):
    width, height = size
    canvas = Image.new("RGBA", size, top + (255,))
    draw = ImageDraw.Draw(canvas)
    for y in range(height):
        t = y / max(height - 1, 1)
        color = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        draw.line([(0, y), (width, y)], fill=color + (255,))
    return canvas

def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask

def shadow_layer(base_size, box, radius, offset=(0, 28), blur=34, alpha=110):
    layer = Image.new("RGBA", base_size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    x0, y0, x1, y1 = box
    draw.rounded_rectangle(
        (x0 + offset[0], y0 + offset[1], x1 + offset[0], y1 + offset[1]),
        radius=radius,
        fill=(0, 0, 0, alpha),
    )
    return layer.filter(ImageFilter.GaussianBlur(blur))

def build_canvas(source, accent):
    background = ImageOps.fit(
        source.convert("RGB"),
        TARGET_SIZE,
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.38),
    ).filter(ImageFilter.GaussianBlur(36))

    canvas = Image.blend(
        background.convert("RGBA"),
        make_gradient(TARGET_SIZE, (10, 18, 38), accent).convert("RGBA"),
        0.58,
    )

    decor = Image.new("RGBA", TARGET_SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(decor)
    draw.ellipse((-180, 120, 520, 820), fill=(*accent, 58))
    draw.ellipse((860, 90, 1460, 690), fill=(255, 255, 255, 28))
    draw.ellipse((820, 2080, 1500, 2760), fill=(*accent, 20))
    draw.rounded_rectangle((64, 630, 1226, 2530), radius=120, outline=(255, 255, 255, 18), width=3)
    canvas = Image.alpha_composite(canvas, decor)

    top_wash = Image.new("RGBA", TARGET_SIZE, (8, 15, 35, 0))
    wash_draw = ImageDraw.Draw(top_wash)
    wash_draw.rectangle((0, 0, TARGET_SIZE[0], 620), fill=(8, 15, 35, 128))
    canvas = Image.alpha_composite(canvas, top_wash)

    glow = Image.new("RGBA", TARGET_SIZE, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((150, 620, 1140, 1760), fill=(*accent, 52))
    glow = glow.filter(ImageFilter.GaussianBlur(54))
    canvas = Image.alpha_composite(canvas, glow)

    return canvas

def draw_chip(draw, x, y, label, font, accent):
    pad_x = 32
    pad_y = 16
    width = text_width(draw, label, font) + pad_x * 2
    ascent, descent = font.getmetrics() if hasattr(font, "getmetrics") else (0, 0)
    height = ascent + descent + pad_y * 2 - 2
    draw.rounded_rectangle((x, y, x + width, y + height), radius=height // 2, fill=(255, 255, 255, 220), outline=(*accent, 90), width=2)
    draw.text((x + pad_x, y + pad_y - 1), label, font=font, fill=(15, 23, 42))
    return width

def compose(spec):
    source_path = SOURCE_DIR / spec["source"]
    output_path = OUTPUT_DIR / spec["output"]

    with Image.open(source_path) as raw:
        source = raw.convert("RGB")

    canvas = build_canvas(source, spec["accent"])
    draw = ImageDraw.Draw(canvas)

    badge_font = load_font(30, bold=True)
    headline_font = load_font(88, bold=True)
    subhead_font = load_font(40, bold=False)
    chip_font = load_font(30, bold=True)
    footer_font = load_font(26, bold=False)

    # Badge
    badge_x, badge_y = 110, 116
    badge_text = "AI Certify"
    badge_w = text_width(draw, badge_text, badge_font) + 62
    badge_h = 54
    draw.rounded_rectangle((badge_x, badge_y, badge_x + badge_w, badge_y + badge_h), radius=27, fill=(*spec["accent"], 220))
    draw.text((badge_x + 28, badge_y + 12), badge_text, font=badge_font, fill=(255, 255, 255))

    # Copy
    draw_wrapped_text(draw, spec["headline"], 110, 230, headline_font, (255, 255, 255), 1040, line_gap=12)
    draw_wrapped_text(draw, spec["subhead"], 110, 430, subhead_font, (235, 241, 255), 1040, line_gap=10)
    draw.rounded_rectangle((110, 606, 258, 614), radius=4, fill=(*spec["accent"], 235))

    # Card shadow
    card_box = (CARD_X, CARD_Y, CARD_X + CARD_SIZE[0], CARD_Y + CARD_SIZE[1])
    canvas.alpha_composite(shadow_layer(TARGET_SIZE, card_box, 54, offset=(0, 34), blur=40, alpha=120))

    # Device frame
    device = Image.new("RGBA", CARD_SIZE, (13, 18, 30, 255))
    device_draw = ImageDraw.Draw(device)
    device_draw.rounded_rectangle((0, 0, CARD_SIZE[0] - 1, CARD_SIZE[1] - 1), radius=64, fill=(13, 18, 30, 255), outline=(255, 255, 255, 40), width=2)
    device_draw.rounded_rectangle((CARD_SIZE[0] // 2 - 110, 26, CARD_SIZE[0] // 2 + 110, 64), radius=18, fill=(7, 10, 18, 255))
    device_draw.rounded_rectangle((CARD_SIZE[0] // 2 - 42, CARD_SIZE[1] - 44, CARD_SIZE[0] // 2 + 42, CARD_SIZE[1] - 34), radius=5, fill=(255, 255, 255, 78))
    device_draw.line((54, 118, CARD_SIZE[0] - 54, 118), fill=(255, 255, 255, 18), width=2)

    inner_x = 28
    inner_y = 88
    inner_w = CARD_SIZE[0] - (inner_x * 2)
    inner_h = CARD_SIZE[1] - inner_y - 86
    panel = Image.new("RGBA", (inner_w, inner_h), (247, 250, 255, 255))
    panel_draw = ImageDraw.Draw(panel)
    panel_draw.rounded_rectangle((0, 0, inner_w - 1, inner_h - 1), radius=44, fill=(247, 250, 255, 255), outline=(255, 255, 255, 225), width=2)

    fitted = ImageOps.contain(
        source,
        (inner_w - 42, inner_h - 42),
        method=Image.Resampling.LANCZOS,
    )
    panel.paste(fitted, ((inner_w - fitted.size[0]) // 2, (inner_h - fitted.size[1]) // 2), None)
    panel = panel.filter(ImageFilter.UnsharpMask(radius=1.15, percent=105, threshold=2))
    device.paste(panel, (inner_x, inner_y), rounded_mask((inner_w, inner_h), 44))

    canvas.alpha_composite(device, (CARD_X, CARD_Y))

    # Footer
    footer_text = "Built for fast field work • Optimised for App Store review"
    footer_w = text_width(draw, footer_text, footer_font)
    draw.text(((TARGET_SIZE[0] - footer_w) // 2, 2276), footer_text, font=footer_font, fill=(31, 41, 55))

    # Chips
    chips = list(spec["chips"])
    chip_widths = []
    total = 0
    for chip in chips:
        width = text_width(draw, chip, chip_font) + 64
        chip_widths.append(width)
        total += width
    total += 18 * (len(chips) - 1)
    x = (TARGET_SIZE[0] - total) // 2
    y = 2360
    for chip, width in zip(chips, chip_widths):
        draw_chip(draw, x, y, chip, chip_font, spec["accent"])
        x += width + 18

    note = "Portrait 6.7-inch format"
    note_w = text_width(draw, note, footer_font)
    draw.text(((TARGET_SIZE[0] - note_w) // 2, 2518), note, font=footer_font, fill=(71, 85, 105))

    canvas.convert("RGB").save(output_path, format="PNG", optimize=True)

for spec in FILES:
    compose(spec)

print(f"created {len(FILES)} promotional screenshots in {OUTPUT_DIR}")
