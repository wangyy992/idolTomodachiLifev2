import React, { useEffect, useState } from 'react';
import { X, Shuffle, ChevronLeft, ChevronRight } from 'lucide-react';
import { buildSpriteSheet, getAppearance, CELL, FRAMES, SHEET_W, SHEET_H, DIR, type Appearance, type Facing } from './spriteUtils';
import {
  HAIR_STYLES, CLOTHES_STYLES, GLASSES_STYLES, HAT_STYLES, EARRING_STYLES, STYLE_LABEL,
  SKIN_SWATCHES, HAIR_SWATCHES, EYE_SWATCHES, CLOTH_SWATCHES,
} from './appearanceDefaults';

// 实时预览：走路动画（默认正面）
export function SpritePreview({ appearance, size = 128, dir = 'down' }: { appearance: Appearance; size?: number; dir?: Facing }) {
  const [sheet, setSheet] = useState<string | null>(null);
  const [frame, setFrame] = useState(0);
  const key = JSON.stringify(appearance);
  useEffect(() => {
    let alive = true;
    buildSpriteSheet(appearance).then(s => { if (alive) setSheet(s); }).catch(() => {});
    return () => { alive = false; };
  }, [key]);
  useEffect(() => { const id = setInterval(() => setFrame(f => (f + 1) % FRAMES), 150); return () => clearInterval(id); }, []);
  const scale = size / CELL;
  const row = DIR[dir];
  return (
    <div style={{ width: size, height: size, overflow: 'hidden', imageRendering: 'pixelated' }}>
      {sheet && (
        <div style={{
          width: SHEET_W * scale, height: SHEET_H * scale,
          backgroundImage: `url(${sheet})`, backgroundRepeat: 'no-repeat',
          backgroundSize: `${SHEET_W * scale}px ${SHEET_H * scale}px`,
          backgroundPosition: `-${frame * size}px -${row * size}px`, imageRendering: 'pixelated',
        }} />
      )}
    </div>
  );
}

function Swatches({ colors, value, onPick }: { colors: string[]; value: number; onPick: (i: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((c, i) => (
        <button
          key={i}
          onClick={() => onPick(i)}
          className={`w-7 h-7 rounded-lg border-2 transition-all ${value === i ? 'border-[#2A2A3D] scale-110' : 'border-white/60 hover:scale-105'}`}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

// 款式循环选择：◀ 当前 ▶
function Cycler({ options, value, onPick, noneLabel }: { options: string[]; value: string; onPick: (v: string) => void; noneLabel?: string }) {
  const idx = Math.max(0, options.indexOf(value));
  const go = (d: number) => onPick(options[(idx + d + options.length) % options.length]);
  const cur = options[idx];
  const label = cur === '' ? (noneLabel || '无') : (STYLE_LABEL[cur] || cur);
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => go(-1)} className="w-8 h-8 rounded-lg bg-white border border-[#DAD8EE] flex items-center justify-center text-[#5B6BB0] hover:bg-[#E7E6F6] active:scale-95"><ChevronLeft className="w-4 h-4" /></button>
      <div className="flex-1 text-center text-[12px] font-black text-[#2A2A3D] bg-white border border-[#DAD8EE] rounded-lg py-1.5 min-w-0 truncate">{label}</div>
      <button onClick={() => go(1)} className="w-8 h-8 rounded-lg bg-white border border-[#DAD8EE] flex items-center justify-center text-[#5B6BB0] hover:bg-[#E7E6F6] active:scale-95"><ChevronRight className="w-4 h-4" /></button>
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
  const randomize = () => onChange(getAppearance('rnd-' + Math.random()));

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5">
      <div className="text-[11px] font-black text-[#454F87]">{label}</div>
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
            <div className="rounded-2xl p-3" style={{ background: 'radial-gradient(circle at 50% 30%, #E7E6F6, #DAD8EE)' }}>
              <SpritePreview appearance={a} size={128} dir="down" />
            </div>
          </div>

          {/* 调整 */}
          <div className="flex-1 min-w-0 flex flex-col gap-3.5">
            <Row label={tw ? '膚色' : '肤色'}>
              <Swatches colors={SKIN_SWATCHES} value={a.skin} onPick={i => set({ skin: i })} />
            </Row>
            <Row label={tw ? '髮型' : '发型'}>
              <Cycler options={['', ...HAIR_STYLES]} value={a.hairStyle} onPick={v => set({ hairStyle: v })} noneLabel={tw ? '光頭' : '光头'} />
            </Row>
            {a.hairStyle && (
              <Row label={tw ? '髮色' : '发色'}>
                <Swatches colors={HAIR_SWATCHES} value={a.hairColor} onPick={i => set({ hairColor: i })} />
              </Row>
            )}
            <Row label={tw ? '眼睛' : '眼睛'}>
              <Swatches colors={EYE_SWATCHES} value={a.eyes} onPick={i => set({ eyes: i })} />
            </Row>
            <Row label={tw ? '衣服' : '衣服'}>
              <Cycler options={CLOTHES_STYLES} value={a.clothes} onPick={v => set({ clothes: v })} />
            </Row>
            <Row label={tw ? '衣服顏色' : '衣服颜色'}>
              <Swatches colors={CLOTH_SWATCHES} value={a.clothesColor} onPick={i => set({ clothesColor: i })} />
            </Row>
            <Row label={tw ? '鞋' : '鞋'}>
              <Swatches colors={CLOTH_SWATCHES} value={a.shoes} onPick={i => set({ shoes: i })} />
            </Row>
            <Row label={tw ? '眼鏡' : '眼镜'}>
              <Cycler options={GLASSES_STYLES} value={a.glasses || ''} onPick={v => set({ glasses: v })} />
            </Row>
            <Row label={tw ? '帽子' : '帽子'}>
              <Cycler options={HAT_STYLES} value={a.hat || ''} onPick={v => set({ hat: v })} />
            </Row>
            <Row label={tw ? '耳環' : '耳环'}>
              <Cycler options={EARRING_STYLES} value={a.earring || ''} onPick={v => set({ earring: v })} />
            </Row>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-[11px] font-black text-[#454F87] cursor-pointer">
                <input type="checkbox" checked={(a.blush ?? -1) >= 0} onChange={e => set({ blush: e.target.checked ? 2 : -1 })} /> {tw ? '腮紅' : '腮红'}
              </label>
              <label className="flex items-center gap-1.5 text-[11px] font-black text-[#454F87] cursor-pointer">
                <input type="checkbox" checked={(a.lipstick ?? -1) >= 0} onChange={e => set({ lipstick: e.target.checked ? 2 : -1 })} /> {tw ? '口紅' : '口红'}
              </label>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5">
          <button onClick={onClose} className="w-full py-3 rounded-xl bg-[#5B6BB0] text-white font-black text-sm hover:bg-[#454F87] transition-all">{tw ? '完成' : '完成'}</button>
        </div>
      </div>
    </div>
  );
}
