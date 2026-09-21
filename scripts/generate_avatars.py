#!/usr/bin/env python3
import os

AVATARS_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'avatars')
os.makedirs(AVATARS_DIR, exist_ok=True)

# 8 stylish, modern, high-contrast SVG avatars designed for chess profile pictures
AVATARS = {
    "king.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg-king" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="50" fill="url(#bg-king)"/>
  <!-- Cross -->
  <path d="M47 18 h6 v8 h-6 z M43 21 h14 v4 h-14 z" fill="url(#gold)"/>
  <!-- Crown Base & Spikes -->
  <path d="M22 68 L28 36 L40 50 L50 32 L60 50 L72 36 L78 68 Z" fill="url(#gold)" stroke="#b45309" stroke-width="2" stroke-linejoin="round"/>
  <!-- Crown Band Jewels -->
  <rect x="22" y="68" width="56" height="12" rx="3" fill="#b45309"/>
  <circle cx="32" cy="74" r="3" fill="#ffffff"/>
  <circle cx="50" cy="74" r="3.5" fill="#fef08a"/>
  <circle cx="68" cy="74" r="3" fill="#ffffff"/>
</svg>''',

    "knight.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg-knight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#065f46"/>
      <stop offset="100%" stop-color="#022c22"/>
    </linearGradient>
    <linearGradient id="emerald" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6ee7b7"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="50" fill="url(#bg-knight)"/>
  <!-- Stylized Horse Silhouette -->
  <path d="M30 80 Q32 60 42 46 Q45 35 40 22 Q48 20 54 26 Q60 22 64 26 C68 32 65 42 72 48 C76 52 75 58 68 60 C64 61 58 56 54 58 C48 62 48 74 46 80 Z" fill="url(#emerald)"/>
  <!-- Eye -->
  <circle cx="52" cy="36" r="3" fill="#022c22"/>
  <circle cx="53" cy="35" r="1" fill="#ffffff"/>
  <!-- Mane details -->
  <path d="M38 32 Q45 38 42 46 M34 44 Q42 50 38 58" stroke="#047857" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>''',

    "queen.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg-queen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#581c87"/>
      <stop offset="100%" stop-color="#2e1065"/>
    </linearGradient>
    <linearGradient id="pink-glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f472b6"/>
      <stop offset="100%" stop-color="#c084fc"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="50" fill="url(#bg-queen)"/>
  <!-- Queen Tiara -->
  <circle cx="20" cy="38" r="4" fill="url(#pink-glow)"/>
  <circle cx="35" cy="28" r="4.5" fill="url(#pink-glow)"/>
  <circle cx="50" cy="22" r="5.5" fill="#fdf2f8"/>
  <circle cx="65" cy="28" r="4.5" fill="url(#pink-glow)"/>
  <circle cx="80" cy="38" r="4" fill="url(#pink-glow)"/>
  <!-- Crown Web -->
  <path d="M18 72 L20 42 L35 60 L50 28 L65 60 L80 42 L82 72 Z" fill="url(#pink-glow)" stroke="#9333ea" stroke-width="2"/>
  <rect x="18" y="72" width="64" height="10" rx="4" fill="#fae8ff"/>
</svg>''',

    "rook.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg-rook" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="silver" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="50" fill="url(#bg-rook)"/>
  <!-- Castle Turrets -->
  <path d="M26 26 h12 v10 h8 v-10 h8 v10 h8 v-10 h12 v18 h-48 Z" fill="url(#silver)"/>
  <!-- Castle Wall Body -->
  <path d="M30 44 L34 72 h32 L70 44 Z" fill="url(#silver)"/>
  <!-- Castle Base -->
  <rect x="24" y="72" width="52" height="10" rx="3" fill="#64748b"/>
  <!-- Window Arrow Slit -->
  <rect x="47" y="50" width="6" height="14" rx="3" fill="#1e293b"/>
</svg>''',

    "bishop.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg-bishop" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#78350f"/>
      <stop offset="100%" stop-color="#451a03"/>
    </linearGradient>
    <linearGradient id="amber" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde68a"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="50" fill="url(#bg-bishop)"/>
  <!-- Bishop Hat Orb -->
  <circle cx="50" cy="22" r="4.5" fill="#fef3c7"/>
  <!-- Mitre Headpiece -->
  <path d="M30 70 C28 50 36 34 50 28 C64 34 72 50 70 70 Z" fill="url(#amber)"/>
  <!-- Diagonal Mitre Slash -->
  <path d="M42 34 L58 52" stroke="#78350f" stroke-width="4" stroke-linecap="round"/>
  <!-- Base collar -->
  <rect x="28" y="70" width="44" height="10" rx="4" fill="#b45309"/>
</svg>''',

    "pawn.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg-pawn" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
    <linearGradient id="cyan-glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e0f2fe"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="50" fill="url(#bg-pawn)"/>
  <!-- Pawn Head Sphere -->
  <circle cx="50" cy="36" r="16" fill="url(#cyan-glow)"/>
  <!-- Neck Ring -->
  <ellipse cx="50" cy="54" rx="14" ry="4" fill="#0284c7"/>
  <!-- Base Body -->
  <path d="M40 56 Q32 72 26 78 h48 Q68 72 60 56 Z" fill="url(#cyan-glow)"/>
  <!-- Pedestal -->
  <rect x="22" y="78" width="56" height="8" rx="3" fill="#075985"/>
</svg>''',

    "bot.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg-bot" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181b"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>
    <linearGradient id="neon" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4ade80"/>
      <stop offset="100%" stop-color="#22c55e"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="50" fill="url(#bg-bot)"/>
  <!-- Antenna -->
  <line x1="50" y1="14" x2="50" y2="24" stroke="#71717a" stroke-width="4"/>
  <circle cx="50" cy="14" r="4.5" fill="url(#neon)"/>
  <!-- Robot Head Box -->
  <rect x="24" y="24" width="52" height="42" rx="10" fill="#27272a" stroke="#3f3f46" stroke-width="3"/>
  <!-- Visor Screen -->
  <rect x="30" y="32" width="40" height="18" rx="5" fill="#09090b"/>
  <!-- Glowing Eyes -->
  <circle cx="40" cy="41" r="4.5" fill="url(#neon)"/>
  <circle cx="60" cy="41" r="4.5" fill="url(#neon)"/>
  <!-- Robot Mouth Grid -->
  <line x1="38" y1="56" x2="62" y2="56" stroke="url(#neon)" stroke-width="2.5" stroke-dasharray="3,2"/>
  <!-- Neck Joints -->
  <rect x="42" y="66" width="16" height="16" rx="2" fill="#3f3f46"/>
</svg>''',

    "cat.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg-cat" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ea580c"/>
      <stop offset="100%" stop-color="#9a3412"/>
    </linearGradient>
    <linearGradient id="cat-fur" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fed7aa"/>
      <stop offset="100%" stop-color="#fb923c"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="50" fill="url(#bg-cat)"/>
  <!-- Ears -->
  <polygon points="22,46 32,20 48,36" fill="url(#cat-fur)"/>
  <polygon points="78,46 68,20 52,36" fill="url(#cat-fur)"/>
  <polygon points="27,42 33,26 44,36" fill="#f43f5e"/>
  <polygon points="73,42 67,26 56,36" fill="#f43f5e"/>
  <!-- Face -->
  <ellipse cx="50" cy="56" rx="28" ry="24" fill="url(#cat-fur)"/>
  <!-- Big Eyes -->
  <ellipse cx="38" cy="50" rx="5" ry="7" fill="#1e293b"/>
  <ellipse cx="62" cy="50" rx="5" ry="7" fill="#1e293b"/>
  <circle cx="36.5" cy="48" r="2" fill="#ffffff"/>
  <circle cx="60.5" cy="48" r="2" fill="#ffffff"/>
  <!-- Nose and Mouth -->
  <polygon points="48,60 52,60 50,63" fill="#f43f5e"/>
  <path d="M45 65 Q50 69 55 65" stroke="#7c2d12" stroke-width="2" fill="none"/>
  <!-- Whiskers -->
  <line x1="24" y1="56" x2="12" y2="53" stroke="#fed7aa" stroke-width="1.8"/>
  <line x1="24" y1="61" x2="14" y2="63" stroke="#fed7aa" stroke-width="1.8"/>
  <line x1="76" y1="56" x2="88" y2="53" stroke="#fed7aa" stroke-width="1.8"/>
  <line x1="76" y1="61" x2="86" y2="63" stroke="#fed7aa" stroke-width="1.8"/>
</svg>'''
}

for name, svg_content in AVATARS.items():
    path = os.path.join(AVATARS_DIR, name)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print(f"Generated avatar: {name}")

print("All 8 chess avatars generated successfully!")
