import React, { useEffect, useState } from 'react';
import { X, Shuffle } from 'lucide-react';
import { loadSpriteSheet, buildSpriteStrip, getAppearance, FRAMES, STRIP_W, STRIP_H, type Appearance } from './spriteUtils';
import { SKIN_TONES, HAIR_COLORS, CLOTH_COLORS } from './appearanceDefaults';

const HAT_COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#2A2A3D', '#ecf0f1'];

// 实时预览：走路动画
function SpritePreview({ appearance, size = 128 }: { appearance: Appearance; size?: number }) {
  const [strip, setStrip] = useState<string | null>(null);
  const [frame, setFrame] = useState(0);
  const key = JSON.stringify(appearance);
  useEffect(() => {
    let alive = true;
    loadSpriteSheet().then(sheet => { if (alive) setStrip(buildSpriteStrip(sheet, appearance)); }).catch(() => {});
    return () => { alive = false; };
  }, [key]);
  useEffect(() => { const id = setInterval(() => setFrame(f => (f + 1) % FRAMES), 150); return () => clearInterval(id); }, []);
  const scale = size / STRIP_H;
  return (
    <div style={{ width: size, height: size, overflow: 'hidden', imageRendering: 'pixelated' }}>
      {strip && (
        <div style={{
          width: STRIP_W * scale, height: STRIP_H * scale,
          backgroundImage: `url(${strip})`, backgroundRepeat: 'no-repeat',
          backgroundSize: `${STRIP_W * scale}px ${STRIP_H * scale}px`,
          backgroundPosition: `-${frame * size}px 0`, imageRendering: 'pixelated',
        }} />
      )}
    </div>
  );
}

function Swatches({ colors, value, onPick }: { colors: string[]; value?: string; onPick: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map(c => (
        <button
          key={c}
          onClick={() => onPick(c)}
          className={`w-7 h-7 rounded-lg border-2 transition-all ${value?.toLowerCase() === c.toLowerCase() ? 'border-[#2A2A3D] scale-110' : 'border-white/60 hover:scale-105'}`}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

export default function FaceCustomizer({ appearance, onChange, title, lang, onClose }: {
  appearance: Appearance;
  onChange: (a: Appearance) => void;
  title: string;
  lang: string;
  onClose: () => void;
}) {
  const tw = lang === 'traditional';
  const a = appearance;
  const set = (patch: Partial<Appearance>) => onChange({ ...a, ...patch });
  const randomize = () => {
    const r = getAppearance('rnd-' + Math.random());
    onChange({ ...r, skin: SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)] });
  };
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="mb-3">
      <div className="text-[11px] font-black text-[#454F87] mb-1.5">{label}</div>
      {children}
    </div>
  );

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-[#F3F2FA] rounded-2xl w-full max-w-lg max-h-[92%] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 sticky top-0 bg-[#5B6BB0] text-white rounded-t-2xl z-10">
          <h3 className="text-sm font-black">{title}</h3>
          <div className="flex items-center gap-2">
            <button onClick={randomize} className="px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-[11px] font-black flex items-center gap-1"><Shuffle className="w-3 h-3" /> {tw ? '隨機' : '随机'}</button>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 p-5">
          {/* 预览 */}
          <div className="flex-shrink-0 flex flex-col items-center gap-2 sm:sticky sm:top-16 self-center sm:self-start">
            <div className="rounded-2xl p-4" style={{ background: 'radial-gradient(circle at 50% 30%, #E7E6F6, #DAD8EE)' }}>
              <SpritePreview appearance={a} size={128} />
            </div>
          </div>

          {/* 调色 */}
          <div className="flex-1 min-w-0">
            <Row label={tw ? '膚色' : '肤色'}>
              <Swatches colors={SKIN_TONES} value={a.skin} onPick={c => set({ skin: c })} />
            </Row>
            <Row label={tw ? '髮色' : '发色'}>
              <Swatches colors={HAIR_COLORS} value={a.hair} onPick={c => set({ hair: c })} />
            </Row>
            <Row label={tw ? '半半染（雙色髮）' : '半半染（双色发）'}>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => set({ hair2: a.hair2 ? undefined : (HAIR_COLORS[5]) })}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${a.hair2 ? 'bg-[#5B6BB0] text-white' : 'bg-white text-[#454F87] border border-[#DAD8EE]'}`}
                >{a.hair2 ? (tw ? '開' : '开') : (tw ? '關' : '关')}</button>
                {a.hair2 && <Swatches colors={HAIR_COLORS} value={a.hair2} onPick={c => set({ hair2: c })} />}
              </div>
            </Row>
            <Row label={tw ? '上衣' : '上衣'}>
              <Swatches colors={CLOTH_COLORS} value={a.top} onPick={c => set({ top: c })} />
            </Row>
            <Row label={tw ? '褲子' : '裤子'}>
              <Swatches colors={CLOTH_COLORS} value={a.pants} onPick={c => set({ pants: c })} />
            </Row>
            <Row label={tw ? '鞋' : '鞋'}>
              <Swatches colors={CLOTH_COLORS} value={a.shoes} onPick={c => set({ shoes: c })} />
            </Row>
            <Row label={tw ? '帽子' : '帽子'}>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => set({ hat: a.hat ? undefined : HAT_COLORS[0] })}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${a.hat ? 'bg-[#5B6BB0] text-white' : 'bg-white text-[#454F87] border border-[#DAD8EE]'}`}
                >{a.hat ? (tw ? '戴' : '戴') : (tw ? '不戴' : '不戴')}</button>
                {a.hat && <Swatches colors={HAT_COLORS} value={a.hat} onPick={c => set({ hat: c })} />}
              </div>
            </Row>
          </div>
        </div>

        <div className="px-5 pb-5">
          <button onClick={onClose} className="w-full py-3 rounded-xl bg-[#5B6BB0] text-white font-black text-sm hover:bg-[#454F87] transition-all">{tw ? '完成' : '完成'}</button>
        </div>
      </div>
    </div>
  );
}
