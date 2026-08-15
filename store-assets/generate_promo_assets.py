#!/usr/bin/env python3
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_rounded_mask(size, radius):
    mask = Image.new('L', size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), size], radius=radius, fill=255)
    return mask

def add_drop_shadow(image, offset=(0, 15), shadow_color=(0, 0, 0, 180), border=35, iterations=22):
    total_w = image.width + border * 2
    total_h = image.height + border * 2
    
    shadow = Image.new('RGBA', (image.width, image.height), shadow_color)
    mask = image.split()[3] if image.mode == 'RGBA' else None
    
    shadow_layer = Image.new('RGBA', (total_w, total_h), (0, 0, 0, 0))
    shadow_layer.paste(shadow, (border + offset[0], border + offset[1]), mask=mask)
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(iterations))
    
    shadow_layer.paste(image, (border, border), mask=mask)
    return shadow_layer

def prepare_clean_crops():
    if os.path.exists('store-assets/base_1_multi_ai.png'):
        im1 = Image.open('store-assets/base_1_multi_ai.png')
        # Clean crop avoiding any edge artifacts (trimmed bottom 25px)
        widget_crop = im1.crop((2000, 465, 3020, 1865))
        widget_crop.save('store-assets/real_widget_clean.png')

    if os.path.exists('store-assets/base_4_popup_settings.png'):
        im4 = Image.open('store-assets/base_4_popup_settings.png')
        popup_crop = im4.crop((1985, 235, 2775, 1435))
        popup_crop.save('store-assets/real_popup_clean.png')

def generate_marquee():
    w, h = 1400, 560
    base = Image.new('RGBA', (w, h), (8, 12, 24, 255))
    
    # 1. Background gradient
    bg_draw = ImageDraw.Draw(base)
    for x in range(w):
        factor = x / w
        r = int(6 + (16 - 6) * factor)
        g = int(9 + (24 - 9) * factor)
        b = int(18 + (48 - 18) * factor)
        bg_draw.line([(x, 0), (x, h)], fill=(r, g, b, 255))
        
    # Ambient glows
    glow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([(800, 20), (1450, 540)], fill=(59, 130, 246, 55))
    glow_draw.ellipse([(80, 50), (600, 480)], fill=(124, 58, 237, 35))
    glow = glow.filter(ImageFilter.GaussianBlur(60))
    base = Image.alpha_composite(base, glow)
    
    draw = ImageDraw.Draw(base)
    
    # Fonts
    try:
        font_title = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 48)
        font_sub = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 24)
        font_badge = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 13)
        font_head = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 17)
        font_desc = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 15)
        font_pill = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 13)
    except:
        font_title = ImageFont.load_default()
        font_sub = font_title
        font_badge = font_title
        font_head = font_title
        font_desc = font_title
        font_pill = font_title
        
    # Badge
    draw.rounded_rectangle([(70, 50), (255, 82)], radius=16, fill=(30, 58, 138, 220), outline=(96, 165, 250, 240), width=1)
    draw.polygon([(86, 68), (92, 58), (96, 64), (102, 64), (94, 76), (95, 68)], fill=(96, 165, 250, 255))
    draw.text((108, 58), "CHROME EXTENSION", font=font_badge, fill=(224, 242, 254, 255))
    
    # Title
    draw.text((70, 102), "SpectraLens AI", font=font_title, fill=(255, 255, 255, 255))
    
    # Subtitle
    draw.text((70, 164), "Multi-AI Search & On-Page Screen OCR", font=font_sub, fill=(56, 189, 248, 255))
    
    # Feature 1
    draw.ellipse([(70, 226), (82, 238)], fill=(56, 189, 248, 255))
    draw.text((94, 222), "Side-by-Side Multi-AI Answers", font=font_head, fill=(241, 245, 249, 255))
    draw.text((94, 248), "Query Google AI, Bing Copilot, Gemini & Perplexity simultaneously.", font=font_desc, fill=(148, 163, 184, 255))
    
    # Feature 2
    draw.ellipse([(70, 292), (82, 304)], fill=(168, 85, 247, 255))
    draw.text((94, 288), "Private On-Device Area OCR", font=font_head, fill=(241, 245, 249, 255))
    draw.text((94, 314), "Crop any screen area to extract text from math puzzles, images & videos.", font=font_desc, fill=(148, 163, 184, 255))
    
    # Feature 3
    draw.ellipse([(70, 358), (82, 370)], fill=(52, 211, 153, 255))
    draw.text((94, 354), "Floating In-Page Assistant", font=font_head, fill=(241, 245, 249, 255))
    draw.text((94, 380), "Instant answers on any webpage without switching tabs or context.", font=font_desc, fill=(148, 163, 184, 255))
    
    # Feature Badges
    pills = [("Google AI", (66, 133, 244)), ("Bing Copilot", (0, 164, 239)), ("Gemini", (142, 117, 255)), ("Perplexity", (32, 178, 170)), ("100% Private", (52, 211, 153))]
    px = 70
    for text, dot_color in pills:
        pw = len(text) * 8 + 36
        draw.rounded_rectangle([(px, 442), (px + pw, 478)], radius=12, fill=(15, 23, 42, 220), outline=(51, 65, 85, 255), width=1)
        draw.ellipse([(px + 12, 456), (px + 20, 464)], fill=dot_color)
        draw.text((px + 26, 452), text, font=font_pill, fill=(224, 242, 254, 255))
        px += pw + 12

    # Right Content: Real Assistant Widget
    if os.path.exists('store-assets/real_widget_clean.png'):
        widget = Image.open('store-assets/real_widget_clean.png').convert('RGBA')
        
        target_h = 475
        scale = target_h / widget.height
        target_w = int(widget.width * scale)
        widget = widget.resize((target_w, target_h), Image.LANCZOS)
        
        mask = create_rounded_mask((target_w, target_h), 18)
        rounded_widget = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
        rounded_widget.paste(widget, (0, 0), mask=mask)
        
        border_draw = ImageDraw.Draw(rounded_widget)
        border_draw.rounded_rectangle([(0, 0), (target_w-1, target_h-1)], radius=18, outline=(96, 165, 250, 180), width=2)
        
        widget_with_shadow = add_drop_shadow(rounded_widget, offset=(0, 12), iterations=24, border=40)
        
        pos_x = w - target_w - 70 - 40
        pos_y = (h - target_h) // 2 - 40
        base.paste(widget_with_shadow, (pos_x, pos_y), mask=widget_with_shadow)
        
    base.save('store-assets/marquee-1400x560.png')
    print("Marquee 1400x560 regenerated.")

def generate_promo_tile():
    w, h = 440, 280
    base = Image.new('RGBA', (w, h), (8, 12, 24, 255))
    
    bg_draw = ImageDraw.Draw(base)
    for y in range(h):
        factor = y / h
        r = int(10 + (6 - 10) * factor)
        g = int(14 + (8 - 14) * factor)
        b = int(34 + (18 - 34) * factor)
        bg_draw.line([(0, y), (w, y)], fill=(r, g, b, 255))
        
    glow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([(180, 20), (430, 260)], fill=(59, 130, 246, 65))
    glow = glow.filter(ImageFilter.GaussianBlur(35))
    base = Image.alpha_composite(base, glow)
    
    draw = ImageDraw.Draw(base)
    
    try:
        font_title = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 24)
        font_sub = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 12.5)
        font_tag = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 10.5)
        font_desc = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 11.5)
    except:
        font_title = ImageFont.load_default()
        font_sub = font_title
        font_tag = font_title
        font_desc = font_title
        
    draw.rounded_rectangle([(24, 20), (122, 40)], radius=8, fill=(30, 58, 138, 220), outline=(96, 165, 250, 220), width=1)
    draw.text((32, 24), "AI EXTENSION", font=font_tag, fill=(224, 242, 254, 255))
    
    draw.text((24, 48), "SpectraLens AI", font=font_title, fill=(255, 255, 255, 255))
    draw.text((24, 78), "Multi-AI Search & Screen OCR", font=font_sub, fill=(56, 189, 248, 255))
    
    engines = [("Google AI Overview", (66, 133, 244)), ("Bing AI Copilot", (0, 164, 239)), ("Google Gemini", (142, 117, 255)), ("Perplexity AI", (32, 178, 170))]
    ey = 106
    for eng, color in engines:
        draw.ellipse([(24, ey + 3), (30, ey + 9)], fill=color)
        draw.text((36, ey), eng, font=font_desc, fill=(203, 213, 225, 255))
        ey += 20
    
    draw.rounded_rectangle([(24, 222), (210, 250)], radius=10, fill=(15, 23, 42, 230), outline=(59, 130, 246, 200), width=1)
    draw.text((34, 230), "Instant In-Page Assistant", font=font_tag, fill=(147, 197, 253, 255))

    if os.path.exists('store-assets/real_widget_clean.png'):
        widget = Image.open('store-assets/real_widget_clean.png').convert('RGBA')
        target_h = 245
        scale = target_h / widget.height
        target_w = int(widget.width * scale)
        widget = widget.resize((target_w, target_h), Image.LANCZOS)
        
        mask = create_rounded_mask((target_w, target_h), 12)
        rounded_widget = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
        rounded_widget.paste(widget, (0, 0), mask=mask)
        
        border_draw = ImageDraw.Draw(rounded_widget)
        border_draw.rounded_rectangle([(0, 0), (target_w-1, target_h-1)], radius=12, outline=(96, 165, 250, 180), width=1)
        
        widget_with_shadow = add_drop_shadow(rounded_widget, offset=(0, 6), iterations=15, border=25)
        
        pos_x = w - target_w - 18 - 25
        pos_y = (h - target_h) // 2 - 25
        base.paste(widget_with_shadow, (pos_x, pos_y), mask=widget_with_shadow)
        
    base.save('store-assets/promo-tile-440x280.png')
    print("Promo tile 440x280 regenerated.")

if __name__ == '__main__':
    prepare_clean_crops()
    generate_marquee()
    generate_promo_tile()
