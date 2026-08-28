import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { SpritePreview } from './FaceCustomizer';
import type { Appearance } from './spriteUtils';
import type { Ending, YearbookRow } from './endings';

// 结局卡：像素小人定格 + 结算卡（不画 CG，像素定格更合调性且零成本）
export default function EndingCard({
  ending, yearbook, cast, lang, onClose, onContinue, milestoneLog,
}: {
  ending?: Ending | null;
  yearbook?: YearbookRow[] | null;
  cast: { name: string; appearance: Appearance }[];
  lang: string;
  onClose: () => void;
  onContinue?: () => void;
  milestoneLog?: { title: string; name: string; day: number; memory: string }[];
}) {
  const tw = lang === 'traditional';
  const accent = ending?.color || '#C9A227';

  return (
    <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        className="ink-panel ink-scroll rounded-[26px] w-full max-w-lg max-h-[90%] overflow-auto"
        style={{ borderColor: `${accent}66` }}
        onClick={e => e.stopPropagation()}
      >
        {/* 定格舞台 */}
        <div className="relative flex items-end justify-center gap-6 pt-10 pb-6"
          style={{ background: `radial-gradient(60% 70% at 50% 45%, ${accent}22, transparent 70%)` }}>
          <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[#B7B2D9] flex items-center justify-center"><X className="w-4 h-4" /></button>
          {cast.slice(0, 3).map((c, i) => (
            <div key={i} className="relative flex flex-col items-center">
              <div className="absolute bottom-1 w-16 h-3 rounded-full bg-black/45 blur-[4px]" />
              <div style={{ filter: `drop-shadow(0 0 16px ${accent}88)` }}>
                <SpritePreview appearance={c.appearance} size={96} />
              </div>
              <div className="mt-1 text-[10px] font-black text-[#F1ECFF]">{c.name}</div>
            </div>
          ))}
        </div>

        {ending && (
          <div className="px-7 pb-5 text-center">
            <div className="text-3xl mb-2">{ending.icon}</div>
            <div className="gold-caption mb-1" style={{ color: accent }}>{ending.subtitle}</div>
            <h2 className="text-[22px] font-black text-[#F1ECFF] mb-3">{ending.title}</h2>
            <p className="text-[13.5px] leading-[1.9] text-[#B7B2D9] text-left">{ending.body}</p>
          </div>
        )}

        {milestoneLog && milestoneLog.length > 0 && (
          <div className="px-7 pb-5">
            <div className="gold-caption mb-2.5">{tw ? '這一年的重要時刻' : '这一年的重要时刻'}</div>
            <div className="relative flex flex-col gap-3 pl-4">
              <div className="absolute left-[5px] top-1 bottom-1 w-px bg-[rgba(201,162,39,0.35)]" />
              {milestoneLog.map((e, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full" style={{ background: '#C9A227', boxShadow: '0 0 8px rgba(201,162,39,0.8)' }} />
                  <div className="flex items-baseline gap-2">
                    <span className="text-[9px] font-black text-[#8B86B8]">D{e.day}</span>
                    <span className="text-[12.5px] font-black text-[#F1ECFF]">{e.title}</span>
                    {e.name && <span className="text-[10px] text-[#C9A227]">· {e.name}</span>}
                  </div>
                  {e.memory && <p className="text-[11px] text-[#B7B2D9] leading-relaxed mt-0.5">{e.memory}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {yearbook && yearbook.length > 0 && (
          <div className="px-7 pb-6">
            <div className="gold-caption mb-2.5">{tw ? '這一年' : '这一年'}</div>
            <div className="flex flex-col gap-1.5">
              {yearbook.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-[10px] px-3 py-2 bg-white/[0.03]">
                  <span className="text-[11px] text-[#8B86B8]">{r.label}</span>
                  <span className="text-[12px] font-black" style={{ color: r.tone === 'gold' ? '#C9A227' : r.tone === 'pink' ? '#FF7A93' : '#D8D4EE' }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-7 pb-7 flex gap-2.5">
          {onContinue && (
            <button onClick={onContinue} className="flex-1 py-3 rounded-2xl bg-white/[0.05] border border-white/10 text-[#B7B2D9] text-[13px] font-black hover:bg-white/[0.1] transition-all">
              {tw ? '再來一年' : '再来一年'}
            </button>
          )}
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl text-white text-[13px] font-black transition-all"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}aa)` }}>
            {tw ? '收下這個結局' : '收下这个结局'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
