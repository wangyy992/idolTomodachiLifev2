// 场景配置：颜色占位，之后换成真实背景图路径
export const SCENE_CONFIG: Record<string, {
  label: string;
  bg: string; // 暂时用渐变色，之后换成 `url(/scenes/xxx.jpg)`
  overlay: string; // 叠加层透明度
}> = {
  'practice_room': {
    label: '练习室',
    bg: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    overlay: 'rgba(0,0,0,0.3)',
  },
  'waiting_room': {
    label: '待机室',
    bg: 'linear-gradient(180deg, #2d1b33 0%, #1a0a22 50%, #0d0614 100%)',
    overlay: 'rgba(0,0,0,0.25)',
  },
  'dorm': {
    label: '宿舍',
    bg: 'linear-gradient(180deg, #0a0a1a 0%, #111130 50%, #0d0d20 100%)',
    overlay: 'rgba(0,0,0,0.4)',
  },
  'dorm_hall': {
    label: '宿舍走廊',
    bg: 'linear-gradient(180deg, #0f0f1f 0%, #1a1a2e 100%)',
    overlay: 'rgba(0,0,0,0.35)',
  },
  'recording_studio': {
    label: '录音棚',
    bg: 'linear-gradient(180deg, #1a1200 0%, #2d2000 50%, #1a1200 100%)',
    overlay: 'rgba(0,0,0,0.3)',
  },
  'cafe': {
    label: '咖啡厅',
    bg: 'linear-gradient(180deg, #3d2b1f 0%, #2a1a10 50%, #1a0f08 100%)',
    overlay: 'rgba(0,0,0,0.2)',
  },
  'convenience_store': {
    label: '便利店',
    bg: 'linear-gradient(180deg, #0a1a0a 0%, #0d2a0d 50%, #0a1a0a 100%)',
    overlay: 'rgba(0,0,0,0.25)',
  },
  'hangang_day': {
    label: '汉江（白天）',
    bg: 'linear-gradient(180deg, #87ceeb 0%, #4a9eda 30%, #2d7ab8 60%, #1a5a9a 100%)',
    overlay: 'rgba(0,0,0,0.1)',
  },
  'hangang_night': {
    label: '汉江（夜晚）',
    bg: 'linear-gradient(180deg, #0a1628 0%, #1a2d4a 40%, #0d1f35 70%, #071525 100%)',
    overlay: 'rgba(0,0,0,0.2)',
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
    label: '打歌后台',
    bg: 'linear-gradient(180deg, #1a0a2e 0%, #2d1045 50%, #1a0a2e 100%)',
    overlay: 'rgba(0,0,0,0.3)',
  },
  'stage_wing': {
    label: '舞台侧幕',
    bg: 'linear-gradient(180deg, #0d0d0d 0%, #1a0a1a 30%, #2d1040 60%, #1a0828 100%)',
    overlay: 'rgba(0,0,0,0.2)',
  },
};

// 场景名映射（AI输出的中文场景名 → 场景ID）
export const SCENE_NAME_MAP: Record<string, string> = {
  '练习室': 'practice_room',
  '待机室': 'waiting_room',
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
  '首尔街头': 'seoul_street',
  '机场': 'airport_departure',
  '机场出发': 'airport_departure',
  '机场到达': 'airport_arrival',
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
