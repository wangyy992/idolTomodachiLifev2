import { DM_ACTIONS, dmReply, socialEvent, type DMAction } from './socialSimulation';
import { applyMemberSnapshot, validateSnapshot, serializeGame, restoreGame, migrateStoredSecrets, encounterKey, needKey } from './gameState';
import { getSessionApiKey, setSessionApiKey, type RequestProgress } from './chatClient';
import React, { useState, useEffect, useRef } from 'react';
import { Send, RefreshCw, Users, Eye, MapPin, Gamepad2, Heart, Zap, Sparkles, X, ChevronUp, Globe, User, Cake, KeyRound, ArrowRight, Check, Wand2, Save, FolderOpen, Trash2, Smartphone, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { GameState, INITIAL_MEMBERS, ChatMessage, MessageRole, Member, TheqooPost, SetupStep } from './types';
import { callGeminiAPI } from './geminiService';
import { getSceneConfig } from './sceneConfig';
import WorldView from './WorldView';
import FaceCustomizer, { SpritePreview } from './FaceCustomizer';
import SceneView from './SceneView';
import WorldPanel from './WorldPanel';
import { getPlayerAppearance, getDefaultAppearance, getAppearance, normalizeAppearance, type Appearance } from './spriteUtils';
import { nextTime, idolsAt, getLocation, getActivity, unitKeyOf, parseLocKey, getStartLocation, startingAffection, identitySummary, WORLD_LOCATIONS, type WorldLocation, type Activity } from './worldConfig';
import { seedIdolRelations, pairKey, deriveType, hasFlag, PLAYER, type Intent } from './relations';
import { computeMusicShow, isMusicShowDay, weekOf, phaseAt, DAYS_PER_YEAR } from './calendar';
import { availableEnding, buildYearbook } from './endings';
import { pendingMilestone, quietPlaceNow, milestoneTitle } from './milestones';
import type { Need } from './needs';
import { getNeed } from './needs';
import { pairNews, crossingNews, soloMood } from './islandNews';
import EndingCard from './EndingCard';

import { KKTMessageUI, WeversePostUI, BubbleMessageUI, TheqooPostUI, CharacterCardUI, MusicShowUI, MobileDrawer, PhoneModal, CharacterCreationWizard, StoryText } from './GamePanels';
import { parseContentBlocks, extractBlock, comebackOnDay, parseOptions, parseScript, type ScriptEntry, type ContentBlock } from './story';
export type { ScriptEntry } from './story';
const LOCAL_STORAGE_KEY = 'star_reality_kpop_game_state';

export default function App() {
  const getInitialGameState = (): GameState => ({
    members: INITIAL_MEMBERS, exposure: 0, relationships: [], currentScene: '首尔', history: [],
    turnCount: 0, identity: [], setupStep: SetupStep.CREATION, playerName: '', playerAge: 20,
    playerMoney: 2300000, playerMood: 80, targets: [], selectedCPs: [], collectedCards: [],
    playerImpact: { albumImpact: 0, voteImpact: 0 }
  });

  const [gameState, setGameState] = useState<GameState>(() => {
    try {
      migrateStoredSecrets(localStorage);
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) return restoreGame(JSON.parse(saved), getInitialGameState());
    } catch {}
    return getInitialGameState();
  });

  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [showEnding, setShowEnding] = useState(false);
  const [endingDismissed, setEndingDismissed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isTraditional, setIsTraditional] = useState(false);
  const [showSaveSlots, setShowSaveSlots] = useState(false);
  const [worldMode, setWorldMode] = useState(true); // 俯视世界视图 ⟷ 剧情对话（临时UI，不持久化）
  const [toasts, setToasts] = useState<{ id: string; text: string; kind: string }[]>([]);
  const [customizing, setCustomizing] = useState<{ kind: 'player' } | { kind: 'idol'; id: string } | null>(null);
  const [scene, setScene] = useState<{ ids: string[]; anchor: number; key?: string } | null>(null);
  const [requestProgress, setRequestProgress] = useState<RequestProgress | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [showAISettings, setShowAISettings] = useState(false);
  const [keyDraft, setKeyDraft] = useState('');
  const requestRef = useRef<{ controller: AbortController; state: GameState; text: string; id: number } | null>(null);
  const requestVersion = useRef(0);
  const [retryRequest, setRetryRequest] = useState<{ text: string; state: GameState } | null>(null);
  const cancelRequest = () => {
    const pending = requestRef.current;
    requestVersion.current++;
    pending?.controller.abort(); requestRef.current = null;
    setIsLoading(false); setRequestProgress(null);
    if (pending) { setInput(pending.text); setRetryRequest({ text: pending.text, state: pending.state }); setRequestError('已取消等待，刚才的行动已保留。'); }
  };
  useEffect(() => () => { requestVersion.current++; requestRef.current?.controller.abort(); }, []);
  const worldDay = gameState.worldDay ?? 1;
  const worldSlot = gameState.worldSlot ?? 0;
  const worldLocation = gameState.worldLocation ?? 'practice_room';
  // 行动点：每时段全员共享一次深度互动，用掉后只能闲聊，推进时段自动恢复
  // 每人每时段一次深度互动（F6）：usedActions 存 "day-slot:id"；推进时段后自然作废
  const slotPrefix = `${worldDay}-${worldSlot}:`;
  const usedThisSlot = (gameState.usedActions || []).filter(k => k.startsWith(slotPrefix)).map(k => k.slice(slotPrefix.length));
  const isActionUsed = (id: string) => usedThisSlot.includes(id);
  const supportUsed = isActionUsed('__support__');
  const demoMode = !!(gameState as any).demoMode;
  const autoDemo = !!(gameState as any).autoDemo;
  const phoneFeed = gameState.phoneFeed || [];
  const phoneUnread = phoneFeed.filter(f => !f.read).length;
  const openPhone = () => setShowPhone(true);
  const closePhone = () => {
    setShowPhone(false);
    // 关掉手机时全部标记已读，红点熄灭
    setGameState(prev => ({ ...prev, phoneFeed: (prev.phoneFeed || []).map(f => (f.read ? f : { ...f, read: true })) }));
  };
  // 地点由世界掌管：切地点时同步顶栏场景名（不再让 AI 覆盖）
  const setWorldLocation = (loc: string) => setGameState(p => ({ ...p, worldLocation: loc, currentScene: getLocation(parseLocKey(loc).base)?.label ?? p.currentScene }));
  const pushToast = (text: string, kind: string) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    setToasts(t => [...t, { id, text, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4800);
  };
  const [wallpaper, setWallpaper] = useState<string>(() => localStorage.getItem('wallpaper') || '');
  // 新手引导：首次进世界弹一次，讲清照看循环
  const [showIntro, setShowIntro] = useState<boolean>(() => { try { return !localStorage.getItem('seen_intro_v1'); } catch { return false; } });
  const dismissIntro = () => { setShowIntro(false); try { localStorage.setItem('seen_intro_v1', '1'); } catch {} };

  const handleWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setWallpaper(result);
      localStorage.setItem('wallpaper', result);
    };
    reader.readAsDataURL(file);
  };

  const clearWallpaper = () => {
    setWallpaper('');
    localStorage.removeItem('wallpaper');
  };
  const [saveSlots, setSaveSlots] = useState<{id:string,name:string,time:string,scene:string,round:number}[]>(() => {
    try { return JSON.parse(localStorage.getItem('save_slots') || '[]'); } catch { return []; }
  });

  const saveGame = () => {
    const id = Date.now().toString();
    const time = new Date().toLocaleString('zh-TW', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
    const targetNames = gameState.members.filter(m => gameState.targets.includes(m.id)).map(m => m.name);
    const subject = targetNames.join(', ');
    const slot = { id, name: `存档 ${time}`, time, scene: gameState.currentScene, round: gameState.turnCount || 0, subject };
    const newSlots = [slot, ...saveSlots].slice(0, 10);
    setSaveSlots(newSlots);
    localStorage.setItem('save_slots', JSON.stringify(newSlots));
    localStorage.setItem(`save_data_${id}`, serializeGame(gameState));
    pushToast('存档成功', 'friendly');
  };

  const loadGame = (id: string) => {
    const data = localStorage.getItem(`save_data_${id}`);
    if (data) {
      try {
        const p = JSON.parse(data);
        // 存档存的是完整 gameState（所有新字段都在）；这里补几个旧存档可能缺的默认值，避免读回后报错
        cancelRequest(); setScene(null); setRetryRequest(null); setRequestError(null); setInput('');
        setGameState(restoreGame(p, getInitialGameState()));
        setShowSaveSlots(false);
      } catch {}
    }
  };

  const deleteSlot = (id: string) => {
    const newSlots = saveSlots.filter(s => s.id !== id);
    setSaveSlots(newSlots);
    localStorage.setItem('save_slots', JSON.stringify(newSlots));
    localStorage.removeItem(`save_data_${id}`);
  };

  const convertToTraditional = (text: string): string => {
    if ((window as any).OpenCC) {
      const converter = (window as any).OpenCC.Converter({ from: 'cn', to: 'twp' });
      return converter(text);
    }
    return text;
  };
  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevTypesRef = useRef<Record<string, string> | null>(null);

  useEffect(() => { try { localStorage.setItem(LOCAL_STORAGE_KEY, serializeGame(gameState)); } catch { setRequestError('自动存档失败：浏览器存储空间不足，请清理旧存档。'); } }, [gameState]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [gameState.history]);
  // 密钥现由服务端持有，前端不再探测（真缺失时由 /api/chat 报错提示）

  // ── 自动演示（Demo 自动驾驶）──────────────────────────────
  // 开启后，游戏每隔一小段自行推进：在场就自动走近爱豆演一段、有选项就自动选、
  // 一段聊够就自动脱出、没人可撩就自动换地点 / 推进时段。全程无需操作，录像用。
  useEffect(() => {
    if (!autoDemo) return;
    if (gameState.setupStep === SetupStep.CREATION) return;
    if (!gameState.worldLocation) return; // 还没进世界
    if (isLoading) return;
    // 有弹窗/结局占屏时先不动，让它自然展示
    if (showEnding || showConfirmReset || customizing || showPhone) return;
    // 首屏引导：自动看几秒再关掉
    if (showIntro) { const t = setTimeout(() => dismissIntro(), 3200); return () => clearTimeout(t); }

    const targets = gameState.members.filter(m => (gameState.targets || []).includes(m.id));
    const wm = targets.length > 0 ? targets : gameState.members.slice(0, 6);
    const usedNow = (id: string) => usedThisSlot.includes(id);

    // 决策：返回 { run, delay }
    let plan: { run: () => void; delay: number } | null = null;

    if (scene) {
      const hist = gameState.history;
      let msg: any = null;
      for (let i = hist.length - 1; i >= 0; i--) { if (hist[i].role === MessageRole.ASSISTANT && (scene.key ? hist[i].encounterKey === scene.key : i >= scene.anchor)) { msg = hist[i]; break; } }
      const rounds = hist.slice(scene.anchor).filter(h => h.role === MessageRole.ASSISTANT).length;
      const opts: { text: string; action: string }[] = msg?.options || [];
      if (rounds >= 3) {
        plan = { run: () => setScene(null), delay: 2600 };               // 聊够了，脱出
      } else if (opts.length > 0) {
        const pick = opts[Math.floor(Math.random() * opts.length)];
        plan = { run: () => handleSend(pick.action), delay: 2000 };      // 自动选一个选项
      } else {
        plan = { run: () => setScene(null), delay: 2600 };               // 没选项了，脱出
      }
    } else {
      const base = parseLocKey(worldLocation).base;
      const hereFree = idolsAt(wm, base, worldDay, worldSlot).filter(m => !usedNow(m.id));
      if (hereFree.length > 0) {
        // 优先撩头顶有需求气泡的那个，更有看头
        const withNeed = hereFree.map(m => {
          const act = getActivity(m.id, worldDay, worldSlot, m.group);
          const others = hereFree.filter(o => o.id !== m.id).map(o => ({ id: o.id, name: o.name }));
          return { m, act, need: getNeed(m, worldDay, worldSlot, act.available, others) };
        });
        const chosen = withNeed.find(x => x.need) || withNeed[0];
        const loc = getLocation(base);
        plan = {
          run: () => handleTalkTo(chosen.m, loc ? { location: loc, activity: chosen.act, need: chosen.need || undefined } : undefined),
          delay: 1700,
        };
      } else if (!supportUsed && (gameState.isComebackSetting)) {
        plan = { run: () => handleSupport(), delay: 1500 };              // 回归期顺手打投
      } else {
        // 本地没人可撩：去有人的地方；实在没有就推进时段
        let dest: string | null = null;
        for (const L of WORLD_LOCATIONS) {
          if (L.id === base) continue;
          if (idolsAt(wm, L.id, worldDay, worldSlot).some(m => !usedNow(m.id))) { dest = L.id; break; }
        }
        plan = dest
          ? { run: () => setWorldLocation(dest!), delay: 1300 }
          : { run: () => handleAdvanceTime(), delay: 1600 };
      }
    }

    const timer = setTimeout(() => plan && plan.run(), plan?.delay ?? 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDemo, isLoading, scene, showEnding, showConfirmReset, customizing, showPhone, showIntro,
      worldDay, worldSlot, worldLocation, gameState.history.length, gameState.setupStep, gameState.usedActions]);

  // 首次进入世界时，用各成员的 initialRelationships 播种爱豆↔爱豆关系
  useEffect(() => {
    if (gameState.setupStep !== SetupStep.CREATION && !gameState.worldRelations) {
      setGameState(prev => prev.worldRelations ? prev : { ...prev, worldRelations: seedIdolRelations(prev.members) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.setupStep]);

  // 关系跳档里程碑 → toast
  useEffect(() => {
    if (gameState.setupStep === SetupStep.CREATION) return;
    const RANK: Record<string, number> = { 陌生: 0, 眼熟: 1, 普通认识: 2, 朋友: 3, 好友: 4, 挚友: 5, 暧昧: 5, 深度暧昧: 6, 恋人: 7, 疏远: -1, 交恶: -2 };
    const NOTABLE = new Set(['朋友', '好友', '挚友', '暧昧', '深度暧昧', '恋人', '交恶']);
    const rels = gameState.worldRelations || {};
    const intents = gameState.relationIntents || {};
    const matchmakes = gameState.matchmakes || [];
    const targets = gameState.members.filter(m => (gameState.targets || []).includes(m.id));
    const cur: Record<string, string> = {};
    // 玩家↔爱豆
    for (const m of targets) {
      const confessed = hasFlag(rels[pairKey(PLAYER, m.id)], 'confessed');
      cur[`P:${m.id}`] = deriveType(m.affection || 0, 0, { romance: intents[m.id] === 'romance', confessed });
    }
    // 爱豆↔爱豆
    for (const [k, r] of Object.entries(rels)) {
      const [a, b] = k.split('|');
      if (a === PLAYER || b === PLAYER) continue;
      cur[k] = deriveType(r.affinity, r.tension, { romance: matchmakes.includes(k), confessed: hasFlag(r, 'confessed') });
    }
    const prev = prevTypesRef.current;
    if (prev) {
      for (const [k, t] of Object.entries(cur)) {
        const old = prev[k];
        if (old && old !== t && NOTABLE.has(t) && ((RANK[t] ?? 0) > (RANK[old] ?? 0) || t === '交恶')) {
          const label = (id: string) => id === PLAYER ? '你' : (gameState.members.find(m => m.id === id)?.name || id);
          const who = k.startsWith('P:') ? `你 和 ${label(k.slice(2))}` : `${label(k.split('|')[0])} 和 ${label(k.split('|')[1])}`;
          const emoji = t === '恋人' ? '💞' : (t === '暧昧' || t === '深度暧昧') ? '💗' : t === '交恶' ? '💥' : '✨';
          pushToast(`${who} 现在是「${t}」${emoji}`, t === '交恶' ? 'tension' : (RANK[t] >= 5 ? 'romance' : 'friendly'));
        }
      }
    }
    prevTypesRef.current = cur;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.worldRelations, gameState.members, gameState.relationIntents, gameState.matchmakes, gameState.setupStep]);

  const handleCreationComplete = (data: any) => {
    setSessionApiKey(data.playerApiKey || '');
    const { playerApiKey: _secret, ...publicData } = data;
    data = publicData;
    const targetNames = INITIAL_MEMBERS.filter(m => data.targets.includes(m.id)).map(m => m.name);

    let summary = `我的名字是 ${data.playerName}，`;
    {
      const startLabel = getLocation(getStartLocation(data.identity))?.label;
      summary += `身份是 ${(data.identity || []).join(', ') || '普通人'}。我想关注 ${targetNames.join(', ')}。${startLabel ? `故事从我以这个身份自然会出现的地方——${startLabel}——开始，开场地点要符合我的身份。` : ''}故事开始。`;
    }

    const affFloor = startingAffection(data.identity);
    const initializedMembers = INITIAL_MEMBERS.map(m => {
      // 关系型身份（现任女友/青梅…）→ 攻略对象起始好感度带一个下限
      if (affFloor > 0 && data.targets.includes(m.id)) {
        return { ...m, affection: Math.max(m.affection || 0, affFloor) };
      }
      return m;
    });

    // 自建角色（OC）：并进成员表，之后日程/关系/prompt 全部按普通成员走
    const ocs: Member[] = (data.customMembers || []).map((o: any) => ({
      id: o.id, name: o.name, stageName: o.name, group: o.group || '自建',
      age: o.age || 2002, nationality: o.nationality || '—', role: o.role || '',
      publicPersona: o.publicPersona || '你自己创建的角色',
      realPersonality: o.realPersonality || '（未填写性格，AI 会按名字与设定自由发挥）',
      ...(o.speechStyle ? { speechStyle: o.speechStyle } : {}),
      ...(o.secret ? { secret: o.secret } : {}),
      affection: typeof o.affection === 'number' ? o.affection : (affFloor > 0 ? affFloor : 0),
      careerPressure: 40, status: '自由',
    }));
    const allMembers = [...initializedMembers, ...ocs];
    // 自建角色也算"你关注的人"，否则不会出现在世界地图/关系网里
    const allTargets = [...(data.targets || []), ...ocs.map(o => o.id)];

    const startLoc = getStartLocation(data.identity);
    const startScene = startLoc ? getLocation(startLoc)?.label : undefined;
    const newState: GameState = {
      ...gameState, ...data, members: allMembers, targets: allTargets,
      setupStep: SetupStep.CARDS, history: [], turnCount: 0,
      ...(startLoc ? { worldLocation: startLoc, worldDay: 1, worldSlot: 0, currentScene: startScene, isComebackSetting: comebackOnDay(allMembers, allTargets, 1) } : {}),
      ...(data.playerApiKey ? { playerApiKey: data.playerApiKey, playerModel: data.playerModel } : {}),
      language: data.language,
      appearances: {
        ...(gameState.appearances || {}),
        ...Object.fromEntries((data.customMembers || []).filter((o: any) => o.appearance).map((o: any) => [o.id, o.appearance])),
      },
    } as any;
    setGameState(newState);
    const opening = { ...newState, history: [{ role: MessageRole.USER, content: summary, timestamp: Date.now() }] };
    setGameState(opening);
    void handleAIStep(summary, opening);
  };

  const handleAIStep = async (userContent: string, stateToUse: GameState): Promise<boolean> => {
    if (requestRef.current) return false;
    const controller = new AbortController();
    const id = ++requestVersion.current;
    requestRef.current = { controller, state: stateToUse, text: userContent, id };
    setIsLoading(true); setRequestError(null); setRetryRequest(null);
    try {
      const history = stateToUse.activeEncounterKey
        ? stateToUse.history.filter(m => m.encounterKey === stateToUse.activeEncounterKey)
        : stateToUse.history;
      const response = await callGeminiAPI(history.slice(-10), stateToUse, {
        signal: controller.signal,
        onProgress: progress => { if (requestVersion.current === id) setRequestProgress(progress); },
      });
      if (requestVersion.current !== id || controller.signal.aborted) return false;
      processAIResponse(response, stateToUse);
      return true;
    } catch (error) {
      if (requestVersion.current !== id) return false;
      setInput(userContent);
      setRetryRequest({ text: userContent, state: stateToUse });
      setRequestError(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      if (requestVersion.current === id) {
        requestRef.current = null; setIsLoading(false); setRequestProgress(null);
      }
    }
  };
  const retryLastRequest = () => { if (retryRequest && !requestRef.current) void handleAIStep(retryRequest.text, retryRequest.state); };

  const handleReset = () => setShowConfirmReset(true);
  const executeReset = () => { cancelRequest(); setScene(null); setRetryRequest(null); setRequestError(null); localStorage.removeItem(LOCAL_STORAGE_KEY); setShowConfirmReset(false); setGameState(getInitialGameState()); setInput(''); setIsLoading(false); };

  const processAIResponse = (response: string, stateAtCall: GameState) => {
    let remaining = response;
    remaining = remaining.replace(/\*\*([A-Z_]+(?:START|END))\*\*/g, '$1');
    remaining = remaining.replace(/---+\s*\n(SNAPSHOT_START)/g, '$1');
    remaining = remaining.replace(/KATALK_START|KATALK START/g, 'KKTMSG_START');
    remaining = remaining.replace(/KATALK_END|KATALK END/g, 'KKTMSG_END');

    let snapshot: any = null;
    let musicResult: any = null;
    const snapshotBlock = extractBlock(remaining, 'SNAPSHOT_START', 'SNAPSHOT_END');
    if (snapshotBlock) { remaining = snapshotBlock.remaining; try { snapshot = validateSnapshot(JSON.parse(snapshotBlock.content)); } catch(e) {} }
    // 好感变化飘字：满足需求 / 有来有往的即时爽感（攻略/自由世界模式）
    if (snapshot?.members && stateAtCall.gameMode !== 'CPCP' && stateAtCall.gameMode !== 'mom') {
      snapshot.members.forEach((sm: any) => {
        const old = stateAtCall.members.find(m => m.id === sm.id);
        if (!old || typeof sm.affection !== 'number') return;
        const d = sm.affection - (old.affection || 0);
        if (d === 0) return;
        pushToast(`${old.name} ♡ ${d > 0 ? '+' : ''}${d}`, d > 0 ? 'romance' : 'tension');
      });
    }
    const musicBlock = extractBlock(remaining, 'MUSICSHOW_START', 'MUSICSHOW_END');
    if (musicBlock) { remaining = musicBlock.remaining; try { musicResult = JSON.parse(musicBlock.content); } catch(e) {} }
    let relDeltas: any = null;
    const relBlock = extractBlock(remaining, 'RELDELTA_START', 'RELDELTA_END');
    if (relBlock) { remaining = relBlock.remaining; try { relDeltas = JSON.parse(relBlock.content); } catch(e) {} }
    // RISK：曝光度增量
    let riskDelta: any = null;
    const riskBlock = extractBlock(remaining, 'RISK_START', 'RISK_END');
    if (riskBlock) { remaining = riskBlock.remaining; try { riskDelta = JSON.parse(riskBlock.content); } catch(e) {} }
    // MILESTONE_ID=xxx：阶段突破已演出，记录下来避免重复触发
    const firedMilestones: string[] = [];
    remaining = remaining.replace(/^\s*MILESTONE_ID\s*=\s*(\S+)\s*$/gm, (_s, id) => { firedMilestones.push(String(id)); return ''; });
    // F10：里程碑不再只靠 AI 回显 —— 本轮在场的攻略对象若命中触发条件（和喂给 prompt 的同一套），
    // 客户端直接记为已触发，避免 AI 忘了回显 ID 导致重头戏反复触发。
    {
      const focus = ((stateAtCall as any).sceneFocusIds || []) as string[];
      const wl = (stateAtCall as any).worldLocation;
      if (wl && focus.length && stateAtCall.gameMode !== 'CPCP' && stateAtCall.gameMode !== 'mom') {
        const wslot = (stateAtCall as any).worldSlot ?? 0;
        const wbase = parseLocKey(wl).base;
        const done = (stateAtCall as any).milestones || [];
        const intents = (stateAtCall as any).relationIntents || {};
        for (const id of focus) {
          const mem = stateAtCall.members.find(m => m.id === id);
          if (!mem) continue;
          const md = pendingMilestone(id, { affection: mem.affection || 0, intentRomance: intents[id] === 'romance', quietPlace: quietPlaceNow(wslot, wbase), done });
          if (md && !firedMilestones.includes(`${id}:${md.id}`)) firedMilestones.push(`${id}:${md.id}`);
        }
      }
    }
    // 大节点触发 → 醒目 toast（和普通小事件区分开）
    firedMilestones.filter(id => !(stateAtCall.milestones || []).includes(id)).forEach(id => {
      const nm = gameState.members.find(m => m.id === (id.includes(':') ? id.split(':')[0] : ''))?.name || '';
      pushToast(`⚡ ${nm ? nm + '：' : ''}${milestoneTitle(id)}`, 'romance');
    });
    // EVENT_ID=xxx：本轮演过的事件，记下来做冷却
    const firedEvents: string[] = [];
    remaining = remaining.replace(/^\s*EVENT_ID\s*=\s*(\S+)\s*$/gm, (_s, id) => { firedEvents.push(String(id)); return ''; });

    const options = parseOptions(remaining);
    const contentBlocks = parseContentBlocks(remaining);

    const newCards: any[] = [];
    contentBlocks.forEach(block => {
      if (block.type === 'card') {
        const existingNames = (stateAtCall.collectedCards || []).map((c: any) => c.name);
        if (block.data?.name && !existingNames.includes(block.data.name)) {
          newCards.push(block.data);
        }
      }
    });

    setGameState(prev => {
      let next = { ...prev } as any;
      if (snapshot) {
        // 沙盒（世界模式）里，时间/地点/回归期/打歌名次都归游戏管，AI 的 SNAPSHOT 不许覆盖它们
        const inWorld = !!prev.worldLocation;
        next = {
          ...next,
          currentScene: inWorld ? next.currentScene : (snapshot.currentScene ?? next.currentScene),
          hiddenSummary: snapshot.hiddenSummary ?? next.hiddenSummary,
          isComebackSetting: inWorld ? next.isComebackSetting : (snapshot.isComebackSetting ?? false),
          groupHeats: snapshot.groupHeats ?? next.groupHeats,
          currentMusicShow: inWorld ? next.currentMusicShow : (musicResult || next.currentMusicShow),
          members: applyMemberSnapshot(next.members, snapshot.members)
        };
      }
      // 好感度只跟 AI 的 SNAPSHOT 走 —— 不再"没实质进展也硬 +1"（避免没接触也涨好感）。
      // AI 漏写某人时就保持原值不动，等下一轮有真进展再涨。
      // 打歌名次只由系统结算（handleAdvanceTime）；世界模式下忽略 AI 自报的打歌结果
      if (musicResult && !prev.worldLocation) next.musicShowHistory = [...(next.musicShowHistory || []), musicResult];
      if (newCards.length > 0) next.collectedCards = [...(next.collectedCards || []), ...newCards];
      if (newCards.length > 0 && prev.setupStep === SetupStep.CARDS) next.setupStep = SetupStep.STARTED;

      // RELDELTA：把 DeepSeek 输出的爱豆间关系增量应用到关系网
      if (relDeltas?.pairs && Array.isArray(relDeltas.pairs)) {
        const clampR = (v: number) => (v < 0 ? 0 : v > 100 ? 100 : v);
        const rels = { ...(next.worldRelations || {}) };
        for (const p of relDeltas.pairs) {
          if (!p || typeof p.a !== 'string' || typeof p.b !== 'string') continue;
          const a = p.a === 'player' ? PLAYER : p.a;
          const b = p.b === 'player' ? PLAYER : p.b;
          if (a === b || ![a, b].every(id => id === PLAYER || next.members.some((m: Member) => m.id === id))) continue;
          const delta = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? Math.max(-5, Math.min(5, v)) : 0;
          const k = pairKey(a, b);
          const cur = rels[k] || { affinity: 0, tension: 0 };
          rels[k] = {
            ...cur,
            affinity: clampR((cur.affinity || 0) + delta(p.affinity)),
            tension: clampR((cur.tension || 0) + delta(p.tension)),
            ...(p.memory ? { note: String(p.memory) } : {}),
          };
        }
        next.worldRelations = rels;
      }

      // 曝光度：AI 报告的风险增量（低调的一轮可以是负值）
      if (riskDelta && Number.isFinite(Number(riskDelta.delta))) {
        const d = Math.max(-20, Math.min(20, Number(riskDelta.delta)));
        next.exposureLevel = Math.max(0, Math.min(100, (prev.exposureLevel || 0) + d));
      }
      // 事件冷却：记录本轮演过的事件
      if (firedEvents.length) {
        const re = { ...(prev.recentEvents || {}) };
        const d = prev.worldDay ?? 1;
        firedEvents.forEach(id => { re[id] = d; });
        next.recentEvents = re;
      }
      // 阶段突破：记录已触发，避免重复；并写进"大事记"喂给年鉴/结局
      if (firedMilestones.length) {
        const already = new Set(prev.milestones || []);
        const fresh = firedMilestones.filter(id => !already.has(id));
        next.milestones = Array.from(new Set([...(prev.milestones || []), ...firedMilestones]));
        if (fresh.length) {
          const day = prev.worldDay ?? 1;
          const mem = snapshot?.hiddenSummary ? String(snapshot.hiddenSummary).slice(0, 80) : '';
          next.milestoneLog = [
            ...(prev.milestoneLog || []),
            ...fresh.map(id => {
              const memberId = id.includes(':') ? id.split(':')[0] : '';
              const name = prev.members.find((m: Member) => m.id === memberId)?.name || '';
              return { id, memberId, name, title: milestoneTitle(id), day, memory: mem };
            }),
          ].slice(-40);
        }
      }
      // 长期记忆：把本轮摘要写进在场爱豆的档案（每人最多留 12 条）
      const focus = (stateAtCall as any).sceneFocusIds as string[] | undefined;
      const summary = snapshot?.hiddenSummary;
      if (focus?.length && summary) {
        const mem = { ...(prev.memories || {}) };
        const day = prev.worldDay ?? 1, slot = prev.worldSlot ?? 0;
        for (const id of focus) {
          mem[id] = [...(mem[id] || []), { day, slot, text: String(summary).slice(0, 140) }].slice(-12);
        }
        next.memories = mem;
      }

      next.turnCount = (prev.turnCount || 0) + 1;

      // 社媒内容（theqoo/KKT/Weverse/bubble）不进对话流 → 收进手机，亮未读红点
      const PHONE_TYPES = ['kkt', 'weverse', 'bubble', 'theqoo'];
      const phoneBlocks = contentBlocks.filter((b: any) => PHONE_TYPES.includes(b.type));
      if (phoneBlocks.length > 0) {
        next.phoneFeed = [
          ...(next.phoneFeed || []),
          ...phoneBlocks.map((b: any) => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: b.type, data: b.data, ts: Date.now(), read: false,
          })),
        ].slice(-60);
      }
      const chatBlocks = contentBlocks.filter((b: any) => !PHONE_TYPES.includes(b.type));

      // 把选项也存入content，让AI下一轮能看到上一轮给了什么选项
      const isTraditionalMode = (prev as any).language === 'traditional' && (window as any).OpenCC;
      const tw = isTraditionalMode ? (window as any).OpenCC.Converter({ from: 'cn', to: 'twp' }) : (t: string) => t;
      const textContent = contentBlocks
        .filter((b: any) => b.type === 'text')
        .map((b: any) => { b.content = tw(b.content); return b.content; })
        .join('\n');
      const optionsText = options.length > 0
        ? '\n【本轮可选行动】\n' + options.map((o: any) => o.text).join('\n')
        : '';

      return {
        ...next,
        history: [...next.history, {
          role: MessageRole.ASSISTANT,
          encounterKey: stateAtCall.activeEncounterKey,
          content: (next.language === 'traditional' && (window as any).OpenCC)
            ? (window as any).OpenCC.Converter({ from: 'cn', to: 'twp' })(textContent + optionsText)
            : textContent + optionsText,
          timestamp: Date.now(),
          contentBlocks: chatBlocks,
          currentMusicShow: musicResult || undefined,
          options: options.length > 0 ? options : undefined,
          isWeekEnd: snapshot?.isWeekEnd === true,
        }]
      };
    });
  };

  const handleSend = async (content?: any, opts?: { focusIds?: string[]; consumeFor?: string[]; vignette?: any }) => {
    const textToSend = typeof content === 'string' ? content : input;
    if (!textToSend || !textToSend.trim()) return;
    if (isLoading || requestRef.current) return;
    setInput(''); setIsLoading(true);
    let nextState: GameState = { ...gameState };
    // 本场登场的人：走近/围观时显式传入；同一场景内后续对话沿用当前 scene
    const focus = opts?.focusIds ?? scene?.ids;
    nextState.sceneFocusIds = focus && focus.length ? focus : undefined;
    if (focus?.length) {
      const key = scene?.key && !opts?.focusIds ? scene.key : encounterKey(worldDay, worldSlot, worldLocation, focus);
      nextState.activeEncounterKey = key;
      nextState.encounters = { ...nextState.encounters, [key]: nextState.encounters?.[key] || {
        ids: focus, location: worldLocation, day: worldDay, slot: worldSlot,
        ...(opts?.vignette ? { need: opts.vignette } : {}),
      } };
    }
    const rememberedNeed = nextState.activeEncounterKey ? nextState.encounters?.[nextState.activeEncounterKey]?.need : undefined;
    if (!opts?.vignette) nextState.vignetteNeed = rememberedNeed || null;
    // 碎片剧场需求：开场带上（handleTalkTo 传 vignette）；新开的非碎片场景清掉；
    // 续聊/主输入（无 focusIds）沿用当前 scene 的需求不动。
    if (opts?.vignette !== undefined) nextState.vignetteNeed = opts.vignette;
    else if (opts?.focusIds && !rememberedNeed) nextState.vignetteNeed = null;
    if (focus?.some(id => (nextState.completedNeeds || []).includes(needKey(worldDay, worldSlot, id)))) nextState.vignetteNeed = null;
    nextState.history = [...nextState.history, { role: MessageRole.USER, content: textToSend, timestamp: Date.now(), encounterKey: nextState.activeEncounterKey }];
    setGameState(nextState);
    const ok = await handleAIStep(textToSend, nextState);
    // F7：行动点只在 AI 成功返回后才扣（每人每时段一次）；失败不烧机会
    if (ok && opts?.consumeFor?.length) {
      const pfx = `${nextState.worldDay ?? 1}-${nextState.worldSlot ?? 0}:`;
      setGameState(prev => ({ ...prev, usedActions: Array.from(new Set([...(prev.usedActions || []), ...opts.consumeFor!.map(id => pfx + id)])) }));
    }
  };

  // 从俯视世界点击爱豆 → 切回剧情，预填带场景/心情语境的“走近”动作交给 DeepSeek
  const handleTalkTo = (m: Member, ctx?: { location: WorldLocation; activity: Activity; need?: Need }) => {
    const isTw = (gameState as any).language === 'traditional';
    const key = encounterKey(worldDay, worldSlot, worldLocation, [m.id]);
    if (requestRef.current && requestRef.current.state.activeEncounterKey !== key) { pushToast('请先等当前回应完成，或取消等待', 'friendly'); return; }
    setScene({ ids: [m.id], anchor: gameState.history.length, key });
    setRequestError(null); setRetryRequest(null); setInput('');
    if (gameState.history.some(h => h.encounterKey === key && h.role === MessageRole.ASSISTANT)) return;
    const last = gameState.history.filter(h => h.encounterKey === key).at(-1);
    if (last?.role === MessageRole.USER && !requestRef.current) {
      void handleAIStep(last.content, { ...gameState, activeEncounterKey: key,
        sceneFocusIds: gameState.encounters?.[key]?.ids, vignetteNeed: gameState.encounters?.[key]?.need || null });
      return;
    }
    if (isLoading || requestRef.current) return;
    const where = ctx ? `在${ctx.location.label}` : '';
    // 碎片剧场：点了带需求气泡的爱豆 → 走精简 vignette，seed 一句带上她此刻的小状态
    const need = (gameState.completedNeeds || []).includes(needKey(worldDay, worldSlot, m.id)) ? undefined : ctx?.need;
    if (need) {
      const seedLine = isTw
        ? `（我${where}走近${m.name}——看她${need.label}的样子）`
        : `（我${where}走近${m.name}——看她${need.label}的样子）`;
      setScene({ ids: [m.id], anchor: gameState.history.length, key });
      handleSend(seedLine, {
        focusIds: [m.id], consumeFor: [m.id],
        vignette: { kind: need.kind, label: need.label, seed: need.seed, quickHints: need.quickHints, targetName: need.targetName },
      });
      return;
    }
    const doing = ctx ? `（她正${ctx.activity.label}，${ctx.activity.mood}）` : '';
    const line = isTw
      ? `（我${where}走近${m.name}，和ta打個招呼）${doing}`
      : `（我${where}走近${m.name}，和ta打个招呼）${doing}`;
    setScene({ ids: [m.id], anchor: gameState.history.length, key });
    handleSend(line, { focusIds: [m.id], consumeFor: [m.id] });
  };

  // 手机私信：不占行动点，但每天有条数上限；发太勤会涨曝光度（"他手机被工作人员关注"）
  const DM_PER_DAY = 3;
  const dmSentToday = (gameState as any).dmSentAt === `d${worldDay}` ? ((gameState as any).dmCount || 0) : 0;
  const dmLeft = Math.max(0, DM_PER_DAY - dmSentToday);
  const handleSendDM = (memberId: string, action: DMAction) => {
    const choice = DM_ACTIONS.find(a => a.id === action);
    if (!choice) return;
    setGameState(prev => {
      const m = prev.members.find(x => x.id === memberId);
      const day = prev.worldDay ?? 1;
      const count = prev.dmSentAt === 'd' + day ? prev.dmCount || 0 : 0;
      if (!m || count >= DM_PER_DAY) return prev;
      const busy = !getActivity(m.id, day, prev.worldSlot ?? 0, m.group).available;
      const now = Date.now();
      return {
        ...prev, dmSentAt: 'd' + day, dmCount: count + 1,
        phoneFeed: [...(prev.phoneFeed || []), {
          id: 'dm-' + now + '-' + count, type: 'kkt' as const, ts: now, read: true,
          data: { sender: prev.playerName || '你', avatar: '💬', messages: [{ text: choice.text, time: '刚刚', isRead: true, translation: '' }] },
        }, {
          id: 'dm-reply-' + now + '-' + count, type: 'kkt' as const, ts: now + 1, read: false,
          data: { sender: m.name, avatar: '👤', messages: [{ text: dmReply(action, m, busy), time: '刚刚', isRead: false, translation: '' }] },
        }].slice(-100),
      };
    });
  };

  // 应援打投：占用本时段行动点，累积到打歌成绩（回归期才有）
  const handleSupport = () => {
    const isTw = (gameState as any).language === 'traditional';
    if (supportUsed) { pushToast(isTw ? '這個時段已經應援過了' : '这个时段已经应援过了', 'friendly'); return; }
    setGameState(prev => {
      const p = prev.playerImpact || { albumImpact: 0, voteImpact: 0 };
      return {
        ...prev,
        playerImpact: { albumImpact: Math.min(60, p.albumImpact + 6), voteImpact: Math.min(60, p.voteImpact + 8) },
        usedActions: [...(prev.usedActions || []), `${prev.worldDay ?? 1}-${prev.worldSlot ?? 0}:__support__`],
      };
    });
    pushToast(isTw ? '你做了一輪打投與控評 —— 會反映在打歌成績上' : '你做了一轮打投与控评 —— 会反映在打歌成绩上', 'romance');
  };

  // 推进时段：先结算"你不在场"的其它地点里同处一地的爱豆对（后台世界推进），再跳时间
  // 围观两个爱豆相遇 → 切到剧情，让 DeepSeek 演这场戏（关系模块已在 prompt 里，结算走 RELDELTA）
  const handleWatchEncounter = (a: Member, b: Member, ctx: { location: WorldLocation }) => {
    const k = pairKey(a.id, b.id);
    const isMatch = (gameState.matchmakes || []).includes(k);
    const isTw = (gameState as any).language === 'traditional';
    const key = encounterKey(worldDay, worldSlot, worldLocation, [a.id, b.id]);
    if (requestRef.current && requestRef.current.state.activeEncounterKey !== key) { pushToast('请先等当前回应完成，或取消等待', 'friendly'); return; }
    setScene({ ids: [a.id, b.id], anchor: gameState.history.length, key });
    setRequestError(null); setRetryRequest(null); setInput('');
    if (gameState.history.some(h => h.encounterKey === key && h.role === MessageRole.ASSISTANT)) return;
    const last = gameState.history.filter(h => h.encounterKey === key).at(-1);
    if (last?.role === MessageRole.USER && !requestRef.current) {
      void handleAIStep(last.content, { ...gameState, activeEncounterKey: key,
        sceneFocusIds: gameState.encounters?.[key]?.ids, vignetteNeed: gameState.encounters?.[key]?.need || null });
      return;
    }
    if (isLoading || requestRef.current) return;
    const hint = isMatch ? '（我想撮合她们，留意有没有暧昧的火花）' : '';
    const line = isTw
      ? `（我在${ctx.location.label}，看到 ${a.name} 和 ${b.name} 湊在一起，我在旁邊靜靜觀察她們的互動）${hint}`
      : `（我在${ctx.location.label}，看到 ${a.name} 和 ${b.name} 凑在一起，我在旁边静静观察她们的互动）${hint}`;
    setScene({ ids: [a.id, b.id], anchor: gameState.history.length, key });
    handleSend(line, { focusIds: [a.id, b.id], consumeFor: [a.id, b.id] });
  };

  // 捏脸：取当前外观（覆盖或默认）+ 应用
  const appearanceFor = (t: { kind: 'player' } | { kind: 'idol'; id: string }): Appearance =>
    t.kind === 'player'
      ? normalizeAppearance(gameState.playerAppearance, getPlayerAppearance(gameState.playerName || 'you'))
      : normalizeAppearance(gameState.appearances?.[t.id], getDefaultAppearance(t.id));
  const applyAppearance = (a: Appearance) => {
    if (!customizing) return;
    if (customizing.kind === 'player') setGameState(prev => ({ ...prev, playerAppearance: a }));
    else { const id = customizing.id; setGameState(prev => ({ ...prev, appearances: { ...(prev.appearances || {}), [id]: a } })); }
  };

  const handleAdvanceTime = () => {
    if (requestRef.current) return;
    setScene(null); setRetryRequest(null); setInput(''); setRequestError(null);
    setGameState(prev => {
      const day = prev.worldDay ?? 1, slot = prev.worldSlot ?? 0;
      const here = prev.worldLocation ?? 'practice_room';
      const rels = { ...(prev.worldRelations || {}) };
      const feed = [...(prev.worldFeed || [])];
      const tmembers = prev.members.filter(m => (prev.targets || []).includes(m.id));
      const bigNews: { text: string; kind: string }[] = [];
      const settled = new Set(prev.relationshipEvents || []);
      for (const L of WORLD_LOCATIONS) {
        if (L.id === here) continue; // 你在的地方已经现场结算过
        const present = idolsAt(tmembers, L.id, day, slot);
        for (let i = 0; i < present.length; i++) {
          for (let j = i + 1; j < present.length; j++) {
            // 私密地点（练习室/天台/宿舍/演唱会）不同公司/团不同屏，不产生跨单位相遇
            if (unitKeyOf(L.id, present[i]) !== unitKeyOf(L.id, present[j])) continue;
            const a = present[i], b = present[j], k = pairKey(a.id, b.id);
            const cur = rels[k] || { affinity: 0, tension: 0 };
            const event = socialEvent(a, b, cur, L.label, day);
            if (!event || settled.has(event.id)) continue;
            settled.add(event.id);
            rels[k] = { ...cur, affinity: Math.max(0, Math.min(100, cur.affinity + event.affinity)),
              tension: Math.max(0, Math.min(100, cur.tension + event.tension)), note: event.text };
            feed.unshift({ id: event.id, text: event.text, kind: event.kind, day, slot });
            bigNews.push({ text: event.text, kind: event.kind });
          }
          // 单人心情动态（稀疏），让没互动的人也活着
          const mood = soloMood(present[i].name, present[i].realPersonality || present[i].publicPersona || '', `${present[i].id}-mood-${day}-${slot}`);
          if (mood) feed.unshift({ id: `mood-${present[i].id}-${day}-${slot}`, text: mood.text, kind: mood.kind, day, slot });
        }
      }
      const nt = nextTime(day, slot);
      let next: any = { ...prev, worldRelations: rels, worldFeed: feed.slice(0, 30), worldDay: nt.day, worldSlot: nt.slot, relationshipEvents: [...settled].slice(-2000), usedActions: [], activeEncounterKey: undefined, vignetteNeed: null };
      // 回归期由日历决定（推进到新的一天时刷新）
      next.isComebackSetting = comebackOnDay(prev.members, prev.targets, nt.day);
      // F9：曝光度被动回落 —— 每推进一个时段低调无事就自然降 1，不再是一路奔 BE 的棘轮
      next.exposureLevel = Math.max(0, (prev.exposureLevel || 0) - 1);

      // 关系跨门槛的大新闻 → 进手机 + 弹 toast，让"她们自己处出感情"被你看见
      if (bigNews.length) {
        next.phoneFeed = [...(prev.phoneFeed || []), ...bigNews.slice(0, 3).map((n, i) => ({
          id: `news-${nt.day}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'weverse' as const, ts: Date.now(), read: false,
          data: { artist: '八卦速报', group: '岛屿新闻', content: n.text, imageDesc: null, likes: 1200 + Math.floor(Math.random() * 8000), comments: 80 + Math.floor(Math.random() * 400), time: '刚刚' },
        }))].slice(-60);
        bigNews.slice(0, 2).forEach((n, i) => setTimeout(() => pushToast(n.text, n.kind), 120 * i));
      }

      // 打歌日晚上结算一位（#27：你关注的每个团各自结算，不再只算第一个团）
      const involvedGroups = Array.from(new Set(tmembers.map(m => m.group).filter(g => g && g !== '自建')));
      const showGroups = nt.slot === 2 ? involvedGroups.filter(g => isMusicShowDay(g, nt.day)) : [];
      if (showGroups.length) {
        const boost = prev.playerImpact || { albumImpact: 0, voteImpact: 0 };
        const feedAdds: any[] = [];
        const phoneAdds: any[] = [];
        const toasts: { text: string; kind: string }[] = [];
        for (const g of showGroups) {
          const gm = tmembers.filter(m => m.group === g);
          const rivals = Array.from(new Set(prev.members.map(m => m.group))).filter(x => x !== g && x !== '自建').slice(0, 3);
          const morale = gm.length ? Math.round(gm.reduce((s, m) => s + (m.affection || 0), 0) / gm.length * 0.5 + 50) : 50;
          const res = computeMusicShow(g, rivals.length ? rivals : ['其他团'], nt.day, {
            morale,
            boost: { vote: boost.voteImpact, sns: Math.round(boost.voteImpact * 0.6), digital: boost.albumImpact },
          });
          const result = { week: weekOf(nt.day), winner: res.winner, scores: res.scores };
          next.currentMusicShow = result;
          next.musicShowHistory = [...(next.musicShowHistory || prev.musicShowHistory || []), result];
          const won = res.winner === g;
          feedAdds.push({
            id: `ms-${g}-${nt.day}`,
            text: won ? `${g} 拿下本周一位！` : `本周一位是 ${res.winner}，${g} 差 ${res.scores[0].total - (res.scores.find(s => s.group === g)?.total || 0)} 分`,
            kind: won ? 'romance' : 'tension', day: nt.day, slot: nt.slot,
          });
          phoneAdds.push({
            id: `msp-${g}-${nt.day}`, type: 'theqoo' as const, ts: Date.now(), read: false,
            data: {
              title: won ? `${g} 今天一位了…真的哭了` : `今天一位是 ${res.winner}，${g} 也太可惜了`,
              category: '음악방송', viewsCount: 40000 + Math.floor(Math.random() * 60000),
              likesCount: 800 + Math.floor(Math.random() * 3000), commentsCount: 120,
              comments: [
                { authorId: 'ㅇㅇ', content: won ? '무대 진짜 미쳤다' : '아쉽다 다음엔 꼭', translation: won ? '舞台真的绝了' : '好可惜，下次一定' },
                { authorId: 'ㅇㅇ', content: `총점 ${res.scores[0].total}`, translation: `总分 ${res.scores[0].total}` },
              ],
            },
          });
          toasts.push({ text: won ? `🏆 ${g} 本周一位！` : `本周一位：${res.winner}`, kind: won ? 'romance' : 'tension' });
        }
        next.playerImpact = { albumImpact: 0, voteImpact: 0 }; // 每场结算后清空本轮投入
        next.worldFeed = [...feedAdds, ...next.worldFeed].slice(0, 30);
        next.phoneFeed = [...(prev.phoneFeed || []), ...phoneAdds];
        toasts.forEach((t, i) => setTimeout(() => pushToast(t.text, t.kind), i * 120));
      }
      return next;
    });
  };

  // 关系意图 / 撮合 / 表白
  const handleSetIntent = (id: string, intent: Intent) => {
    setGameState(prev => ({ ...prev, relationIntents: { ...(prev.relationIntents || {}), [id]: intent } }));
  };
  const handleToggleMatchmake = (key: string) => {
    setGameState(prev => {
      const cur = prev.matchmakes || [];
      return { ...prev, matchmakes: cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key] };
    });
  };
  // 玩家自定义两个爱豆的亲密度（有些私下关系游戏无从得知，交给玩家设定）
  const handleSetPairAffinity = (key: string, value: number) => {
    const v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    setGameState(prev => {
      const rels = { ...(prev.worldRelations || {}) };
      const cur = rels[key] || { affinity: 0, tension: 0 };
      rels[key] = { ...cur, affinity: v };
      return { ...prev, worldRelations: rels };
    });
  };
  // 爱豆两两相遇 → 按撮合意图/既有张力结算关系
  const handleIdolEncounter = (aId: string, bId: string, _kind: 'romance' | 'tension' | 'friendly') => {
    setGameState(prev => {
      const a = prev.members.find(m => m.id === aId), b = prev.members.find(m => m.id === bId);
      if (!a || !b) return prev;
      const day = prev.worldDay ?? 1, slot = prev.worldSlot ?? 0, key = pairKey(aId, bId);
      const rel = prev.worldRelations?.[key] || { affinity: 0, tension: 0 };
      const event = socialEvent(a, b, rel, prev.currentScene, day);
      if (!event || prev.relationshipEvents?.includes(event.id)) return prev;
      return { ...prev,
        relationshipEvents: [...(prev.relationshipEvents || []), event.id].slice(-2000),
        worldRelations: { ...prev.worldRelations, [key]: { ...rel,
          affinity: Math.max(0, Math.min(100, rel.affinity + event.affinity)),
          tension: Math.max(0, Math.min(100, rel.tension + event.tension)), note: event.text } },
        worldFeed: [{ id: event.id, text: event.text, kind: event.kind, day, slot }, ...(prev.worldFeed || [])].slice(0, 30),
      };
    });
  };

  const handleConfess = (id: string) => {
    setGameState(prev => {
      const k = pairKey(PLAYER, id);
      const rels = { ...(prev.worldRelations || {}) };
      const rel = rels[k] || { affinity: 0, tension: 0 };
      rels[k] = { ...rel, flags: Array.from(new Set([...(rel.flags || []), 'confessed'])) };
      return { ...prev, worldRelations: rels };
    });
  };

  if (gameState.setupStep === SetupStep.CREATION) return <CharacterCreationWizard onComplete={handleCreationComplete} members={gameState.members} />;

  const targetMembers = gameState.members.filter(m => gameState.targets.includes(m.id));
  const primaryTarget = targetMembers[0];
  const roundCount = gameState.turnCount || 0;

  // 俯视世界里出现的爱豆：优先玩家关注的对象，否则取前若干位
  const worldMembers = targetMembers.length > 0 ? targetMembers : gameState.members.slice(0, 6);

  // 大节点预兆：当前世界里哪些爱豆此刻有"待触发"的重头戏 → 头顶亮 ⚡
  const worldPendingMilestones: Record<string, { title: string; omen: string }> = {};
  const quietNow = quietPlaceNow(worldSlot, worldLocation);
  worldMembers.forEach(m => {
    const md = pendingMilestone(m.id, {
      affection: m.affection || 0,
      intentRomance: (gameState.relationIntents || {})[m.id] === 'romance',
      quietPlace: quietNow,
      done: gameState.milestones || [],
    });
    if (md) worldPendingMilestones[m.id] = { title: md.title, omen: md.omen };
  });

  // ── 结局：条件触发，玩家自己决定何时收 ──
  const confessedIds = worldMembers
    .filter(m => hasFlag((gameState.worldRelations || {})[pairKey(PLAYER, m.id)], 'confessed'))
    .map(m => m.id);
  const pairedKeys = (gameState.matchmakes || []).filter(k => {
    const r = (gameState.worldRelations || {})[k];
    return r && (r.affinity || 0) >= 85;
  });
  const endingCtx = {
    playerName: gameState.playerName, members: gameState.members, targets: gameState.targets || [],
    relations: gameState.worldRelations || {}, matchmakes: gameState.matchmakes || [],
    intents: (gameState.relationIntents || {}) as Record<string, string>,
    exposure: gameState.exposureLevel || 0, day: worldDay, confessedIds, pairedKeys,
  };
  const ending = availableEnding(endingCtx);
  const isYearEnd = worldDay >= DAYS_PER_YEAR;
  const yearbook = isYearEnd || ending
    ? buildYearbook(endingCtx, (gameState.musicShowHistory || []).filter(r => r.winner === worldMembers[0]?.group).length)
    : null;
  // BE 自动弹出（曝光爆表/脚踏多条船）—— 用派生状态而非 useEffect，
  // 因为这段代码在建号向导的早退之后，加 hook 会破坏 hooks 顺序（React #310）
  const beOpen = ending?.kind === 'be' && !endingDismissed;
  const endingCast = (ending?.kind === 'romance' && confessedIds.length
    ? gameState.members.filter(m => confessedIds.includes(m.id))
    : worldMembers.slice(0, 3)
  ).map(m => ({ name: m.name, appearance: normalizeAppearance(gameState.appearances?.[m.id], getDefaultAppearance(m.id)) }));

  // VN 场景数据：取本次相遇（anchor 之后）的最新一条 AI 回复
  let sceneMessageTimestamp = 0;
  let sceneScript: ScriptEntry[] = [];
  let sceneOptions: { text: string; action: string }[] = [];
  if (scene) {
    const hist = gameState.history;
    let msg: any = null;
    for (let i = hist.length - 1; i >= scene.anchor; i--) { if (hist[i].role === MessageRole.ASSISTANT) { msg = hist[i]; break; } }
    if (msg) {
      sceneMessageTimestamp = msg.timestamp;
      const txt = (msg.contentBlocks || []).filter((b: any) => b.type === 'text').map((b: any) => b.content).join('\n') || msg.content || '';
      sceneScript = parseScript(txt);
      sceneOptions = msg.options || [];
    }
  }
  const sceneMembers = scene ? gameState.members.filter(m => scene.ids.includes(m.id)) : [];
  const sceneLoc = getLocation(parseLocKey(worldLocation).base);
  const sceneRecord = scene?.key ? gameState.encounters?.[scene.key] : undefined;
  const sceneRounds = scene ? gameState.history.filter(h => h.role === MessageRole.ASSISTANT &&
    (scene.key ? h.encounterKey === scene.key : false)).length : 0;
  const sceneNeedDone = !!scene?.ids.length && scene.ids.every(id =>
    (gameState.completedNeeds || []).includes(needKey(worldDay, worldSlot, id)));
  const completeSceneNeed = () => {
    if (!sceneRecord?.need || sceneRounds < 2 || isLoading || !scene) return;
    setGameState(prev => ({ ...prev, completedNeeds: Array.from(new Set([
      ...(prev.completedNeeds || []), ...scene.ids.map(id => needKey(worldDay, worldSlot, id)),
    ])), vignetteNeed: null }));
    pushToast('这次的小心愿已完成，随时可以回来聊天', 'friendly');
  };

  const lang = (gameState as any).language || 'simplified';
  const sidebarLabel = lang === 'traditional' ? '角色狀態' : '角色状态';
  const modeLabel = '攻略';

  const sceneConfig = getSceneConfig(gameState.currentScene);

  return (
    <div className="flex h-dvh overflow-hidden relative">
      {/* 新手引导：首次进世界 */}
      {showIntro && worldMode && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5" onClick={dismissIntro}>
          <div className="ink-panel ink-scroll rounded-[24px] w-full max-w-sm p-6 border border-[rgba(201,162,39,0.3)] max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-3xl mb-1.5">🏝️</div>
              <h2 className="text-[17px] font-black text-[#F1ECFF]">{lang === 'traditional' ? '歡迎來到這座島' : '欢迎来到这座岛'}</h2>
              <p className="text-[11px] text-[#8B86B8] mt-1">{lang === 'traditional' ? '她們有自己的作息，你來照看她們的日常' : '她们有自己的作息，你来照看她们的日常'}</p>
            </div>
            <div className="flex flex-col gap-2.5">
              {[
                { e: '💭', t: lang === 'traditional' ? '點頭頂冒氣泡的愛豆，滿足她的小需求（每人每時段一次）' : '点头顶冒气泡的爱豆，满足她的小需求（每人每时段一次）' },
                { e: '⚡', t: lang === 'traditional' ? '好感攢夠，頭頂會亮金光 —— 那是一場重頭戲' : '好感攒够，头顶会亮金光 —— 那是一场重头戏' },
                { e: '⏭️', t: lang === 'traditional' ? '「推進時段」讓世界往前走，她們會自己發生事' : '「推进时段」让世界往前走，她们会自己发生事' },
                { e: '📡', t: lang === 'traditional' ? '右上角看島嶼動態和手機；🎤 進打歌舞台' : '右上角看岛屿动态和手机；🎤 进打歌舞台' },
              ].map((r, i) => (
                <div key={i} className="flex items-start gap-3 rounded-2xl bg-white/[0.03] border border-white/10 px-3.5 py-3">
                  <span className="text-[18px] leading-none">{r.e}</span>
                  <span className="text-[12.5px] text-[#D8D4EE] leading-relaxed">{r.t}</span>
                </div>
              ))}
            </div>
            <button onClick={dismissIntro} className="w-full mt-5 py-3 rounded-2xl text-white text-[13px] font-black transition-all hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg,#6C79C4,#454F87)', boxShadow: '0 8px 20px -6px rgba(91,107,176,0.7)' }}>
              {lang === 'traditional' ? '開始遊玩' : '开始游玩'}
            </button>
          </div>
        </div>
      )}
      <button onClick={() => { setKeyDraft(getSessionApiKey()); setShowAISettings(true); }} className="fixed bottom-3 right-3 z-[170] min-h-11 rounded-full bg-[#342d4c] border border-white/20 px-4 text-xs text-white shadow-lg">AI 设置</button>
      {showAISettings && <div className="fixed inset-0 z-[220] bg-black/70 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="AI 设置">
        <div className="w-full max-w-md rounded-3xl bg-[#211b34] border border-white/20 p-6 text-white">
          <h2 className="text-lg font-bold">AI 连接设置</h2>
          <p className="text-sm text-white/70 my-3">Key 只用于当前页面，刷新后需重新填写，不会写入存档。留空则使用网站提供的服务。API 用量按服务商计费。</p>
          <input aria-label="DeepSeek API Key" type="password" autoComplete="off" value={keyDraft} onChange={e => setKeyDraft(e.target.value)} className="w-full rounded-xl bg-white/10 p-3 border border-white/20" />
          <div className="mt-4 flex gap-3"><button className="min-h-11 px-4 rounded-xl bg-[#6C79C4]" onClick={() => { setSessionApiKey(keyDraft); setKeyDraft(''); setShowAISettings(false); }}>保存本次设置</button><button className="min-h-11 px-4" onClick={() => { setKeyDraft(''); setShowAISettings(false); }}>取消</button></div>
        </div>
      </div>}
      {!scene && (isLoading || requestError) && <div className="fixed bottom-16 inset-x-3 mx-auto max-w-lg z-[165] rounded-2xl bg-[#211b34] border border-white/20 text-white p-4 text-sm" role="status">
        <p>{isLoading ? requestProgress?.phase === 'retrying' ? '连接较慢，正在重试…' : '正在生成回应…' : requestError}</p>
        {isLoading ? <button className="min-h-11" onClick={cancelRequest}>取消等待</button> : <button className="min-h-11" onClick={retryLastRequest}>重试刚才的行动</button>}
      </div>}
      {/* VN 相遇场景 */}
      {scene && (
        <SceneView
          members={sceneMembers}
          playerName={gameState.playerName}
          appearances={gameState.appearances || {}}
          playerAppearance={gameState.playerAppearance}
          sceneBg={getSceneConfig(sceneLoc?.id === 'hangang' ? (worldSlot === 2 ? 'hangang_night' : 'hangang_day') : (sceneLoc?.sceneKey || 'practice_room')).bg}
          sceneLabel={sceneLoc?.label || ''}
          script={sceneScript}
          options={sceneOptions}
          initialIndex={sceneRecord?.messageTimestamp === sceneMessageTimestamp ? sceneRecord.cursor || 0 : 0}
          onProgress={cursor => {
            if (scene.key) setGameState(prev => ({ ...prev, encounters: { ...prev.encounters,
              [scene.key!]: { ...(prev.encounters?.[scene.key!] || { ids: scene.ids, location: worldLocation, day: worldDay, slot: worldSlot }),
                cursor, messageTimestamp: sceneMessageTimestamp },
            } }));
          }}
          requestProgress={requestProgress}
          requestError={requestError}
          draft={input}
          onCancel={cancelRequest}
          onRetry={retryLastRequest}
          needLabel={sceneRecord?.need?.label}
          needDone={sceneNeedDone}
          canCompleteNeed={sceneRounds >= 2}
          onCompleteNeed={completeSceneNeed}
          isLoading={isLoading}
          lang={lang}
          onChoose={(a) => handleSend(a)}
          onSend={(t) => handleSend(t)}
          onLeave={() => { setScene(null); setInput(''); }}
        />
      )}
      {/* 捏脸器 */}
      {customizing && (
        <FaceCustomizer
          appearance={appearanceFor(customizing)}
          onChange={applyAppearance}
          title={customizing.kind === 'player'
            ? (lang === 'traditional' ? '捏你的臉' : '捏你的脸')
            : `${lang === 'traditional' ? '捏' : '捏'}${gameState.members.find(m => m.id === (customizing as any).id)?.name || ''}`}
          lang={lang}
          onClose={() => setCustomizing(null)}
        />
      )}
      {/* 手机 */}
      {showPhone && <PhoneModal feed={phoneFeed} onClose={closePhone} lang={lang} members={worldMembers} onSendDM={handleSendDM} dmLeft={dmLeft} />}
      {/* 结局 / 年鉴 */}
      {(showEnding || beOpen) && (ending || yearbook) && (
        <EndingCard
          ending={ending} yearbook={yearbook} cast={endingCast} lang={lang}
          milestoneLog={(gameState.milestoneLog || []).filter(e => worldMembers.some(m => m.id === e.memberId))}
          onClose={() => { setShowEnding(false); setEndingDismissed(true); }}
          onContinue={ending?.kind === 'be' ? undefined : () => { setShowEnding(false); setEndingDismissed(true); }}
        />
      )}
      {/* 关系里程碑 toast */}
      {toasts.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none">
          {toasts.map(t => (
            <motion.div key={t.id} initial={{ opacity: 0, y: -12, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
              className={`px-4 py-2 rounded-full text-xs font-black text-white shadow-lg ${t.kind === 'romance' ? 'bg-[#FF7A93]' : t.kind === 'tension' ? 'bg-[#c0392b]' : 'bg-[#5B6BB0]'}`}>
              {t.text}
            </motion.div>
          ))}
        </div>
      )}
      {/* 场景背景层 */}
      <div
        className="absolute inset-0 z-0 transition-all duration-700 scene-fade"
        style={{ background: wallpaper ? `url(${wallpaper}) center/cover no-repeat` : sceneConfig.bg }}
      />
      {/* 场景叠加层 */}
      <div
        className="absolute inset-0 z-0"
        style={{ background: wallpaper ? 'transparent' : sceneConfig.overlay }}
      />
      {/* 内容层 */}
      <div className="absolute inset-0 z-10 flex overflow-hidden">
      {showConfirmReset && (
        <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="ink-panel rounded-[3rem] p-10 max-w-sm w-full text-center flex flex-col gap-6">
            <div className="w-20 h-20 bg-white/[0.06] rounded-full flex items-center justify-center mx-auto"><RefreshCw className="w-10 h-10 text-[#C9A227] animate-spin-slow" /></div>
            <div><h3 className="text-xl font-black text-[#F1ECFF]">{lang === "traditional" ? "確定重置嗎？" : "确定重置吗？"}</h3><p className="text-sm text-[#B7B2D9] mt-2">{lang === "traditional" ? "所有進度將永久刪除。" : "所有进度将永久删除。"}</p></div>
            <div className="flex flex-col gap-3">
              <button onClick={executeReset} className="w-full py-4 bg-white text-[#211D33] rounded-3xl font-black text-sm hover:bg-white/90 transition-all">{lang === "traditional" ? "確認重置" : "确认重置"}</button>
              <button onClick={() => setShowConfirmReset(false)} className="w-full py-4 bg-white/[0.06] text-[#B7B2D9] rounded-3xl font-black text-sm hover:bg-white/[0.12] transition-all">{lang === "traditional" ? "返回" : "返回"}</button>
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setShowDrawer(false)} />
            <MobileDrawer gameState={gameState} onClose={() => setShowDrawer(false)} onSave={saveGame} onLoad={loadGame} onDelete={deleteSlot} saveSlots={saveSlots} wallpaper={wallpaper} onWallpaperUpload={handleWallpaperUpload} onClearWallpaper={clearWallpaper} />
          </>
        )}
      </AnimatePresence>

      {/* 桌面端不再用全屏遮罩罩住地图（会把点爱豆的第一下吃掉）——侧栏浮在左侧，地图随时可点，收起用顶栏按钮 */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-56 border-r border-white/[0.06] flex-col hidden lg:flex fixed left-0 top-0 bottom-0 z-[95] transition-transform duration-300 shadow-2xl`} style={{background: 'linear-gradient(180deg, #14121f, #0B0A14)'}}>
        <div className="p-4 border-b border-white/[0.06] relative">
          <button
            onClick={() => setSidebarOpen(false)}
            title={lang === 'traditional' ? '收起側欄' : '收起侧栏'}
            className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] text-[#B7A9E8] flex items-center justify-center transition-colors"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-black text-[#F1ECFF] tracking-tighter flex items-center gap-1.5 pr-8"><Gamepad2 className="w-4 h-4 flex-shrink-0 text-[#C9A227]" /> 爱豆收集梦想生活</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[9px] text-white px-2 py-0.5 rounded-full font-black uppercase" style={{ background: 'linear-gradient(135deg,#6C79C4,#454F87)' }}>{modeLabel}</span>
            <span className="text-[10px] text-[#8B86B8] font-bold">Idol Tomodachi Life</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-5 ink-scroll">
          {worldMode ? (
            <WorldPanel
              members={worldMembers}
              playerName={gameState.playerName}
              playerAppearance={gameState.playerAppearance}
              appearances={gameState.appearances || {}}
              relations={gameState.worldRelations || {}}
              intents={gameState.relationIntents || {}}
              day={worldDay} slot={worldSlot}
              onCustomize={setCustomizing}
              lang={lang}
            />
          ) : (
          <section>
            <h3 className="gold-caption mb-3 flex items-center gap-2"><Users className="w-3 h-3" /> {sidebarLabel}</h3>
            {(
              <div className="flex flex-col gap-2">{targetMembers.map(member => (
                <div key={member.id} className="bg-white/[0.03] p-4 rounded-2xl border border-white/10">
                  <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-[#F1ECFF]">{member.name}</span><span className="text-[10px] text-[#C9A227] font-mono font-bold">{member.affection}/100</span></div>
                  <div className="h-[3px] bg-white/[0.08] rounded-full overflow-hidden"><motion.div animate={{ width: `${member.affection}%` }} className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#6C79C4,#C9A227)' }} /></div>
                  <div className="text-[9px] text-[#8B86B8] mt-1">{member.status}</div>
                </div>
              ))}</div>
            )}
          </section>
          )}
        </div>
        <div className="p-3.5 border-t border-white/[0.06] flex flex-col gap-2.5">
          <div className="flex gap-2.5">
            <button onClick={saveGame} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-white rounded-2xl text-[11px] font-black hover:-translate-y-0.5 transition-all" style={{ background: 'linear-gradient(135deg,#6C79C4,#454F87)', boxShadow: '0 6px 16px -6px rgba(91,107,176,0.7)' }}><Save className="w-3.5 h-3.5" />{lang === "traditional" ? "存檔" : "存档"}</button>
            <button onClick={() => setShowSaveSlots(!showSaveSlots)} className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-[11px] font-black border transition-all ${showSaveSlots ? 'bg-[rgba(201,162,39,0.1)] text-[#F1ECFF] border-[rgba(201,162,39,0.45)]' : 'bg-white/[0.04] text-[#B7B2D9] border-white/10 hover:bg-white/[0.09]'}`}><FolderOpen className="w-3.5 h-3.5" />{lang === "traditional" ? "讀檔" : "读档"} <span className="px-1.5 rounded-full bg-white/10 text-[9px]">{saveSlots.length}</span></button>
          </div>
          {showSaveSlots && (
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-2.5 flex flex-col gap-2 max-h-56 overflow-y-auto ink-scroll">
              {saveSlots.length > 0 ? saveSlots.map((slot, si) => (
                <div key={slot.id} className="group bg-white/[0.03] border border-white/10 rounded-xl p-2.5 flex items-center gap-2.5 hover:border-[rgba(201,162,39,0.45)] transition-all">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6C79C4] to-[#454F87] text-white flex items-center justify-center text-[11px] font-black flex-shrink-0">{saveSlots.length - si}</div>
                  <button onClick={() => loadGame(slot.id)} className="flex-1 min-w-0 text-left">
                    <div className="text-[11px] font-black text-[#F1ECFF] truncate">{(slot as any).subject || slot.scene}</div>
                    <div className="text-[9px] text-[#8B86B8] truncate mt-0.5">{slot.scene} · R{slot.round} · {slot.time}</div>
                  </button>
                  <button onClick={() => deleteSlot(slot.id)} title={lang === "traditional" ? "刪除" : "删除"} className="w-6 h-6 rounded-lg text-[#8b90b8] hover:bg-[#FF7A93]/10 hover:text-[#FF7A93] flex items-center justify-center flex-shrink-0 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )) : (
                <div className="text-[10px] text-[#8B86B8] text-center py-4 font-bold">{lang === "traditional" ? "暫無存檔" : "暂无存档"}</div>
              )}
            </div>
          )}
          <button onClick={handleReset} className="w-full flex items-center justify-center gap-2 py-2.5 text-[#8b90b8] rounded-2xl text-[10px] font-black hover:bg-white/[0.04] hover:text-[#B7A9E8] transition-all"><RefreshCw className="w-3.5 h-3.5" /> {lang === "traditional" ? "重新開始" : "重新开始"}</button>
        </div>
      </aside>

      <main className={`flex-1 flex flex-col h-full lg:rounded-l-[2rem] lg:shadow-sm overflow-hidden transition-[margin] duration-300 ${sidebarOpen ? 'lg:ml-56' : ''}`} style={{background: 'rgba(11,10,20,0.72)'}}>
        <header className="h-11 border-b border-white/[0.06] px-4 flex items-center justify-between z-10 flex-shrink-0" style={{ background: 'rgba(14,12,28,0.85)' }}>
          <div className="flex items-center gap-3">
            <button onClick={handleReset} className="lg:hidden p-2 text-[#B7A9E8] hover:bg-white/10 rounded-xl"><RefreshCw className="w-4 h-4" /></button>
            <button
              onClick={() => setSidebarOpen(v => !v)}
              title={sidebarOpen ? (lang === 'traditional' ? '收起側欄' : '收起侧栏') : (lang === 'traditional' ? '展開側欄' : '展开侧栏')}
              className="hidden lg:flex p-2 text-[#B7A9E8] hover:bg-white/10 rounded-xl transition-colors"
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
            <div>
              <div className="text-[10px] text-[#8B86B8] font-black uppercase tracking-widest">Scene</div>
              <h2 className="text-sm font-bold flex items-center gap-1 text-[#F1ECFF]"><MapPin className="w-3 h-3 text-[#C9A227]" /> {gameState.currentScene}</h2>
            </div>
          </div>
          {primaryTarget && (
            <button onClick={() => setShowDrawer(true)} className="lg:hidden flex items-center gap-2 bg-white/[0.06] px-3 py-2 rounded-2xl border border-white/10 active:scale-95 transition-all">
              <Heart className="w-3 h-3 text-[#C9A227]" />
              <span className="text-[11px] font-bold text-[#F1ECFF]">{primaryTarget?.name}</span>
              <span className="text-[11px] font-black text-[#C9A227]">{primaryTarget?.affection || 0}</span>
              <ChevronUp className="w-3 h-3 text-[#8B86B8]" />
            </button>
          )}
          {apiKeyMissing && <div className="bg-white/[0.06] text-[#C9A227] text-[10px] font-black px-3 py-1 rounded-full border border-[rgba(201,162,39,0.3)] animate-pulse">API KEY MISSING</div>}
          <div className="flex items-center gap-3">
            {!worldMode && (
              <button onClick={openPhone} className="relative flex items-center gap-1.5 text-[11px] font-black px-3 py-1.5 rounded-xl border bg-white/[0.06] text-[#B7B2D9] border-white/10 hover:bg-white/[0.12] transition-all">
                <Smartphone className="w-3.5 h-3.5" /> {lang === 'traditional' ? '手機' : '手机'}
                {phoneUnread > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#FF3B30] text-white text-[9px] font-black flex items-center justify-center animate-pulse">{phoneUnread}</span>}
              </button>
            )}
            <button
              onClick={() => setWorldMode(v => !v)}
              className={`flex items-center gap-1.5 text-[11px] font-black px-3 py-1.5 rounded-xl border transition-all ${worldMode ? 'text-white border-transparent' : 'bg-white/[0.06] text-[#B7B2D9] border-white/10 hover:bg-white/[0.12]'}`}
              style={worldMode ? { background: 'linear-gradient(135deg,#6C79C4,#454F87)' } : undefined}
              title={lang === 'traditional' ? '切換世界 / 回憶' : '切换世界 / 回忆'}
            >
              {worldMode ? <Zap className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
              {worldMode ? (lang === 'traditional' ? '回憶' : '回忆') : (lang === 'traditional' ? '世界' : '世界')}
            </button>
            <button
              onClick={() => {
                const newVal = gameState.language !== 'traditional';
                setIsTraditional(newVal);
                setGameState(prev => ({ ...prev, language: newVal ? 'traditional' : 'simplified' }));
              }}
              className="text-[10px] font-black text-[#B7B2D9] bg-white/[0.06] px-2 py-1 rounded-lg border border-white/10 hover:bg-white/[0.12] transition-all"
            >
              {gameState.language === 'traditional' ? '简' : '繁'}
            </button>
            <div className="text-right">
              <div className="text-[10px] text-[#8B86B8] font-bold">第 {worldDay} 天</div>
              <div className="text-sm font-bold text-[#C9A227]">{['上午', '下午', '晚上'][worldSlot]}</div>
            </div>
          </div>
        </header>

        {worldMode ? (
        <div className="flex-1 overflow-hidden relative">
          <WorldView
            members={worldMembers}
            playerName={gameState.playerName}
            day={worldDay}
            slot={worldSlot}
            locationId={worldLocation}
            identity={gameState.identity || []}
            usedActionIds={usedThisSlot}
            completedNeedIds={(gameState.completedNeeds || []).filter(k => k.startsWith(slotPrefix)).map(k => k.slice(slotPrefix.length))}
            supportUsed={supportUsed}
            onSupport={handleSupport}
            endingReady={!!ending || isYearEnd}
            onOpenEnding={() => setShowEnding(true)}
            onTravel={setWorldLocation}
            onAdvanceTime={handleAdvanceTime}
            onTalk={handleTalkTo}
            lang={lang}
            relations={gameState.worldRelations || {}}
            intents={gameState.relationIntents || {}}
            matchmakes={gameState.matchmakes || []}
            onSetIntent={handleSetIntent}
            onToggleMatchmake={handleToggleMatchmake}
            onSetPairAffinity={handleSetPairAffinity}
            onConfess={handleConfess}
            onIdolEncounter={handleIdolEncounter}
            worldFeed={gameState.worldFeed || []}
            onWatchEncounter={handleWatchEncounter}
            appearances={gameState.appearances || {}}
            playerAppearance={gameState.playerAppearance}
            onCustomize={setCustomizing}
            phoneUnread={phoneUnread}
            onOpenPhone={openPhone}
            pendingMilestones={worldPendingMilestones}
          />
          {/* Demo 自动演示开关：这局由一键 Demo 开始时才显示 */}
          {demoMode && (
            <button
              onClick={() => setGameState(prev => ({ ...(prev as any), autoDemo: !(prev as any).autoDemo }))}
              title={autoDemo ? (lang === 'traditional' ? '停止自動演示' : '停止自动演示') : (lang === 'traditional' ? '開始自動演示' : '开始自动演示')}
              className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full text-[12px] font-black flex items-center gap-2 border transition-all shadow-lg ${
                autoDemo
                  ? 'bg-[rgba(201,162,39,0.16)] border-[rgba(201,162,39,0.6)] text-[#F1ECFF]'
                  : 'bg-black/45 border-white/15 text-[#B7B2D9] hover:bg-black/60'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${autoDemo ? 'bg-[#C9A227] animate-pulse' : 'bg-white/40'}`} />
              {autoDemo ? (lang === 'traditional' ? '自動演示中 · 點擊停止' : '自动演示中 · 点击停止') : (lang === 'traditional' ? '▶ 自動演示' : '▶ 自动演示')}
            </button>
          )}
        </div>
        ) : (
        <>
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 custom-scrollbar" style={{background: "transparent"}}>
          <div className="max-w-2xl w-full mx-auto flex flex-col gap-6">
            <div className="flex items-center justify-center gap-2 text-[10px] font-black text-[#8B86B8] uppercase tracking-[0.2em]">
              <span className="h-px w-8 bg-white/10" /><Zap className="w-3 h-3 text-[#C9A227]" /> {lang === 'traditional' ? '劇情回顧' : '剧情回顾'}<span className="h-px w-8 bg-white/10" />
            </div>
            <AnimatePresence initial={false}>
            {gameState.history.map((msg, i) => {
              const isLatest = i === gameState.history.length - 1;
              const blocks = (msg as any).contentBlocks as ContentBlock[] | undefined;
              if (msg.role === MessageRole.USER) {
                return (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 my-0.5">
                    <div className="flex-1 h-px bg-white/10" />
                    <div className="px-3.5 py-1.5 rounded-full bg-white/[0.06] text-[#B7B2D9] text-[12px] font-bold max-w-[80%] truncate border border-white/10">{msg.content}</div>
                    <div className="flex-1 h-px bg-white/10" />
                  </motion.div>
                );
              }
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-[rgba(201,162,39,0.2)] shadow-[0_20px_50px_-24px_rgba(0,0,0,0.7)] overflow-hidden" style={{ background: 'linear-gradient(165deg, rgba(28,24,48,0.92), rgba(14,12,28,0.92))' }}>
                  <div className="flex flex-col gap-4 p-5 md:p-6">
                    {blocks && blocks.length > 0 ? blocks.map((block, bi) => {
                      if (block.type === 'text') return <StoryText key={bi} content={block.content} />;
                      if (block.type === 'kkt') return <KKTMessageUI key={bi} data={block.data} />;
                      if (block.type === 'weverse') return <WeversePostUI key={bi} data={block.data} />;
                      if (block.type === 'bubble') return <BubbleMessageUI key={bi} data={block.data} />;
                      if (block.type === 'theqoo') return <TheqooPostUI key={bi} post={block.data} />;
                      if (block.type === 'card') return <CharacterCardUI key={bi} card={block.data} />;
                      if (block.type === 'musicshow') return isLatest ? <MusicShowUI key={bi} result={block.data} /> : null;
                      return null;
                    }) : <StoryText content={msg.content || '（剧情推进中...）'} />}
                    {msg.options && <div className="text-xs text-[#b9aed0] border-t border-white/10 pt-3">当时的选择：{msg.options.map(o => o.text).join(' / ')}</div>}

                  </div>
                </motion.div>
              );
            })}
            </AnimatePresence>
            {isLoading && (
              <div className="rounded-3xl border border-[rgba(201,162,39,0.2)] p-5 flex gap-2 w-fit" style={{ background: 'linear-gradient(165deg, rgba(28,24,48,0.92), rgba(14,12,28,0.92))' }}>
                <div className="w-2 h-2 bg-[#B7A9E8] rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-[#B7A9E8] rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-[#C9A227] rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        <div className="p-4 border-t border-white/10 text-center text-sm text-[#c5bbdc]">
          回忆只记录已经发生的故事。<button className="min-h-11 px-4 text-[#e9d2a3] underline" onClick={() => setWorldMode(true)}>回到世界继续生活</button>
        </div>
        </>
        )}
      </main>

      </div>
      <script src="https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/full.js"></script>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700;900&display=swap');
        * { font-family: 'Noto Sans SC', sans-serif; }
        input, textarea, select { font-size: 16px !important; touch-action: manipulation; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #DAD8EE; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #5B6BB0; }
        .markdown-container p { margin-bottom: 0.6rem; } .markdown-container p:last-child { margin-bottom: 0; }
        .markdown-container ul,.markdown-container ol { margin-left: 1.5rem; margin-bottom: 0.6rem; }
        .markdown-container ul { list-style-type: disc; } .markdown-container ol { list-style-type: decimal; }
        .markdown-container blockquote { border-left: 3px solid rgba(201,162,39,0.35); padding-left: 0.75rem; color: #B7B2D9; margin: 0.75rem 0; }
        .markdown-container strong { font-weight: 900; color: #B7A9E8; }
        .markdown-container hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 1rem 0; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(201,162,39,0.3) !important; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(201,162,39,0.55) !important; }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
      `}</style>
    </div>
  );
}
