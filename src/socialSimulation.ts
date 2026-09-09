import type { Member } from './types';
import type { WorldRelation } from './relations';

export const DM_ACTIONS = [
  { id: 'greet', label: '问候近况', text: '今天过得怎么样？' },
  { id: 'encourage', label: '给她打气', text: '今天也辛苦了，记得休息。' },
  { id: 'invite', label: '约咖啡', text: '有空一起喝杯咖啡吗？' },
] as const;
export type DMAction = typeof DM_ACTIONS[number]['id'];
export function dmReply(action: DMAction, member: Pick<Member, 'affection'>, busy: boolean) {
  if (action === 'invite') return busy ? '今天行程排满了，这次先不约，等我有空再说。'
    : member.affection < 30 ? '谢谢邀请，我们再熟悉一点以后吧。' : '好呀，你在咖啡厅碰到我时，过来一起坐吧。';
  if (action === 'encourage') return busy ? '谢谢，看到你的消息了，忙完我会好好休息。'
    : member.affection >= 60 ? '收到，有你这句话就没那么累了。' : '谢谢你的鼓励，我会记得休息的。';
  return busy ? '正在赶行程，今天有点忙，晚点再聊。'
    : member.affection >= 60 ? '刚忙完，想和你聊聊。你今天怎么样？' : '今天还不错，谢谢你惦记。';
}
const hash = (text: string) => {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) { value ^= text.charCodeAt(i); value = Math.imul(value, 16777619); }
  return value >>> 0;
};
export interface SocialEvent { id: string; text: string; affinity: number; tension: number; kind: 'friendly' | 'tension'; }
export function socialEvent(a: Member, b: Member, relation: WorldRelation, location: string, day: number): SocialEvent | null {
  const key = [a.id, b.id].sort().join('|') + ':' + day;
  const roll = hash(key);
  // One possible event per pair per day. Sharing a room alone does not guarantee progress.
  if (roll % 100 >= 35) return null;
  const personal = a.realPersonality + ' ' + b.realPersonality;
  const tense = relation.tension >= 50 || /要强|完美|倔强/.test(personal);
  if (tense && roll % 3 === 0) return {
    id: key, text: `${a.name}和${b.name}在${location}对安排有了分歧，暂时各自冷静。`,
    affinity: -1, tension: 2, kind: 'tension',
  };
  if (/温柔|细腻|照顾|体贴|耐心/.test(personal)) return {
    id: key, text: `${a.name}在${location}注意到${b.name}有些累，主动留下来陪了一会儿。`,
    affinity: 1, tension: -1, kind: 'friendly',
  };
  if (a.group === b.group) return {
    id: key, text: `${a.name}和${b.name}在${location}一起解决了一个工作上的小问题，配合更默契了。`,
    affinity: 1, tension: -1, kind: 'friendly',
  };
  return {
    id: key, text: `${a.name}和${b.name}在${location}聊到共同经历，终于记住了彼此的名字与近况。`,
    affinity: 1, tension: 0, kind: 'friendly',
  };
}
