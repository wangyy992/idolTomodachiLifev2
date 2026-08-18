import React from 'react';
import { Palette, Heart } from 'lucide-react';
import { Member } from './types';
import { getDefaultAppearance, getPlayerAppearance, normalizeAppearance, type Appearance } from './spriteUtils';
import { SpritePreview } from './FaceCustomizer';
import { PLAYER, pairKey, deriveType, hasFlag, type Intent, type WorldRelation } from './relations';
import { TIME_SLOTS } from './worldConfig';

const INTENT_ICON: Record<Intent, string> = { romance: '♥', friend: '🧑', none: '·' };

export default function WorldPanel({
  members, playerName, playerAppearance, appearances, relations, intents, day, slot, onCustomize, lang,
}: {
  members: Member[];
  playerName: string;
  playerAppearance?: Appearance;
  appearances: Record<string, Appearance>;
  relations: Record<string, WorldRelation>;
  intents: Record<string, Intent>;
  day: number; slot: number;
  onCustomize: (t: { kind: 'player' } | { kind: 'idol'; id: string }) => void;
  lang: string;
}) {
  const tw = lang === 'traditional';
  const playerA = normalizeAppearance(playerAppearance, getPlayerAppearance(playerName || 'you'));

  return (
    <div className="flex flex-col gap-5">
      {/* 玩家卡片 */}
      <div className="rounded-2xl p-4 text-white shadow-lg relative overflow-hidden border border-[rgba(201,162,39,0.35)]" style={{ background: 'linear-gradient(135deg, #6C79C4, #454F87)' }}>
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-3">
          <div className="rounded-2xl bg-white/15 p-1 flex items-center justify-center" style={{ imageRendering: 'pixelated' }}><SpritePreview appearance={playerA} size={52} /></div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-black truncate">{playerName || (tw ? '你' : '你')}</div>
            <div className="text-[10px] text-white/75 font-bold mt-0.5">{tw ? `第${day}天` : `第${day}天`} · {TIME_SLOTS[slot]}</div>
          </div>
          <button onClick={() => onCustomize({ kind: 'player' })} title={tw ? '捏臉' : '捏脸'} className="p-2 rounded-xl bg-white/15 hover:bg-white/30 transition-colors"><Palette className="w-4 h-4" /></button>
        </div>
      </div>

      {/* 你的爱豆 */}
      <div>
        <h3 className="gold-caption mb-2.5 flex items-center gap-1.5"><Heart className="w-3 h-3" /> {tw ? '你的愛豆' : '你的爱豆'}</h3>
        <div className="flex flex-col gap-2">
          {members.map(m => {
            const romance = intents[m.id] === 'romance';
            const confessed = hasFlag(relations[pairKey(PLAYER, m.id)], 'confessed');
            const type = deriveType(m.affection || 0, 0, { romance, confessed });
            const intent = intents[m.id] || 'none';
            return (
              <button key={m.id} onClick={() => onCustomize({ kind: 'idol', id: m.id })} className="group w-full flex items-center gap-2.5 p-2 rounded-2xl bg-white/[0.03] border border-[rgba(201,162,39,0.15)] hover:border-[rgba(201,162,39,0.45)] transition-all">
                <div className="rounded-xl bg-white/[0.05] p-0.5 flex-shrink-0"><SpritePreview appearance={normalizeAppearance(appearances[m.id], getDefaultAppearance(m.id))} size={36} /></div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black text-[#F1ECFF] truncate">{m.name}</span>
                    <span className="text-[8px] font-black text-[#C9A227] uppercase tracking-[0.05em] whitespace-nowrap">{type}</span>
                    {intent !== 'none' && <span className="text-[9px]" style={{ color: intent === 'romance' ? '#FF7A93' : '#B7A9E8' }}>{INTENT_ICON[intent]}</span>}
                  </div>
                  <div className="h-[3px] bg-white/[0.08] rounded-full overflow-hidden mt-1.5"><div className="h-full rounded-full transition-all" style={{ width: `${m.affection || 0}%`, background: 'linear-gradient(90deg,#6C79C4,#C9A227)' }} /></div>
                </div>
                <span className="text-[9px] font-mono font-bold text-[#8B86B8] flex-shrink-0">{m.affection || 0}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[9px] text-[#8B86B8]/70 mt-2.5 px-1">{tw ? '點頭像捏臉；進世界走近她們觸發劇情。' : '点头像捏脸；进世界走近她们触发剧情。'}</p>
      </div>
    </div>
  );
}
