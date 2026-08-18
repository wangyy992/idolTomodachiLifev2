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
  { id: 'backstage', label: '待机室', sceneKey: 'backstage_hall', icon: '🎤' },
  { id: 'variety_studio', label: '综艺棚', sceneKey: 'recording_studio', icon: '🎬' },
  { id: 'concert', label: '演唱会现场', sceneKey: 'concert', icon: '🎆' },
  { id: 'dorm', label: '宿舍', sceneKey: 'dorm', icon: '🛋️' },
  { id: 'cafe', label: '咖啡厅', sceneKey: 'cafe', icon: '☕' },
  { id: 'convenience', label: '便利店', sceneKey: 'convenience_store', icon: '🏪' },
  { id: 'district', label: '商圈', sceneKey: 'district', icon: '🏙️' },
  { id: 'rooftop', label: '公司天台', sceneKey: 'rooftop', icon: '🌇' },
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
  stage:    { key: 'stage', label: '待机室候场', loc: 'backstage', available: true, mood: '紧绷、要强' },
  perform:  { key: 'perform', label: '打歌舞台', loc: 'concert', available: true, mood: '临上台、亢奋又紧张' },
  variety:  { key: 'variety', label: '录综艺', loc: 'variety_studio', available: true, mood: '放松、综艺感' },
  concert:  { key: 'concert', label: '演唱会', loc: 'concert', available: true, mood: '肾上腺素飙升、台上台下' },
  rest:     { key: 'rest', label: '宿舍休息', loc: 'dorm', available: true, mood: '松弛、露出真实一面' },
  cafe:     { key: 'cafe', label: '泡咖啡厅', loc: 'cafe', available: true, mood: '惬意、健谈' },
  shop:     { key: 'shop', label: '逛商圈', loc: 'district', available: true, mood: '轻松、被认出的风险' },
  roof:     { key: 'roof', label: '天台放空', loc: 'rooftop', available: true, mood: '独处、心里有事' },
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
  const free = [ACT.cafe, ACT.hangang, ACT.rest, ACT.conv, ACT.shop, ACT.roof, ACT.practice];
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
// 注：建号只提供 5 个原型身份（圈内工作人员/普通粉丝/公寓同栋住户/青梅竹马/现任女友），
// 但这里的规则保持宽松，兼容旧存档与玩家自定义输入的身份。
const IDENTITY_START: { test: RegExp; loc: string }[] = [
  { test: /实习|工作人员|妆造|发型|助理|翻译|商务|经纪|staff/i, loc: 'backstage' },   // 圈内人：后台
  { test: /记者|博主|媒体|采访/, loc: 'concert' },                                  // 媒体：打歌舞台边
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

// 关系型身份 → 起始好感度下限：让"你们本来就认识"变成真实数值，而非从陌生人开始
const IDENTITY_AFFECTION: { test: RegExp; floor: number }[] = [
  { test: /现任女友|现任男友|恋人/, floor: 62 },  // 已在恋爱
  { test: /青梅|发小/, floor: 40 },               // 从小认识
  { test: /前任/, floor: 34 },                    // 旧情复杂
  { test: /暗恋/, floor: 18 },                    // 单向，略有接触
  { test: /同栋|住户|邻居/, floor: 12 },          // 抬头不见低头见的脸熟
];

export function startingAffection(identity?: string[]): number {
  let floor = 0;
  for (const id of identity || []) {
    const m = IDENTITY_AFFECTION.find(r => r.test.test(id));
    if (m) floor = Math.max(floor, m.floor);
  }
  return floor;
}

// 人人可去的公共场所
export const PUBLIC_LOCS = ['concert', 'cafe', 'convenience', 'hangang', 'district'];

// 身份类别 → 公共场所之外，额外解锁的地点
const IDENTITY_ACCESS: { test: RegExp; extra: string[] }[] = [
  { test: /实习|工作人员|妆造|发型|助理|翻译|商务|经纪|staff/i, extra: ['practice_room', 'backstage', 'variety_studio', 'dorm', 'rooftop'] },
  { test: /记者|博主|媒体|采访/, extra: ['variety_studio'] },
  { test: /女友|男友|恋人|同栋|住户|邻居/, extra: ['dorm'] },
  { test: /青梅|发小|暗恋|前任/, extra: ['dorm'] },
];

// 当前身份能进入的地点集合（多身份取并集）
export function getAccessibleLocations(identity?: string[]): Set<string> {
  const allowed = new Set(PUBLIC_LOCS);
  for (const id of identity || []) {
    const m = IDENTITY_ACCESS.find(r => r.test.test(id));
    if (m) m.extra.forEach(l => allowed.add(l));
  }
  return allowed;
}

// 建号时给玩家看的身份摘要：从哪开场、能进哪些私密场所、和爱豆的起始熟悉度
export function identitySummary(identity: string[]): { startLabel: string; affFloor: number; unlocked: string[] } {
  const startLabel = getLocation(getStartLocation(identity))?.label || '练习室';
  const affFloor = startingAffection(identity);
  const acc = getAccessibleLocations(identity);
  const unlocked = [...acc].filter(l => !PUBLIC_LOCS.includes(l)).map(l => getLocation(l)?.label || l);
  return { startLabel, affFloor, unlocked };
}

// 进不去的地点，给一句符合身份的解释
export function lockReason(locationId: string, tw: boolean): string {
  switch (locationId) {
    case 'practice_room': return tw ? '練習室閒人免進，你的身份刷不開門禁。' : '练习室闲人免进，你的身份刷不开门禁。';
    case 'backstage': return tw ? '待機室只認工作證，你被保安攔在門口。' : '待机室只认工作证，你被保安拦在门口。';
    case 'variety_studio': return tw ? '綜藝棚錄製中，無關人員止步。' : '综艺棚录制中，无关人员止步。';
    case 'rooftop': return tw ? '天台在公司樓上，你刷不開那道門。' : '天台在公司楼上，你刷不开那道门。';
    case 'dorm': return tw ? '宿舍是她們的私人領域，你這身份沒法登門。' : '宿舍是她们的私人领域，你这身份没法登门。';
    default: return tw ? '你的身份到不了這裡。' : '你的身份到不了这里。';
  }
}

// 时间推进：晚上→次日上午
export function nextTime(day: number, slot: number): { day: number; slot: number } {
  if (slot >= TIME_SLOTS.length - 1) return { day: day + 1, slot: 0 };
  return { day, slot: slot + 1 };
}
