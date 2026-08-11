import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Clock, CalendarDays, ChevronRight, X } from 'lucide-react';
import { Member } from './types';
import { getSceneConfig } from './sceneConfig';
import {
  WORLD_LOCATIONS, TIME_SLOTS, AWAY, getActivity, idolsAt, getLocation,
  type Activity, type WorldLocation,
} from './worldConfig';
import {
  loadSpriteSheet, buildSpriteStrip, getAppearance, getPlayerAppearance,
  FRAMES, STRIP_W, STRIP_H,
} from './spriteUtils';

// ---------- 单个像素小人 ----------
function PixelSprite({ strip, facing, frame, size }: {
  strip: string | null; facing: 'left' | 'right'; frame: number; size: number;
}) {
  if (!strip) {
    return <div style={{ width: size, height: size, borderRadius: '50%', background: 'rgba(255,255,255,0.25)' }} />;
  }
  const scale = size / STRIP_H;
  return (
    <div style={{ width: size, height: size, overflow: 'hidden', transform: facing === 'left' ? 'scaleX(-1)' : undefined }}>
      <div
        style={{
          width: STRIP_W * scale, height: STRIP_H * scale,
          backgroundImage: `url(${strip})`, backgroundRepeat: 'no-repeat',
          backgroundSize: `${STRIP_W * scale}px ${STRIP_H * scale}px`,
          backgroundPosition: `-${frame * size}px 0`, imageRendering: 'pixelated',
        }}
      />
    </div>
  );
}

interface Entity {
  id: string; isPlayer: boolean; name: string; member?: Member;
  x: number; y: number; tx: number; ty: number;
  facing: 'left' | 'right'; moving: boolean; frame: number; frameAcc: number; waitAcc: number;
}

const BOUND = { minX: 8, maxX: 92, minY: 44, maxY: 88 };
const SPRITE = 58;
const TALK_DIST = 9;
const IDOL_SPEED = 7;
const PLAYER_SPEED = 22;

function rand(min: number, max: number) { return min + Math.random() * (max - min); }
function clamp(v: number, lo: number, hi: number) { return v < lo ? lo : v > hi ? hi : v; }

function moveToward(e: Entity, speed: number, dt: number): boolean {
  const dx = e.tx - e.x, dy = e.ty - e.y;
  const dist = Math.hypot(dx, dy);
  const step = speed * dt;
  if (dist <= step || dist < 0.4) { e.x = e.tx; e.y = e.ty; e.moving = false; return true; }
  e.x += (dx / dist) * step; e.y += (dy / dist) * step;
  if (Math.abs(dx) > 0.1) e.facing = dx < 0 ? 'left' : 'right';
  e.moving = true; return false;
}

export default function WorldView({
  members, playerName, day, slot, locationId, onTravel, onAdvanceTime, onTalk, lang,
}: {
  members: Member[];
  playerName: string;
  day: number; slot: number; locationId: string;
  onTravel: (locId: string) => void;
  onAdvanceTime: () => void;
  onTalk: (m: Member, ctx: { location: WorldLocation; activity: Activity }) => void;
  lang: string;
}) {
  const tw = lang === 'traditional';
  const location = getLocation(locationId) || WORLD_LOCATIONS[0];
  const sceneConfig = getSceneConfig(location.sceneKey);
  const present = idolsAt(members, locationId, day, slot);
  const presentKey = present.map(m => m.id).join(',') + `@${locationId}#${day}-${slot}`;

  const stageRef = useRef<HTMLDivElement>(null);
  const entitiesRef = useRef<Entity[]>([]);
  const stripsRef = useRef<Record<string, string>>({});
  const keysRef = useRef<Set<string>>(new Set());
  const [, setTick] = useState(0);
  const [nearId, setNearId] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);

  // 重建当前地点在场的实体（换地点/换时段/换成员时）
  useEffect(() => {
    const prev = new Map(entitiesRef.current.map(e => [e.id, e]));
    const idols: Entity[] = present.map(m => {
      const old = prev.get(m.id);
      if (old) return { ...old, name: m.name, member: m };
      return {
        id: m.id, isPlayer: false, name: m.name, member: m,
        x: rand(BOUND.minX, BOUND.maxX), y: rand(BOUND.minY, BOUND.maxY),
        tx: rand(BOUND.minX, BOUND.maxX), ty: rand(BOUND.minY, BOUND.maxY),
        facing: 'right', moving: true, frame: 0, frameAcc: 0, waitAcc: 0,
      };
    });
    const oldPlayer = prev.get('__player__');
    const player: Entity = oldPlayer || {
      id: '__player__', isPlayer: true, name: playerName || '你',
      x: 50, y: 82, tx: 50, ty: 82, facing: 'right', moving: false, frame: 0, frameAcc: 0, waitAcc: 0,
    };
    player.name = playerName || '你';
    entitiesRef.current = [...idols, player];
    setNearId(null);
    setTick(t => t + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentKey, playerName]);

  // 合成所有已选成员的走路 strip（换地点不重建）
  const membersKey = members.map(m => m.id).join(',');
  useEffect(() => {
    let alive = true;
    loadSpriteSheet().then(sheet => {
      if (!alive) return;
      const map: Record<string, string> = { ...stripsRef.current };
      for (const m of members) if (!map[m.id]) map[m.id] = buildSpriteStrip(sheet, getAppearance(m.id));
      map['__player__'] = buildSpriteStrip(sheet, getPlayerAppearance(playerName || 'you'));
      stripsRef.current = map;
      setTick(t => t + 1);
    }).catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membersKey, playerName]);

  // 键盘
  useEffect(() => {
    const down = (ev: KeyboardEvent) => {
      const k = ev.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { keysRef.current.add(k); ev.preventDefault(); }
    };
    const up = (ev: KeyboardEvent) => keysRef.current.delete(ev.key.toLowerCase());
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // 主循环
  useEffect(() => {
    let raf = 0; let last = performance.now(); let renderAcc = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const ents = entitiesRef.current; const keys = keysRef.current;
      for (const e of ents) {
        if (e.isPlayer) {
          let dx = 0, dy = 0;
          if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
          if (keys.has('d') || keys.has('arrowright')) dx += 1;
          if (keys.has('w') || keys.has('arrowup')) dy -= 1;
          if (keys.has('s') || keys.has('arrowdown')) dy += 1;
          if (dx || dy) {
            const len = Math.hypot(dx, dy) || 1;
            e.x = clamp(e.x + (dx / len) * PLAYER_SPEED * dt, BOUND.minX, BOUND.maxX);
            e.y = clamp(e.y + (dy / len) * PLAYER_SPEED * dt, BOUND.minY, BOUND.maxY);
            e.tx = e.x; e.ty = e.y; if (dx) e.facing = dx < 0 ? 'left' : 'right'; e.moving = true;
          } else moveToward(e, PLAYER_SPEED, dt);
        } else {
          if (e.moving) { const arrived = moveToward(e, IDOL_SPEED, dt); if (arrived) { e.moving = false; e.waitAcc = rand(0.6, 2.4); } }
          else { e.waitAcc -= dt; if (e.waitAcc <= 0) { e.tx = rand(BOUND.minX, BOUND.maxX); e.ty = rand(BOUND.minY, BOUND.maxY); e.moving = true; } }
        }
        if (e.moving) { e.frameAcc += dt; if (e.frameAcc > 0.11) { e.frameAcc = 0; e.frame = (e.frame + 1) % FRAMES; } }
        else e.frame = 0;
      }
      const player = ents.find(e => e.isPlayer);
      if (player) {
        let near: string | null = null; let best = TALK_DIST;
        for (const e of ents) { if (e.isPlayer) continue; const d = Math.hypot(e.x - player.x, e.y - player.y); if (d < best) { best = d; near = e.id; } }
        setNearId(prev => (prev === near ? prev : near));
      }
      renderAcc += dt; if (renderAcc > 0.033) { renderAcc = 0; setTick(t => (t + 1) % 1000000); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onFloorClick = (ev: React.MouseEvent) => {
    const rect = stageRef.current?.getBoundingClientRect(); if (!rect) return;
    const px = ((ev.clientX - rect.left) / rect.width) * 100;
    const py = ((ev.clientY - rect.top) / rect.height) * 100;
    const player = entitiesRef.current.find(e => e.isPlayer);
    if (player) { player.tx = clamp(px, BOUND.minX, BOUND.maxX); player.ty = clamp(py, BOUND.minY, BOUND.maxY); player.moving = true; }
  };

  // 每个地点当前时段的可约人数（导航用）
  const countAt = (locId: string) => idolsAt(members, locId, day, slot).length;

  const ents = entitiesRef.current;
  const sorted = [...ents].sort((a, b) => a.y - b.y);

  return (
    <div className="relative w-full h-full overflow-hidden select-none" style={{ background: sceneConfig.bg }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 80% at 50% 0%, rgba(255,240,210,0.18), transparent 55%)' }} />
      <div className="absolute left-0 right-0" style={{ top: `${BOUND.minY - 6}%`, bottom: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.35))' }} />
      <div className="absolute inset-0" style={{ background: sceneConfig.overlay }} />

      {/* 顶部：时间 + 地点 + 日程按钮 */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-full bg-black/45 backdrop-blur text-white text-xs font-black flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> {tw ? '第' : '第'}{day}{tw ? '天' : '天'} · {TIME_SLOTS[slot]}
          </div>
          <div className="px-3 py-1.5 rounded-full bg-white/90 text-[#3D2B1F] text-xs font-black flex items-center gap-1.5">
            <span>{location.icon}</span> {location.label}
          </div>
        </div>
        <div className="px-3 py-1 rounded-full bg-white/15 text-white/90 text-[10px] font-bold pointer-events-none">
          {present.length > 0
            ? (tw ? 'WASD/點地板移動 · 走近愛豆對話' : 'WASD/点地板移动 · 走近爱豆对话')
            : (tw ? '這裡現在沒人 —— 看日程換個地點' : '这里现在没人 —— 看日程换个地点')}
        </div>
      </div>

      {/* 右上：日程 + 推进时间 */}
      <div className="absolute top-3 right-3 z-30 flex gap-2">
        <button onClick={() => setShowSchedule(true)} className="px-3 py-1.5 rounded-xl bg-white/90 text-[#3D2B1F] text-[11px] font-black flex items-center gap-1.5 hover:bg-white transition-all shadow">
          <CalendarDays className="w-3.5 h-3.5" /> {tw ? '日程' : '日程'}
        </button>
        <button onClick={onAdvanceTime} className="px-3 py-1.5 rounded-xl bg-[#C4936A] text-white text-[11px] font-black flex items-center gap-1 hover:bg-[#A0663A] transition-all shadow">
          {tw ? '推進時段' : '推进时段'} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 舞台 */}
      <div ref={stageRef} className="absolute inset-0 z-10 cursor-pointer" onClick={onFloorClick}>
        {sorted.map(e => {
          const isNear = !e.isPlayer && e.id === nearId;
          const activity = e.member ? getActivity(e.member.id, day, slot) : null;
          return (
            <div
              key={e.id}
              className="absolute"
              style={{ left: `${e.x}%`, top: `${e.y}%`, transform: 'translate(-50%, -100%)', zIndex: Math.round(e.y) + (e.isPlayer ? 1 : 0) }}
              onClick={(ev) => { if (!e.isPlayer && e.member) { ev.stopPropagation(); onTalk(e.member, { location, activity: getActivity(e.member.id, day, slot) }); } }}
            >
              <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: -4, width: SPRITE * 0.5, height: SPRITE * 0.16, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', filter: 'blur(2px)' }} />
              <div className="absolute left-1/2 -translate-x-1/2 -top-6 flex flex-col items-center gap-0.5 whitespace-nowrap">
                {isNear && (
                  <div className="mb-0.5 px-2 py-0.5 rounded-full bg-[#C4936A] text-white text-[9px] font-black flex items-center gap-1 shadow-lg animate-bounce">
                    <MessageCircle className="w-2.5 h-2.5" /> {tw ? '對話' : '对话'}
                  </div>
                )}
                <div className={`px-1.5 py-0.5 rounded text-[9px] font-black ${e.isPlayer ? 'bg-white/90 text-[#3D2B1F]' : 'bg-black/45 text-white'}`}>
                  {e.isPlayer ? (tw ? '你' : '你') : e.name}
                </div>
                {!e.isPlayer && activity && <div className="px-1 rounded text-[8px] text-white/80 bg-black/30">{activity.mood.split('、')[0]}</div>}
              </div>
              <div className={`${!e.isPlayer ? 'cursor-pointer' : ''} ${isNear ? 'drop-shadow-[0_0_8px_rgba(196,147,106,0.9)]' : ''}`}>
                <PixelSprite strip={stripsRef.current[e.id] ?? null} facing={e.facing} frame={e.frame} size={SPRITE} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部：地点切换栏 */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex gap-1.5 px-2 py-1.5 rounded-2xl bg-black/40 backdrop-blur max-w-[95%] overflow-x-auto">
        {WORLD_LOCATIONS.map(loc => {
          const n = countAt(loc.id);
          const active = loc.id === locationId;
          return (
            <button
              key={loc.id}
              onClick={() => onTravel(loc.id)}
              className={`relative flex-shrink-0 px-2.5 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1 transition-all ${active ? 'bg-white text-[#3D2B1F]' : 'bg-white/15 text-white hover:bg-white/25'}`}
            >
              <span>{loc.icon}</span> {loc.label}
              {n > 0 && <span className={`ml-0.5 min-w-[15px] h-[15px] px-1 rounded-full text-[8px] flex items-center justify-center ${active ? 'bg-[#C4936A] text-white' : 'bg-[#C4936A] text-white'}`}>{n}</span>}
            </button>
          );
        })}
      </div>

      {/* 日程面板 */}
      {showSchedule && (
        <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSchedule(false)}>
          <div className="bg-white rounded-2xl p-5 max-w-2xl w-full max-h-[85%] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-[#3D2B1F] flex items-center gap-2"><CalendarDays className="w-4 h-4 text-[#C4936A]" /> {tw ? `第${day}天 · 日程` : `第${day}天 · 日程`}</h3>
              <button onClick={() => setShowSchedule(false)} className="p-1.5 rounded-lg hover:bg-[#F5E6D0] text-[#A0663A]"><X className="w-4 h-4" /></button>
            </div>
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="text-[#A0663A]">
                  <th className="text-left py-2 px-2 font-black">成员</th>
                  {TIME_SLOTS.map((s, i) => (
                    <th key={s} className={`text-left py-2 px-2 font-black ${i === slot ? 'text-[#C4936A]' : ''}`}>{s}{i === slot ? ' ●' : ''}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id} className="border-t border-[#EAE0D5]">
                    <td className="py-2 px-2 font-bold text-[#3D2B1F] whitespace-nowrap">{m.name}<span className="text-[9px] text-[#A0663A] ml-1">{m.group}</span></td>
                    {TIME_SLOTS.map((_, i) => {
                      const a = getActivity(m.id, day, i);
                      const here = a.available && a.loc === locationId;
                      const loc = a.loc === AWAY ? null : getLocation(a.loc);
                      return (
                        <td key={i} className={`py-2 px-2 ${i === slot ? 'bg-[#FAF7F2]' : ''}`}>
                          <div className={`flex items-center gap-1 ${a.available ? 'text-[#3D2B1F]' : 'text-[#B0A89E] line-through'}`}>
                            {loc && <span>{loc.icon}</span>}
                            <span className="font-bold">{a.label}</span>
                            {here && i === slot && <span className="text-[8px] text-[#C4936A] font-black">· 在这</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-[#A0663A] mt-3">{tw ? '劃掉=在外地/聯繫不上。點下方地點欄過去找人；沒人就「推進時段」等日程變化。' : '划掉=在外地/联系不上。点下方地点栏过去找人；没人就「推进时段」等日程变化。'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
