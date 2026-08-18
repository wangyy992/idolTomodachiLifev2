// 结局 / 结算：结局是条件触发的，玩家自己决定何时收；年末只是章节结算 + 可选收尾点。
// 明确的 END 一直挂在那儿（有目标、可达成、可收口）＝收敛；
// 收不收由玩家定，日常甜蜜和随机事件可以一直玩 ＝不硬切。

import type { Member } from './types';
import type { WorldRelation } from './relations';

export type EndingKind = 'romance' | 'matchmaker' | 'witness' | 'be';

export interface Ending {
  kind: EndingKind;
  title: string;
  subtitle: string;
  body: string;
  icon: string;
  color: string;
}

export interface EndingCtx {
  playerName: string;
  members: Member[];
  targets: string[];
  relations: Record<string, WorldRelation>;
  matchmakes: string[];
  intents: Record<string, string>;
  exposure: number;
  day: number;
  confessedIds: string[];   // 已确认关系的爱豆
  pairedKeys: string[];     // 已成对的撮合 CP
}

// 可以收尾了吗？返回当前可达成的结局（没有就是 null）
export function availableEnding(ctx: EndingCtx): Ending | null {
  // BE 优先：曝光爆表
  if (ctx.exposure >= 100) {
    return {
      kind: 'be', icon: '💔', color: '#c0392b',
      title: '爆料',
      subtitle: '倒计时结束了',
      body: '那篇报道最终还是发了出来。你们谁都没来得及说最后一句话——从那天起，她的名字后面永远跟着一个括号。',
    };
  }
  // 脚踏多条船被抓：同时和 2 人以上确认关系
  if (ctx.confessedIds.length >= 2) {
    const names = ctx.confessedIds.map(id => ctx.members.find(m => m.id === id)?.name).filter(Boolean).join('、');
    return {
      kind: 'be', icon: '💔', color: '#c0392b',
      title: '两头空',
      subtitle: '你想要的太多了',
      body: `${names} 最后都知道了。没有争吵，只是不再回你的消息——这大概是最体面也最难受的结束方式。`,
    };
  }
  // 恋爱 END
  if (ctx.confessedIds.length === 1) {
    const m = ctx.members.find(x => x.id === ctx.confessedIds[0]);
    if (m) {
      return {
        kind: 'romance', icon: '💗', color: '#FF7A93',
        title: `与 ${m.name} 的结局`,
        subtitle: '你们把这件事撑了下来',
        body: `从陌生到现在，中间隔着无数个必须装作不认识的瞬间。你们没有把它变成新闻，只是把它变成了日常——这已经是这个行业里最奢侈的事。`,
      };
    }
  }
  // 红娘 END
  if (ctx.pairedKeys.length >= 1) {
    const names = ctx.pairedKeys.map(k => {
      const [a, b] = k.split('|');
      const na = ctx.members.find(m => m.id === a)?.name;
      const nb = ctx.members.find(m => m.id === b)?.name;
      return na && nb ? `${na}×${nb}` : null;
    }).filter(Boolean).join('、');
    return {
      kind: 'matchmaker', icon: '🔗', color: '#C9A227',
      title: '红娘',
      subtitle: `你撮合成了 ${ctx.pairedKeys.length} 对`,
      body: `${names} —— 她们大概永远不会知道，最初那点微妙的火花是谁在旁边悄悄扇的风。你什么也没得到，但你看着她们走到了一起。`,
    };
  }
  return null;
}

// 年末年鉴：一年结束时的软收尾（不强制结束，只是回顾 + 问要不要收）
export interface YearbookRow { label: string; value: string; tone?: 'gold' | 'pink' | 'muted' }

export function buildYearbook(ctx: EndingCtx, musicShowWins: number): YearbookRow[] {
  const rows: YearbookRow[] = [];
  const tm = ctx.members.filter(m => ctx.targets.includes(m.id));
  const best = [...tm].sort((a, b) => (b.affection || 0) - (a.affection || 0))[0];
  rows.push({ label: '走得最近的人', value: best ? `${best.name}（好感 ${best.affection}）` : '没有特别的人', tone: 'pink' });
  rows.push({ label: '确认关系', value: ctx.confessedIds.length ? ctx.confessedIds.map(id => ctx.members.find(m => m.id === id)?.name).join('、') : '无', tone: ctx.confessedIds.length ? 'pink' : 'muted' });
  rows.push({ label: '撮合成功', value: ctx.pairedKeys.length ? `${ctx.pairedKeys.length} 对` : '0 对', tone: ctx.pairedKeys.length ? 'gold' : 'muted' });
  rows.push({ label: '打歌一位', value: `${musicShowWins} 次`, tone: musicShowWins > 0 ? 'gold' : 'muted' });
  rows.push({
    label: '曝光程度',
    value: ctx.exposure >= 80 ? '被盯上了' : ctx.exposure >= 60 ? '粉圈在传' : ctx.exposure >= 40 ? '公司知道了' : ctx.exposure >= 20 ? '队友察觉' : '没人发现',
    tone: ctx.exposure >= 60 ? 'pink' : 'muted',
  });
  return rows;
}
