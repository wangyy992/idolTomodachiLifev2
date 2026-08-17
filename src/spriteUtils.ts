// Cozy People 多层精灵合成（款式 + 预渲染配色，无需 HSL 换色）
// 每张图层 PNG：宽 = 颜色数 × 256，高 = 128（8 帧走路 × 4 方向）。
// 方向行：0=下(正面) 1=上(背面) 2=左 3=右。颜色块沿 x 平铺，每块 256 宽。
// 合成结果是一张 256×128 的整表，消费方按 (帧=x, 方向=y) 取格。
import {
  HAIR_STYLES, TOP_STYLES, BOTTOM_STYLES, HAIR_COLOR_COUNT, EYE_COLOR_COUNT, TOP_COLOR_COUNT,
  BOTTOM_COLOR_COUNT, SHOE_COLOR_COUNT, SKIN_COUNT, IDOL_LOOK,
} from './appearanceDefaults';

export const CELL = 32;
export const FRAMES = 8;
export const DIRS = 4;
export const SHEET_W = CELL * FRAMES; // 256
export const SHEET_H = CELL * DIRS;   // 128
// 兼容旧引用
export const STRIP_W = SHEET_W;
export const STRIP_H = SHEET_H;

export const DIR = { down: 0, up: 1, left: 2, right: 3 } as const;
export type Facing = keyof typeof DIR;

const BASE = (import.meta as any).env?.BASE_URL || '/';
const url = (p: string) => `${BASE}sprites/${p}`;

export interface Appearance {
  skin: number;          // 0..SKIN_COUNT-1 → char{n}
  eyes: number;          // 眼睛颜色
  hairStyle: string;     // '' = 光头，否则款式名
  hairColor: number;
  top: string;           // 上衣款式（'' = 无；dress/overalls 为连体，盖住腿）
  topColor: number;
  bottom: string;        // 下装款式（'' = 无）
  bottomColor: number;
  shoes: number;         // 鞋颜色（总是穿）
  glasses?: string;      // '', 'glasses', 'glasses_sun'
  hat?: string;          // '', 'hat_lucky', 'hat_cowboy'
  earring?: string;      // '', 'earring_red', ...
  blush?: number;        // -1 无，否则 0..4
  lipstick?: number;     // -1 无，否则 0..4
  beard?: number;        // -1 无，否则颜色
}

// ---------- 图层加载（按 URL 缓存） ----------
const imgCache = new Map<string, Promise<HTMLImageElement>>();
function loadImg(u: string): Promise<HTMLImageElement> {
  let p = imgCache.get(u);
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = u;
    });
    imgCache.set(u, p);
  }
  return p;
}

// 兼容旧接口：以前是先 loadSpriteSheet() 再同步 buildSpriteStrip。
// 现在改成异步 buildSpriteSheet(appearance)，这个 resolve 一个占位以免旧调用崩。
export function loadSpriteSheet(): Promise<null> { return Promise.resolve(null); }

// 每层要画什么：文件 + 选用的颜色块
function layerSpecs(a: Appearance): { u: string; color: number }[] {
  const specs: { u: string; color: number }[] = [];
  specs.push({ u: url(`base/char${clamp(a.skin, 0, SKIN_COUNT - 1) + 1}_walk.png`), color: 0 });
  specs.push({ u: url('eyes/eyes_walk.png'), color: a.eyes });
  if (a.blush != null && a.blush >= 0) specs.push({ u: url('eyes/blush_walk.png'), color: a.blush });
  if (a.lipstick != null && a.lipstick >= 0) specs.push({ u: url('eyes/lipstick_walk.png'), color: a.lipstick });
  if (a.beard != null && a.beard >= 0) specs.push({ u: url('acc/beard_walk.png'), color: a.beard });
  if (a.bottom) specs.push({ u: url(`clothes/${a.bottom}_walk.png`), color: a.bottomColor });
  if (a.top) specs.push({ u: url(`clothes/${a.top}_walk.png`), color: a.topColor });
  specs.push({ u: url('clothes/shoes_walk.png'), color: a.shoes });
  if (a.hairStyle) specs.push({ u: url(`hair/${a.hairStyle}_walk.png`), color: a.hairColor });
  if (a.earring) specs.push({ u: url(`acc/${a.earring}_walk.png`), color: 0 });
  if (a.glasses) specs.push({ u: url(`acc/${a.glasses}_walk.png`), color: 0 });
  if (a.hat) specs.push({ u: url(`acc/${a.hat}_walk.png`), color: 0 });
  return specs;
}

const sheetCache = new Map<string, string>();

// 合成整张 256×128 精灵表（含 4 方向），返回 dataURL
export async function buildSpriteSheet(a: Appearance): Promise<string> {
  const key = JSON.stringify(a);
  const cached = sheetCache.get(key);
  if (cached) return cached;

  const specs = layerSpecs(a);
  const imgs = await Promise.all(specs.map(s => loadImg(s.u).catch(() => null)));

  const cv = document.createElement('canvas');
  cv.width = SHEET_W; cv.height = SHEET_H;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  specs.forEach((s, i) => {
    const img = imgs[i];
    if (!img) return;
    const cols = Math.max(1, Math.round(img.width / SHEET_W)); // 颜色块数
    const c = clamp(s.color, 0, cols - 1);
    ctx.drawImage(img, c * SHEET_W, 0, SHEET_W, SHEET_H, 0, 0, SHEET_W, SHEET_H);
  });

  const out = cv.toDataURL();
  sheetCache.set(key, out);
  return out;
}

function clamp(v: number, lo: number, hi: number) {
  v = Math.round(Number.isFinite(v) ? v : lo);
  return v < lo ? lo : v > hi ? hi : v;
}

// ---------- 随机 / 默认外观 ----------
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function getAppearance(seed: string): Appearance {
  const h = hashStr(seed);
  const at = (salt: number, mod: number) => (h >>> salt) % mod;
  return {
    skin: at(0, SKIN_COUNT),
    eyes: at(3, EYE_COLOR_COUNT),
    hairStyle: HAIR_STYLES[at(6, HAIR_STYLES.length)],
    hairColor: at(9, HAIR_COLOR_COUNT),
    top: TOP_STYLES[at(12, TOP_STYLES.length)],
    topColor: at(15, TOP_COLOR_COUNT),
    bottom: BOTTOM_STYLES[at(17, BOTTOM_STYLES.length)],
    bottomColor: at(19, BOTTOM_COLOR_COUNT),
    shoes: at(21, SHOE_COLOR_COUNT),
    blush: at(23, 5) === 0 ? at(24, 5) : -1,
    lipstick: -1,
    glasses: at(26, 6) === 0 ? 'glasses' : '',
    hat: '',
    earring: '',
    beard: -1,
  };
}

// 玩家默认外观：中性稳定
export function getPlayerAppearance(seed: string): Appearance {
  const base = getAppearance('player::' + seed);
  // 默认：黄皮肤 / 黑头发 / 黑眼睛
  return { ...base, skin: 0, hairColor: 0, eyes: 0, top: 'basic', bottom: 'pants', glasses: '', blush: -1, hat: '', earring: '', beard: -1 };
}

// 爱豆默认外观：优先用还原真人的预设，否则按 id 稳定随机
export function getDefaultAppearance(id: string): Appearance {
  const preset = IDOL_LOOK[id];
  const base = getAppearance(id);
  return preset ? { ...base, ...preset } : base;
}

// 把可能是旧格式/残缺的外观规整成合法 v2；不合法则回退 fallback
export function normalizeAppearance(a: any, fallback: Appearance): Appearance {
  if (a && typeof a.skin === 'number' && typeof a.hairStyle === 'string' && typeof a.top === 'string' && typeof a.bottom === 'string') {
    return { ...fallback, ...a };
  }
  return fallback;
}
