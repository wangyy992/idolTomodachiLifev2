import React from 'react';
import { Heart, X, Users, Palette } from 'lucide-react';
import { Member } from './types';
import {
  PLAYER, pairKey, deriveType, typeColor, hasFlag, type WorldRelation, type Intent,
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
    <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 max-w-2xl w-full max-h-[88%] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-[#2A2A3D] flex items-center gap-2"><Users className="w-4 h-4 text-[#5B6BB0]" /> {tw ? '關係網' : '关系网'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#E7E6F6] text-[#454F87]"><X className="w-4 h-4" /></button>
        </div>

        {/* 你 与 爱豆 */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-black text-[#454F87] uppercase tracking-widest">{tw ? '你 與 愛豆' : '你 与 爱豆'}</div>
          <button onClick={() => onCustomize({ kind: 'player' })} className="px-2 py-0.5 rounded-lg bg-white text-[#454F87] border border-[#DAD8EE] text-[10px] font-black flex items-center gap-1 hover:bg-[#E7E6F6]"><Palette className="w-3 h-3" /> {tw ? '捏我的臉' : '捏我的脸'}</button>
        </div>
        <div className="flex flex-col gap-2 mb-5">
          {members.map(m => {
            const romance = intents[m.id] === 'romance';
            const confessed = hasFlag(relations[pairKey(PLAYER, m.id)], 'confessed');
            const type = deriveType(m.affection, 0, { romance, confessed });
            const canConfess = romance && m.affection >= 75 && !confessed;
            return (
              <div key={m.id} className="bg-[#F3F2FA] rounded-xl p-3 border border-[#DAD8EE]">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[#2A2A3D]">{m.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black text-white" style={{ background: typeColor(type) }}>{type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onCustomize({ kind: 'idol', id: m.id })} title={tw ? '捏臉' : '捏脸'} className="p-1 rounded-lg bg-white text-[#454F87] border border-[#DAD8EE] hover:bg-[#E7E6F6]"><Palette className="w-3 h-3" /></button>
                    <span className="text-[10px] font-mono font-bold text-[#5B6BB0]">{m.affection}/100</span>
                  </div>
                </div>
                <div className="h-1.5 bg-[#E7E6F6] rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full" style={{ width: `${m.affection}%`, background: typeColor(type) }} />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {INTENT_ORDER.map(it => (
                    <button
                      key={it}
                      onClick={() => onSetIntent(m.id, it)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${intents[m.id] === it || (!intents[m.id] && it === 'none') ? 'bg-[#5B6BB0] text-white' : 'bg-white text-[#454F87] border border-[#DAD8EE] hover:bg-[#E7E6F6]'}`}
                    >
                      {INTENT_LABEL[it]}
                    </button>
                  ))}
                  {canConfess && (
                    <button onClick={() => onConfess(m.id)} className="ml-auto px-2.5 py-1 rounded-lg text-[10px] font-black bg-[#FF7A93] text-white hover:bg-[#F0607E] transition-all animate-pulse">
                      {tw ? '表白 ♥' : '表白 ♥'}
                    </button>
                  )}
                  {confessed && <span className="ml-auto px-2 py-1 rounded-lg text-[10px] font-black bg-[#FF7A93] text-white">{tw ? '戀人 ♥' : '恋人 ♥'}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* 爱豆之间 */}
        <div className="text-[11px] font-black text-[#454F87] uppercase tracking-widest mb-2">{tw ? '愛豆之間' : '爱豆之间'}</div>
        {pairs.length === 0 ? (
          <div className="text-[10px] text-[#454F87] py-2">{tw ? '所選愛豆之間暫無既有關係。' : '所选爱豆之间暂无既有关系。'}</div>
        ) : (
          <div className="flex flex-col gap-2">
            {pairs.map(({ a, b, rel }) => {
              const key = pairKey(a.id, b.id);
              const wantMatch = matchmakes.includes(key);
              const type = deriveType(rel.affinity, rel.tension, { romance: wantMatch, confessed: hasFlag(rel, 'confessed') });
              return (
                <div key={key} className="bg-[#F3F2FA] rounded-xl p-3 border border-[#DAD8EE] flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-black text-[#2A2A3D]">{a.name} <span className="text-[#454F87]">×</span> {b.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black text-white" style={{ background: typeColor(type) }}>{type}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[9px] text-[#454F87]">
                      <span>{tw ? '親密' : '亲密'} {rel.affinity}</span>
                      <span>{tw ? '張力' : '张力'} {rel.tension}</span>
                      {rel.note && <span className="truncate italic">{rel.note}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => onToggleMatchmake(key)}
                    title={tw ? '撮合這一對' : '撮合这一对'}
                    className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all ${wantMatch ? 'bg-[#FF7A93] text-white' : 'bg-white text-[#454F87] border border-[#DAD8EE] hover:bg-[#E7E6F6]'}`}
                  >
                    <Heart className={`w-3 h-3 ${wantMatch ? 'fill-current' : ''}`} /> {tw ? '撮合' : '撮合'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[10px] text-[#454F87] mt-4">{tw ? '設「攻略/朋友/隨緣」定你對每個愛豆的方向；「撮合」把兩個愛豆往一起推。這些意圖會影響劇情走向。' : '设「攻略/朋友/随缘」定你对每个爱豆的方向；「撮合」把两个爱豆往一起推。这些意图会影响剧情走向。'}</p>
      </div>
    </div>
  );
}
