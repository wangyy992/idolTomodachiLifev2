// 统一关系模型：玩家↔爱豆、爱豆↔爱豆共用一套 { affinity, tension, type }。
// - 爱豆↔爱豆：数值存在 GameState.worldRelations（初始来自各成员的 initialRelationships）。
// - 玩家↔爱豆：亲密度沿用 member.affection（AI 每轮更新），这里只额外存"表白"等 flag。
import { Member } from './types';

export const PLAYER = '__player__';

export interface WorldRelation {
  affinity: number;
  tension: number;
  note?: string;
  flags?: string[]; // 例如 'confessed'（已表白/确认关系）
}

export type Intent = 'romance' | 'friend' | 'none';

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// 由数值 + 意图/flag 推导关系名
export function deriveType(
  affinity: number,
  tension: number,
  opts: { romance?: boolean; confessed?: boolean } = {}
): string {
  const { romance = false, confessed = false } = opts;
  if (tension >= 65 && affinity < 55) return '交恶';
  if (tension >= 50 && affinity < 45) return '疏远';
  if (affinity >= 90) return confessed ? '恋人' : romance ? '深度暧昧' : '挚友';
  if (affinity >= 75) return romance ? '暧昧' : '好友';
  if (affinity >= 60) return '朋友';
  if (affinity >= 45) return '普通认识';
  if (affinity >= 25) return '眼熟';
  return '陌生';
}

// 关系名对应的色调（面板用）
export function typeColor(type: string): string {
  if (type === '恋人' || type === '深度暧昧' || type === '暧昧') return '#FF7A93';
  if (type === '挚友' || type === '好友') return '#16a085';
  if (type === '朋友') return '#2980b9';
  if (type === '疏远' || type === '交恶') return '#c0392b';
  return '#454F87';
}

// 从成员的 initialRelationships 生成爱豆↔爱豆关系表
export function seedIdolRelations(members: Member[]): Record<string, WorldRelation> {
  const out: Record<string, WorldRelation> = {};
  for (const m of members) {
    for (const r of (m.initialRelationships || [])) {
      const k = pairKey(m.id, r.targetId);
      if (!out[k]) out[k] = { affinity: r.affinity, tension: r.tension, note: r.note };
    }
  }
  return out;
}

export function hasFlag(rel: WorldRelation | undefined, flag: string): boolean {
  return !!rel?.flags?.includes(flag);
}
