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
  { id: 'dorm', label: '宿舍', sceneKey: 'dorm', icon: '🛋️' },
  { id: 'variety_studio', label: '综艺棚', sceneKey: 'recording_studio', icon: '🎬' },
  { id: 'backstage', label: '打歌后台', sceneKey: 'backstage_hall', icon: '🎤' },
  { id: 'cafe', label: '咖啡厅', sceneKey: 'cafe', icon: '☕' },
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
  variety:  { key: 'variety', label: '录综艺', loc: 'variety_studio', available: true, mood: '放松、综艺感' },
  rest:     { key: 'rest', label: '宿舍休息', loc: 'dorm', available: true, mood: '松弛、露出真实一面' },
  cafe:     { key: 'cafe', label: '泡咖啡厅', loc: 'cafe', available: true, mood: '惬意、健谈' },
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
  if (dayTheme < 12) return ACT.tour;
  if (dayTheme < 18) return ACT.schedule;

  // 回归打歌日：白天在后台，晚上回宿舍/咖啡厅
  if (dayTheme < 45) {
    if (slot < 2) return ACT.stage;
    return hash(`${memberId}|e${day}`) % 2 ? ACT.rest : ACT.cafe;
  }
  // 录综艺日
  if (dayTheme < 62) {
    return slot < 2 ? ACT.variety : ACT.rest;
  }
  // 练习日
  if (dayTheme < 78) {
    return slot < 2 ? ACT.practice : ACT.hangang;
  }
  // 自由日：每个时段随机一个休闲活动
  const free = [ACT.cafe, ACT.hangang, ACT.rest, ACT.practice];
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

// 时间推进：晚上→次日上午
export function nextTime(day: number, slot: number): { day: number; slot: number } {
  if (slot >= TIME_SLOTS.length - 1) return { day: day + 1, slot: 0 };
  return { day, slot: slot + 1 };
}
