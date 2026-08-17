// 场景配置：颜色占位，之后换成真实背景图路径
export const SCENE_CONFIG: Record<string, {
  label: string;
  bg: string; // 暂时用渐变色，之后换成 `url(/scenes/xxx.jpg)`
  sceneBase?: string; // 舞台外侧留白底色
  blur?: string;      // 留白处的低清模糊底
  ratio?: number;     // 画面宽高比（不填按 1920/1072）
  overlay: string; // 叠加层透明度
}> = {
  'practice_room': {
    label: '练习室',
    bg: "#241a14 url('/scenes/practice.webp') center/cover no-repeat",
    blur: "url('/scenes/practice_blur.webp') center/cover no-repeat",
    sceneBase: '#241a14',
    ratio: 1.791044776119403,
    overlay: 'rgba(0,0,0,0.04)',
  },
  'waiting_room': {
    label: '待机室',
    bg: 'linear-gradient(180deg, #2d1b33 0%, #1a0a22 50%, #0d0614 100%)',
    overlay: 'rgba(0,0,0,0.25)',
  },
  'dorm': {
    label: '宿舍',
    bg: "#6b5a4a url('/scenes/dorm.webp') center/cover no-repeat",
    blur: "url('/scenes/dorm_blur.webp') center/cover no-repeat",
    sceneBase: '#6b5a4a',
    ratio: 1.833810888252149,
    overlay: 'rgba(0,0,0,0.04)',
  },
  'dorm_hall': {
    label: '宿舍走廊',
    bg: 'linear-gradient(180deg, #0f0f1f 0%, #1a1a2e 100%)',
    overlay: 'rgba(0,0,0,0.35)',
  },
  'recording_studio': {
    label: '录音棚',
    bg: "#3a3a44 url('/scenes/variety.webp') center/cover no-repeat",
    blur: "url('/scenes/variety_blur.webp') center/cover no-repeat",
    sceneBase: '#3a3a44',
    ratio: 1.791044776119403,
    overlay: 'rgba(0,0,0,0.04)',
  },
  'cafe': {
    label: '咖啡厅',
    bg: "#e8e0cf url('/scenes/cafe.webp') center/cover no-repeat",
    blur: "url('/scenes/cafe_blur.webp') center/cover no-repeat",
    sceneBase: '#e8e0cf',
    ratio: 1.791044776119403,
    overlay: 'rgba(0,0,0,0.04)',
  },
  'convenience_store': {
    label: '便利店',
    bg: "#cfc7b4 url('/scenes/convenience.webp') center/cover no-repeat",
    blur: "url('/scenes/convenience_blur.webp') center/cover no-repeat",
    sceneBase: '#cfc7b4',
    ratio: 1.833810888252149,
    overlay: 'rgba(0,0,0,0.04)',
  },
  'hangang_day': {
    label: '汉江（白天）',
    bg: "#8fbfe0 url('/scenes/hangang_day.webp') center/cover no-repeat",
    blur: "url('/scenes/hangang_day_blur.webp') center/cover no-repeat",
    sceneBase: '#8fbfe0',
    ratio: 1.791044776119403,
    overlay: 'rgba(0,0,0,0.04)',
  },
  'hangang_night': {
    label: '汉江（夜晚）',
    bg: "#141a3a url('/scenes/hangang_night.webp') center/cover no-repeat",
    blur: "url('/scenes/hangang_night_blur.webp') center/cover no-repeat",
    sceneBase: '#141a3a',
    ratio: 1.791044776119403,
    overlay: 'rgba(0,0,0,0.04)',
  },
  'seoul_street': {
    label: '首尔街头',
    bg: 'linear-gradient(180deg, #c4936a 0%, #a0663a 50%, #7a4a28 100%)',
    overlay: 'rgba(0,0,0,0.3)',
  },
  'airport_departure': {
    label: '机场出发',
    bg: 'linear-gradient(180deg, #e8e8f0 0%, #c8c8d8 50%, #a0a0b8 100%)',
    overlay: 'rgba(0,0,0,0.2)',
  },
  'airport_arrival': {
    label: '机场到达',
    bg: 'linear-gradient(180deg, #d8e8f0 0%, #b8c8d8 50%, #98a8b8 100%)',
    overlay: 'rgba(0,0,0,0.2)',
  },
  'backstage_hall': {
    label: '待机室',
    bg: "#3a3630 url('/scenes/backstage.webp') center/cover no-repeat",
    blur: "url('/scenes/backstage_blur.webp') center/cover no-repeat",
    sceneBase: '#3a3630',
    ratio: 1.791044776119403,
    overlay: 'rgba(0,0,0,0.04)',
  },
  'stage_wing': {
    label: '舞台',
    bg: "#150f22 url('/scenes/concert.webp') center/cover no-repeat",
    blur: "url('/scenes/concert_blur.webp') center/cover no-repeat",
    sceneBase: '#150f22',
    ratio: 1.791045,
    overlay: 'rgba(0,0,0,0.04)',
  },
  'district': {
    label: '商圈',
    bg: "#8a6a52 url('/scenes/district.webp') center/cover no-repeat",
    blur: "url('/scenes/district_blur.webp') center/cover no-repeat",
    sceneBase: '#8a6a52',
    ratio: 1.791045,
    overlay: 'rgba(0,0,0,0.04)',
  },
  'rooftop': {
    label: '公司天台',
    bg: "#4a5a72 url('/scenes/rooftop.webp') center/cover no-repeat",
    blur: "url('/scenes/rooftop_blur.webp') center/cover no-repeat",
    sceneBase: '#4a5a72',
    ratio: 1.791045,
    overlay: 'rgba(0,0,0,0.04)',
  },
  'concert': {
    label: '演唱会现场',
    bg: "#150f22 url('/scenes/concert.webp') center/cover no-repeat",
    blur: "url('/scenes/concert_blur.webp') center/cover no-repeat",
    sceneBase: '#150f22',
    ratio: 1.791044776119403,
    overlay: 'rgba(0,0,0,0.04)',
  },
};

// 场景名映射（AI输出的中文场景名 → 场景ID）
export const SCENE_NAME_MAP: Record<string, string> = {
  '练习室': 'practice_room',
  '宿舍': 'dorm',
  '宿舍走廊': 'dorm_hall',
  '录音棚': 'recording_studio',
  '咖啡厅': 'cafe',
  '便利店': 'convenience_store',
  '汉江': 'hangang_night',
  '汉江公园': 'hangang_night',
  '汉江夜': 'hangang_night',
  '汉江夜晚': 'hangang_night',
  '汉江白天': 'hangang_day',
  '首尔': 'seoul_street',
  '首尔街头': 'district',
  '商圈': 'district',
  '天台': 'rooftop',
  '公司天台': 'rooftop',
  '楼顶': 'rooftop',
  '弘大': 'district',
  '机场': 'airport_departure',
  '机场出发': 'airport_departure',
  '机场到达': 'airport_arrival',
  '待机室': 'backstage_hall',
  '打歌后台': 'backstage_hall',
  '后台': 'backstage_hall',
  '舞台侧幕': 'stage_wing',
  '舞台': 'stage_wing',
};

export const DEFAULT_SCENE = 'seoul_street';

export function getSceneConfig(sceneName: string) {
  // 先尝试直接匹配场景ID
  if (SCENE_CONFIG[sceneName]) return SCENE_CONFIG[sceneName];
  // 再尝试中文名映射
  const sceneId = SCENE_NAME_MAP[sceneName];
  if (sceneId && SCENE_CONFIG[sceneId]) return SCENE_CONFIG[sceneId];
  // 模糊匹配
  for (const [key, id] of Object.entries(SCENE_NAME_MAP)) {
    if (sceneName.includes(key)) return SCENE_CONFIG[id];
  }
  return SCENE_CONFIG[DEFAULT_SCENE];
}
