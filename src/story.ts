import { isRecord } from './gameState';
import type { Member } from './types';
import { phaseAt } from './calendar';
export type ContentBlock =
  | { type: 'text'; content: string }
  | { type: 'kkt'; data: any }
  | { type: 'weverse'; data: any }
  | { type: 'bubble'; data: any }
  | { type: 'theqoo'; data: any }
  | { type: 'card'; data: any }
  | { type: 'musicshow'; data: any };

export function sanitizeContentData(raw: unknown): Record<string, any> | null {
  if (!isRecord(raw)) return null;
  const scalars = (value: Record<string, unknown>) => Object.fromEntries(Object.entries(value).filter(([key, v]) =>
    !['__proto__', 'constructor', 'prototype'].includes(key) &&
    (typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))))
    .map(([key, value]) => [key, typeof value === 'string' ? value.slice(0, 8000) : value]));
  const result: Record<string, any> = scalars(raw);
  for (const field of ['messages', 'comments', 'scores']) {
    result[field] = Array.isArray(raw[field]) ? raw[field].filter(isRecord).slice(0, 50).map(scalars) : [];
  }
  result.weaknesses = Array.isArray(raw.weaknesses) ? raw.weaknesses.filter(v => typeof v === 'string').slice(0, 20) : [];
  return result;
}

export function parseContentBlocks(text: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const tags = [
    { start: 'KKTMSG_START', end: 'KKTMSG_END', type: 'kkt' },
    { start: 'WEVERSE_START', end: 'WEVERSE_END', type: 'weverse' },
    { start: 'BUBBLE_START', end: 'BUBBLE_END', type: 'bubble' },
    { start: 'THEQOO_START', end: 'THEQOO_END', type: 'theqoo' },
    { start: 'CARD_START', end: 'CARD_END', type: 'card' },
    { start: 'MUSICSHOW_START', end: 'MUSICSHOW_END', type: 'musicshow' },
  ];

  let remaining = text;
  while (remaining.length > 0) {
    let earliest = { index: Infinity, tag: null as any };
    for (const tag of tags) {
      const idx = remaining.indexOf(tag.start);
      if (idx !== -1 && idx < earliest.index) earliest = { index: idx, tag };
    }

    if (earliest.tag === null) {
      const cleaned = remaining
        .replace(/^\*{0,2}[A-D]\.\*{0,2}.+$/gm, '')
        .replace(/^[A-D][\.、。\s].+$/gm, '')
        .replace(/\[.*?\]/g, '')
        .replace(/^---+$/gm, '')
        .replace(/\n{3,}/g, '\n\n').trim();
      if (cleaned) blocks.push({ type: 'text', content: cleaned });
      break;
    }

    if (earliest.index > 0) {
      const textBefore = remaining.slice(0, earliest.index)
        .replace(/^\*{0,2}[A-D]\.\*{0,2}.+$/gm, '')
        .replace(/^[A-D][\.、。\s].+$/gm, '')
        .replace(/\[.*?\]/g, '')
        .replace(/^---+$/gm, '')
        .replace(/\n{3,}/g, '\n\n').trim();
      if (textBefore) blocks.push({ type: 'text', content: textBefore });
    }

    const endIdx = remaining.indexOf(earliest.tag.end, earliest.index);
    if (endIdx === -1) break;
    const content = remaining.slice(earliest.index + earliest.tag.start.length, endIdx).trim();
    try {
      const data = sanitizeContentData(JSON.parse(content));
      if (data) blocks.push({ type: earliest.tag.type as any, data });
    } catch(e) {}
    remaining = remaining.slice(endIdx + earliest.tag.end.length);
  }

  return blocks;
}

export function extractBlock(text: string, startTag: string, endTag: string): { content: string; remaining: string } | null {
  const start = text.indexOf(startTag);
  if (start === -1) return null;
  const end = text.indexOf(endTag, start + startTag.length);
  if (end === -1) return null;
  const content = text.slice(start + startTag.length, end).trim();
  const remaining = text.slice(0, start) + text.slice(end + endTag.length);
  return { content, remaining };
}

// 回归期由日历决定（不由 AI 说了算）：攻略目标所在团在当天是否处于回归/打歌期
export function comebackOnDay(members: Member[], targets: string[] | undefined, day: number): boolean {
  const g = members.find(m => (targets || []).includes(m.id))?.group;
  const p = g ? phaseAt(g, day) : null;
  return !!p && (p.kind === 'comeback' || p.kind === 'promo');
}

export function parseOptions(text: string): { text: string; action: string }[] {
  const abcdPattern = /^\*{0,2}([A-C])[\.、。\s]\*{0,2}\s*(.+)$/gm;
  const options: { text: string; action: string }[] = [];
  let match;
  while ((match = abcdPattern.exec(text)) !== null) {
    const content = match[2].trim();
    if (content.length > 2 && !content.includes('自由行动')) {
      options.push({ text: `${match[1]}. ${content}`, action: content });
    }
  }
  if (options.length >= 2) return options;
  const numberedPattern = /^\d+[\.、]\s*(.+)$/gm;
  const numbered: { text: string; action: string }[] = [];
  while ((match = numberedPattern.exec(text)) !== null) {
    const content = match[1].trim();
    if (content.length > 2) numbered.push({ text: content, action: content });
  }
  if (numbered.length >= 2) return numbered;
  return [];
}

export type ScriptEntry = { kind: 'narration'; text: string } | { kind: 'line'; speaker: string; text: string };

// 把叙事正文解析成"旁白/台词"序列，做 VN 演出用；AI 不守格式时优雅降级为整段旁白
export function parseScript(text: string): ScriptEntry[] {
  const out: ScriptEntry[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (let line of lines) {
    if (/^\*{0,2}[A-C][\.、。]/.test(line)) continue;       // 选项行
    if (/^【.*】/.test(line)) continue;                     // 【本轮可选行动】等标题
    if (/^-{3,}$/.test(line)) continue;
    line = line.replace(/^\*+/, '').replace(/\*+$/, '').trim();
    let m = line.match(/^(旁白|旁白君|N|narration)[：:]\s*(.+)$/i);
    if (m) { out.push({ kind: 'narration', text: m[2].trim() }); continue; }
    // 角色名：「台词」
    m = line.match(/^([^\s：:，。！？、]{1,8})[：:]\s*[「"“](.+?)[」"”]?$/);
    if (m) { out.push({ kind: 'line', speaker: m[1].trim(), text: m[2].replace(/[」"”]\s*$/, '').trim() }); continue; }
    // 角色名：台词（无引号，名字较短）
    m = line.match(/^([^\s：:，。！？、]{2,6})[：:]\s*(.+)$/);
    if (m) { out.push({ kind: 'line', speaker: m[1].trim(), text: m[2].trim() }); continue; }
    out.push({ kind: 'narration', text: line });
  }
  return out.length ? out : [{ kind: 'narration', text: text.trim() }];
}

