import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, ChevronDown, MessageSquareText } from 'lucide-react';
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
  const [typed, setTyped] = useState('');
  const [input, setInput] = useState('');
  const [showInput, setShowInput] = useState(false);

  const scriptKey = script.map(s => (s.kind === 'line' ? s.speaker + ':' : '') + s.text).join('|');
  useEffect(() => { setIdx(0); }, [scriptKey]);

  const entry = script[idx];
  const atEnd = idx >= script.length - 1;

  // 打字机
  useEffect(() => {
    setTyped('');
    if (!entry) return;
    const full = entry.text; let i = 0;
    const t = setInterval(() => { i++; setTyped(full.slice(0, i)); if (i >= full.length) clearInterval(t); }, 16);
    return () => clearInterval(t);
  }, [idx, scriptKey]);

  const isTyping = !!entry && typed.length < entry.text.length;
  const onBox = () => { if (isTyping && entry) setTyped(entry.text); else if (idx < script.length - 1) setIdx(i => i + 1); };

  // 说话人 → 外观
  const you = { key: '__you__', name: playerName || '你', appearance: playerAppearance || getPlayerAppearance(playerName || 'you'), isPlayer: true };
  const cast = [...members.map(m => ({ key: m.id, name: m.name, appearance: appearances[m.id] || getDefaultAppearance(m.id), isPlayer: false })), you];
  const activeSpeaker = entry?.kind === 'line' ? entry.speaker : null;
  const isActive = (c: typeof cast[number]) => !!activeSpeaker && (c.name === activeSpeaker || activeSpeaker.includes(c.name) || c.name.includes(activeSpeaker));
  const activeIdx = cast.findIndex(isActive);

  const send = () => { const t = input.trim(); if (!t || isLoading) return; setInput(''); setShowInput(false); onSend(t); };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[60] flex flex-col overflow-hidden select-none" style={{ background: sceneBg }}>
      {/* 氛围：聚光 + 暗角 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(70% 55% at 50% 42%, rgba(255,245,225,0.14), transparent 70%)' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 180px 40px rgba(10,6,25,0.6)' }} />

      {/* 顶栏 */}
      <div className="relative z-20 flex items-center justify-between p-3">
        <div className="px-3 py-1.5 rounded-full bg-black/35 backdrop-blur-md text-white/95 text-xs font-black tracking-wide border border-white/10">{sceneLabel}</div>
        <button onClick={onLeave} className="px-3.5 py-1.5 rounded-full bg-white/90 text-[#2A2A3D] text-xs font-black flex items-center gap-1 hover:bg-white shadow-lg transition-all"><X className="w-3.5 h-3.5" /> {tw ? '離開' : '离开'}</button>
      </div>

      {/* 舞台 */}
      <div className="relative z-10 flex-1 flex items-end justify-center gap-4 sm:gap-10 pb-3 px-4" onClick={onBox}>
        {cast.map((c, i) => {
          const active = isActive(c);
          const dim = !!activeSpeaker && !active;
          return (
            <motion.div
              key={c.key}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: dim ? 0.45 : 1, y: 0, scale: active ? 1.14 : 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
              className="relative flex flex-col items-center"
              style={{ filter: dim ? 'grayscale(0.55) brightness(0.8)' : 'none', zIndex: active ? 5 : 1 }}
            >
              {/* 聚光 */}
              {active && <div className="absolute -bottom-2 w-32 h-10 rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(255,240,210,0.35), transparent 70%)', filter: 'blur(6px)' }} />}
              <AnimatePresence>
                {active && entry?.kind === 'line' && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute bottom-full mb-3 max-w-[62vw] sm:max-w-xs px-3.5 py-2.5 rounded-3xl rounded-bl-md bg-white text-[#2A2A3D] text-sm font-medium shadow-[0_8px_24px_rgba(30,20,60,0.35)]"
                  >
                    {typed}<span className={isTyping ? 'opacity-100' : 'opacity-0'}>▍</span>
                    <div className="absolute top-full left-6 -mt-1 w-3 h-3 bg-white rotate-45 rounded-sm" />
                  </motion.div>
                )}
              </AnimatePresence>
              {/* 影子 */}
              <div className="absolute bottom-0 w-16 h-3 rounded-full bg-black/35 blur-[3px]" />
              <SpritePreview appearance={c.appearance} size={120} />
              <div className={`mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black transition-colors ${active ? 'bg-[#5B6BB0] text-white shadow-lg' : 'bg-black/35 text-white/80'}`}>{c.isPlayer ? (tw ? '你' : '你') : c.name}</div>
            </motion.div>
          );
        })}
      </div>

      {/* 底部：选项 + 剧情框 */}
      <div className="relative z-20 p-3 sm:p-4">
        <AnimatePresence>
          {atEnd && !isLoading && (showInput || options.length > 0) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-2xl mx-auto mb-2 flex flex-col gap-2">
              {showInput ? (
                <div className="flex gap-2">
                  <input autoFocus value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} placeholder={tw ? '自由行動…' : '自由行动…'} className="flex-1 bg-white/95 rounded-2xl px-4 py-3 text-sm outline-none border border-white/40 text-[#2A2A3D] shadow-lg" />
                  <button onClick={send} className="px-4 rounded-2xl bg-[#5B6BB0] text-white shadow-lg active:scale-95"><Send className="w-4 h-4" /></button>
                </div>
              ) : options.map((o, i) => (
                <motion.button
                  key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                  onClick={() => onChoose(o.action)}
                  className="group w-full text-left pl-4 pr-4 py-3 rounded-2xl bg-white/95 text-[#2A2A3D] text-sm font-bold border border-white/50 shadow-[0_6px_18px_rgba(30,20,60,0.25)] hover:bg-white hover:border-[#FF7A93] hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                  <span className="w-6 h-6 rounded-lg bg-[#E7E6F6] text-[#5B6BB0] text-[11px] font-black flex items-center justify-center group-hover:bg-[#FF7A93] group-hover:text-white transition-colors flex-shrink-0">{'ABC'[i] || '·'}</span>
                  <span className="flex-1">{o.text.replace(/^[A-C][\.、。]\s*/, '')}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 剧情框 */}
        <div onClick={onBox} className="relative max-w-2xl mx-auto rounded-[1.75rem] p-[1.5px] cursor-pointer shadow-[0_10px_40px_rgba(10,6,25,0.5)]" style={{ background: 'linear-gradient(135deg, rgba(123,133,201,0.9), rgba(255,122,147,0.5))' }}>
          <div className="rounded-[1.65rem] bg-[#141127]/85 backdrop-blur-md px-5 pt-4 pb-3 min-h-[92px]">
            {/* 名牌 */}
            {entry?.kind === 'line' && (
              <div className="inline-block -mt-7 mb-1 px-3 py-1 rounded-full bg-[#5B6BB0] text-white text-[11px] font-black shadow-lg">{entry.speaker}</div>
            )}
            {isLoading && atEnd ? (
              <div className="flex gap-1.5 items-center py-2 text-white/70"><span className="w-2 h-2 bg-white/70 rounded-full animate-bounce" /><span className="w-2 h-2 bg-white/70 rounded-full animate-bounce [animation-delay:0.15s]" /><span className="w-2 h-2 bg-white/70 rounded-full animate-bounce [animation-delay:0.3s]" /></div>
            ) : entry ? (
              <div className={`text-[15px] leading-relaxed text-white ${entry.kind === 'narration' ? 'italic text-white/85' : ''}`}>{typed}<span className={isTyping ? 'opacity-90' : 'opacity-0'}>▍</span></div>
            ) : <div className="text-white/50 text-sm py-2">…</div>}

            <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/10">
              <div className="text-[10px] text-white/35 font-mono">{script.length > 1 ? `${Math.min(idx + 1, script.length)} / ${script.length}` : ''}</div>
              {!atEnd && <div className="flex items-center gap-1 text-white/50 text-[10px]"><span>{tw ? '點擊繼續' : '点击继续'}</span><ChevronDown className="w-3.5 h-3.5 animate-bounce" /></div>}
              {atEnd && !isLoading && (
                <button onClick={e => { e.stopPropagation(); setShowInput(v => !v); }} className="flex items-center gap-1 text-white/70 text-[10px] font-bold hover:text-white transition-colors"><MessageSquareText className="w-3.5 h-3.5" /> {tw ? '自由行動' : '自由行动'}</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
