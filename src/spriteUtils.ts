// 分层精灵合成 + 换色工具
// global.png 是 Cozy People 分层精灵表：256×384，32×32 格 = 8列 × 12行。
// 每个部件占 2 行（两个方向，互为镜像），我们只用每对的第一行 + CSS 水平翻转做另一方向。
// 层序（行号）：身体0 / 头发2 / 上衣4 / 裤子6 / 鞋8 / 帽10。每行 8 帧走路循环。
import spriteSheetUrl from './global.png';

export const CELL = 32;
export const FRAMES = 8;
export const STRIP_W = CELL * FRAMES; // 256
export const STRIP_H = CELL; // 32

// 各部件在精灵表里的起始行（取镜像对的第一行）
const LAYER_ROW = {
  body: 0,
  hair: 2,
  top: 4,
  pants: 6,
  shoes: 8,
  hat: 10,
} as const;

export interface Appearance {
  hair: string;       // 发色 (hex)
  hair2?: string;     // 半半发色：右半边的颜色（可选）
  top: string;        // 上衣
  pants: string;      // 裤子
  shoes: string;      // 鞋
  hat?: string;       // 帽子（有则显示）
}

// ---------- 颜色工具 ----------
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// 把一层像素重新着色：替换色相/饱和度，保留原有明度（保留描边与阴影层次）
function recolorInPlace(data: Uint8ClampedArray, target: string, target2?: string) {
  const [th, ts] = rgbToHsl(...hexToRgb(target));
  const alt = target2 ? rgbToHsl(...hexToRgb(target2)) : null;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 10) continue;
    const [, , l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    // 半半发色：像素在格子右半边用第二色
    let hh = th, ss = ts;
    if (alt) {
      const px = (i / 4) % STRIP_W;      // 整条 strip 的 x
      const inCell = px % CELL;          // 格子内 x (0..31)
      if (inCell >= CELL / 2) { hh = alt[0]; ss = alt[1]; }
    }
    const [r, g, b] = hslToRgb(hh, ss, l);
    data[i] = r; data[i + 1] = g; data[i + 2] = b;
  }
}

// ---------- 加载 & 合成 ----------
let sheetPromise: Promise<HTMLImageElement> | null = null;
export function loadSpriteSheet(): Promise<HTMLImageElement> {
  if (!sheetPromise) {
    sheetPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = spriteSheetUrl;
    });
  }
  return sheetPromise;
}

function layerStrip(sheet: HTMLImageElement, row: number, recolor?: { c: string; c2?: string }): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = STRIP_W; cv.height = STRIP_H;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, 0, row * CELL, STRIP_W, STRIP_H, 0, 0, STRIP_W, STRIP_H);
  if (recolor) {
    const id = ctx.getImageData(0, 0, STRIP_W, STRIP_H);
    recolorInPlace(id.data, recolor.c, recolor.c2);
    ctx.putImageData(id, 0, 0);
  }
  return cv;
}

const stripCache = new Map<string, string>();

// 合成一条 8 帧走路 strip（面朝右），返回 dataURL
export function buildSpriteStrip(sheet: HTMLImageElement, a: Appearance): string {
  const key = JSON.stringify(a);
  const cached = stripCache.get(key);
  if (cached) return cached;

  const out = document.createElement('canvas');
  out.width = STRIP_W; out.height = STRIP_H;
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // 顺序：身体 → 头发 → 上衣 → 裤子 → 鞋 → 帽
  ctx.drawImage(layerStrip(sheet, LAYER_ROW.body), 0, 0);
  ctx.drawImage(layerStrip(sheet, LAYER_ROW.hair, { c: a.hair, c2: a.hair2 }), 0, 0);
  ctx.drawImage(layerStrip(sheet, LAYER_ROW.top, { c: a.top }), 0, 0);
  ctx.drawImage(layerStrip(sheet, LAYER_ROW.pants, { c: a.pants }), 0, 0);
  ctx.drawImage(layerStrip(sheet, LAYER_ROW.shoes, { c: a.shoes }), 0, 0);
  if (a.hat) ctx.drawImage(layerStrip(sheet, LAYER_ROW.hat, { c: a.hat }), 0, 0);

  const url = out.toDataURL();
  stripCache.set(key, url);
  return url;
}

// ---------- 依据成员生成稳定外观 ----------
const HAIR = ['#2b2320', '#4a3527', '#6b4a2f', '#8a5a3a', '#c98b4a', '#d9b382', '#e8c9a0', '#7a3b3b', '#3a3a4a', '#b56b8a'];
const HAIR2 = ['#c98b4a', '#b56b8a', '#6a8ac9', '#7ac98a', '#e0a0d0', '#f0d060'];
const TOPS = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#e67e22', '#16a085', '#d63384', '#34495e', '#e84393', '#f39c12'];
const PANTS = ['#2c3e50', '#34495e', '#5d4037', '#455a64', '#37474f', '#6d4c41', '#283593', '#1b2631'];
const SHOES = ['#1c1c1c', '#ecf0f1', '#c0392b', '#f5f5f5', '#3d3d3d'];
const HATS = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c'];

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function getAppearance(seed: string): Appearance {
  const h = hashStr(seed);
  const pick = <T,>(arr: T[], salt: number) => arr[(h >>> salt) % arr.length];
  const halfDye = ((h >>> 20) & 7) === 0; // ~1/8 概率半半发色
  const wearHat = ((h >>> 23) & 7) === 0; // ~1/8 概率戴帽
  return {
    hair: pick(HAIR, 0),
    hair2: halfDye ? pick(HAIR2, 3) : undefined,
    top: pick(TOPS, 6),
    pants: pick(PANTS, 9),
    shoes: pick(SHOES, 12),
    hat: wearHat ? pick(HATS, 15) : undefined,
  };
}

// 玩家外观：偏中性、稳定
export function getPlayerAppearance(seed: string): Appearance {
  const base = getAppearance('player::' + seed);
  return { ...base, top: '#f5f0e8', pants: '#3a3f4a', shoes: '#1c1c1c', hat: undefined, hair2: undefined };
}
