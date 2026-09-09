export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

export enum SetupStep {
  IDLE = 'idle',
  CREATION = 'creation',
  CARDS = 'cards',
  STARTED = 'started'
}

export enum GameMode {
  ROMANCE = 'romance',
  CPCP = 'CPCP',
  mom = 'mom',
}

export interface InitialRelationship {
  targetId: string;
  type: string;
  affinity: number;
  tension: number;
  note: string;
}

export interface TheqooComment {
  id?: string;
  authorId: string;
  content: string;
  translation: string;
  replies?: { authorId: string; content: string; translation?: string }[];
}

export interface TheqooPost {
  title: string;
  category: string;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  comments: TheqooComment[];
}

export interface ChatMessage {
  encounterKey?: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  theqooPost?: TheqooPost;
  statusSnapshot?: string;
  cardData?: any;
  options?: { text: string; action: string }[];
  currentMusicShow?: MusicShowResult;
  isComebackSetup?: boolean;
  isWeekEnd?: boolean;
  kktMessage?: any;
  weversePost?: any;
  bubbleMessage?: any;
  contentBlocks?: any[];
}

export interface Member {
  id: string;
  name: string;
  stageName: string;
  group: string;
  age: number;
  nationality: string;
  role: string;
  publicPersona: string;
  realPersonality: string;
  speechStyle?: string;   // 说话风格：口头禅/句子长短/语气词（可选，填了会喂给 AI）
  secret?: string;        // 一个秘密/软肋，留给阶段突破时揭示（可选）
  affection: number;
  privacy?: number;
  careerPressure: number;
  companyAlertness?: number;
  status: string;
  initialRelationships?: InitialRelationship[];
}

export interface Relationship {
  name: string;
  level: number;
}

export interface GroupHeat {
  name: string;
  heat: number;
  description?: string;
  isPlayerTarget?: boolean;
}

export interface MusicShowResult {
  week: number;
  winner: string;
  scores: {
    group: string;
    digital: number;
    physical: number;
    sns: number;
    preVote: number;
    broadcast: number;
    total: number;
  }[];
}

export interface PlayerStats {
  albumImpact: number;
  voteImpact: number;
}

export interface GameState {
  activeEncounterKey?: string;
  encounters?: Record<string, import('./gameState').Encounter>;
  completedNeeds?: string[];
  playerModel?: string;
  language?: string;
  dmInvitations?: Record<string, string>;
  relationshipEvents?: string[];
  members: Member[];
  exposure: number;
  relationships: Relationship[];
  currentScene: string;
  history: ChatMessage[];
  turnCount: number;
  identity?: string[];
  setupStep: SetupStep;
  playerName: string;
  playerAge: number;
  playerMoney: number;
  playerMood: number;
  gameMode?: string;
  targets: string[];
  selectedCPs: string[];
  groupHeats?: GroupHeat[];
  isComebackSetting?: boolean;
  competingGroups?: string[];
  currentMusicShow?: MusicShowResult;
  musicShowHistory?: MusicShowResult[];
  playerImpact: PlayerStats;
  hasContributedThisWeek?: boolean;
  hiddenSummary?: string;
  collectedCards?: any[];
  // 手机：theqoo/KKT/Weverse/bubble 内容不进对话流，收进手机应用
  phoneFeed?: { id: string; type: 'kkt' | 'weverse' | 'bubble' | 'theqoo'; data: any; ts: number; read: boolean }[];
  daughterProfile?: {
    name: string;
    nationality: string;
    personality: string;
    background: string;
  };
  momTrustLevel?: number;
  // 自由世界关系系统
  worldRelations?: Record<string, { affinity: number; tension: number; note?: string; flags?: string[] }>;
  relationIntents?: Record<string, 'romance' | 'friend' | 'none'>; // 玩家对某爱豆的意图（key=成员id）
  matchmakes?: string[]; // 玩家想撮合的爱豆对（pairKey）
  // Demo 展示：demoMode=这局由一键 Demo 开始（显示自动演示开关）；autoDemo=当前正在自动演示
  demoMode?: boolean;
  autoDemo?: boolean;
  // 自由世界运行状态（持久化）
  worldDay?: number;
  worldSlot?: number;
  worldLocation?: string;
  worldFeed?: { id: string; text: string; kind: string; day: number; slot: number }[]; // 世界动态流
  sceneFocusIds?: string[]; // 本场登场的爱豆（给 prompt 聚焦用；不在场的只给一行简介）
  actionUsedAt?: string;    // (旧)本时段的深度互动已用掉；已被 usedActions 取代，保留兼容旧存档
  usedActions?: string[];   // 本时段已用掉的深度互动，元素形如 "day-slot:memberId" 或 "day-slot:__support__"（每人每时段 1 次）
  vignetteNeed?: { kind: string; label: string; seed: string; quickHints: string[]; targetName?: string } | null; // 碎片剧场：本次互动的需求（临时，非持久）
  // 长期记忆：每个爱豆一份滚动档案（只注入摘要，不注入全历史）
  memories?: Record<string, { day: number; slot: number; text: string }[]>;
  // 已触发过的阶段突破（key = `${memberId}:${milestoneId}`），避免重复触发
  milestones?: string[];
  // 大事记：每次里程碑触发记一条，喂给年鉴/结局，让"发展"看得见
  milestoneLog?: { id: string; memberId: string; name: string; title: string; day: number; memory: string }[];
  // 曝光度 0-100：偷偷来往的风险累积；低调会缓慢回落
  exposureLevel?: number;
  exposureTier?: number;    // 已播报到第几档，避免同一档重复触发
  recentEvents?: Record<string, number>; // 事件id → 上次触发的 day（冷却用）
  dmSentAt?: string;        // 私信计数所属的那一天（"d{day}"）
  dmCount?: number;         // 当天已发条数
  // 捏脸：外观覆盖（不填则用默认/还原真人）
  playerAppearance?: import('./spriteUtils').Appearance;
  appearances?: Record<string, import('./spriteUtils').Appearance>;
}

export { INITIAL_MEMBERS } from './members';
