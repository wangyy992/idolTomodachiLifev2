import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Lock, X, Users } from 'lucide-react';
import type { Member } from './types';
import { WORLD_LOCATIONS, getAccessibleLocations, idolsAt, LOCATION_SCOPE, lockReason, parseLocKey, TIME_SLOTS, unitKeyOf } from './worldConfig';

export const MAP_POINTS: Record<string, [number, number]> = {
  practice_room: [20, 22], rooftop: [48, 18], dorm: [77, 22],
  variety_studio: [17, 48], backstage: [43, 43], music_stage: [64, 45], concert: [84, 52],
  cafe: [20, 70], convenience: [44, 69], district: [68, 70], hangang: [50, 89],
};
export default function CityMap({ members, day, slot, locationId, identity, lang, onTravel, onClose }: {
  members: Member[]; day: number; slot: number; locationId: string; identity: string[]; lang: string;
  onTravel: (location: string) => void; onClose: () => void;
}) {
  const current = parseLocKey(locationId);
  const [selected, setSelected] = useState(current.base);
  const [selectedUnit, setSelectedUnit] = useState(current.unit || '');
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const allowed = getAccessibleLocations(identity);
  const location = WORLD_LOCATIONS.find(l => l.id === selected) || WORLD_LOCATIONS[0];
  const scoped = LOCATION_SCOPE[selected] !== 'shared';
  const units = scoped ? [...new Set(members.map(m => unitKeyOf(selected, m)).filter((v): v is string => !!v))] : [];
  const unit = units.includes(selectedUnit) ? selectedUnit : units[0] || '';
  const present = idolsAt(members, selected, day, slot).filter(m => !scoped || unitKeyOf(selected, m) === unit);
  const destination = selected + (scoped && unit ? '@' + unit : '');
  const here = selected === current.base && (!scoped || !current.unit || current.unit === unit);
  const isCurrentSelected = selected === current.base;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const keydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'Tab') {
        const all = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), select, [tabindex="0"]') || []);
        const first = all[0], last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, []);
  return (
    <div className="city-map-overlay fixed inset-0 z-[150] bg-[#100f1d]/80 backdrop-blur-md p-2 sm:p-6 flex items-center justify-center" onClick={onClose}>
      <div ref={panel} role="dialog" aria-modal="true" aria-label="城市地图" className="city-map-dialog w-full max-w-6xl max-h-full overflow-hidden rounded-3xl bg-[#19172a] border border-[#c8bca4]/25 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6 border-b border-white/10 shrink-0">
          <div><div className="text-[10px] tracking-[.22em] text-[#cdbfa2]">OUR LITTLE WORLD</div><h2 className="text-xl font-bold text-[#f8f1e5] mt-1">今天，想去哪里？</h2></div>
          <div className="flex items-center gap-4"><span className="hidden sm:block text-sm text-[#c9c2dc]">第 {day} 天 · {TIME_SLOTS[slot]}</span><button ref={close} aria-label="关闭地图" onClick={onClose} className="min-w-11 min-h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"><X size={20}/></button></div>
        </header>
        <div className="city-map-body min-h-0 flex flex-col lg:flex-row">
          <div className="city-map-scroll overflow-auto min-h-0 flex-1 bg-[#aca7b0]" tabIndex={0} aria-label="城市插画，可左右滑动查看地点">
            <div className="city-map-canvas relative min-w-[600px] aspect-[3/2]">
              <img src="/maps/idol-city.png" alt="道路连接练习室、电视台、宿舍、商圈与汉江的像素城市地图" className="absolute inset-0 w-full h-full object-cover" draggable={false}/>
              {WORLD_LOCATIONS.map(loc => {
                const [x,y] = MAP_POINTS[loc.id];
                const locked = !allowed.has(loc.id), active = selected === loc.id, isCurrent = current.base === loc.id;
                const count = idolsAt(members, loc.id, day, slot).length;
                // 地图上只写地名：不加底框、不加 emoji，靠字重和描边压住插画
                return <button key={loc.id} aria-label={loc.label + (locked ? '，未解锁' : '') + (isCurrent ? '，你在这里' : '')} aria-pressed={active}
                  onClick={() => { setSelected(loc.id); setSelectedUnit(loc.id === current.base ? current.unit || '' : ''); }}
                  className="city-map-pin absolute -translate-x-1/2 -translate-y-1/2 min-h-11 px-2 flex flex-col items-center justify-center gap-1 transition-transform hover:scale-[1.06]"
                  style={{ left: x+'%', top: y+'%' }}>
                  <span className={'city-map-name text-[15px] leading-none font-black tracking-wide ' +
                    (active ? 'text-[#ffe3a3]' : locked ? 'text-white/60' : 'text-white')}>
                    {loc.label}{!locked && count > 0 && <span className="ml-1 text-[12px] font-bold opacity-85">{count}</span>}
                  </span>
                  <span className={'h-[3px] rounded-full transition-all ' + (active ? 'w-7 bg-[#e9bf66]' : isCurrent ? 'w-2 bg-[#e9bf66]' : 'w-0')} />
                </button>;
              })}
            </div>
          </div>
          <aside className="city-map-details lg:w-64 shrink-0 p-4 sm:p-5 text-[#f5f0ff] flex flex-col gap-3 border-t lg:border-t-0 lg:border-l border-white/10">
            <div className="flex items-center gap-2"><h3 className="text-lg font-bold">{location.label}</h3>{isCurrentSelected && <span className="text-xs text-[#e9bf66]">你在这里</span>}</div>
            {scoped && units.length > 0 && <label className="text-xs text-[#bbb2d0]">选择{LOCATION_SCOPE[selected] === 'company' ? '公司' : '团体'}<select aria-label="选择地点所属单位" value={unit} onChange={e => setSelectedUnit(e.target.value)} className="block w-full mt-1 p-2 rounded-xl bg-[#302b46] text-white border border-white/15">{units.map(u => <option key={u}>{u}</option>)}</select></label>}
            <div className="text-sm text-[#c9c2dc] flex items-center gap-2"><Users size={15}/>{present.length ? present.map(m => m.name).join('、') : '此刻没有关注的人在这里'}</div>
            <p className="text-xs leading-relaxed text-[#aaa1bd]">{allowed.has(selected) ? '选中建筑查看地点，再点击前往。人数会随日程更新。' : lockReason(selected, lang === 'traditional')}</p>
            <button disabled={!allowed.has(selected)} onClick={() => { if (allowed.has(selected)) { onTravel(destination); onClose(); } }} className="min-h-12 mt-auto rounded-xl bg-[#eed5a0] text-[#35273f] font-bold px-4 flex items-center justify-center gap-2 disabled:bg-white/10 disabled:text-white/40">
              {allowed.has(selected) ? <>{here ? '返回这里' : '前往这里'}<ArrowRight size={17}/></> : <><Lock size={15}/>尚未解锁</>}
            </button>
          </aside>
        </div>
        <footer className="hidden sm:flex px-5 py-2 text-xs text-[#a59ab6] gap-4 border-t border-white/10"><span>地名后的数字是此刻在那里的人数</span><span>金色下划线是你的位置</span><span>灰掉的地名点开可看进入条件</span></footer>
      </div>
    </div>
  );
}
