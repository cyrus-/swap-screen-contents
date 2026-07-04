#!/usr/bin/env python3
# Generate SVG art for the "Swap Screen Contents" KDE Store listing.
import os

OUT = os.path.expanduser("~/Drive/projects/swap-screen-contents/assets")
os.makedirs(OUT, exist_ok=True)

# Breeze-ish palette
BG0, BG1 = "#232629", "#16181a"
SCREEN = "#31363b"
BEZEL  = "#0f1113"
WIN    = "#eff0f1"
BLUE   = "#3daee9"
ORANGE = "#f67400"
GREEN  = "#2ecc71"
TEXT   = "#ffffff"
MUTED  = "#9aa2ad"
ARROW  = "#3daee9"

def rrect(x, y, w, h, r, fill, stroke=None, sw=0, extra=""):
    s = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" ry="{r}" fill="{fill}"'
    if stroke: s += f' stroke="{stroke}" stroke-width="{sw}"'
    return s + f' {extra}/>'

def window(x, y, w, h, accent):
    """A little window: light body + colored title bar + 3 dots."""
    r = 6
    tb = max(12, int(h*0.26))
    parts = [rrect(x, y, w, h, r, WIN)]
    # title bar (rounded top only -> draw full rrect accent then body over lower part)
    parts.append(f'<path d="M{x+r},{y} h{w-2*r} a{r},{r} 0 0 1 {r},{r} v{tb-r} h{-w} v{-(tb-r)} a{r},{r} 0 0 1 {r},{-r} z" fill="{accent}"/>')
    # dots
    cy = y + tb/2
    for i in range(3):
        parts.append(f'<circle cx="{x+10+i*11}" cy="{cy:.1f}" r="2.6" fill="{WIN}" opacity="0.9"/>')
    return "".join(parts)

def monitor(cx, top, sw, sh, accents, panel=False):
    """Screen (centered at cx, top edge=top) + neck + base. accents = list of window colors."""
    sx = cx - sw/2
    parts = [rrect(sx-6, top-6, sw+12, sh+12, 16, BEZEL)]      # bezel
    parts.append(rrect(sx, top, sw, sh, 11, SCREEN))
    pad = 12
    iy = top + pad
    ih = sh - 2*pad
    if panel:  # thin taskbar strip at top of the screen -> reduces usable height
        parts.append(rrect(sx+pad, top+pad, sw-2*pad, 12, 4, "#3b4045"))
        iy += 18; ih -= 18
    n = len(accents)
    gap = 12
    ww = (sw - 2*pad - (n-1)*gap) / n
    for i, a in enumerate(accents):
        wx = sx + pad + i*(ww+gap)
        parts.append(window(wx, iy, ww, ih, a))
    # neck + base
    ncx = cx
    parts.append(rrect(ncx-9, top+sh, 18, 16, 3, BEZEL))
    parts.append(rrect(ncx-46, top+sh+14, 92, 12, 6, BEZEL))
    return "".join(parts)

def swap_arrows(cx, cy, span, thick, color, mid, bow):
    """Two curved arrows forming a vertical exchange, centered at (cx,cy).
    Each bezier arrives vertically at its tip; arrowheads are SVG markers with
    orient=auto so they always align to the curve. mid = half-gap between the two
    vertical tips; bow = how far each arrow arches outward."""
    top = cy - span/2
    bot = cy + span/2
    x1 = cx - mid        # up-arrow tip column (left)
    x2 = cx + mid        # down-arrow tip column (right)
    d = span * 0.34      # control offset that forces a vertical tangent at the tip
    mw = thick * 2.6     # arrowhead size (user units)
    mkid = "ah" + color.lstrip('#')
    marker = (f'<defs><marker id="{mkid}" markerUnits="userSpaceOnUse" '
              f'markerWidth="{mw}" markerHeight="{mw}" viewBox="0 0 10 10" refX="6.2" refY="5" '
              f'orient="auto"><path d="M0.5,1 L9.3,5 L0.5,9 L3.4,5 Z" fill="{color}"/></marker></defs>')
    # up arrow: bottom -> top, bows left, tangent vertical at the top tip
    up = (f'<path d="M{x1},{bot} C{x1-bow},{cy} {x1},{top+d} {x1},{top}" '
          f'fill="none" stroke="{color}" stroke-width="{thick}" stroke-linecap="butt" '
          f'marker-end="url(#{mkid})"/>')
    # down arrow: top -> bottom, bows right, tangent vertical at the bottom tip
    dn = (f'<path d="M{x2},{top} C{x2+bow},{cy} {x2},{bot-d} {x2},{bot}" '
          f'fill="none" stroke="{color}" stroke-width="{thick}" stroke-linecap="butt" '
          f'marker-end="url(#{mkid})"/>')
    return marker + up + dn

# ---------- LOGO 512x512 ----------
def logo():
    W = 512
    body = []
    body.append(f'''<defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="{BG0}"/><stop offset="1" stop-color="{BG1}"/>
      </linearGradient></defs>''')
    body.append(rrect(0, 0, W, W, 112, "url(#bg)"))
    body.append(monitor(256, 92, 300, 104, [BLUE, ORANGE]))
    body.append(monitor(256, 320, 300, 104, [ORANGE, BLUE]))
    body.append(swap_arrows(256, 268, span=96, thick=15, color=WIN, mid=9, bow=44))
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{W}" viewBox="0 0 {W} {W}">' + "".join(body) + '</svg>'
    open(f"{OUT}/logo.svg", "w").write(svg)

# ---------- GALLERY 1280x720 ----------
def gallery():
    W, H = 1280, 720
    b = []
    b.append(f'''<defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="{BG0}"/><stop offset="1" stop-color="{BG1}"/>
      </linearGradient></defs>''')
    b.append(f'<rect width="{W}" height="{H}" fill="url(#bg)"/>')
    b.append(f'<text x="64" y="86" font-family="Inter" font-weight="700" font-size="54" fill="{TEXT}">Swap Screen Contents</text>')
    b.append(f'<text x="66" y="126" font-family="Inter" font-weight="400" font-size="24" fill="{MUTED}">One keystroke swaps the windows between your monitors — respecting per-screen virtual desktops.</text>')

    def group(cx, label, top_acc, bot_acc):
        g = [f'<text x="{cx}" y="204" font-family="Inter" font-weight="600" font-size="26" fill="{MUTED}" text-anchor="middle">{label}</text>']
        g.append(monitor(cx, 236, 250, 118, top_acc, panel=True))
        g.append(monitor(cx, 452, 250, 118, bot_acc))
        return "".join(g)

    b.append(group(300, "BEFORE", [BLUE, ORANGE], [GREEN, BLUE]))
    b.append(group(980, "AFTER",  [GREEN, BLUE], [BLUE, ORANGE]))
    # center swap glyph + caption
    b.append(swap_arrows(640, 400, span=150, thick=18, color=ARROW, mid=12, bow=64))
    b.append(f'<text x="640" y="512" font-family="Inter" font-weight="600" font-size="22" fill="{TEXT}" text-anchor="middle">one keystroke</text>')
    b.append(f'<text x="{W-64}" y="{H-34}" font-family="Inter" font-weight="400" font-size="20" fill="{MUTED}" text-anchor="end">github.com/cyrus-/swap-screen-contents</text>')
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">' + "".join(b) + '</svg>'
    open(f"{OUT}/gallery.svg", "w").write(svg)

logo(); gallery()
print("wrote", OUT)
