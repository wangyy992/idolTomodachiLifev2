// Cozy People 款式目录 + 配色近似色板（色板仅用于捏脸 UI 显示，真实像素来自预渲染图层）

// ---- 款式（对应 public/sprites 下的文件名） ----
export const HAIR_STYLES = ['long_straight', 'wavy', 'ponytail', 'midiwave', 'bob', 'french_curl', 'curly', 'braids', 'spacebuns', 'extra_long', 'emo', 'gentleman', 'buzzcut'];
export const CLOTHES_STYLES = ['basic', 'dress', 'skirt', 'spaghetti', 'floral', 'stripe', 'sporty', 'overalls', 'pants', 'pants_suit', 'suit', 'sailor'];
export const GLASSES_STYLES = ['', 'glasses', 'glasses_sun'];
export const HAT_STYLES = ['', 'hat_lucky', 'hat_cowboy'];
export const EARRING_STYLES = ['', 'earring_red', 'earring_emerald', 'earring_red_silver', 'earring_emerald_silver'];

// ---- 中文标签 ----
export const STYLE_LABEL: Record<string, string> = {
  long_straight: '长直', wavy: '大波浪', ponytail: '马尾', midiwave: '中长波浪', bob: '波波头',
  french_curl: '法式卷', curly: '卷发', braids: '编发', spacebuns: '丸子头', extra_long: '超长',
  emo: 'emo刘海', gentleman: '背头', buzzcut: '寸头',
  basic: '基础', dress: '连衣裙', skirt: '半裙', spaghetti: '吊带', floral: '碎花', stripe: '条纹',
  sporty: '运动', overalls: '背带裤', pants: '长裤', pants_suit: '西裤', suit: '西装', sailor: '水手服',
  glasses: '眼镜', glasses_sun: '墨镜', hat_lucky: '帽子', hat_cowboy: '牛仔帽',
  earring_red: '红宝石', earring_emerald: '绿宝石', earring_red_silver: '红·银', earring_emerald_silver: '绿·银',
};

// ---- 颜色数量（与图层 PNG 里预渲染的色块数一致） ----
export const SKIN_COUNT = 8;
export const HAIR_COLOR_COUNT = 14;
export const EYE_COLOR_COUNT = 14;
export const CLOTHES_COLOR_COUNT = 10;
export const SHOE_COLOR_COUNT = 10;

// ---- 色板（近似，仅 UI 显示用；顺序对应图层里的色块顺序） ----
export const SKIN_SWATCHES = ['#e6ac9c', '#dea48a', '#de9a85', '#eb9c7a', '#ab6e4d', '#96553e', '#784c31', '#6c3d2d'];
// HAIR: Black, Blonde, Brown, Brown Light, Copper, Emerald, Green, Grey, Lilac, Navy, Pink, Purple, Red, Turquoise
export const HAIR_SWATCHES = ['#2b2320', '#e6c78f', '#6b4a2f', '#a5744a', '#b5651d', '#1e7a5a', '#4a9e4a', '#9a9aa0', '#c9a8e0', '#2a3a6a', '#e88ab0', '#8a4ac0', '#b5352a', '#3ab5b5'];
// EYES: Black, Blue, Blue L, Brown, Brown Dark, Brown L, Green, Green Dark, Green L, Grey, Grey L, Pink, Pink L, Red
export const EYE_SWATCHES = ['#2a2a2a', '#3a7ac0', '#6ab0e0', '#6b4a2f', '#3a2a1a', '#a5744a', '#3a9e5a', '#1e6a3a', '#7ac98a', '#7a7a86', '#b0b0ba', '#e07aa8', '#f0a8c8', '#b5352a'];
// CLOTHES/SHOES: Black, Blue, Blue L, Brown, Green, Green L, Pink, Purple, Red, White/Grey
export const CLOTH_SWATCHES = ['#2c2c34', '#2980b9', '#6ab0e0', '#6d4c41', '#27ae60', '#7ac98a', '#e88ab0', '#8e44ad', '#c0392b', '#e2e2e8'];

// ---- 爱豆"还原真人"默认外观（近似：长发系为主 + 各自发色，肤色偏浅） ----
// 只给出与默认随机不同的字段；未列出的成员回退到按 id 稳定随机。
type Look = Partial<{ skin: number; hairStyle: string; hairColor: number; clothes: string; clothesColor: number }>;
const raw: Record<string, [string, number, number]> = {
  // id: [hairStyle, hairColor, skin]
  yeji: ['long_straight', 4, 1], ryujin: ['ponytail', 0, 1], lia: ['wavy', 2, 0], chaeryeong: ['long_straight', 0, 0], yuna_itzy: ['wavy', 3, 0],
  karina: ['long_straight', 0, 0], winter: ['bob', 0, 0], giselle: ['wavy', 2, 1], ningning: ['long_straight', 12, 0],
  wonyoung: ['long_straight', 2, 0], yujin_ive: ['wavy', 0, 0], gaeul: ['long_straight', 0, 1], rei: ['midiwave', 2, 0], liz: ['wavy', 3, 0], leeseo: ['long_straight', 0, 0],
  sakura: ['long_straight', 1, 0], chaewon: ['long_straight', 3, 0], yunjin: ['wavy', 0, 0], kazuha: ['long_straight', 0, 0], eunchae: ['ponytail', 0, 0],
  yunah: ['wavy', 3, 0], minju: ['long_straight', 2, 0], moka: ['bob', 0, 0], wonhee: ['long_straight', 2, 0], iroha: ['long_straight', 0, 0],
  lily_nmixx: ['wavy', 2, 0], haewon_nmixx: ['long_straight', 0, 0],
};
export const IDOL_LOOK: Record<string, Look> = Object.fromEntries(
  Object.entries(raw).map(([id, [hairStyle, hairColor, skin]]) => [id, { hairStyle, hairColor, skin }])
);
