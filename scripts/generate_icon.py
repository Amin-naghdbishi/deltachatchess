#!/usr/bin/env python3
"""
Generate a high-resolution, modern app icon (public/icon.png)
in the exact style of the chess avatars:
A bold, majestic chess Knight on a deep navy/slate gradient background
with golden highlights, clean curves, and subtle glows.
"""

from PIL import Image, ImageDraw, ImageFilter
import math
import os

SIZE = 512
SCALE = 2  # Super-sampling for perfect anti-aliased edges
CANVAS_SIZE = SIZE * SCALE

# Create canvas
img = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Center and radius for squircle / circle
cx, cy = CANVAS_SIZE // 2, CANVAS_SIZE // 2
radius = int(CANVAS_SIZE * 0.46)

# 1. Subtle Outer Drop Shadow
shadow_img = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
shadow_draw = ImageDraw.Draw(shadow_img)
shadow_draw.ellipse(
    [cx - radius + 10, cy - radius + 24, cx + radius + 10, cy + radius + 24],
    fill=(0, 0, 0, 140)
)
shadow_img = shadow_img.filter(ImageFilter.GaussianBlur(30))
img.paste(shadow_img, (0, 0), shadow_img)

# 2. Main Circular Background with vertical linear gradient (Deep Navy to Slate Obsidian)
bg_mask = Image.new("L", (CANVAS_SIZE, CANVAS_SIZE), 0)
bg_mask_draw = ImageDraw.Draw(bg_mask)
bg_mask_draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=255)

bg_gradient = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
top_color = (26, 42, 74)     # Deep Royal Navy #1a2a4a
bottom_color = (12, 18, 30)  # Dark Obsidian #0c121e

for y in range(cy - radius, cy + radius):
    factor = (y - (cy - radius)) / (2 * radius)
    r = int(top_color[0] + (bottom_color[0] - top_color[0]) * factor)
    g = int(top_color[1] + (bottom_color[1] - top_color[1]) * factor)
    b = int(top_color[2] + (bottom_color[2] - top_color[2]) * factor)
    line = Image.new("RGBA", (CANVAS_SIZE, 1), (r, g, b, 255))
    bg_gradient.paste(line, (0, y))

img.paste(bg_gradient, (0, 0), bg_mask)

# 3. Inner Ring Glow (Subtle gold / teal rim)
rim_img = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
rim_draw = ImageDraw.Draw(rim_img)
rim_draw.ellipse(
    [cx - radius + 4, cy - radius + 4, cx + radius - 4, cy + radius - 4],
    outline=(251, 191, 36, 60),
    width=6
)
img.paste(rim_img, (0, 0), rim_img)

# 4. Draw Chess Knight (Stylized, powerful, modern avatar style)
# Normalize coordinates from 0-100 to canvas space centered at (cx, cy)
SCALE_FACTOR = (radius * 1.5) / 100.0

def map_pt(x, y):
    bx = cx - (50 * SCALE_FACTOR)
    by = cy - (48 * SCALE_FACTOR)
    return (bx + x * SCALE_FACTOR, by + y * SCALE_FACTOR)

# Knight body polygon points (modern bold knight)
knight_pts = [
    map_pt(26, 82),
    map_pt(32, 60),
    map_pt(40, 48),
    map_pt(43, 36),
    map_pt(38, 20),
    map_pt(46, 17),
    map_pt(54, 23),
    map_pt(60, 19),
    map_pt(65, 23),
    map_pt(70, 31),
    map_pt(67, 42),
    map_pt(74, 48),
    map_pt(78, 54),
    map_pt(77, 61),
    map_pt(71, 63),
    map_pt(65, 62),
    map_pt(57, 59),
    map_pt(52, 62),
    map_pt(49, 74),
    map_pt(48, 82),
]

# Knight Pedestal Base
pedestal_pts = [
    map_pt(22, 82),
    map_pt(22, 86),
    map_pt(78, 86),
    map_pt(78, 82),
]
pedestal_rim = [
    map_pt(20, 86),
    map_pt(20, 91),
    map_pt(80, 91),
    map_pt(80, 86),
]

# Create Knight silhouette with Gold Gradient
gold_top = (254, 240, 138)  # Bright amber gold #fef08a
gold_mid = (245, 158, 11)   # Rich gold #f59e0b
gold_bot = (180, 83, 9)     # Deep bronze #b45309

knight_mask = Image.new("L", (CANVAS_SIZE, CANVAS_SIZE), 0)
km_draw = ImageDraw.Draw(knight_mask)
km_draw.polygon(knight_pts, fill=255)
km_draw.polygon(pedestal_pts, fill=255)
km_draw.polygon(pedestal_rim, fill=255)

# Add subtle knight shadow
k_shadow = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
ks_draw = ImageDraw.Draw(k_shadow)
ks_draw.polygon([(pt[0] + 6, pt[1] + 12) for pt in knight_pts], fill=(0, 0, 0, 160))
ks_draw.polygon([(pt[0] + 6, pt[1] + 12) for pt in pedestal_pts], fill=(0, 0, 0, 160))
ks_draw.polygon([(pt[0] + 6, pt[1] + 12) for pt in pedestal_rim], fill=(0, 0, 0, 160))
k_shadow = k_shadow.filter(ImageFilter.GaussianBlur(16))
img.paste(k_shadow, (0, 0), k_shadow)

knight_grad = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
min_y = int(cy - radius * 0.72)
max_y = int(cy + radius * 0.72)
span_y = max_y - min_y

for y in range(min_y, max_y):
    t = max(0.0, min(1.0, (y - min_y) / span_y))
    if t < 0.5:
        sub_t = t / 0.5
        r = int(gold_top[0] + (gold_mid[0] - gold_top[0]) * sub_t)
        g = int(gold_top[1] + (gold_mid[1] - gold_top[1]) * sub_t)
        b = int(gold_top[2] + (gold_mid[2] - gold_top[2]) * sub_t)
    else:
        sub_t = (t - 0.5) / 0.5
        r = int(gold_mid[0] + (gold_bot[0] - gold_mid[0]) * sub_t)
        g = int(gold_mid[1] + (gold_bot[1] - gold_mid[1]) * sub_t)
        b = int(gold_mid[2] + (gold_bot[2] - gold_mid[2]) * sub_t)
    line = Image.new("RGBA", (CANVAS_SIZE, 1), (r, g, b, 255))
    knight_grad.paste(line, (0, y))

img.paste(knight_grad, (0, 0), knight_mask)

# 5. Knight Details (Eye, Mane cuts, Snout line, Muzzle contour)
details_draw = ImageDraw.Draw(img)

# Mane groove lines
m1 = [map_pt(38, 30), map_pt(47, 36), map_pt(43, 46)]
m2 = [map_pt(33, 43), map_pt(44, 49), map_pt(40, 58)]
m3 = [map_pt(30, 56), map_pt(39, 62), map_pt(36, 70)]

for line_pts in [m1, m2, m3]:
    details_draw.line(line_pts, fill=(146, 64, 14, 240), width=int(3 * SCALE))

# Snout mouth line
mouth = [map_pt(74, 55), map_pt(67, 56)]
details_draw.line(mouth, fill=(146, 64, 14, 240), width=int(2.5 * SCALE))

# Eye
eye_center = map_pt(54, 34)
eye_r = int(4 * SCALE)
details_draw.ellipse(
    [eye_center[0] - eye_r, eye_center[1] - eye_r, eye_center[0] + eye_r, eye_center[1] + eye_r],
    fill=(15, 23, 42, 255)
)
# Eye highlight
h_r = int(1.4 * SCALE)
details_draw.ellipse(
    [eye_center[0] + 1 - h_r, eye_center[1] - 1 - h_r, eye_center[0] + 1 + h_r, eye_center[1] - 1 + h_r],
    fill=(255, 255, 255, 255)
)

# Pedestal line accent
p_line = [map_pt(22, 86), map_pt(78, 86)]
details_draw.line(p_line, fill=(254, 240, 138, 180), width=int(2 * SCALE))

# 6. Downsample using Lanczos for crisp antialiasing
final_img = img.resize((SIZE, SIZE), Image.Resampling.LANCZOS)

# Save to public/icon.png and dist/icon.png
out_public = os.path.join(os.path.dirname(__file__), "..", "public", "icon.png")
out_dist = os.path.join(os.path.dirname(__file__), "..", "dist", "icon.png")

final_img.save(out_public, "PNG")
if os.path.exists(os.path.dirname(out_dist)):
    final_img.save(out_dist, "PNG")

print(f"Generated {SIZE}x{SIZE} modern chess icon at {out_public}")
