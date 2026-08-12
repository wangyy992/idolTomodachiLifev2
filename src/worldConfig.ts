// 世界配置：地点、时段、以及"谁在什么时候干什么"的日程生成器。
// 状态字段太笼统，这里改用确定性哈希，按 (成员, 天, 时段) 排活动 → 活动决定地点与可约度。

export interface WorldLocation {
  id: string;
  label: string;
  sceneKey: string; // 对应 sceneConfig 里的背景
  icon: string;
}

// 可前往的地点（away 除外）
export const WORLD_LOCATIONS: WorldLocation[] = [
  { id: 'practice_room', label: '练习室', sceneKey: 'practice_room', icon: '🕺' },
  { id: 'backstage', label: '打歌后台', sceneKey: 'backstage_hall', icon: '🎤' },
  { id: 'music_stage', label: '打歌舞台', sceneKey: 'stage_wing', icon: '🎶' },
  { id: 'variety_studio', label: '综艺棚', sceneKey: 'recording_studio', icon: '🎬' },
  { id: 'concert', label: '演唱会现场', sceneKey: 'concert', icon: '🎆' },
  { id: 'dorm', label: '宿舍', sceneKey: 'dorm', icon: '🛋️' },
  { id: 'cafe', label: '咖啡厅', sceneKey: 'cafe', icon: '☕' },
  { id: 'convenience', label: '便利店', sceneKey: 'convenience_store', icon: '🏪' },
  { id: 'hangang', label: '汉江', sceneKey: 'hangang_night', icon: '🌉' },
];

export const AWAY = 'away';

export const TIME_SLOTS = ['上午', '下午', '晚上'] as const;
export type SlotIndex = 0 | 1 | 2;

export interface Activity {
  key: string;
  label: string;
  loc: string;      // 地点 id，或 AWAY
  available: boolean; // 能否线下约到
  mood: string;     // 心情/话题基调，喂给 AI
}

const ACT: Record<string, Activity> = {
  practice: { key: 'practice', label: '练习', loc: 'practice_room', available: true, mood: '专注、略疲惫' },
  stage:    { key: 'stage', label: '打歌彩排', loc: 'backstage', available: true, mood: '紧绷、要强' },
  perform:  { key: 'perform', label: '打歌舞台', loc: 'music_stage', available: true, mood: '临上台、亢奋又紧张' },
  variety:  { key: 'variety', label: '录综艺', loc: 'variety_studio', available: true, mood: '放松、综艺感' },
  concert:  { key: 'concert', label: '演唱会', loc: 'concert', available: true, mood: '肾上腺素飙升、台上台下' },
  rest:     { key: 'rest', label: '宿舍休息', loc: 'dorm', available: true, mood: '松弛、露出真实一面' },
  cafe:     { key: 'cafe', label: '泡咖啡厅', loc: 'cafe', available: true, mood: '惬意、健谈' },
  conv:     { key: 'conv', label: '逛便利店', loc: 'convenience', available: true, mood: '深夜、随性' },
  hangang:  { key: 'hangang', label: '汉江散步', loc: 'hangang', available: true, mood: '放空、感性' },
  tour:     { key: 'tour', label: '巡演·在外地', loc: AWAY, available: false, mood: '奔波、想家' },
  schedule: { key: 'schedule', label: '行程中·联系不上', loc: AWAY, available: false, mood: '忙碌' },
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// 按 (成员, 第几天, 时段) 确定性地返回当下活动
export function getActivity(memberId: string, day: number, slot: number): Activity {
  const dayTheme = hash(`${memberId}|day${day}`) % 100;

  // 巡演/大行程：整天在外地（占比小）
  if (dayTheme < 10) return ACT.tour;
  if (dayTheme < 15) return ACT.schedule;

  // 演唱会日：上午彩排，下午+晚上在演唱会现场（能去看/去后台）
  if (dayTheme < 27) {
    if (slot === 0) return ACT.practice;
    return ACT.concert;
  }
  // 回归打歌日：上午后台彩排，下午上打歌舞台，晚上回宿舍/咖啡厅
  if (dayTheme < 48) {
    if (slot === 0) return ACT.stage;
    if (slot === 1) return ACT.perform;
    return hash(`${memberId}|e${day}`) % 2 ? ACT.rest : ACT.cafe;
  }
  // 录综艺日：白天录制，晚上宿舍/便利店
  if (dayTheme < 63) {
    if (slot < 2) return ACT.variety;
    return hash(`${memberId}|e${day}`) % 2 ? ACT.rest : ACT.conv;
  }
  // 练习日：白天练习，晚上汉江/便利店
  if (dayTheme < 78) {
    if (slot < 2) return ACT.practice;
    return hash(`${memberId}|e${day}`) % 2 ? ACT.hangang : ACT.conv;
  }
  // 自由日：每个时段随机一个休闲活动
  const free = [ACT.cafe, ACT.hangang, ACT.rest, ACT.conv, ACT.practice];
  return free[hash(`${memberId}|f${day}-${slot}`) % free.length];
}

// 当前时段、在某地点、能约到的成员
export function idolsAt<T extends { id: string }>(members: T[], locationId: string, day: number, slot: number): T[] {
  return members.filter(m => {
    const a = getActivity(m.id, day, slot);
    return a.available && a.loc === locationId;
  });
}

export function getLocation(id: string): WorldLocation | undefined {
  return WORLD_LOCATIONS.find(l => l.id === id);
}

// 身份 → 初始切入点：让"你是谁"决定你从世界的哪个角落出场
const IDENTITY_START: { test: RegExp; loc: string }[] = [
  { test: /实习|工作人员|妆造|发型|助理|翻译|商务|经纪|staff/i, loc: 'backstage' },   // 圈内人：后台
  { test: /记者|博主|媒体|采访/, loc: 'music_stage' },                                  // 媒体：打歌舞台边
  { test: /粉丝|饭|站姐|fan/i, loc: 'concert' },                                         // 粉丝：演唱会现场
  { test: /女友|男友|恋人|同栋|住户|邻居/, loc: 'dorm' },                                 // 私密关系：宿舍区
  { test: /青梅|发小|暗恋|前任/, loc: 'cafe' },                                           // 旧relationship：咖啡厅
  { test: /留学|打工|便利店|咖啡/, loc: 'cafe' },                                         // 普通生活：咖啡厅
];

// 依身份挑一个合理的起始地点；无匹配则回落练习室
export function getStartLocation(identity?: string[]): string {
  for (const id of identity || []) {
    const m = IDENTITY_START.find(r => r.test.test(id));
    if (m) return m.loc;
  }
  return 'practice_room';
}

// 时间推进：晚上→次日上午
export function nextTime(day: number, slot: number): { day: number; slot: number } {
  if (slot >= TIME_SLOTS.length - 1) return { day: day + 1, slot: 0 };
  return { day, slot: slot + 1 };
}
