// 岛屿新闻：世界自己过日子——同地点的爱豆之间自发相处，攒成有性格的动态。
// 全部确定性/便宜逻辑，不调 AI；关系数值的实际增减仍由 App.handleAdvanceTime 掌握，
// 这里只负责"把这次相处写成一句有画面的话"，以及在跨过关系门槛时给一条大新闻。

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const pick = <T,>(arr: T[], seed: number): T => arr[((Math.trunc(seed) % arr.length) + arr.length) % arr.length];

export interface NewsLine { text: string; kind: 'romance' | 'friendly' | 'tension'; big?: boolean }

// 一对爱豆本次相处 → 一句有画面的动态
export function pairNews(
  aName: string, bName: string, locLabel: string,
  affinity: number, tension: number, isMatch: boolean, seed: string,
): NewsLine {
  const h = hash(seed);
  const at = `在${locLabel}`;

  if (tension >= 55) {
    return { text: pick([
      `${aName}和${bName}${at}气氛有点僵，各玩各的手机`,
      `${aName}和${bName}好像又为什么小事别着劲`,
      `${aName}${at}没怎么理${bName}`,
    ], h), kind: 'tension' };
  }
  if (isMatch && affinity >= 45) {
    return { text: pick([
      `${aName}和${bName}并排走的时候，手背碰到了一下，谁都没说话`,
      `${aName}把耳机分了一半给${bName}，两个人听着同一首歌`,
      `${bName}偷偷帮${aName}理了下衣领，${at}`,
    ], h), kind: 'romance' };
  }
  if (affinity >= 70) {
    return { text: pick([
      `${aName}和${bName}又黏在一起了，${at}笑得停不下来`,
      `${aName}${at}靠着${bName}打了个盹`,
      `${aName}和${bName}默契到一个眼神就懂，队友都服`,
    ], h), kind: 'friendly' };
  }
  if (affinity >= 40) {
    return { text: pick([
      `${aName}和${bName}${at}一起点了炸鸡，聊到很晚`,
      `${aName}${at}教${bName}一个新动作，两个人练了好久`,
      `${aName}和${bName}拼了单奶茶，为了配料拌了两句嘴又笑了`,
    ], h), kind: 'friendly' };
  }
  return { text: pick([
    `${aName}和${bName}${at}碰到，点头打了个招呼`,
    `${aName}和${bName}${at}各忙各的，偶尔搭一句话`,
    `${aName}${at}帮${bName}捡了下掉的东西`,
  ], h), kind: 'friendly' };
}

// 跨过关系门槛 → 一条大新闻（值得进手机/被队友起哄的那种）
export function crossingNews(
  aName: string, bName: string, oldAff: number, newAff: number, isMatch: boolean,
): NewsLine | null {
  const crossed = (t: number) => oldAff < t && newAff >= t;
  if (isMatch && crossed(60)) return { text: `🌸 ${aName}和${bName}之间那点微妙，好像藏不住了`, kind: 'romance', big: true };
  if (crossed(70)) return { text: `✨ ${aName}和${bName}现在特别合拍，队友都开始起哄`, kind: 'friendly', big: true };
  if (crossed(40)) return { text: `🤝 ${aName}和${bName}处成了无话不说的好朋友`, kind: 'friendly', big: true };
  return null;
}

// 单人心情动态（很稀疏地冒一条，让没有互动的人也活着）
export function soloMood(name: string, persona: string, seed: string): NewsLine | null {
  const h = hash(seed);
  if (h % 100 >= 22) return null; // ~22% 概率
  const good = [
    `${name}今天状态在线，一直在哼歌 🎶`,
    `${name}心情不错，给成员们买了奶茶`,
    `${name}练完舞瘫在地上笑，说自己"又行了"`,
    `${name}今天话特别多，逮谁跟谁聊`,
  ];
  const low = [
    `${name}today有点蔫，靠在墙角没怎么说话`,
    `${name}看起来有心事，练习间隙一直在发呆`,
    `${name}today累到不想动，窝在椅子里刷手机`,
  ];
  const tired = /累|压力|焦虑|内耗|敏感|完美/.test(persona || '');
  const pool = tired && h % 2 === 0 ? low : good;
  return { text: pick(pool, h >> 3).replace('today', '今天'), kind: pool === low ? 'tension' : 'friendly' };
}
