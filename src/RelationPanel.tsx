import React from 'react';
import { Heart, X, Users, Palette } from 'lucide-react';
import { Member } from './types';
import {
  PLAYER, pairKey, deriveType, hasFlag, type WorldRelation, type Intent,
} from './relations';

const INTENT_LABEL: Record<Intent, string> = { romance: '♥ 攻略', friend: '🧑 朋友', none: '· 随缘' };
const INTENT_ORDER: Intent[] = ['none', 'friend', 'romance'];

export default function RelationPanel({
  members, relations, intents, matchmakes, onSetIntent, onToggleMatchmake, onConfess, onClose, lang, onCustomize,
}: {
  members: Member[];
  relations: Record<string, WorldRelation>;
  intents: Record<string, Intent>;
  matchmakes: string[];
  onSetIntent: (id: string, intent: Intent) => void;
  onToggleMatchmake: (key: string) => void;
  onConfess: (id: string) => void;
  onClose: () => void;
  lang: string;
  onCustomize: (t: { kind: 'player' } | { kind: 'idol'; id: string }) => void;
}) {
  const tw = lang === 'traditional';

  // 爱豆两两之间已有关系的对
  const pairs: { a: Member; b: Member; rel: WorldRelation }[] = [];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const rel = relations[pairKey(members[i].id, members[j].id)];
      if (rel) pairs.push({ a: members[i], b: members[j], rel });
    }
  }

  return (
    <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div className="ink-panel ink-scroll rounded-[20px] p-5 max-w-2xl w-full max-h-[88%] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-black text-[#F1ECFF] flex items-center gap-2"><Users className="w-4 h-4 text-[#C9A227]" /> {tw ? '關係網' : '关系网'}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[#B7B2D9] flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {/* 你 与 爱豆 */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="gold-caption">{tw ? '你 與 愛豆' : '你 与 爱豆'}</div>
          <button onClick={() => onCustomize({ kind: 'player' })} className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-[#B7B2D9] border border-white/10 text-[10px] font-black flex items-center gap-1 hover:bg-white/[0.09] transition-colors"><Palette className="w-3 h-3" /> {tw ? '捏我的臉' : '捏我的脸'}</button>
        </div>
        <div className="flex flex-col gap-2.5 mb-6">
          {members.map(m => {
            const romance = intents[m.id] === 'romance';
            const confessed = hasFlag(relations[pairKey(PLAYER, m.id)], 'confessed');
            const type = deriveType(m.affection, 0, { romance, confessed });
            const canConfess = romance && m.affection >= 75 && !confessed;
            const activeIntent = intents[m.id] || 'none';
            return (
              <div key={m.id} className="rounded-[14px] p-3.5 bg-white/[0.03] border border-[rgba(201,162,39,0.3)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-black text-[#F1ECFF]">{m.name}</span>
                    <span className="text-[9px] font-black text-[#C9A227] uppercase tracking-[0.06em]">{type}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button onClick={() => onCustomize({ kind: 'idol', id: m.id })} title={tw ? '捏臉' : '捏脸'} className="p-1 rounded-lg bg-white/[0.04] text-[#B7B2D9] border border-white/10 hover:bg-white/[0.09] transition-colors"><Palette className="w-3 h-3" /></button>
                    <span className="text-[10px] font-mono font-bold text-[#8B86B8]">{m.affection}/100</span>
                  </div>
                </div>
                <div className="h-[3px] bg-white/[0.08] rounded-full overflow-hidden mb-3">
                  <div className="h-full rounded-full" style={{ width: `${m.affection}%`, background: 'linear-gradient(90deg,#6C79C4,#C9A227)' }} />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {INTENT_ORDER.map(it => {
                    const on = activeIntent === it;
                    return (
                      <button
                        key={it}
                        onClick={() => onSetIntent(m.id, it)}
                        className={`px-3 py-1 rounded-full text-[10px] font-black transition-all border ${on ? 'text-white border-transparent' : 'bg-transparent text-[#B7B2D9] border-white/15 hover:border-white/30'}`}
                        style={on ? { background: 'linear-gradient(135deg,#6C79C4,#454F87)' } : undefined}
                      >
                        {INTENT_LABEL[it]}
                      </button>
                    );
                  })}
                  {canConfess && (
                    <button onClick={() => onConfess(m.id)} className="ml-auto px-3 py-1 rounded-full text-[10px] font-black text-white transition-all animate-pulse" style={{ background: 'linear-gradient(135deg,#FF7A93,#e35c78)' }}>
                      {tw ? '表白 ♥' : '表白 ♥'}
                    </button>
                  )}
                  {confessed && <span className="ml-auto px-3 py-1 rounded-full text-[10px] font-black text-white" style={{ background: 'linear-gradient(135deg,#FF7A93,#e35c78)' }}>{tw ? '戀人 ♥' : '恋人 ♥'}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* 爱豆之间 */}
        <div className="gold-caption mb-2.5">{tw ? '愛豆之間' : '爱豆之间'}</div>
        {pairs.length === 0 ? (
          <div className="text-[10px] text-[#8B86B8] py-2">{tw ? '所選愛豆之間暫無既有關係。' : '所选爱豆之间暂无既有关系。'}</div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {pairs.map(({ a, b, rel }) => {
              const key = pairKey(a.id, b.id);
              const wantMatch = matchmakes.includes(key);
              const type = deriveType(rel.affinity, rel.tension, { romance: wantMatch, confessed: hasFlag(rel, 'confessed') });
              return (
                <div key={key} className="rounded-[14px] p-3.5 bg-white/[0.03] border flex items-center gap-3" style={{ borderColor: wantMatch ? 'rgba(255,122,147,0.4)' : 'rgba(201,162,39,0.15)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-black text-[#F1ECFF]">{a.name} <span className="text-[#6C79C4]">×</span> {b.name}</span>
                      <span className="text-[9px] font-black text-[#C9A227] uppercase tracking-[0.06em]">{type}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-[#B7B2D9]">
                      <span>{tw ? '親密' : '亲密'} {rel.affinity}</span>
                      <span>{tw ? '張力' : '张力'} {rel.tension}</span>
                      {rel.note && <span className="truncate italic text-[#8B86B8]">{rel.note}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => onToggleMatchmake(key)}
                    title={tw ? '撮合這一對' : '撮合这一对'}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1 transition-all border ${wantMatch ? 'text-white border-transparent' : 'bg-transparent text-[#B7B2D9] border-white/15 hover:border-white/30'}`}
                    style={wantMatch ? { background: 'linear-gradient(135deg,#FF7A93,#e35c78)' } : undefined}
                  >
                    <Heart className={`w-3 h-3 ${wantMatch ? 'fill-current' : ''}`} /> {tw ? '撮合' : '撮合'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[10px] text-[#8B86B8] mt-4 leading-relaxed">{tw ? '設「攻略/朋友/隨緣」定你對每個愛豆的方向；「撮合」把兩個愛豆往一起推。這些意圖會影響劇情走向。' : '设「攻略/朋友/随缘」定你对每个爱豆的方向；「撮合」把两个爱豆往一起推。这些意图会影响剧情走向。'}</p>
      </div>
    </div>
  );
}
