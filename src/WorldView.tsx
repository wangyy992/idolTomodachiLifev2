import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Clock, CalendarDays, ChevronRight, X, Users, Rss, Palette, Lock, Smartphone, CalendarRange, Megaphone } from 'lucide-react';
import { buildYearPhases, phaseAt, weekOf, dayInWeek, isMusicShowDay, WEEKS_PER_YEAR } from './calendar';
import { Member } from './types';
import { getSceneConfig } from './sceneConfig';
import RelationPanel from './RelationPanel';
import { pairKey, type WorldRelation, type Intent } from './relations';
import {
  WORLD_LOCATIONS, TIME_SLOTS, AWAY, getActivity, idolsAt, getLocation, isGroupDay,
  getAccessibleLocations, lockReason,
  type Activity, type WorldLocation,
} from './worldConfig';
import {
  buildSpriteSheet, getDefaultAppearance, getPlayerAppearance, normalizeAppearance,
  FRAMES, CELL, SHEET_W, SHEET_H, DIR, type Appearance, type Facing,
} from './spriteUtils';

function faceFrom(dx: number, dy: number): Facing | null {
  if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) return null;
  if (Math.abs(dy) >= Math.abs(dx)) return dy < 0 ? 'up' : 'down';
  return dx < 0 ? 'left' : 'right';
}

// ---------- 单个像素小人 ----------
function PixelSprite({ sheet, facing, frame, size }: {
  sheet: string | null; facing: Facing; frame: number; size: number;
}) {
  if (!sheet) {
    return <div style={{ width: size, height: size, borderRadius: '50%', background: 'rgba(255,255,255,0.25)' }} />;
  }
  const scale = size / CELL;
  const row = DIR[facing];
  return (
    <div style={{ width: size, height: size, overflow: 'hidden', imageRendering: 'pixelated' }}>
      <div
        style={{
          width: SHEET_W * scale, height: SHEET_H * scale,
          backgroundImage: `url(${sheet})`, backgroundRepeat: 'no-repeat',
          backgroundSize: `${SHEET_W * scale}px ${SHEET_H * scale}px`,
          backgroundPosition: `-${frame * size}px -${row * size}px`, imageRendering: 'pixelated',
        }}
      />
    </div>
  );
}

interface Entity {
  id: string; isPlayer: boolean; name: string; member?: Member;
  x: number; y: number; tx: number; ty: number;
  facing: Facing; moving: boolean; frame: number; frameAcc: number; waitAcc: number;
}

const BOUND = { minX: 8, maxX: 92, minY: 44, maxY: 88 };
const SPRITE = 76;
const TALK_DIST = 9;
const IDOL_SPEED = 7;
const PLAYER_SPEED = 22;
const ENCOUNTER_DIST = 11;       // 爱豆相遇触发距离（百分比）
const ENCOUNTER_COOLDOWN = 4500; // 同一对相遇冷却（ms）
const BUBBLE_TTL = 2200;         // 相遇气泡存活（ms）
// 时段光照氛围（上午暖 / 下午亮 / 晚上暮色）
const TIME_TINT = [
  'linear-gradient(180deg, rgba(255,214,170,0.16) 0%, rgba(255,190,140,0.05) 40%, transparent 75%)',
  'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 60%)',
  'linear-gradient(180deg, rgba(60,40,110,0.30) 0%, rgba(20,12,45,0.42) 60%, rgba(8,5,22,0.5) 100%)',
];

function rand(min: number, max: number) { return min + Math.random() * (max - min); }
function clamp(v: number, lo: number, hi: number) { return v < lo ? lo : v > hi ? hi : v; }

function moveToward(e: Entity, speed: number, dt: number): boolean {
  const dx = e.tx - e.x, dy = e.ty - e.y;
  const dist = Math.hypot(dx, dy);
  const step = speed * dt;
  if (dist <= step || dist < 0.4) { e.x = e.tx; e.y = e.ty; e.moving = false; return true; }
  e.x += (dx / dist) * step; e.y += (dy / dist) * step;
  const f = faceFrom(dx, dy); if (f) e.facing = f;
  e.moving = true; return false;
}

export default function WorldView({
  members, playerName, day, slot, locationId, identity, actionUsed, onSupport, endingReady, onOpenEnding, onTravel, onAdvanceTime, onTalk, lang,
  relations, intents, matchmakes, onSetIntent, onToggleMatchmake, onSetPairAffinity, onConfess, onIdolEncounter, worldFeed, onWatchEncounter,
  appearances, playerAppearance, onCustomize, phoneUnread, onOpenPhone,
}: {
  members: Member[];
  playerName: string;
  day: number; slot: number; locationId: string;
  identity: string[];
  actionUsed: boolean;
  onSupport: () => void;
  endingReady?: boolean;
  onOpenEnding?: () => void;
  phoneUnread: number;
  onOpenPhone: () => void;
  onTravel: (locId: string) => void;
  onAdvanceTime: () => void;
  onTalk: (m: Member, ctx: { location: WorldLocation; activity: Activity }) => void;
  lang: string;
  relations: Record<string, WorldRelation>;
  intents: Record<string, Intent>;
  matchmakes: string[];
  onSetIntent: (id: string, intent: Intent) => void;
  onToggleMatchmake: (key: string) => void;
  onSetPairAffinity: (key: string, value: number) => void;
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
  // 汉江按时段切换昼/夜画面
  const sceneKey = location.id === 'hangang' ? (slot === 2 ? 'hangang_night' : 'hangang_day') : location.sceneKey;
  const sceneConfig = getSceneConfig(sceneKey);
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
  const [showCalendar, setShowCalendar] = useState(false);
  const [lockToast, setLockToast] = useState<string | null>(null);
  // 主团（取在场成员里最常见的团）用于日历/打歌
  const mainGroup = React.useMemo(() => {
    const c: Record<string, number> = {};
    members.forEach(m => { c[m.group] = (c[m.group] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  }, [members.map(m => m.group).join('|')]);
  const curPhase = mainGroup ? phaseAt(mainGroup, day) : null;
  const isPromo = curPhase?.kind === 'promo';
  const showDay = mainGroup ? isMusicShowDay(mainGroup, day) : false;

  // 身份 → 可进入地点；进不去的地点上锁
  const accessible = React.useMemo(() => getAccessibleLocations(identity), [identity.join('|')]);
  const tryTravel = (locId: string) => {
    if (accessible.has(locId)) { onTravel(locId); return; }
    setLockToast(lockReason(locId, tw));
  };
  useEffect(() => {
    if (!lockToast) return;
    const t = setTimeout(() => setLockToast(null), 2600);
    return () => clearTimeout(t);
  }, [lockToast]);
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
        facing: 'down', moving: true, frame: 0, frameAcc: 0, waitAcc: 0,
      };
    });
    const oldPlayer = prev.get('__player__');
    const player: Entity = oldPlayer || {
      id: '__player__', isPlayer: true, name: playerName || '你',
      x: 50, y: 82, tx: 50, ty: 82, facing: 'down', moving: false, frame: 0, frameAcc: 0, waitAcc: 0,
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
    (async () => {
      const map: Record<string, string> = {};
      for (const m of members) map[m.id] = await buildSpriteSheet(normalizeAppearance(appearances[m.id], getDefaultAppearance(m.id)));
      map['__player__'] = await buildSpriteSheet(normalizeAppearance(playerAppearance, getPlayerAppearance(playerName || 'you')));
      if (!alive) return;
      stripsRef.current = map;
      setTick(t => t + 1);
    })();
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
            e.tx = e.x; e.ty = e.y; { const f = faceFrom(dx, dy); if (f) e.facing = f; } e.moving = true;
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

  // 场景完整显示：舞台按画面比例居中，人物与背景锁在同一个盒子里（不再左右裁切）
  const SCENE_RATIO = (sceneConfig as any).ratio || 1920 / 1072;

  return (
    <div className="relative w-full h-full overflow-hidden select-none flex items-center justify-center" style={{ background: sceneConfig.sceneBase || '#14121f' }}>
      {/* 留白处：同图放大模糊，视觉上满铺 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: (sceneConfig as any).blur || sceneConfig.bg, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(26px) brightness(0.45) saturate(0.85)', transform: 'scale(1.2)' }}
      />
      <div
        className="relative overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.55)]"
        style={{ aspectRatio: `${SCENE_RATIO}`, width: '100%', maxWidth: '100%', maxHeight: '100%', background: sceneConfig.bg, backgroundSize: '100% 100%' }}
      >
      <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 80% at 50% 0%, rgba(255,240,210,0.18), transparent 55%)' }} />
      <div className="absolute left-0 right-0" style={{ top: `${BOUND.minY - 6}%`, bottom: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.35))' }} />
      <div className="absolute inset-0" style={{ background: sceneConfig.overlay }} />
      {/* 时段氛围 + 暗角 */}
      <div className="absolute inset-0 pointer-events-none transition-all duration-700" style={{ background: TIME_TINT[slot] || TIME_TINT[1] }} />
      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 140px 30px rgba(10,6,25,0.35)' }} />

      {/* 顶部：时间 + 地点 + 日程按钮 */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-full text-[#F1ECFF] text-xs font-black flex items-center gap-1.5" style={{ background: 'rgba(14,11,26,0.6)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Clock className="w-3.5 h-3.5" /> {tw ? '第' : '第'}{day}{tw ? '天' : '天'} · {TIME_SLOTS[slot]}
          </div>
          <div className="px-3 py-1.5 rounded-full bg-white/95 text-[#211D33] text-xs font-black flex items-center gap-1.5">
            <span>{location.icon}</span> {location.label}
          </div>
          {curPhase && (
            <div className="px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5"
              style={{ background: showDay ? 'rgba(201,162,39,0.9)' : 'rgba(201,162,39,0.2)', color: showDay ? '#211D33' : '#F1ECFF', border: '1px solid rgba(201,162,39,0.5)' }}>
              <span>{curPhase.icon}</span>{showDay ? (tw ? '今天打歌' : '今天打歌') : curPhase.label}
            </div>
          )}
        </div>
        <div
          className="px-3 py-1 rounded-full text-[10px] font-bold pointer-events-none flex items-center gap-1.5"
          style={actionUsed
            ? { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }
            : { background: 'rgba(201,162,39,0.18)', color: '#F1ECFF', border: '1px solid rgba(201,162,39,0.45)' }}
        >
          {actionUsed
            ? (tw ? '本時段已用完 —— 只能閒聊，推進時段恢復' : '本时段已用完 —— 只能闲聊，推进时段恢复')
            : <><span className="text-[#C9A227]">●</span>{tw ? '本時段還可深入互動 1 次' : '本时段还可深入互动 1 次'}</>}
        </div>
      </div>

      {/* 右上：快捷入口（毛玻璃图标） + 推进时段（主操作） */}
      <div className="absolute top-3 right-3 z-30 flex gap-1.5 flex-wrap justify-end">
        <button onClick={onOpenPhone} title={tw ? '手機' : '手机'} className="relative w-8 h-8 rounded-xl flex items-center justify-center text-[#F1ECFF] transition-all hover:bg-white/10" style={{ background: 'rgba(14,11,26,0.6)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Smartphone className="w-4 h-4" />
          {phoneUnread > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#FF3B30] text-white text-[9px] font-black flex items-center justify-center shadow animate-pulse">{phoneUnread}</span>}
        </button>
        <button onClick={() => onCustomize({ kind: 'player' })} title={tw ? '捏臉' : '捏脸'} className="w-8 h-8 rounded-xl flex items-center justify-center text-[#F1ECFF] transition-all hover:bg-white/10" style={{ background: 'rgba(14,11,26,0.6)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Palette className="w-4 h-4" />
        </button>
        <button onClick={() => setShowRelations(true)} title={tw ? '關係' : '关系'} className="w-8 h-8 rounded-xl flex items-center justify-center text-[#F1ECFF] transition-all hover:bg-white/10" style={{ background: 'rgba(14,11,26,0.6)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Users className="w-4 h-4" />
        </button>
        <button onClick={() => setShowFeed(true)} title={tw ? '動態' : '动态'} className="relative w-8 h-8 rounded-xl flex items-center justify-center text-[#F1ECFF] transition-all hover:bg-white/10" style={{ background: 'rgba(14,11,26,0.6)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Rss className="w-4 h-4" />
          {worldFeed.length > 0 && <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-[#FF7A93] text-white text-[8px] flex items-center justify-center">{worldFeed.length}</span>}
        </button>
        <button onClick={() => setShowSchedule(true)} title={tw ? '日程' : '日程'} className="w-8 h-8 rounded-xl flex items-center justify-center text-[#F1ECFF] transition-all hover:bg-white/10" style={{ background: 'rgba(14,11,26,0.6)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <CalendarDays className="w-4 h-4" />
        </button>
        <button onClick={() => setShowCalendar(true)} title={tw ? '年曆' : '年历'} className="w-8 h-8 rounded-xl flex items-center justify-center text-[#F1ECFF] transition-all hover:bg-white/10" style={{ background: 'rgba(14,11,26,0.6)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <CalendarRange className="w-4 h-4" />
        </button>
        {isPromo && (
          <button onClick={onSupport} disabled={actionUsed} title={tw ? '應援打投' : '应援打投'}
            className="px-3 py-1.5 rounded-xl text-white text-[11px] font-black flex items-center gap-1 transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#FF7A93,#e35c78)', boxShadow: '0 6px 16px -6px rgba(255,122,147,0.8)' }}>
            <Megaphone className="w-3.5 h-3.5" /> {tw ? '應援' : '应援'}
          </button>
        )}
        {endingReady && onOpenEnding && (
          <button onClick={onOpenEnding} title={tw ? '可以收尾了' : '可以收尾了'}
            className="px-3 py-1.5 rounded-xl text-white text-[11px] font-black flex items-center gap-1 transition-all animate-pulse"
            style={{ background: 'linear-gradient(135deg,#C9A227,#9a7b1d)', boxShadow: '0 6px 16px -6px rgba(201,162,39,0.9)' }}>
            ✦ {tw ? '結局' : '结局'}
          </button>
        )}
        <button onClick={onAdvanceTime} className={`px-3 py-1.5 rounded-xl text-white text-[11px] font-black flex items-center gap-1 transition-all border-none ${actionUsed ? 'animate-pulse' : ''}`} style={{ background: 'linear-gradient(135deg,#6C79C4,#454F87)', boxShadow: actionUsed ? '0 6px 20px -4px rgba(201,162,39,0.9)' : '0 6px 16px -6px rgba(91,107,176,0.8)' }}>
          {tw ? '推進時段' : '推进时段'} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 舞台 */}
      <div ref={stageRef} className="absolute inset-0 z-10 cursor-pointer" onClick={onFloorClick}>
        {sorted.map(e => {
          const isNear = !e.isPlayer && e.id === nearId;
          const activity = e.member ? getActivity(e.member.id, day, slot, e.member.group) : null;
          return (
            <div
              key={e.id}
              className="absolute"
              style={{ left: `${e.x}%`, top: `${e.y}%`, transform: 'translate(-50%, -100%)', zIndex: Math.round(e.y) + (e.isPlayer ? 1 : 0) }}
              onClick={(ev) => { if (!e.isPlayer && e.member) { ev.stopPropagation(); onTalk(e.member, { location, activity: getActivity(e.member.id, day, slot, e.member.group) }); } }}
            >
              <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: -4, width: SPRITE * 0.5, height: SPRITE * 0.16, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', filter: 'blur(2px)' }} />
              <div className="absolute left-1/2 -translate-x-1/2 -top-6 flex flex-col items-center gap-0.5 whitespace-nowrap">
                {isNear && (
                  <div
                    className={`mb-0.5 px-2 py-0.5 rounded-full text-white text-[9px] font-black flex items-center gap-1 shadow-lg ${actionUsed ? '' : 'animate-bounce'}`}
                    style={{ background: actionUsed ? 'rgba(8,6,16,0.7)' : '#5B6BB0' }}
                  >
                    <MessageCircle className="w-2.5 h-2.5" /> {actionUsed ? (tw ? '閒聊' : '闲聊') : (tw ? '對話' : '对话')}
                  </div>
                )}
                <div className={`px-1.5 py-0.5 rounded text-[9px] font-black ${e.isPlayer ? 'bg-white/90 text-[#2A2A3D]' : 'bg-black/45 text-white'}`}>
                  {e.isPlayer ? (tw ? '你' : '你') : e.name}
                </div>
                {!e.isPlayer && activity && <div className="px-1 rounded text-[8px] text-white/80 bg-black/30">{activity.mood.split('、')[0]}</div>}
              </div>
              <div className={!e.isPlayer ? 'cursor-pointer' : ''} style={{ filter: isNear ? 'drop-shadow(0 0 9px rgba(201,162,39,0.85)) drop-shadow(0 3px 4px rgba(0,0,0,0.5))' : 'drop-shadow(0 3px 4px rgba(0,0,0,0.45))' }}>
                <PixelSprite sheet={stripsRef.current[e.id] ?? null} facing={e.facing} frame={e.frame} size={SPRITE} />
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

      {/* 身份门禁提示 */}
      {lockToast && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-2xl bg-[#2A2A3D]/95 text-white text-[11px] font-bold flex items-center gap-2 shadow-xl border border-white/10 max-w-[86%] animate-[fadeIn_0.2s_ease]">
          <Lock className="w-3.5 h-3.5 text-[#FF7A93] flex-shrink-0" /> {lockToast}
        </div>
      )}

      {/* 底部：地点切换栏 */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex gap-1.5 px-2 py-1.5 rounded-2xl max-w-[95%] overflow-x-auto" style={{ background: 'rgba(8,6,16,0.55)', backdropFilter: 'blur(6px)' }}>
        {WORLD_LOCATIONS.map(loc => {
          const n = countAt(loc.id);
          const active = loc.id === locationId;
          const locked = !accessible.has(loc.id);
          return (
            <button
              key={loc.id}
              onClick={() => tryTravel(loc.id)}
              title={locked ? lockReason(loc.id, tw) : undefined}
              className={`relative flex-shrink-0 px-2.5 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1 transition-all ${active ? 'bg-white text-[#211D33]' : locked ? 'bg-white/[0.05] text-white/35' : 'bg-white/15 text-white hover:bg-white/25'}`}
            >
              <span className={locked ? 'grayscale opacity-70' : ''}>{loc.icon}</span> {loc.label}
              {locked
                ? <Lock className="w-2.5 h-2.5 ml-0.5" />
                : n > 0 && <span className="ml-0.5 min-w-[15px] h-[15px] px-1 rounded-full text-[8px] flex items-center justify-center bg-[#5B6BB0] text-white">{n}</span>}
            </button>
          );
        })}
      </div>

      {/* 世界动态流 */}
      {showFeed && (
        <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowFeed(false)}>
          <div className="ink-panel ink-scroll rounded-[18px] p-5 max-w-md w-full max-h-[80%] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-black text-[#F1ECFF] flex items-center gap-2"><Rss className="w-4 h-4 text-[#C9A227]" /> {tw ? '世界動態' : '世界动态'}</h3>
              <button onClick={() => setShowFeed(false)} className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[#B7B2D9] flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
            </div>
            {worldFeed.length === 0 ? (
              <div className="text-[11px] text-[#8B86B8] py-3 leading-relaxed">{tw ? '暫無動態。推進時段後，其它地點的愛豆也會各自相處，這裡會記錄下來。' : '暂无动态。推进时段后，其它地点的爱豆也会各自相处，这里会记录下来。'}</div>
            ) : (
              <div className="flex flex-col gap-2">
                {worldFeed.map(f => (
                  <div key={f.id} className="flex items-center gap-2.5 bg-white/[0.03] rounded-[10px] px-3 py-2.5">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: f.kind === 'romance' ? '#FF7A93' : f.kind === 'tension' ? '#C9A227' : '#6C79C4' }} />
                    <span className="text-[11px] text-[#F1ECFF] flex-1">{f.text}</span>
                    <span className="text-[9px] text-[#8B86B8] whitespace-nowrap">D{f.day}·{TIME_SLOTS[f.slot]}</span>
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
          onSetIntent={onSetIntent} onToggleMatchmake={onToggleMatchmake} onSetPairAffinity={onSetPairAffinity} onConfess={onConfess}
          onClose={() => setShowRelations(false)} lang={lang} onCustomize={onCustomize}
        />
      )}

      {/* 年历：一年的档期一眼看完，玩家能提前规划 */}
      {showCalendar && (
        <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowCalendar(false)}>
          <div className="ink-panel ink-scroll rounded-[18px] p-5 max-w-2xl w-full max-h-[85%] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[14px] font-black text-[#F1ECFF] flex items-center gap-2"><CalendarRange className="w-4 h-4 text-[#C9A227]" /> {mainGroup} {tw ? '年曆' : '年历'}</h3>
              <button onClick={() => setShowCalendar(false)} className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[#B7B2D9] flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[10px] text-[#8B86B8] mb-4">{tw ? `第 ${weekOf(day)} 週 · 第 ${day} 天（第 ${dayInWeek(day)} 日）` : `第 ${weekOf(day)} 周 · 第 ${day} 天（周内第 ${dayInWeek(day)} 日）`}</p>

            {/* 52 周条带 */}
            <div className="grid gap-1 mb-4" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
              {Array.from({ length: WEEKS_PER_YEAR }, (_, i) => i + 1).map(w => {
                const p = mainGroup ? buildYearPhases(mainGroup).find(ph => w >= ph.startWeek && w <= ph.endWeek) : null;
                const isNow = w === weekOf(day);
                const bg = p?.kind === 'promo' ? 'rgba(201,162,39,0.55)'
                  : p?.kind === 'comeback' ? 'rgba(201,162,39,0.28)'
                  : p?.kind === 'tour' ? 'rgba(108,121,196,0.5)'
                  : p?.kind === 'awards' ? 'rgba(255,122,147,0.5)'
                  : 'rgba(255,255,255,0.06)';
                return (
                  <div key={w} title={`第${w}周${p ? ' · ' + p.label : ''}`}
                    className="h-6 rounded flex items-center justify-center text-[8px] font-bold"
                    style={{ background: bg, color: p ? '#F1ECFF' : '#6b6790', outline: isNow ? '2px solid #C9A227' : 'none' }}>
                    {p ? p.icon : w % 4 === 1 ? w : ''}
                  </div>
                );
              })}
            </div>

            {/* 档期清单 */}
            <div className="gold-caption mb-2">{tw ? '今年的大事' : '今年的大事'}</div>
            <div className="flex flex-col gap-1.5">
              {(mainGroup ? buildYearPhases(mainGroup) : []).map((p, i) => {
                const now = weekOf(day) >= p.startWeek && weekOf(day) <= p.endWeek;
                const past = weekOf(day) > p.endWeek;
                return (
                  <div key={i} className="flex items-center gap-3 rounded-[10px] px-3 py-2 bg-white/[0.03]"
                    style={{ border: now ? '1px solid rgba(201,162,39,0.5)' : '1px solid transparent', opacity: past ? 0.45 : 1 }}>
                    <span className="text-base">{p.icon}</span>
                    <span className="text-[12px] font-black text-[#F1ECFF] flex-1">{p.label}</span>
                    <span className="text-[10px] text-[#8B86B8]">{tw ? `第 ${p.startWeek}-${p.endWeek} 週` : `第 ${p.startWeek}-${p.endWeek} 周`}</span>
                    {now && <span className="text-[9px] font-black text-[#C9A227]">{tw ? '進行中' : '进行中'}</span>}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-[#8B86B8] mt-4 leading-relaxed">
              {tw ? '打歌期每週第 4、7 天有打歌舞台，成績由你平時的應援與她的狀態決定。' : '打歌期每周第 4、7 天有打歌舞台，成绩由你平时的应援与她的状态决定。'}
            </p>
          </div>
        </div>
      )}

      {/* 日程面板 */}
      {showSchedule && (
        <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowSchedule(false)}>
          <div className="ink-panel ink-scroll rounded-[18px] p-5 max-w-2xl w-full max-h-[85%] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-black text-[#F1ECFF] flex items-center gap-2"><CalendarDays className="w-4 h-4 text-[#C9A227]" /> {tw ? `第${day}天 · 日程` : `第${day}天 · 日程`}</h3>
              <button onClick={() => setShowSchedule(false)} className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[#B7B2D9] flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="text-[#8B86B8]">
                  <th className="text-left py-2 px-2 font-black">成员</th>
                  {TIME_SLOTS.map((s, i) => (
                    <th key={s} className={`text-left py-2 px-2 font-black ${i === slot ? 'text-[#C9A227]' : ''}`}>{s}{i === slot ? ' ●' : ''}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(members.reduce((acc, m) => {
                  (acc[m.group] = acc[m.group] || []).push(m); return acc;
                }, {} as Record<string, Member[]>)).flatMap(([g, gm]) => [
                  <tr key={`g-${g}`}>
                    <td colSpan={TIME_SLOTS.length + 1} className="pt-3 pb-1 px-2">
                      <span className="gold-caption">{g}</span>
                      <span className="ml-2 text-[9px] font-bold" style={{ color: isGroupDay(g, day) ? '#C9A227' : '#8B86B8' }}>
                        {isGroupDay(g, day) ? (tw ? '· 團體行程日（全團同進同出）' : '· 团体行程日（全团同进同出）') : (tw ? '· 休息日（各自散開，好約）' : '· 休息日（各自散开，好约）')}
                      </span>
                    </td>
                  </tr>,
                  ...gm.map(m => (
                  <tr key={m.id} className="border-t border-white/[0.08]">
                    <td className="py-2 px-2 font-bold text-[#F1ECFF] whitespace-nowrap">{m.name}</td>
                    {TIME_SLOTS.map((_, i) => {
                      const a = getActivity(m.id, day, i, m.group);
                      const here = a.available && a.loc === locationId;
                      const loc = a.loc === AWAY ? null : getLocation(a.loc);
                      const gated = a.available && a.loc !== AWAY && !accessible.has(a.loc);
                      return (
                        <td key={i} className={`py-2 px-2 ${i === slot ? 'bg-[rgba(201,162,39,0.08)]' : ''}`}>
                          <div className={`flex items-center gap-1 ${!a.available ? 'text-[#5b5678] line-through' : gated ? 'text-[#5b5678]' : 'text-[#F1ECFF]'}`}>
                            {loc && <span className={gated ? 'grayscale opacity-70' : ''}>{loc.icon}</span>}
                            <span className="font-bold">{a.label}</span>
                            {gated && <Lock className="w-2.5 h-2.5 text-[#5b5678]" />}
                            {here && i === slot && <span className="text-[8px] text-[#C9A227] font-black">· 在这</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  )),
                ])}
              </tbody>
            </table>
            <p className="text-[10px] text-[#8B86B8] mt-3 flex items-center gap-1 flex-wrap leading-relaxed">{tw ? '劃掉=在外地/聯繫不上；' : '划掉=在外地/联系不上；'}<Lock className="w-2.5 h-2.5" />{tw ? '=你的身份進不去。點下方地點欄過去找人；沒人就「推進時段」等日程變化。' : '=你的身份进不去。点下方地点栏过去找人；没人就「推进时段」等日程变化。'}</p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
