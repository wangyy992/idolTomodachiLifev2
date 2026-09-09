import type { GameState, Member } from './types';

export interface Encounter {
  ids: string[];
  location: string;
  day: number;
  slot: number;
  cursor?: number;
  messageTimestamp?: number;
  need?: NonNullable<GameState['vignetteNeed']>;
}
export const encounterKey = (day: number, slot: number, location: string, ids: string[]) =>
  JSON.stringify([day, slot, location, [...ids].sort()]);
export const needKey = (day: number, slot: number, id: string) => `${day}-${slot}:${id}`;
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

// The AI can update game statistics, never identity, biography, or arbitrary fields.
export function applyMemberSnapshot(members: Member[], raw: unknown): Member[] {
  if (!Array.isArray(raw)) return members;
  return members.map(member => {
    const patch = raw.find(p => isRecord(p) && p.id === member.id);
    if (!isRecord(patch)) return member;
    return {
      ...member,
      ...(finite(patch.affection) ? { affection: clamp(patch.affection) } : {}),
      ...(finite(patch.careerPressure) ? { careerPressure: clamp(patch.careerPressure) } : {}),
      ...(typeof patch.status === 'string' ? { status: patch.status.slice(0, 100) } : {}),
    };
  });
}
export function validateSnapshot(raw: unknown): Record<string, any> | null {
  if (!isRecord(raw)) return null;
  return {
    members: Array.isArray(raw.members) ? raw.members.filter(isRecord) : [],
    hiddenSummary: typeof raw.hiddenSummary === 'string' ? raw.hiddenSummary.slice(0, 12000) : undefined,
    currentScene: typeof raw.currentScene === 'string' ? raw.currentScene.slice(0, 100) : undefined,
    isComebackSetting: typeof raw.isComebackSetting === 'boolean' ? raw.isComebackSetting : undefined,
    isWeekEnd: raw.isWeekEnd === true,
    groupHeats: Array.isArray(raw.groupHeats) ? raw.groupHeats.filter(p => isRecord(p) &&
      typeof p.name === 'string' && finite(p.heat)).map(p => ({
        name: p.name, heat: clamp(p.heat as number),
        ...(typeof p.description === 'string' ? { description: p.description.slice(0, 300) } : {}),
        ...(typeof p.isPlayerTarget === 'boolean' ? { isPlayerTarget: p.isPlayerTarget } : {}),
      })) : undefined,
  };
}

// Credentials are deliberately excluded from every save, including old save migrations.
export function withoutSecrets<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutSecrets) as T;
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !/^(playerApiKey|apiKey|authorization|accessToken)$/i.test(key))
    .map(([key, item]) => [key, withoutSecrets(item)])) as T;
}
export const serializeGame = (state: GameState) => JSON.stringify(withoutSecrets(state));
export function restoreGame(raw: unknown, fallback: GameState): GameState {
  if (!isRecord(raw) || !Array.isArray(raw.members) || !Array.isArray(raw.history)) return fallback;
  const safe = withoutSecrets(raw);
  return {
    ...fallback, ...safe,
    members: (safe.members as unknown[]).filter((m): m is Member => isRecord(m) &&
      typeof m.id === 'string' && typeof m.name === 'string' && typeof m.group === 'string')
      .map(m => ({ ...m, affection: finite(m.affection) ? clamp(m.affection) : 0 })),
    history: (safe.history as unknown[]).filter((h): h is GameState['history'][number] => isRecord(h) &&
      ['user', 'assistant', 'system'].includes(String(h.role)) && typeof h.content === 'string'),
    targets: Array.isArray(safe.targets) ? safe.targets.filter((x): x is string => typeof x === 'string') : [],
    collectedCards: Array.isArray(safe.collectedCards) ? safe.collectedCards : [],
    playerImpact: isRecord(safe.playerImpact) ? {
      albumImpact: finite(safe.playerImpact.albumImpact) ? clamp(safe.playerImpact.albumImpact, 0, 60) : 0,
      voteImpact: finite(safe.playerImpact.voteImpact) ? clamp(safe.playerImpact.voteImpact, 0, 60) : 0,
    } : fallback.playerImpact,
    encounters: isRecord(safe.encounters) ? Object.fromEntries(Object.entries(safe.encounters).filter(([, e]) =>
      isRecord(e) && Array.isArray(e.ids) && e.ids.every(x => typeof x === 'string') &&
      typeof e.location === 'string' && finite(e.day) && finite(e.slot))) as Record<string, Encounter> : {},
    completedNeeds: Array.isArray(safe.completedNeeds) ? safe.completedNeeds.filter((x): x is string => typeof x === 'string') : [],
  } as GameState;
}
export function migrateStoredSecrets(storage: Storage) {
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key || (key !== 'star_reality_kpop_game_state' && !key.startsWith('save_data_'))) continue;
    try {
      const value = storage.getItem(key);
      if (value) storage.setItem(key, JSON.stringify(withoutSecrets(JSON.parse(value))));
    } catch { /* A damaged save must not prevent other saves from loading. */ }
  }
}
