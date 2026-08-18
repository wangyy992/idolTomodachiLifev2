// 年历：一轮 = 游戏内一年（52 周 × 7 天）。
// 大事件（回归 ×2 / 年末颁奖季）确定性排布，玩家一开局就能在日历上看见 → 有目标感、会规划；
// 小事件（热搜/偶遇/吃醋）随天数推进条件+随机 roll 出来，事后标到日历上。

export const DAYS_PER_WEEK = 7;
export const WEEKS_PER_YEAR = 52;
export const DAYS_PER_YEAR = DAYS_PER_WEEK * WEEKS_PER_YEAR;

export type PhaseKind = 'comeback' | 'promo' | 'tour' | 'awards' | 'off';

export interface Phase {
  kind: PhaseKind;
  label: string;
  startWeek: number;  // 含
  endWeek: number;    // 含
  icon: string;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// 一个团一年的档期：上半年一次回归、下半年一次回归、年末颁奖季，时间带小幅浮动
export function buildYearPhases(group: string, year = 1): Phase[] {
  const j = (salt: string, span: number) => hash(`${group}|y${year}|${salt}`) % span;
  // 上半年回归：第 8-11 周开始，预热 1 周 + 打歌 3 周
  const cb1 = 8 + j('cb1', 4);
  // 下半年回归：第 32-36 周
  const cb2 = 32 + j('cb2', 5);
  // 巡演：回归打歌结束后一段
  const tour1 = cb1 + 5 + j('t1', 3);
  return [
    { kind: 'comeback', label: '回归预热', startWeek: cb1, endWeek: cb1, icon: '📀' },
    { kind: 'promo', label: '打歌期', startWeek: cb1 + 1, endWeek: cb1 + 3, icon: '🎤' },
    { kind: 'tour', label: '巡演', startWeek: tour1, endWeek: tour1 + 2, icon: '✈️' },
    { kind: 'comeback', label: '回归预热', startWeek: cb2, endWeek: cb2, icon: '📀' },
    { kind: 'promo', label: '打歌期', startWeek: cb2 + 1, endWeek: cb2 + 3, icon: '🎤' },
    { kind: 'awards', label: '颁奖季', startWeek: 50, endWeek: 52, icon: '🏆' },
  ];
}

export const weekOf = (day: number) => Math.floor((day - 1) / DAYS_PER_WEEK) + 1;
export const dayInWeek = (day: number) => ((day - 1) % DAYS_PER_WEEK) + 1;

export function phaseAt(group: string, day: number, year = 1): Phase | null {
  const w = weekOf(day);
  return buildYearPhases(group, year).find(p => w >= p.startWeek && w <= p.endWeek) || null;
}

// 打歌日：打歌期里固定每周第 4、7 天各一次
export function isMusicShowDay(group: string, day: number, year = 1): boolean {
  const p = phaseAt(group, day, year);
  if (!p || p.kind !== 'promo') return false;
  const d = dayInWeek(day);
  return d === 4 || d === 7;
}

// ── 打歌一位评分 ──────────────────────────────────────────
// 分数由代码算，AI 只负责旁白/获奖感言 —— 这样成绩才有连续性，玩家投入才能兑现成名次。
export interface ShowScore {
  group: string;
  digital: number; physical: number; sns: number; preVote: number; broadcast: number;
  total: number;
}

export interface PlayerBoost {
  vote?: number;      // 打投/控评（粉丝身份）
  sns?: number;       // 控评/搬运
  digital?: number;   // 冲音源
  broadcast?: number; // 爱豆状态好（士气）→ 舞台加分
}

// 歌曲强度：本次回归的底子（同一次回归内稳定）
function songPower(group: string, day: number, year: number): number {
  const w = weekOf(day);
  const p = buildYearPhases(group, year).find(ph => ph.kind === 'promo' && w >= ph.startWeek && w <= ph.endWeek);
  const seed = `${group}|y${year}|song${p?.startWeek ?? w}`;
  return 55 + (hash(seed) % 35); // 55-89
}

export function computeMusicShow(
  playerGroup: string,
  rivals: string[],
  day: number,
  opts: { year?: number; boost?: PlayerBoost; morale?: number } = {}
): { winner: string; scores: ShowScore[] } {
  const year = opts.year ?? 1;
  const boost = opts.boost || {};
  const morale = opts.morale ?? 50; // 0-100，来自爱豆 mood/士气

  const mk = (g: string, isPlayer: boolean): ShowScore => {
    const power = songPower(g, day, year);
    const r = (salt: string, span: number) => hash(`${g}|y${year}|d${day}|${salt}`) % span;
    const digital = Math.round(power * 0.6 + r('dg', 25) + (isPlayer ? (boost.digital || 0) : 0));
    const physical = Math.round(power * 0.5 + r('ph', 30));
    const sns = Math.round(power * 0.4 + r('sn', 35) + (isPlayer ? (boost.sns || 0) : 0));
    const preVote = Math.round(power * 0.35 + r('pv', 30) + (isPlayer ? (boost.vote || 0) : 0));
    // 放送 = 舞台完成度，受士气影响（这是情感线的兑现口）
    const broadcast = Math.round(
      power * 0.35 + r('bc', 20) + (isPlayer ? ((morale - 50) * 0.3 + (boost.broadcast || 0)) : 0)
    );
    const c = (v: number) => Math.max(0, Math.round(v));
    const s = { group: g, digital: c(digital), physical: c(physical), sns: c(sns), preVote: c(preVote), broadcast: c(broadcast), total: 0 };
    s.total = s.digital + s.physical + s.sns + s.preVote + s.broadcast;
    return s;
  };

  const scores = [mk(playerGroup, true), ...rivals.map(g => mk(g, false))];
  scores.sort((a, b) => b.total - a.total);
  return { winner: scores[0].group, scores };
}
