import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Member } from './types';
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
  const scale = size / STRIP_H; // 每帧 32px → size
  return (
    <div style={{ width: size, height: size, overflow: 'hidden', transform: facing === 'left' ? 'scaleX(-1)' : undefined }}>
      <div
        style={{
          width: STRIP_W * scale,
          height: STRIP_H * scale,
          backgroundImage: `url(${strip})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${STRIP_W * scale}px ${STRIP_H * scale}px`,
          backgroundPosition: `-${frame * size}px 0`,
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
}

interface Entity {
  id: string;
  isPlayer: boolean;
  name: string;
  member?: Member;
  x: number; y: number;      // 百分比坐标 (脚下位置)
  tx: number; ty: number;    // 目标航点
  facing: 'left' | 'right';
  moving: boolean;
  frame: number;
  frameAcc: number;
  waitAcc: number;           // 到达后停留计时
}

// 移动区域（百分比），留出顶部给背景
const BOUND = { minX: 8, maxX: 92, minY: 42, maxY: 88 };
const SPRITE = 60;          // 小人显示尺寸 px
const TALK_DIST = 9;        // 触发对话的邻近距离（百分比欧氏）
const IDOL_SPEED = 7;       // %/秒
const PLAYER_SPEED = 22;    // %/秒

function rand(min: number, max: number) { return min + Math.random() * (max - min); }

export default function WorldView({ members, playerName, sceneConfig, sceneLabel, onTalk, lang }: {
  members: Member[];
  playerName: string;
  sceneConfig: { bg: string; overlay: string };
  sceneLabel: string;
  onTalk: (m: Member) => void;
  lang: string;
}) {
  const tw = lang === 'traditional';
  const stageRef = useRef<HTMLDivElement>(null);
  const entitiesRef = useRef<Entity[]>([]);
  const stripsRef = useRef<Record<string, string>>({}); // id → 合成后的走路 strip dataURL
  const keysRef = useRef<Set<string>>(new Set());
  const [, setTick] = useState(0);
  const [nearId, setNearId] = useState<string | null>(null);
  const [, setStripVer] = useState(0);

  // 初始化实体（成员变化时重建，保留已有位置）
  const memberKey = members.map(m => m.id).join(',');
  useEffect(() => {
    const prev = new Map(entitiesRef.current.map(e => [e.id, e]));
    const idols: Entity[] = members.map(m => {
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
      id: '__player__', isPlayer: true, name: playerName || (tw ? '你' : '你'),
      x: 50, y: 80, tx: 50, ty: 80,
      facing: 'right', moving: false, frame: 0, frameAcc: 0, waitAcc: 0,
    };
    player.name = playerName || '你';
    entitiesRef.current = [...idols, player];
    setTick(t => t + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberKey, playerName]);

  // 加载精灵表 + 合成每个小人的走路 strip（按 id 存入 map，与实体对象生命周期解耦）
  useEffect(() => {
    let alive = true;
    loadSpriteSheet().then(sheet => {
      if (!alive) return;
      const map: Record<string, string> = { ...stripsRef.current };
      for (const m of members) if (!map[m.id]) map[m.id] = buildSpriteStrip(sheet, getAppearance(m.id));
      map['__player__'] = buildSpriteStrip(sheet, getPlayerAppearance(playerName || 'you'));
      stripsRef.current = map;
      setStripVer(v => v + 1);
    }).catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberKey, playerName]);

  // 键盘控制
  useEffect(() => {
    const down = (ev: KeyboardEvent) => {
      const k = ev.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        keysRef.current.add(k); ev.preventDefault();
      }
    };
    const up = (ev: KeyboardEvent) => keysRef.current.delete(ev.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // 主循环
  useEffect(() => {
    let raf = 0; let last = performance.now(); let renderAcc = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const ents = entitiesRef.current;
      const keys = keysRef.current;

      for (const e of ents) {
        if (e.isPlayer) {
          // 键盘方向优先
          let dx = 0, dy = 0;
          if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
          if (keys.has('d') || keys.has('arrowright')) dx += 1;
          if (keys.has('w') || keys.has('arrowup')) dy -= 1;
          if (keys.has('s') || keys.has('arrowdown')) dy += 1;
          if (dx || dy) {
            const len = Math.hypot(dx, dy) || 1;
            e.x = clamp(e.x + (dx / len) * PLAYER_SPEED * dt, BOUND.minX, BOUND.maxX);
            e.y = clamp(e.y + (dy / len) * PLAYER_SPEED * dt, BOUND.minY, BOUND.maxY);
            e.tx = e.x; e.ty = e.y;
            if (dx) e.facing = dx < 0 ? 'left' : 'right';
            e.moving = true;
          } else {
            // 点击移动
            moveToward(e, PLAYER_SPEED, dt);
          }
        } else {
          // 爱豆自主漫步
          if (e.moving) {
            const arrived = moveToward(e, IDOL_SPEED, dt);
            if (arrived) { e.moving = false; e.waitAcc = rand(0.6, 2.4); }
          } else {
            e.waitAcc -= dt;
            if (e.waitAcc <= 0) {
              e.tx = rand(BOUND.minX, BOUND.maxX);
              e.ty = rand(BOUND.minY, BOUND.maxY);
              e.moving = true;
            }
          }
        }
        // 走路动画帧
        if (e.moving) {
          e.frameAcc += dt;
          if (e.frameAcc > 0.11) { e.frameAcc = 0; e.frame = (e.frame + 1) % FRAMES; }
        } else {
          e.frame = 0;
        }
      }

      // 邻近检测
      const player = ents.find(e => e.isPlayer)!;
      let near: string | null = null; let best = TALK_DIST;
      for (const e of ents) {
        if (e.isPlayer) continue;
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < best) { best = d; near = e.id; }
      }
      setNearId(prev => (prev === near ? prev : near));

      // 限制重绘 ~30fps
      renderAcc += dt;
      if (renderAcc > 0.033) { renderAcc = 0; setTick(t => (t + 1) % 1000000); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onFloorClick = (ev: React.MouseEvent) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((ev.clientX - rect.left) / rect.width) * 100;
    const py = ((ev.clientY - rect.top) / rect.height) * 100;
    const player = entitiesRef.current.find(e => e.isPlayer);
    if (player) { player.tx = clamp(px, BOUND.minX, BOUND.maxX); player.ty = clamp(py, BOUND.minY, BOUND.maxY); player.moving = true; }
  };

  const ents = entitiesRef.current;
  const sorted = [...ents].sort((a, b) => a.y - b.y); // 每次重绘按 y 排序做前后遮挡

  return (
    <div className="relative w-full h-full overflow-hidden select-none" style={{ background: sceneConfig.bg }}>
      {/* 地面 + 射灯氛围 */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 80% at 50% 0%, rgba(255,240,210,0.18), transparent 55%)' }} />
      <div className="absolute left-0 right-0" style={{ top: `${BOUND.minY - 6}%`, bottom: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.35))' }} />
      <div className="absolute inset-0" style={{ background: sceneConfig.overlay }} />

      {/* 顶部标题 + 提示 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1 pointer-events-none">
        <div className="px-4 py-1.5 rounded-full bg-black/40 backdrop-blur text-white text-xs font-black tracking-wide">
          {sceneLabel}
        </div>
        <div className="px-3 py-1 rounded-full bg-white/15 text-white/90 text-[10px] font-bold">
          {tw ? 'WASD / 方向鍵移動 · 點擊地板走過去 · 走近愛豆對話' : 'WASD / 方向键移动 · 点击地板走过去 · 走近爱豆对话'}
        </div>
      </div>

      {/* 舞台点击层 */}
      <div ref={stageRef} className="absolute inset-0 z-10 cursor-pointer" onClick={onFloorClick}>
        {sorted.map(e => {
          const isNear = !e.isPlayer && e.id === nearId;
          return (
            <div
              key={e.id}
              className="absolute"
              style={{ left: `${e.x}%`, top: `${e.y}%`, transform: 'translate(-50%, -100%)', zIndex: Math.round(e.y) + (e.isPlayer ? 1 : 0) }}
              onClick={(ev) => { if (!e.isPlayer && e.member) { ev.stopPropagation(); onTalk(e.member); } }}
            >
              {/* 影子 */}
              <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: -4, width: SPRITE * 0.5, height: SPRITE * 0.16, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', filter: 'blur(2px)' }} />

              {/* 名牌 / 对话提示 */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-5 flex flex-col items-center gap-0.5 whitespace-nowrap">
                {isNear && (
                  <div className="mb-0.5 px-2 py-0.5 rounded-full bg-[#C4936A] text-white text-[9px] font-black flex items-center gap-1 shadow-lg animate-bounce">
                    <MessageCircle className="w-2.5 h-2.5" /> {tw ? '對話' : '对话'}
                  </div>
                )}
                <div className={`px-1.5 py-0.5 rounded text-[9px] font-black ${e.isPlayer ? 'bg-white/90 text-[#3D2B1F]' : 'bg-black/45 text-white'}`}>
                  {e.isPlayer ? (tw ? '你' : '你') : e.name}
                </div>
              </div>

              <div className={`${!e.isPlayer ? 'cursor-pointer' : ''} ${isNear ? 'drop-shadow-[0_0_8px_rgba(196,147,106,0.9)]' : ''}`}>
                <PixelSprite strip={stripsRef.current[e.id] ?? null} facing={e.facing} frame={e.frame} size={SPRITE} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) { return v < lo ? lo : v > hi ? hi : v; }

// 朝目标移动，返回是否到达
function moveToward(e: Entity, speed: number, dt: number): boolean {
  const dx = e.tx - e.x, dy = e.ty - e.y;
  const dist = Math.hypot(dx, dy);
  const step = speed * dt;
  if (dist <= step || dist < 0.4) { e.x = e.tx; e.y = e.ty; e.moving = false; return true; }
  e.x += (dx / dist) * step;
  e.y += (dy / dist) * step;
  if (Math.abs(dx) > 0.1) e.facing = dx < 0 ? 'left' : 'right';
  e.moving = true;
  return false;
}
