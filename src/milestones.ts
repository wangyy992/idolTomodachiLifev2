// 阶段突破（里程碑）＝暗线积累到阈值后触发的"重头戏"大节点。
// 和日常碎片剧场相对：里程碑是 authored、更长更正式、有醒目预兆、会被记进大事记 → 喂给年鉴/结局。
// 这个表被两处共用：geminiService（喂 prompt）和 App/WorldView（世界里的 ⚡ 预兆 + 触发记录）。

export interface MilestoneDef {
  id: string;            // 短 id
  minAff: number;        // 触发所需最低好感
  needRomance?: boolean; // 需要"攻略/恋爱意图"
  needQuietPlace?: boolean; // 需要晚上 / 汉江 / 天台这种能说心里话的时空
  title: string;         // 记进大事记的标题
  omen: string;          // 世界里 ⚡ 预兆的悬念文案
  directive: string;     // 喂给 AI 的重头戏指令
}

export const MILESTONES: MilestoneDef[] = [
  {
    id: 'vulnerable', minAff: 30, needQuietPlace: true,
    title: '第一次卸下防备',
    omen: '她今天好像有话想说',
    directive: '她第一次在你面前卸下防备，吐露最近压在心里最重的那件职业压力（具体到人和事，不要泛泛）。关系由此推进到"能说真心话的朋友"。克制、有留白，靠细节和停顿写，不要煽情、不要金句。',
  },
  {
    id: 'boundary', minAff: 55, needRomance: true,
    title: '越界的那一瞬',
    omen: '你们之间的空气不太一样了',
    directive: '出现一次两个人都清楚察觉到的越界瞬间——一个眼神、一次没躲开的靠近、一句说到一半的话（不是告白）。事后两人都装作没发生，但都知道发生了。把那几秒写慢、写透。',
  },
  {
    id: 'confess_ready', minAff: 75, needRomance: true,
    title: '只差最后一句',
    omen: '她好像在等你说点什么',
    directive: '她已经完全明白你的心意，也几乎确定了自己的。本轮给出一个明确到不能再明确的"可以更进一步"的信号，把球稳稳递到你脚下——但那句话必须由玩家来说。停在最关键的、令人屏息的那一刻。',
  },
];

export interface MilestoneSituation {
  affection: number;
  intentRomance: boolean;
  quietPlace: boolean;   // 晚上 / 汉江 / 天台
  done: string[];        // 已触发的 `${memberId}:${id}`
}

// 这个爱豆此刻是否有"待触发"的里程碑？返回门槛最高的那个（越靠后越重）。
export function pendingMilestone(memberId: string, s: MilestoneSituation): MilestoneDef | null {
  let hit: MilestoneDef | null = null;
  for (const m of MILESTONES) {
    if (s.done.includes(`${memberId}:${m.id}`)) continue;
    if (s.affection < m.minAff) continue;
    if (m.needRomance && !s.intentRomance) continue;
    if (m.needQuietPlace && !s.quietPlace) continue;
    if (!hit || m.minAff > hit.minAff) hit = m;
  }
  return hit;
}

export function quietPlaceNow(slot: number, locationId: string): boolean {
  return slot === 2 || locationId === 'hangang' || locationId === 'rooftop';
}

export function milestoneTitle(id: string): string {
  const bare = id.includes(':') ? id.split(':')[1] : id;
  return MILESTONES.find(m => m.id === bare)?.title || '一个重要的时刻';
}
