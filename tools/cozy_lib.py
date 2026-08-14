"""Cozy Interior / Town 素材库：统一裁切、拼装工具。
坐标均以 16px 网格为准，来源于逐张网格标定。
"""
from PIL import Image

ROOT = 'cozy'
_cache = {}

def sheet(path):
    if path not in _cache:
        _cache[path] = Image.open(f'{ROOT}/{path}').convert('RGBA')
    return _cache[path]

# ---- 常用表 ----
WALL = 'interior/basics/wallpapers.png'
RUGS = 'interior/basics/rugs.png'
CURTAIN = 'interior/basics/curtains.png'
BEDS = 'interior/furniture/beds.png'
COUCH = 'interior/furniture/couches.png'
CTABLE = 'interior/furniture/couchtables.png'
TABLES = 'interior/furniture/tables.png'
CHAIRS = 'interior/furniture/chairs.png'
STORAGE = 'interior/furniture/storage.png'
DECO = 'interior/furniture/decorations.png'
SHELF = 'interior/furniture/wallshelves.png'
KITCHEN = 'interior/furniture/kitchens_assembled.png'
TOWN_INT = 'town/interior/interior.png'
TOWN_TILES = 'town/tiles/tiles.png'

def cut(path, x, y, w, h):
    """按像素裁一块（不裁边）"""
    return sheet(path).crop((x, y, x + w, y + h))

def obj(path, x, y, w, h):
    """裁一个道具并去掉四周透明边"""
    c = cut(path, x, y, w, h)
    b = c.getbbox()
    return c.crop(b) if b else c

def tile_fill(canvas, tile, x0, y0, x1, y1):
    """用 tile 平铺一块矩形区域（像素坐标）"""
    tw, th = tile.size
    y = y0
    while y < y1:
        x = x0
        while x < x1:
            canvas.alpha_composite(tile, (x, y))
            x += tw
        y += th

# ---- 地板（wallpapers.png 下部，16x16；坐标经无缝平铺检测验证）----
FLOOR = {
    'wood_warm':   (144, 576),
    'wood_red':    (144, 624),
    'wood_plain':  (256, 656),
    'wood_dark':   (160, 592),
    'wood_teal':   (192, 624),
    'wood_olive':  (208, 624),
    'wood_grey':   (176, 592),
    'wood_light':  (256, 576),
    'green_flat':  (288, 656),
    'wood_brown':  (144, 656),
}
def floor(name):
    x, y = FLOOR[name]
    return cut(WALL, x, y, 16, 16)

# ---- 墙纸（wallpapers.png 上部，16x32 一片）----
WALLP = {
    'stripe_rose':   (220, 128),
    'blue_panel':    (364, 0),
    'blue_stripe':   (364, 64),
    'teal_panel':    (268, 288),
    'cream_panel':   (316, 192),
    'cream_wood':    (316, 160),
    'grey_panel':    (316, 384),
    'navy_wood':     (540, 32),
    'plaid_teal':    (428, 256),
}
def wallpaper(name):
    x, y = WALLP[name]
    return cut(WALL, x, y, 16, 32)

def room(cols, rows, floor_name, wall_name, wall_rows=3):
    """生成一个带墙和地板的房间底"""
    cv = Image.new('RGBA', (cols * 16, rows * 16), (0, 0, 0, 0))
    f = floor(floor_name)
    tile_fill(cv, f, 0, 0, cols * 16, rows * 16)
    w = wallpaper(wall_name)
    for tx in range(cols):
        for i in range(0, wall_rows * 16, 32):
            cv.alpha_composite(w, (tx * 16, i))
    return cv

def save(cv, path, scale=4):
    out = cv.resize((cv.width * scale, cv.height * scale), Image.NEAREST)
    out.save(path)
    return out
