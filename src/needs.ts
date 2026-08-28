// 需求 / 心情系统（Tomodachi Life 的心跳）
// —— 每个爱豆在某个时段"有没有需求、是什么需求"用便宜的确定性哈希算出来，不调 AI、不烧钱。
// 玩家点头顶冒泡的爱豆 = 进一段短小的"碎片剧场"（AI 只在这时才被调）。

export type NeedKind = 'hungry' | 'bored' | 'worry' | 'want' | 'matchmake' | 'share' | 'happy';

export interface Need {
  kind: NeedKind;
  emoji: string;
  label: string;          // 冒泡/提示用的短标签
  seed: string;           // 喂给 vignette prompt 的一行情境（{name} 会被替换成爱豆名）
  quickHints: string[];   // 2-3 个非常具体的玩家快捷回应（做成 chip）
  targetName?: string;    // matchmake：想牵线的对象
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const MOOD_EMOJI = ['🙂', '😌', '😐', '😴', '🥱', '😆', '😶', '🤔'];

// 无需求时头顶的心情表情（确定性，随时段轻微漂移）—— 让每个人头上总有点东西，很 Tomodachi
export function getMoodEmoji(memberId: string, day: number, slot: number): string {
  return MOOD_EMOJI[hash(`${memberId}|mood|${day}-${slot}`) % MOOD_EMOJI.length];
}

const TEMPLATES: Record<NeedKind, Omit<Need, 'targetName'>> = {
  hungry:  { kind: 'hungry',  emoji: '😋', label: '想吃东西', seed: '{name}饿了，馋某样很具体的吃的（你来定是什么，要符合她的性格和此刻处境）。', quickHints: ['请她吃', '带她去买宵夜', '说我也饿了一起'] },
  bored:   { kind: 'bored',   emoji: '🥱', label: '闲得慌',   seed: '{name}闲得发慌，想找点乐子或者有人陪。', quickHints: ['陪她玩会儿', '带她去个地方', '逗逗她'] },
  worry:   { kind: 'worry',   emoji: '💭', label: '有心事',   seed: '{name}心里压着点事（工作/状态/人际，符合她性格），没主动说出来，但看得出。', quickHints: ['问她怎么了', '安静陪着', '说点轻松的岔开'] },
  want:    { kind: 'want',    emoji: '🎁', label: '想要个东西', seed: '{name}最近惦记着想要某样东西（你来定，符合她性格）。', quickHints: ['答应帮她弄到', '先问清楚是什么', '打趣她'] },
  matchmake:{ kind: 'matchmake', emoji: '💘', label: '想让你牵线', seed: '{name}想让你帮她跟【{target}】拉近一点（做朋友或更进一步，看她性格），有点不好意思开口。', quickHints: ['帮她约{target}', '先替她打听', '调侃她'] },
  share:   { kind: 'share',   emoji: '🎤', label: '想分享',   seed: '{name}有点小得意，想拉着你看/说一件最近的事（新歌、练习成果、日常小成就，符合她性格）。', quickHints: ['捧场夸她', '认真听', '开玩笑泼冷水'] },
  happy:   { kind: 'happy',   emoji: '✨', label: '心情很好', seed: '{name}今天心情特别好，看到你就想拉着你一起高兴。', quickHints: ['一起开心', '问她什么好事', '顺势约她'] },
};

// 根据性格文本给需求类型加权（很轻的偏向，够用就行）
function weightedKinds(persona: string): NeedKind[] {
  const pool: NeedKind[] = ['hungry', 'bored', 'worry', 'want', 'matchmake', 'share', 'happy'];
  const bump = (k: NeedKind, n: number) => { for (let i = 0; i < n; i++) pool.push(k); };
  const p = persona || '';
  if (/吃|美食|饿|零食|外卖/.test(p)) bump('hungry', 2);
  if (/累|压力|焦虑|完美|内耗|敏感|emo|崩/.test(p)) bump('worry', 2);
  if (/话痨|活泼|外向|综艺|逗|闹|社牛|开朗/.test(p)) { bump('share', 1); bump('happy', 1); }
  if (/懒|宅|无聊|摆烂|随性/.test(p)) bump('bored', 2);
  if (/恋|暧昧|八卦|磕|撮合|少女心/.test(p)) bump('matchmake', 1);
  return pool;
}

/**
 * 算出某个爱豆此刻的需求。约 45% 概率有需求；联系不上（在外地/行程中）时没有需求。
 * @param others 可用于 matchmake 牵线的候选（一般传本场在场或本团其他人）
 */
export function getNeed(
  member: { id: string; realPersonality?: string; publicPersona?: string },
  day: number,
  slot: number,
  available: boolean,
  others: { id: string; name: string }[] = [],
): Need | null {
  if (!available) return null;
  const roll = hash(`${member.id}|need|${day}-${slot}`) % 100;
  if (roll >= 45) return null;

  const pool = weightedKinds(`${member.realPersonality || ''} ${member.publicPersona || ''}`);
  let kind = pool[hash(`${member.id}|needkind|${day}-${slot}`) % pool.length];

  let targetName: string | undefined;
  if (kind === 'matchmake') {
    if (others.length === 0) { kind = 'share'; }       // 没人可牵线就退化成"想分享"
    else targetName = others[hash(`${member.id}|mmtarget|${day}-${slot}`) % others.length].name;
  }

  const t = TEMPLATES[kind];
  const fill = (s: string) => s.replace(/\{name\}/g, '她').replace(/\{target\}/g, targetName || '那个人');
  return {
    kind,
    emoji: t.emoji,
    label: t.label,
    seed: fill(t.seed),
    quickHints: t.quickHints.map(fill),
    targetName,
  };
}
