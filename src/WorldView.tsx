import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Clock, CalendarDays, ChevronRight, X, Users, Rss, Palette } from 'lucide-react';
import { Member } from './types';
import { getSceneConfig } from './sceneConfig';
import RelationPanel from './RelationPanel';
import { pairKey, type WorldRelation, type Intent } from './relations';
import {
  WORLD_LOCATIONS, TIME_SLOTS, AWAY, getActivity, idolsAt, getLocation,
  type Activity, type WorldLocation,
} from './worldConfig';
import {
  loadSpriteSheet, buildSpriteStrip, getDefaultAppearance, getPlayerAppearance,
  FRAMES, STRIP_W, STRIP_H, type Appearance,
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
const ENCOUNTER_DIST = 11;       // 爱豆相遇触发距离（百分比）
const ENCOUNTER_COOLDOWN = 4500; // 同一对相遇冷却（ms）
const BUBBLE_TTL = 2200;         // 相遇气泡存活（ms）

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
  relations, intents, matchmakes, onSetIntent, onToggleMatchmake, onConfess, onIdolEncounter, worldFeed, onWatchEncounter,
  appearances, playerAppearance, onCustomize,
}: {
  members: Member[];
  playerName: string;
  day: number; slot: number; locationId: string;
  onTravel: (locId: string) => void;
  onAdvanceTime: () => void;
  onTalk: (m: Member, ctx: { location: WorldLocation; activity: Activity }) => void;
  lang: string;
  relations: Record<string, WorldRelation>;
  intents: Record<string, Intent>;
  matchmakes: string[];
  onSetIntent: (id: string, intent: Intent) => void;
  onToggleMatchmake: (key: string) => void;
  onConfess: (id: string) => void;
  onIdolEncounter: (aId: string, bId: string, kind: 'romance' | 'tension' | 'friendly') => void;
  worldFeed: { id: string; text: string; kind: string; day: number; slot: number }[];
  onWatchEncounter: (a: Member, b: Member, ctx: { location: WorldLocation }) => void;
  appearances: Record<string, Appearance>;
  playerAppearance?: Appearance;
  onCustomize: (t: { kind: 'player' } | { kind: 'idol'; id: string }) => void;
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
  const [watchable, setWatchable] = useState<{ aId: string; bId: string } | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showRelations, setShowRelations] = useState(false);
  const [showFeed, setShowFeed] = useState(false);
  const bubblesRef = useRef<{ key: string; x: number; y: number; emoji: string; born: number }[]>([]);
  const cooldownRef = useRef<Map<string, number>>(new Map());
  // 让主循环拿到最新的 props（循环用空依赖挂载）
  const encRef = useRef({ matchmakes, relations, onIdolEncounter });
  encRef.current = { matchmakes, relations, onIdolEncounter };

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

  // 合成所有已选成员的走路 strip（外观来自捏脸覆盖，否则用默认/还原真人）
  const membersKey = members.map(m => m.id).join(',');
  const appearanceKey = JSON.stringify(appearances) + '|' + JSON.stringify(playerAppearance || '');
  useEffect(() => {
    let alive = true;
    loadSpriteSheet().then(sheet => {
      if (!alive) return;
      const map: Record<string, string> = {};
      for (const m of members) map[m.id] = buildSpriteStrip(sheet, appearances[m.id] || getDefaultAppearance(m.id));
      map['__player__'] = buildSpriteStrip(sheet, playerAppearance || getPlayerAppearance(playerName || 'you'));
      stripsRef.current = map;
      setTick(t => t + 1);
    }).catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membersKey, playerName, appearanceKey]);

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
          if (e.moving) { const arrived = moveToward(e, IDOL_SPEED, dt); if (arrived) { e.moving = false; e.waitAcc = rand(0.5, 2.0); } }
          else {
            e.waitAcc -= dt;
            if (e.waitAcc <= 0) {
              // 有一定概率朝另一个爱豆走过去（社交聚集 → 自然产生相遇）
              const others = ents.filter(x => !x.isPlayer && x !== e);
              if (others.length && Math.random() < 0.5) {
                const o = others[Math.floor(Math.random() * others.length)];
                e.tx = clamp(o.x + rand(-5, 5), BOUND.minX, BOUND.maxX);
                e.ty = clamp(o.y + rand(-5, 5), BOUND.minY, BOUND.maxY);
              } else {
                e.tx = rand(BOUND.minX, BOUND.maxX); e.ty = rand(BOUND.minY, BOUND.maxY);
              }
              e.moving = true;
            }
          }
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

      // 爱豆两两相遇：走近且过了冷却 → 触发一次互动
      const idols = ents.filter(e => !e.isPlayer && e.member);
      const { matchmakes, relations, onIdolEncounter } = encRef.current;
      for (let i = 0; i < idols.length; i++) {
        for (let j = i + 1; j < idols.length; j++) {
          const a = idols[i], b = idols[j];
          if (Math.hypot(a.x - b.x, a.y - b.y) > ENCOUNTER_DIST) continue;
          const key = pairKey(a.id, b.id);
          const last = cooldownRef.current.get(key) || 0;
          if (now - last < ENCOUNTER_COOLDOWN) continue;
          cooldownRef.current.set(key, now);
          const rel = relations[key];
          const kind: 'romance' | 'tension' | 'friendly' =
            matchmakes.includes(key) ? 'romance' : (rel && rel.tension >= 45 ? 'tension' : 'friendly');
          const emoji = kind === 'romance' ? '💗' : kind === 'tension' ? '⚡' : '💬';
          bubblesRef.current.push({ key: key + now, x: (a.x + b.x) / 2, y: Math.min(a.y, b.y), emoji, born: now });
          onIdolEncounter(a.id, b.id, kind);
        }
      }
      // 可围观的爱豆对：两人靠近，且玩家也在旁边
      let wpair: { aId: string; bId: string } | null = null;
      if (player) {
        let wbest = 16;
        for (let i = 0; i < idols.length; i++) {
          for (let j = i + 1; j < idols.length; j++) {
            const a = idols[i], b = idols[j];
            if (Math.hypot(a.x - b.x, a.y - b.y) > ENCOUNTER_DIST + 3) continue;
            const dp = Math.hypot(player.x - (a.x + b.x) / 2, player.y - (a.y + b.y) / 2);
            if (dp < wbest) { wbest = dp; wpair = { aId: a.id, bId: b.id }; }
          }
        }
      }
      setWatchable(prev => (prev?.aId === wpair?.aId && prev?.bId === wpair?.bId ? prev : wpair));

      // 清理过期气泡
      if (bubblesRef.current.length) bubblesRef.current = bubblesRef.current.filter(bb => now - bb.born < BUBBLE_TTL);

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
          <div className="px-3 py-1.5 rounded-full bg-white/90 text-[#2A2A3D] text-xs font-black flex items-center gap-1.5">
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
      <div className="absolute top-3 right-3 z-30 flex gap-2 flex-wrap justify-end">
        <button onClick={() => onCustomize({ kind: 'player' })} className="px-3 py-1.5 rounded-xl bg-white/90 text-[#2A2A3D] text-[11px] font-black flex items-center gap-1.5 hover:bg-white transition-all shadow">
          <Palette className="w-3.5 h-3.5" /> {tw ? '捏臉' : '捏脸'}
        </button>
        <button onClick={() => setShowFeed(true)} className="relative px-3 py-1.5 rounded-xl bg-white/90 text-[#2A2A3D] text-[11px] font-black flex items-center gap-1.5 hover:bg-white transition-all shadow">
          <Rss className="w-3.5 h-3.5" /> {tw ? '動態' : '动态'}
          {worldFeed.length > 0 && <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-[#FF7A93] text-white text-[8px] flex items-center justify-center">{worldFeed.length}</span>}
        </button>
        <button onClick={() => setShowRelations(true)} className="px-3 py-1.5 rounded-xl bg-white/90 text-[#2A2A3D] text-[11px] font-black flex items-center gap-1.5 hover:bg-white transition-all shadow">
          <Users className="w-3.5 h-3.5" /> {tw ? '關係' : '关系'}
        </button>
        <button onClick={() => setShowSchedule(true)} className="px-3 py-1.5 rounded-xl bg-white/90 text-[#2A2A3D] text-[11px] font-black flex items-center gap-1.5 hover:bg-white transition-all shadow">
          <CalendarDays className="w-3.5 h-3.5" /> {tw ? '日程' : '日程'}
        </button>
        <button onClick={onAdvanceTime} className="px-3 py-1.5 rounded-xl bg-[#5B6BB0] text-white text-[11px] font-black flex items-center gap-1 hover:bg-[#454F87] transition-all shadow">
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
                  <div className="mb-0.5 px-2 py-0.5 rounded-full bg-[#5B6BB0] text-white text-[9px] font-black flex items-center gap-1 shadow-lg animate-bounce">
                    <MessageCircle className="w-2.5 h-2.5" /> {tw ? '對話' : '对话'}
                  </div>
                )}
                <div className={`px-1.5 py-0.5 rounded text-[9px] font-black ${e.isPlayer ? 'bg-white/90 text-[#2A2A3D]' : 'bg-black/45 text-white'}`}>
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

      {/* 爱豆相遇气泡 */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {bubblesRef.current.map(bb => {
          const age = clamp((performance.now() - bb.born) / BUBBLE_TTL, 0, 1);
          return (
            <div key={bb.key} className="absolute text-2xl" style={{ left: `${bb.x}%`, top: `${bb.y}%`, transform: `translate(-50%, -170%) translateY(${-age * 26}px)`, opacity: 1 - age }}>
              {bb.emoji}
            </div>
          );
        })}
      </div>

      {/* 围观爱豆相遇 */}
      {watchable && (() => {
        const a = ents.find(e => e.id === watchable.aId);
        const b = ents.find(e => e.id === watchable.bId);
        if (!a || !b || !a.member || !b.member) return null;
        const mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y);
        return (
          <div className="absolute z-[25]" style={{ left: `${mx}%`, top: `${my}%`, transform: 'translate(-50%, -230%)' }}>
            <button onClick={() => onWatchEncounter(a.member!, b.member!, { location })} className="px-3 py-1.5 rounded-full bg-[#2A2A3D] text-white text-[10px] font-black flex items-center gap-1 shadow-lg hover:bg-black transition-all animate-bounce whitespace-nowrap">
              👀 {tw ? '圍觀' : '围观'} {a.name}×{b.name}
            </button>
          </div>
        );
      })()}

      {/* 底部：地点切换栏 */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex gap-1.5 px-2 py-1.5 rounded-2xl bg-black/40 backdrop-blur max-w-[95%] overflow-x-auto">
        {WORLD_LOCATIONS.map(loc => {
          const n = countAt(loc.id);
          const active = loc.id === locationId;
          return (
            <button
              key={loc.id}
              onClick={() => onTravel(loc.id)}
              className={`relative flex-shrink-0 px-2.5 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1 transition-all ${active ? 'bg-white text-[#2A2A3D]' : 'bg-white/15 text-white hover:bg-white/25'}`}
            >
              <span>{loc.icon}</span> {loc.label}
              {n > 0 && <span className={`ml-0.5 min-w-[15px] h-[15px] px-1 rounded-full text-[8px] flex items-center justify-center ${active ? 'bg-[#5B6BB0] text-white' : 'bg-[#5B6BB0] text-white'}`}>{n}</span>}
            </button>
          );
        })}
      </div>

      {/* 世界动态流 */}
      {showFeed && (
        <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowFeed(false)}>
          <div className="bg-white rounded-2xl p-5 max-w-md w-full max-h-[80%] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-[#2A2A3D] flex items-center gap-2"><Rss className="w-4 h-4 text-[#5B6BB0]" /> {tw ? '世界動態' : '世界动态'}</h3>
              <button onClick={() => setShowFeed(false)} className="p-1.5 rounded-lg hover:bg-[#E7E6F6] text-[#454F87]"><X className="w-4 h-4" /></button>
            </div>
            {worldFeed.length === 0 ? (
              <div className="text-[11px] text-[#454F87] py-3">{tw ? '暫無動態。推進時段後，其它地點的愛豆也會各自相處，這裡會記錄下來。' : '暂无动态。推进时段后，其它地点的爱豆也会各自相处，这里会记录下来。'}</div>
            ) : (
              <div className="space-y-2">
                {worldFeed.map(f => (
                  <div key={f.id} className="flex items-center gap-2 bg-[#F3F2FA] rounded-xl p-2.5 border border-[#DAD8EE]">
                    <span className="text-base">{f.kind === 'romance' ? '💗' : f.kind === 'tension' ? '⚡' : '💬'}</span>
                    <span className="text-[11px] font-bold text-[#2A2A3D] flex-1">{f.text}</span>
                    <span className="text-[9px] text-[#454F87] whitespace-nowrap">D{f.day}·{TIME_SLOTS[f.slot]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 关系网面板 */}
      {showRelations && (
        <RelationPanel
          members={members} relations={relations} intents={intents} matchmakes={matchmakes}
          onSetIntent={onSetIntent} onToggleMatchmake={onToggleMatchmake} onConfess={onConfess}
          onClose={() => setShowRelations(false)} lang={lang} onCustomize={onCustomize}
        />
      )}

      {/* 日程面板 */}
      {showSchedule && (
        <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSchedule(false)}>
          <div className="bg-white rounded-2xl p-5 max-w-2xl w-full max-h-[85%] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-[#2A2A3D] flex items-center gap-2"><CalendarDays className="w-4 h-4 text-[#5B6BB0]" /> {tw ? `第${day}天 · 日程` : `第${day}天 · 日程`}</h3>
              <button onClick={() => setShowSchedule(false)} className="p-1.5 rounded-lg hover:bg-[#E7E6F6] text-[#454F87]"><X className="w-4 h-4" /></button>
            </div>
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="text-[#454F87]">
                  <th className="text-left py-2 px-2 font-black">成员</th>
                  {TIME_SLOTS.map((s, i) => (
                    <th key={s} className={`text-left py-2 px-2 font-black ${i === slot ? 'text-[#5B6BB0]' : ''}`}>{s}{i === slot ? ' ●' : ''}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id} className="border-t border-[#DAD8EE]">
                    <td className="py-2 px-2 font-bold text-[#2A2A3D] whitespace-nowrap">{m.name}<span className="text-[9px] text-[#454F87] ml-1">{m.group}</span></td>
                    {TIME_SLOTS.map((_, i) => {
                      const a = getActivity(m.id, day, i);
                      const here = a.available && a.loc === locationId;
                      const loc = a.loc === AWAY ? null : getLocation(a.loc);
                      return (
                        <td key={i} className={`py-2 px-2 ${i === slot ? 'bg-[#F3F2FA]' : ''}`}>
                          <div className={`flex items-center gap-1 ${a.available ? 'text-[#2A2A3D]' : 'text-[#B0A89E] line-through'}`}>
                            {loc && <span>{loc.icon}</span>}
                            <span className="font-bold">{a.label}</span>
                            {here && i === slot && <span className="text-[8px] text-[#5B6BB0] font-black">· 在这</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-[#454F87] mt-3">{tw ? '劃掉=在外地/聯繫不上。點下方地點欄過去找人；沒人就「推進時段」等日程變化。' : '划掉=在外地/联系不上。点下方地点栏过去找人；没人就「推进时段」等日程变化。'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
