import React, { useEffect, useRef, useState } from 'react';
import { X, Send, ChevronDown } from 'lucide-react';
import { Member } from './types';
import { getPlayerAppearance, getDefaultAppearance, type Appearance } from './spriteUtils';
import { SpritePreview } from './FaceCustomizer';
import type { ScriptEntry } from './App';

export default function SceneView({
  members, playerName, appearances, playerAppearance, sceneBg, sceneLabel,
  script, options, isLoading, lang, onChoose, onSend, onLeave,
}: {
  members: Member[];
  playerName: string;
  appearances: Record<string, Appearance>;
  playerAppearance?: Appearance;
  sceneBg: string;
  sceneLabel: string;
  script: ScriptEntry[];
  options: { text: string; action: string }[];
  isLoading: boolean;
  lang: string;
  onChoose: (action: string) => void;
  onSend: (text: string) => void;
  onLeave: () => void;
}) {
  const tw = lang === 'traditional';
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [showInput, setShowInput] = useState(false);

  // 新剧本到来时从头播放
  const scriptKey = script.map(s => (s.kind === 'line' ? s.speaker + ':' : '') + s.text).join('|');
  useEffect(() => { setIdx(0); }, [scriptKey]);

  const entry = script[idx];
  const atEnd = idx >= script.length - 1;
  const advance = () => { if (idx < script.length - 1) setIdx(i => i + 1); };

  // 说话人 → 外观
  const you = { name: playerName || '你', appearance: playerAppearance || getPlayerAppearance(playerName || 'you'), isPlayer: true };
  const cast = [you, ...members.map(m => ({ name: m.name, appearance: appearances[m.id] || getDefaultAppearance(m.id), isPlayer: false }))];
  const activeSpeaker = entry?.kind === 'line' ? entry.speaker : null;
  const matchSpeaker = (c: typeof cast[number]) => activeSpeaker && (c.name === activeSpeaker || activeSpeaker.includes(c.name) || c.name.includes(activeSpeaker));

  const send = () => { const t = input.trim(); if (!t || isLoading) return; setInput(''); setShowInput(false); onSend(t); };

  return (
    <div className="absolute inset-0 z-[60] flex flex-col overflow-hidden" style={{ background: sceneBg }}>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.45))' }} />

      {/* 顶栏 */}
      <div className="relative z-10 flex items-center justify-between p-3">
        <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur text-white text-xs font-black">{sceneLabel}</div>
        <button onClick={onLeave} className="px-3 py-1.5 rounded-full bg-white/90 text-[#2A2A3D] text-xs font-black flex items-center gap-1 hover:bg-white"><X className="w-3.5 h-3.5" /> {tw ? '離開' : '离开'}</button>
      </div>

      {/* 舞台：说话人 + 气泡 */}
      <div className="relative z-10 flex-1 flex items-end justify-center gap-6 pb-2 px-4" onClick={advance}>
        {cast.map(c => {
          const active = matchSpeaker(c);
          const showBubble = active && entry?.kind === 'line';
          return (
            <div key={c.name} className="relative flex flex-col items-center transition-all duration-300" style={{ opacity: activeSpeaker ? (active ? 1 : 0.4) : 0.9, transform: active ? 'scale(1.12)' : 'scale(1)', filter: activeSpeaker && !active ? 'grayscale(0.5)' : 'none' }}>
              {showBubble && (
                <div className="absolute bottom-full mb-2 max-w-[60vw] sm:max-w-xs px-3 py-2 rounded-2xl bg-white text-[#2A2A3D] text-sm font-medium shadow-lg animate-[fadeIn_0.2s]">
                  {entry.text}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-8 border-transparent border-t-white" />
                </div>
              )}
              <SpritePreview appearance={c.appearance} size={96} />
              <div className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-black ${active ? 'bg-[#5B6BB0] text-white' : 'bg-black/40 text-white/80'}`}>{c.isPlayer ? (tw ? '你' : '你') : c.name}</div>
            </div>
          );
        })}
      </div>

      {/* 底部：旁白/剧情框 + 选项 */}
      <div className="relative z-10 p-3 sm:p-4">
        {/* 选项 */}
        {atEnd && !isLoading && options.length > 0 && (
          <div className="max-w-2xl mx-auto mb-2 space-y-2">
            {options.map((o, i) => (
              <button key={i} onClick={() => onChoose(o.action)} className="w-full text-left px-4 py-2.5 rounded-xl bg-white/95 text-[#2A2A3D] text-sm font-bold border border-[#DAD8EE] hover:bg-[#E7E6F6] transition-all">{o.text}</button>
            ))}
          </div>
        )}

        {/* 自由输入 */}
        {atEnd && !isLoading && showInput && (
          <div className="max-w-2xl mx-auto mb-2 flex gap-2">
            <input autoFocus value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} placeholder={tw ? '自由行動…' : '自由行动…'} className="flex-1 bg-white rounded-xl px-4 py-2.5 text-sm outline-none border border-[#DAD8EE] text-[#2A2A3D]" />
            <button onClick={send} className="px-4 rounded-xl bg-[#5B6BB0] text-white"><Send className="w-4 h-4" /></button>
          </div>
        )}

        {/* 剧情框 */}
        <div className="max-w-2xl mx-auto rounded-2xl bg-black/70 backdrop-blur text-white p-4 shadow-xl cursor-pointer min-h-[76px] flex flex-col justify-center" onClick={advance}>
          {isLoading && idx >= script.length - 1 ? (
            <div className="flex gap-1.5 items-center text-white/70"><span className="w-2 h-2 bg-white/70 rounded-full animate-bounce" /><span className="w-2 h-2 bg-white/70 rounded-full animate-bounce [animation-delay:0.15s]" /><span className="w-2 h-2 bg-white/70 rounded-full animate-bounce [animation-delay:0.3s]" /></div>
          ) : entry ? (
            <>
              {entry.kind === 'line' && <div className="text-[11px] font-black text-[#9db0ee] mb-1">{entry.speaker}</div>}
              <div className={`text-sm leading-relaxed ${entry.kind === 'narration' ? 'italic text-white/90' : ''}`}>{entry.text}</div>
            </>
          ) : <div className="text-white/60 text-sm">…</div>}

          {/* 进度/继续指示 */}
          <div className="flex items-center justify-between mt-2">
            <div className="text-[10px] text-white/40">{script.length > 1 ? `${Math.min(idx + 1, script.length)}/${script.length}` : ''}</div>
            {!atEnd && <ChevronDown className="w-4 h-4 text-white/60 animate-bounce" />}
            {atEnd && !isLoading && (
              <button onClick={e => { e.stopPropagation(); setShowInput(v => !v); }} className="text-[10px] text-white/70 underline">{tw ? '自由行動' : '自由行动'}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
