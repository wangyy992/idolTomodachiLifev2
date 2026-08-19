// Cozy People 款式目录 + 配色近似色板（色板仅用于捏脸 UI 显示，真实像素来自预渲染图层）

// ---- 款式（对应 public/sprites 下的文件名） ----
export const HAIR_STYLES = ['long_straight', 'wavy', 'ponytail', 'midiwave', 'bob', 'french_curl', 'curly', 'braids', 'spacebuns', 'extra_long', 'emo', 'gentleman', 'buzzcut'];
// 上衣：短款露腿 + 连衣裙/背带（连体，盖住腿）
export const TOP_STYLES = ['basic', 'spaghetti', 'sporty', 'stripe', 'floral', 'sailor', 'suit', 'dress', 'overalls'];
// 下装：长裤 / 半裙 / 西裤
export const BOTTOM_STYLES = ['pants', 'skirt', 'pants_suit'];
export const GLASSES_STYLES = ['', 'glasses', 'glasses_sun'];
export const HAT_STYLES = ['', 'hat_lucky', 'hat_cowboy'];
export const EARRING_STYLES = ['', 'earring_red', 'earring_emerald', 'earring_red_silver', 'earring_emerald_silver'];

// ---- 中文标签 ----
export const STYLE_LABEL: Record<string, string> = {
  long_straight: '长直', wavy: '大波浪', ponytail: '马尾', midiwave: '中长波浪', bob: '波波头',
  french_curl: '法式卷', curly: '卷发', braids: '编发', spacebuns: '丸子头', extra_long: '超长',
  emo: 'emo刘海', gentleman: '背头', buzzcut: '寸头',
  basic: '基础', dress: '连衣裙', skirt: '半裙', spaghetti: '吊带', floral: '碎花', stripe: '条纹',
  sporty: '运动', overalls: '背带裤', pants: '长裤', pants_suit: '西裤', suit: '西装外套', sailor: '水手服',
  none: '无',
  glasses: '眼镜', glasses_sun: '墨镜', hat_lucky: '帽子', hat_cowboy: '牛仔帽',
  earring_red: '红宝石', earring_emerald: '绿宝石', earring_red_silver: '红·银', earring_emerald_silver: '绿·银',
};

// ---- 颜色数量（与图层 PNG 里预渲染的色块数一致） ----
export const SKIN_COUNT = 8;
export const HAIR_COLOR_COUNT = 14;
export const EYE_COLOR_COUNT = 14;
export const TOP_COLOR_COUNT = 10;
export const BOTTOM_COLOR_COUNT = 10;
export const SHOE_COLOR_COUNT = 10;

// ---- 色板（近似，仅 UI 显示用；顺序对应图层里的色块顺序） ----
export const SKIN_SWATCHES = ['#e6ac9c', '#dea48a', '#de9a85', '#eb9c7a', '#ab6e4d', '#96553e', '#784c31', '#6c3d2d'];
// HAIR: Black, Blonde, Brown, Brown Light, Copper, Emerald, Green, Grey, Lilac, Navy, Pink, Purple, Red, Turquoise
export const HAIR_SWATCHES = ['#2b2320', '#e6c78f', '#6b4a2f', '#a5744a', '#b5651d', '#1e7a5a', '#4a9e4a', '#9a9aa0', '#c9a8e0', '#2a3a6a', '#e88ab0', '#8a4ac0', '#b5352a', '#3ab5b5'];
// EYES: Black, Blue, Blue L, Brown, Brown Dark, Brown L, Green, Green Dark, Green L, Grey, Grey L, Pink, Pink L, Red
export const EYE_SWATCHES = ['#2a2a2a', '#3a7ac0', '#6ab0e0', '#6b4a2f', '#3a2a1a', '#a5744a', '#3a9e5a', '#1e6a3a', '#7ac98a', '#7a7a86', '#b0b0ba', '#e07aa8', '#f0a8c8', '#b5352a'];
// CLOTHES/SHOES: Black, Blue, Blue L, Brown, Green, Green L, Pink, Purple, Red, White/Grey
export const CLOTH_SWATCHES = ['#2c2c34', '#2980b9', '#6ab0e0', '#6d4c41', '#27ae60', '#7ac98a', '#e88ab0', '#8e44ad', '#c0392b', '#e2e2e8'];

// ---- 爱豆招牌造型：一人一个色彩识别 + 招牌发型 + 成套搭配，追求"一眼认出是谁" ----
// 颜色索引：发色见 HAIR_SWATCHES（0黑 1金 2棕 3浅棕 4铜 5翡翠 6绿 7灰 8丁香 9藏青 10粉 11紫 12红 13青）
//           衣服见 CLOTH_SWATCHES（0黑 1蓝 2浅蓝 3棕 4绿 5浅绿 6粉 7紫 8红 9白灰）
type Look = Partial<{ skin: number; hairStyle: string; hairColor: number; top: string; topColor: number; bottom: string; bottomColor: number; hat: string; glasses: string }>;
// [skin, hairStyle, hairColor, top, topColor, bottom, bottomColor, hat]
const raw: Record<string, [number, string, number, string, number, string, number, string?]> = {
  // ITZY
  yeji:       [1, 'long_straight', 7, 'suit', 0, 'pants', 0],             // 银发 + 全黑 —— 冷冽
  ryujin:     [1, 'ponytail', 1, 'sporty', 8, 'pants', 0],                 // 金马尾 + 红运动 —— 帅气
  lia:        [0, 'wavy', 10, 'dress', 6, '', 0],                          // 粉大波浪 + 粉裙 —— 甜
  chaeryeong: [0, 'spacebuns', 11, 'basic', 7, 'skirt', 7],               // 紫双丸子 + 紫 —— 灵动
  yuna_itzy:  [0, 'long_straight', 13, 'spaghetti', 2, 'skirt', 2],       // 青长直 + 浅蓝
  // aespa
  karina:     [0, 'long_straight', 0, 'dress', 0, '', 0],                 // 黑长直 + 黑裙 —— 高冷
  winter:     [0, 'bob', 2, 'sailor', 1, 'skirt', 1],                     // 棕波波 + 蓝水手
  giselle:    [1, 'wavy', 4, 'basic', 3, 'pants', 3],                     // 铜色波浪 + 棕
  ningning:   [0, 'spacebuns', 12, 'dress', 8, '', 0],                    // 红双丸子 + 红裙
  // IVE
  wonyoung:   [0, 'extra_long', 3, 'dress', 9, '', 0],                    // 浅棕超长 + 白裙 —— 公主
  yujin_ive:  [0, 'ponytail', 0, 'sporty', 4, 'pants', 0],                // 黑马尾 + 绿运动
  gaeul:      [1, 'bob', 2, 'stripe', 0, 'pants', 0],                     // 棕波波 + 条纹黑
  rei:        [0, 'midiwave', 0, 'basic', 6, 'skirt', 6],                 // 黑中长 + 粉
  liz:        [0, 'wavy', 1, 'floral', 5, 'skirt', 5],                    // 金波浪 + 碎花绿
  leeseo:     [0, 'long_straight', 3, 'spaghetti', 2, 'skirt', 2],        // 浅棕长直 + 浅蓝
  // LE SSERAFIM
  sakura:     [0, 'long_straight', 1, 'dress', 9, '', 0],                 // 金长直 + 白裙
  chaewon:    [0, 'bob', 3, 'basic', 9, 'skirt', 9],                      // 浅棕波波 + 白
  yunjin:     [1, 'wavy', 0, 'suit', 8, 'pants', 0],                      // 黑波浪 + 红西装
  kazuha:     [0, 'long_straight', 0, 'dress', 2, '', 0],                 // 黑长直 + 浅蓝裙 —— 芭蕾
  eunchae:    [0, 'ponytail', 2, 'sporty', 5, 'pants', 4],                // 棕马尾 + 浅绿
  // ILLIT
  yunah:      [0, 'wavy', 3, 'floral', 6, 'skirt', 6],
  minju:      [0, 'long_straight', 2, 'dress', 2, '', 0],
  moka:       [0, 'bob', 0, 'basic', 0, 'pants', 0],
  wonhee:     [0, 'long_straight', 3, 'sailor', 6, 'skirt', 6],
  iroha:      [0, 'ponytail', 0, 'sporty', 1, 'pants', 0],
  // NMIXX
  lily_nmixx:  [1, 'wavy', 2, 'basic', 4, 'skirt', 4],
  haewon_nmixx:[0, 'long_straight', 0, 'dress', 7, '', 0],
};
export const IDOL_LOOK: Record<string, Look> = Object.fromEntries(
  Object.entries(raw).map(([id, v]) => [id, {
    skin: v[0], hairStyle: v[1], hairColor: v[2], top: v[3], topColor: v[4], bottom: v[5], bottomColor: v[6], hat: v[7] || '',
  }])
);
