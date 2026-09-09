import React, { useEffect, useState } from 'react';
import { X, Send, ChevronDown, MessageSquareText, Check, RotateCcw } from 'lucide-react';
import { Member } from './types';
import { getPlayerAppearance, getDefaultAppearance, normalizeAppearance, type Appearance } from './spriteUtils';
import { SpritePreview } from './FaceCustomizer';
import type { ScriptEntry } from './App';
import type { RequestProgress } from './chatClient';

export default function SceneView({
  members, playerName, appearances, playerAppearance, sceneBg, sceneLabel,
  script, options, isLoading, lang, onChoose, onSend, onLeave,
  initialIndex = 0, onProgress, requestProgress, requestError, onCancel, onRetry,
  draft = '', needLabel, needDone, canCompleteNeed, onCompleteNeed,
}: {
  members: Member[]; playerName: string; appearances: Record<string, Appearance>;
  playerAppearance?: Appearance; sceneBg: string; sceneLabel: string;
  script: ScriptEntry[]; options: { text: string; action: string }[];
  isLoading: boolean; lang: string;
  onChoose: (action: string) => void; onSend: (text: string) => void; onLeave: () => void;
  initialIndex?: number; onProgress?: (index: number) => void;
  requestProgress?: RequestProgress | null; requestError?: string | null;
  onCancel: () => void; onRetry: () => void; draft?: string;
  needLabel?: string; needDone?: boolean; canCompleteNeed?: boolean; onCompleteNeed?: () => void;
}) {
  const tw = lang === 'traditional';
  const [idx, setIdx] = useState(initialIndex);
  const [typed, setTyped] = useState('');
  const [input, setInput] = useState(draft);
  const [showInput, setShowInput] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const scriptKey = script.map(s => (s.kind === 'line' ? s.speaker + ':' : '') + s.text).join('|');
  useEffect(() => { setIdx(Math.min(initialIndex, Math.max(0, script.length - 1))); }, [scriptKey]);
  useEffect(() => { if (draft) { setInput(draft); setShowInput(true); } }, [draft]);
  useEffect(() => {
    if (!isLoading) { setElapsed(0); return; }
    const timer = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isLoading]);
  const entry = script[idx];
  const atEnd = idx >= script.length - 1;
  const [skipTyping, setSkipTyping] = useState(false);
  useEffect(() => { setSkipTyping(false); }, [idx, scriptKey]);
  useEffect(() => {
    setTyped('');
    if (!entry) return;
    if (skipTyping || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setTyped(entry.text); return; }
    let n = 0;
    const timer = setInterval(() => {
      n += 2; setTyped(entry.text.slice(0, n));
      if (n >= entry.text.length) clearInterval(timer);
    }, 24);
    return () => clearInterval(timer);
  }, [idx, scriptKey, skipTyping]);
  const typing = !!entry && typed.length < entry.text.length;
  const advance = () => {
    if (typing) { setSkipTyping(true); return; }
    if (!atEnd) { setIdx(i => i + 1); onProgress?.(idx + 1); }
  };
  const cast = [
    ...members.map(m => ({ id: m.id, name: m.name, appearance: normalizeAppearance(appearances[m.id], getDefaultAppearance(m.id)) })),
    { id: '__player__', name: playerName || '你', appearance: normalizeAppearance(playerAppearance, getPlayerAppearance(playerName || 'you')) },
  ];
  const send = () => { if (!input.trim() || isLoading) return; onSend(input.trim()); setInput(''); setShowInput(false); };
  return (
    <section className="dialogue-screen fixed inset-0 z-[160] flex flex-col text-white" style={{ background: sceneBg }} role="dialog" aria-modal="true" aria-label="当前对话">
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#171326]/40 via-transparent to-[#171326]/90" />
      <header className="relative flex items-center justify-between gap-3 p-3 sm:p-5 shrink-0">
        <span className="rounded-full bg-black/40 px-4 py-2 text-sm">{sceneLabel}</span>
        <button onClick={onLeave} className="min-h-11 px-4 rounded-full bg-white/90 text-[#29233e] flex items-center gap-2 text-sm"><X size={16} />{tw ? '暫別 · 進度保留' : '暂别 · 进度保留'}</button>
      </header>
      <div className="relative flex-1 min-h-0 overflow-y-auto dialogue-content px-4 pb-4 sm:px-6">
        <div className="dialogue-cast flex justify-center items-end gap-3 sm:gap-10 py-3">
          {cast.map(c => {
            const active = entry?.kind === 'line' && (entry.speaker.includes(c.name) || c.name.includes(entry.speaker));
            return <div key={c.id} className={`flex flex-col items-center transition-opacity ${entry?.kind === 'line' && !active ? 'opacity-55' : ''}`}>
              <div className="dialogue-sprite"><SpritePreview appearance={c.appearance} size={96} /></div>
              <span className={`text-xs px-3 py-1 rounded-full ${active ? 'bg-[#6C79C4]' : 'bg-black/40'}`}>{c.id === '__player__' ? '你' : c.name}</span>
            </div>;
          })}
        </div>
        <div className="max-w-3xl mx-auto rounded-3xl bg-[#18142b]/95 border border-[#a69bd1]/40 shadow-xl p-5 sm:p-7">
          {needLabel && <div className="mb-3 text-xs text-[#d9ceaa]">{needDone ? '✓ 已完成照顾' : '这次的小心愿'} · {needLabel}</div>}
          <button onClick={advance} className="block w-full text-left min-h-24" aria-label={typing ? '显示完整文字' : !atEnd ? '阅读下一段' : '当前对话'}>
            {entry?.kind === 'line' && <span className="block text-sm font-bold text-[#c7bcf4] mb-3">{entry.speaker}</span>}
            <span className="block text-base sm:text-lg leading-relaxed whitespace-pre-wrap">{entry ? typed : isLoading ? '正在等待回应…' : '可以继续刚才的话题。'}</span>
            {!atEnd && <span className="flex justify-end items-center gap-1 text-xs text-white/60 mt-4">点击继续 <ChevronDown size={14}/></span>}
          </button>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
            <span>{script.length ? `${Math.min(idx + 1, script.length)} / ${script.length}` : ''}</span>
            {atEnd && !isLoading && <button className="min-h-11 px-2 flex items-center gap-2 text-white/85" onClick={() => setShowInput(v => !v)}><MessageSquareText size={16}/>{showInput ? '返回选项' : '自己说点什么'}</button>}
          </div>
          {isLoading && <div role="status" aria-live="polite" className="mt-3 flex flex-wrap justify-between gap-3 items-center text-sm text-[#d5cbea]">
            <span>{requestProgress?.phase === 'retrying' ? `连接较慢，正在重试（${requestProgress.attempt}/3）` : elapsed >= 15 ? '回应还在生成，可以稍等或取消' : '正在回应…'} <span className="text-white/50">{elapsed}s</span></span>
            <button onClick={onCancel} className="min-h-11 px-4 rounded-xl border border-white/25">取消等待</button>
          </div>}
          {requestError && !isLoading && <div role="alert" className="mt-3 p-3 rounded-xl bg-[#4f2938]/60 text-sm"><p>{requestError}</p><button onClick={onRetry} className="min-h-11 flex gap-2 items-center"><RotateCcw size={15}/>重试刚才的行动</button></div>}
        </div>
        {atEnd && !typing && !isLoading && <div className="max-w-3xl mx-auto mt-3 grid gap-2">
          {showInput ? <form onSubmit={e => { e.preventDefault(); send(); }} className="flex gap-2">
            <input aria-label="自由对话" value={input} onChange={e => setInput(e.target.value)} placeholder="想说什么，或想做什么？" className="min-w-0 flex-1 rounded-2xl bg-white text-[#29233e] px-4 py-3 text-base" />
            <button aria-label="发送" disabled={!input.trim()} className="min-w-12 rounded-2xl bg-[#6C79C4] p-3 disabled:opacity-40"><Send size={18}/></button>
          </form> : options.map((o, i) => <button key={i} onClick={() => onChoose(o.action)} className="flex gap-3 items-center min-h-12 bg-[#f5f1ff] text-[#29233e] text-left px-4 py-3 rounded-2xl text-sm sm:text-base hover:bg-white">
            <span className="text-[#72638c] font-bold">{String.fromCharCode(65+i)}</span>{o.text.replace(/^[A-C][.、。]\s*/, '')}
          </button>)}
          {needLabel && !needDone && canCompleteNeed && <button onClick={onCompleteNeed} className="min-h-11 rounded-xl border border-[#c9b67b]/50 text-[#eee0ad] text-sm flex items-center justify-center gap-2"><Check size={16}/>这件事已经办好 · 完成照顾</button>}
        </div>}
      </div>
    </section>
  );
}
