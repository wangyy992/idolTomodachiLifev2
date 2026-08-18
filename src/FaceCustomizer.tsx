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
      className={`flex flex-col items-center gap-0.5 p-1 rounded-xl border-2 transition-all ${selected ? 'border-[#C9A227] bg-[rgba(201,162,39,0.1)]' : 'border-transparent bg-white/[0.04] hover:bg-white/[0.08]'}`}
    >
      <div style={{ width: size, height: size, overflow: 'hidden', imageRendering: 'pixelated' }}>
        {sheet && <div style={{
          width: SHEET_W * scale, height: SHEET_H * scale,
          backgroundImage: `url(${sheet})`, backgroundRepeat: 'no-repeat',
          backgroundSize: `${SHEET_W * scale}px ${SHEET_H * scale}px`,
          backgroundPosition: '0px 0px', imageRendering: 'pixelated',
        }} />}
      </div>
      <span className={`text-[8px] font-bold leading-none max-w-[46px] truncate ${selected ? 'text-[#F1ECFF]' : 'text-[#8B86B8]'}`}>{label}</span>
    </button>
  );
}

function Swatches({ colors, value, onPick }: { colors: string[]; value: number; onPick: (i: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((c, i) => (
        <button key={i} onClick={() => onPick(i)}
          className={`w-6 h-6 rounded-full border-2 transition-all ${value === i ? 'border-[#C9A227] scale-110' : 'border-white/25 hover:scale-105'}`}
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
      <div className="gold-caption">{label}</div>
      {children}
    </div>
  );
  const Grid = ({ children }: { children: React.ReactNode }) => (
    <div className="flex flex-wrap gap-1.5 bg-white/[0.03] rounded-xl p-2">{children}</div>
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
    <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3" onClick={onClose}>
      <div className="rounded-[26px] w-full max-w-xl max-h-[94%] flex flex-col shadow-[0_30px_70px_-20px_rgba(0,0,0,0.7)] border border-[rgba(201,162,39,0.25)]" style={{ background: 'linear-gradient(165deg, #1C1830, #0E0C1C)' }} onClick={e => e.stopPropagation()}>
        {/* 头部 + 预览 */}
        <div className="flex items-center justify-between px-5 py-3 text-white rounded-t-[26px] border-b border-white/[0.06]" style={{ background: 'linear-gradient(135deg, #6C79C4, #454F87)' }}>
          <h3 className="text-sm font-black">{title}</h3>
          <div className="flex items-center gap-2">
            <button onClick={randomize} className="px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-[11px] font-black flex items-center gap-1"><Shuffle className="w-3 h-3" /> {tw ? '隨機' : '随机'}</button>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="relative flex items-center justify-center py-5 border-b border-white/[0.06]" style={{ background: 'radial-gradient(50% 70% at 50% 40%, rgba(120,110,220,0.16), transparent 70%)' }}>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-24 h-4 rounded-full bg-black/40 blur-[4px]" />
          <div className="relative" style={{ filter: 'drop-shadow(0 0 18px rgba(150,140,255,0.35))' }}>
            <SpritePreview appearance={a} size={104} dir="down" />
          </div>
        </div>

        {/* 衣橱 */}
        <div className="flex-1 overflow-auto ink-scroll p-4 flex flex-col gap-4">
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
              <label className="flex items-center gap-1.5 text-[11px] font-black text-[#B7B2D9] cursor-pointer">
                <input type="checkbox" checked={(a.blush ?? -1) >= 0} onChange={e => set({ blush: e.target.checked ? 2 : -1 })} style={{ accentColor: '#C9A227' }} /> {tw ? '腮紅' : '腮红'}
              </label>
              <label className="flex items-center gap-1.5 text-[11px] font-black text-[#B7B2D9] cursor-pointer">
                <input type="checkbox" checked={(a.lipstick ?? -1) >= 0} onChange={e => set({ lipstick: e.target.checked ? 2 : -1 })} style={{ accentColor: '#C9A227' }} /> {tw ? '口紅' : '口红'}
              </label>
            </div>
          </Section>
        </div>

        <div className="p-4 border-t border-white/[0.06]">
          <button onClick={onClose} className="w-full py-3 rounded-xl text-white font-black text-sm transition-all" style={{ background: 'linear-gradient(135deg,#6C79C4,#454F87)', boxShadow: '0 8px 20px -6px rgba(91,107,176,0.7)' }}>{tw ? '完成' : '完成'}</button>
        </div>
      </div>
    </div>
  );
}
