import React, { useEffect, useState } from 'react';
import { X, Shuffle } from 'lucide-react';
import { buildSpriteSheet, getAppearance, CELL, FRAMES, SHEET_W, SHEET_H, DIR, type Appearance, type Facing } from './spriteUtils';
import {
  HAIR_STYLES, TOP_STYLES, BOTTOM_STYLES, GLASSES_STYLES, HAT_STYLES, EARRING_STYLES, STYLE_LABEL,
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

// 静态缩略图（正面 frame0），用于衣橱选择
function SpriteThumb({ appearance, size = 42, selected, onClick, label }: {
  appearance: Appearance; size?: number; selected: boolean; onClick: () => void; label: string;
}) {
  const [sheet, setSheet] = useState<string | null>(null);
  const key = JSON.stringify(appearance);
  useEffect(() => { let a = true; buildSpriteSheet(appearance).then(s => { if (a) setSheet(s); }).catch(() => {}); return () => { a = false; }; }, [key]);
  const scale = size / CELL;
  return (
    <button
      onClick={onClick} title={label}
      className={`flex flex-col items-center gap-0.5 p-1 rounded-xl border-2 transition-all ${selected ? 'border-[#5B6BB0] bg-[#E7E6F6]' : 'border-transparent bg-white/60 hover:bg-white'}`}
    >
      <div style={{ width: size, height: size, overflow: 'hidden', imageRendering: 'pixelated' }}>
        {sheet && <div style={{
          width: SHEET_W * scale, height: SHEET_H * scale,
          backgroundImage: `url(${sheet})`, backgroundRepeat: 'no-repeat',
          backgroundSize: `${SHEET_W * scale}px ${SHEET_H * scale}px`,
          backgroundPosition: '0px 0px', imageRendering: 'pixelated',
        }} />}
      </div>
      <span className="text-[8px] font-bold text-[#454F87] leading-none max-w-[46px] truncate">{label}</span>
    </button>
  );
}

function Swatches({ colors, value, onPick }: { colors: string[]; value: number; onPick: (i: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((c, i) => (
        <button key={i} onClick={() => onPick(i)}
          className={`w-6 h-6 rounded-lg border-2 transition-all ${value === i ? 'border-[#2A2A3D] scale-110' : 'border-white/60 hover:scale-105'}`}
          style={{ background: c }} />
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
  const randomize = () => onChange(getAppearance('rnd-' + Math.random()));
  const styleLabel = (o: string, none: string) => (o === '' ? none : (STYLE_LABEL[o] || o));

  const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] font-black text-[#454F87] uppercase tracking-wide">{label}</div>
      {children}
    </div>
  );
  const Grid = ({ children }: { children: React.ReactNode }) => (
    <div className="flex flex-wrap gap-1.5 bg-[#EBEAF6] rounded-xl p-2">{children}</div>
  );

  // 缩略图：把某个字段换成候选值来预览
  const thumbRow = (options: string[], field: keyof Appearance, current: string, none: string) => (
    <Grid>
      {options.map(o => (
        <SpriteThumb key={o || 'none'} appearance={{ ...a, [field]: o } as Appearance}
          selected={current === o} onClick={() => set({ [field]: o } as Partial<Appearance>)} label={styleLabel(o, none)} />
      ))}
    </Grid>
  );

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-[#F3F2FA] rounded-2xl w-full max-w-xl max-h-[94%] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* 头部 + 预览 */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#5B6BB0] text-white rounded-t-2xl">
          <h3 className="text-sm font-black">{title}</h3>
          <div className="flex items-center gap-2">
            <button onClick={randomize} className="px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-[11px] font-black flex items-center gap-1"><Shuffle className="w-3 h-3" /> {tw ? '隨機' : '随机'}</button>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex items-center justify-center py-3 bg-gradient-to-b from-[#E7E6F6] to-[#F3F2FA] border-b border-[#DAD8EE]">
          <div className="rounded-2xl p-2" style={{ background: 'radial-gradient(circle at 50% 35%, #E7E6F6, #DAD8EE)' }}>
            <SpritePreview appearance={a} size={104} dir="down" />
          </div>
        </div>

        {/* 衣橱 */}
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
          <Section label={tw ? '髮型' : '发型'}>
            {thumbRow(['', ...HAIR_STYLES], 'hairStyle', a.hairStyle, tw ? '光頭' : '光头')}
            {a.hairStyle && <Swatches colors={HAIR_SWATCHES} value={a.hairColor} onPick={i => set({ hairColor: i })} />}
          </Section>

          <Section label={tw ? '上衣' : '上衣'}>
            {thumbRow(['', ...TOP_STYLES], 'top', a.top, tw ? '無' : '无')}
            {a.top && <Swatches colors={CLOTH_SWATCHES} value={a.topColor} onPick={i => set({ topColor: i })} />}
          </Section>

          <Section label={tw ? '下裝' : '下装'}>
            {thumbRow(['', ...BOTTOM_STYLES], 'bottom', a.bottom, tw ? '無' : '无')}
            {a.bottom && <Swatches colors={CLOTH_SWATCHES} value={a.bottomColor} onPick={i => set({ bottomColor: i })} />}
          </Section>

          <Section label={tw ? '鞋' : '鞋'}>
            <Swatches colors={CLOTH_SWATCHES} value={a.shoes} onPick={i => set({ shoes: i })} />
          </Section>

          <div className="grid grid-cols-2 gap-4">
            <Section label={tw ? '膚色' : '肤色'}>
              <Swatches colors={SKIN_SWATCHES} value={a.skin} onPick={i => set({ skin: i })} />
            </Section>
            <Section label={tw ? '眼睛' : '眼睛'}>
              <Swatches colors={EYE_SWATCHES} value={a.eyes} onPick={i => set({ eyes: i })} />
            </Section>
          </div>

          <Section label={tw ? '帽子' : '帽子'}>{thumbRow(HAT_STYLES, 'hat', a.hat || '', tw ? '無' : '无')}</Section>
          <Section label={tw ? '眼鏡' : '眼镜'}>{thumbRow(GLASSES_STYLES, 'glasses', a.glasses || '', tw ? '無' : '无')}</Section>
          <Section label={tw ? '耳環' : '耳环'}>{thumbRow(EARRING_STYLES, 'earring', a.earring || '', tw ? '無' : '无')}</Section>

          <Section label={tw ? '妝容' : '妆容'}>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-[11px] font-black text-[#454F87] cursor-pointer">
                <input type="checkbox" checked={(a.blush ?? -1) >= 0} onChange={e => set({ blush: e.target.checked ? 2 : -1 })} /> {tw ? '腮紅' : '腮红'}
              </label>
              <label className="flex items-center gap-1.5 text-[11px] font-black text-[#454F87] cursor-pointer">
                <input type="checkbox" checked={(a.lipstick ?? -1) >= 0} onChange={e => set({ lipstick: e.target.checked ? 2 : -1 })} /> {tw ? '口紅' : '口红'}
              </label>
            </div>
          </Section>
        </div>

        <div className="p-4 border-t border-[#DAD8EE]">
          <button onClick={onClose} className="w-full py-3 rounded-xl bg-[#5B6BB0] text-white font-black text-sm hover:bg-[#454F87] transition-all">{tw ? '完成' : '完成'}</button>
        </div>
      </div>
    </div>
  );
}
