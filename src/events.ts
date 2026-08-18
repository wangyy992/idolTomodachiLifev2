// 事件表：数据驱动的小事件/危机。
// A 族 = 按日历阶段触发（回归/巡演/机场/淡季/颁奖）
// B 族 = 按曝光度档位触发（成员察觉 → 公司干预 → 粉圈舆论 → 私生狗仔 → 爆料）
// 事件本身不写死剧情，只给 AI 一条"本轮要演什么"的指令，由 AI 按在场人物性格演绎。

import type { PhaseKind } from './calendar';

export interface GameEvent {
  id: string;
  kind: 'phase' | 'exposure' | 'relation' | 'welfare';
  label: string;            // 给玩家看的标题
  /** 触发条件 */
  phase?: PhaseKind;        // 限定档期
  minExposure?: number;     // 曝光度下限
  maxExposure?: number;     // 曝光度上限
  minAffection?: number;    // 在场爱豆好感下限
  slot?: number;            // 限定时段
  weight: number;           // 权重
  cooldownDays: number;     // 同一事件冷却
  risk?: number;            // 触发时的曝光度基础增量
  /** 喂给 AI 的指令 */
  directive: string;
}

export const EVENTS: GameEvent[] = [
  // ── A 族：回归期 ──────────────────────────────
  { id: 'cb_teaser', kind: 'phase', label: '概念照发布', phase: 'comeback', weight: 3, cooldownDays: 20,
    directive: '本轮围绕新专辑预告/概念照发布展开：公司刚放出物料，她正被一堆反馈包围，情绪在兴奋与焦虑之间。' },
  { id: 'cb_mv', kind: 'phase', label: 'MV 拍摄', phase: 'comeback', weight: 3, cooldownDays: 20,
    directive: '本轮在 MV 拍摄现场：长时间待机、反复重拍、妆造闷热。写出片场的疲惫与专业感。' },
  { id: 'promo_predoc', kind: 'phase', label: '打歌节目预录', phase: 'promo', weight: 3, cooldownDays: 10,
    directive: '本轮在打歌节目预录：候场、走位、和其他团擦肩。时间紧、人多眼杂。' },
  { id: 'promo_fansign', kind: 'phase', label: '签售抽选', phase: 'promo', weight: 2, cooldownDays: 14, risk: 3,
    directive: '本轮与签售会有关：抽选、排队、短短几十秒的对话。写出"公开场合下的私人瞬间"。' },
  { id: 'promo_live', kind: 'phase', label: '直播宣传', phase: 'promo', weight: 2, cooldownDays: 12, risk: 4,
    directive: '本轮有一场宣传直播：弹幕、粉丝解码歌词、她需要小心措辞。若玩家在附近，她可能不小心看向某个方向。' },
  // ── A 族：巡演 ──────────────────────────────
  { id: 'tour_farewell', kind: 'phase', label: '长期异地', phase: 'tour', weight: 3, cooldownDays: 10,
    directive: '本轮主题是"见不到面"：巡演在外地，时差、疲惫、消息回得慢。写出距离带来的不安与克制。' },
  { id: 'tour_stage_hint', kind: 'phase', label: '台上的暗号', phase: 'tour', minAffection: 45, weight: 2, cooldownDays: 20, risk: 6,
    directive: '本轮她在台上说了一句疑似只有玩家听得懂的话。事后两人都没有承认，但粉丝开始讨论。' },
  // ── A 族：颁奖季 / 淡季 ──────────────────────
  { id: 'awards_redcarpet', kind: 'phase', label: '红毯', phase: 'awards', weight: 3, cooldownDays: 20,
    directive: '本轮是年末颁奖季的红毯/后台：所有人都盛装，镜头无处不在，说话都要挑地方。' },
  { id: 'off_hangang', kind: 'phase', label: '汉江夜谈', phase: 'off', slot: 2, weight: 3, cooldownDays: 8,
    directive: '本轮是难得的私下时间：汉江边、便利店、深夜的街。节奏放慢，让她说些平时不会说的话。' },

  // ── B 族：曝光度升级链 ──────────────────────
  { id: 'exp_member', kind: 'exposure', label: '队友察觉', minExposure: 20, maxExposure: 39, weight: 5, cooldownDays: 6,
    directive: '本轮有队友察觉到不对劲：待机室里的玩笑试探、"最近手机看得挺勤啊"。她可能帮忙打掩护，也可能提醒别在回归期分心。' },
  { id: 'exp_company', kind: 'exposure', label: '公司干预', minExposure: 40, maxExposure: 59, weight: 5, cooldownDays: 8,
    directive: '本轮公司介入：经纪人约谈、要求减少私人联系、"回归期不要出问题"。压力是制度性的，不是某个人的恶意。' },
  { id: 'exp_fandom', kind: 'exposure', label: '粉圈舆论', minExposure: 60, maxExposure: 79, weight: 5, cooldownDays: 8,
    directive: '本轮粉圈起疑：韩网论坛热帖、站姐预览图里多出一个身影、脱粉小作文开始流传。写出舆论的窒息感。' },
  { id: 'exp_paparazzi', kind: 'exposure', label: '私生 / 狗仔', minExposure: 80, weight: 6, cooldownDays: 6, risk: 4,
    directive: '本轮出现真正的危险：小区门口的陌生人、被跟的车牌、咖啡店偷拍、旧账号被翻出。恐惧要具体。' },

  // ── 关系向 ──────────────────────────────────
  { id: 'rel_jealous', kind: 'relation', label: '吃醋', minAffection: 45, weight: 3, cooldownDays: 10,
    directive: '本轮她察觉到玩家和别人走得近（或正在撮合她和别人），产生了她自己也说不清的情绪。她不会直说。' },
  { id: 'rel_recognized', kind: 'relation', label: '被认出', minAffection: 25, weight: 2, cooldownDays: 12, risk: 5,
    directive: '本轮在公共场合被粉丝认出，两人不得不立刻拉开距离。写出"上一秒还很近，下一秒必须装作不认识"的落差。' },

  // ── 日常底噪：无门槛，保证开局也有戏可演 ──────
  { id: 'day_tired', kind: 'relation', label: '疲惫的一天', weight: 4, cooldownDays: 5,
    directive: '本轮是普通的一天：她刚结束一段行程，累但还撑着。从很小的细节切入（喝水、揉肩、发呆）。' },
  { id: 'day_smalltalk', kind: 'relation', label: '闲话', weight: 4, cooldownDays: 5,
    directive: '本轮没有大事：聊吃什么、天气、最近看的东西。信息量小，但要让人物性格从对话里透出来。' },
  { id: 'day_work', kind: 'relation', label: '手上的活', weight: 3, cooldownDays: 6,
    directive: '本轮她正专注在某件具体的事上（动作没抠好／歌词记不住／道具坏了）。玩家可以帮忙或旁观。' },
  { id: 'day_interrupt', kind: 'relation', label: '被打断', weight: 3, cooldownDays: 7,
    directive: '本轮两人的独处被打断（工作人员叫她、队友路过、电话响了）。写出"没说完的话"。' },
  { id: 'day_weather', kind: 'relation', label: '天气', slot: 2, weight: 3, cooldownDays: 8,
    directive: '本轮借天气/夜色做文章：突然下雨、风很大、天冷。用环境推动两人靠近或分开。' },

  // ── 福利 ────────────────────────────────────
  { id: 'wel_message', kind: 'welfare', label: '突然的私讯', minAffection: 35, slot: 2, weight: 2, cooldownDays: 10,
    directive: '本轮她在深夜主动发来一条消息，没什么正事，就是想说点什么。' },
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export interface EventCtx {
  day: number;
  slot: number;
  phase: PhaseKind | null;
  exposure: number;
  affection: number;               // 在场爱豆的好感（多人取最高）
  recent: Record<string, number>;  // 事件id → 上次触发的 day
}

// 从事件表里挑一个符合当前情境的事件（确定性：同一天同一时段结果稳定）
export function pickEvent(ctx: EventCtx): GameEvent | null {
  const pool = EVENTS.filter(e => {
    if (e.phase && e.phase !== ctx.phase) return false;
    if (e.minExposure != null && ctx.exposure < e.minExposure) return false;
    if (e.maxExposure != null && ctx.exposure > e.maxExposure) return false;
    if (e.minAffection != null && ctx.affection < e.minAffection) return false;
    if (e.slot != null && e.slot !== ctx.slot) return false;
    const last = ctx.recent[e.id];
    if (last != null && ctx.day - last < e.cooldownDays) return false;
    return true;
  });
  if (!pool.length) return null;
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let r = hash(`ev|${ctx.day}|${ctx.slot}|${ctx.exposure}`) % total;
  for (const e of pool) { r -= e.weight; if (r < 0) return e; }
  return pool[0];
}

// 撮合动词：玩家作为助攻能做的具体动作
export const MATCHMAKE_VERBS = [
  { id: 'relay', label: '传话', hint: '跟其中一人提起另一人（"她昨天问起你"）' },
  { id: 'tease', label: '起哄', hint: '在旁边推一把，把气氛点起来' },
  { id: 'smooth', label: '打圆场', hint: '化解尴尬或冲突，让两人别僵着' },
  { id: 'leave', label: '识趣走开', hint: '主动离开，把独处的机会留给她们' },
] as const;
