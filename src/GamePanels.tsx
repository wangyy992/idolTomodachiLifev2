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

import { parseScript } from './story';
export const KKTMessageUI = ({ data, bare }: { data: any; bare?: boolean }) => bare ? (
  <div className="font-sans bg-[#F5F0EA] rounded-2xl overflow-hidden border border-[#DAD8EE]">
    <div className="bg-[#FAE100] px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-lg">{data.avatar || '👤'}</div>
      <div>
        <div className="text-[13px] font-black text-[#3A1F00]">{data.sender}</div>
        <div className="text-[9px] text-[#3A1F00]/60">카카오톡</div>
      </div>
    </div>
    <div className="px-4 py-4 flex flex-col gap-3 bg-[#B2C7D9]/20">
      {data.messages?.map((msg: any, idx: number) => (
        <div key={idx} className="flex items-end gap-2">
          <div className="w-7 h-7 rounded-full bg-[#FAE100] flex items-center justify-center text-sm flex-shrink-0">{data.avatar || '👤'}</div>
          <div className="flex flex-col gap-0.5 max-w-[78%]">
            <div className="bg-white rounded-2xl rounded-tl-none px-3 py-2 shadow-sm">
              <p className="text-[12px] text-gray-800 leading-relaxed font-medium">{msg.text}</p>
              {msg.translation && <p className="text-[11px] text-[#505C99] mt-0.5 leading-relaxed">{msg.translation}</p>}
            </div>
            <div className="flex items-center gap-1 pl-1">
              <span className="text-[9px] text-gray-400">{msg.time}</span>
              {!msg.isRead && <span className="text-[9px] text-[#FAE100] font-black">1</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
) : (
  <div className="my-6 max-w-xs mx-auto font-sans">
    <div className="relative bg-[#1A1A1A] rounded-[2.5rem] p-3 shadow-2xl">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-4 bg-[#111] rounded-full flex items-center justify-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-[#333]"></div>
        <div className="w-3 h-3 rounded-full bg-[#2a2a2a] border border-[#444]"></div>
      </div>
      <div className="bg-[#F5F0EA] rounded-[2rem] overflow-hidden mt-4">
        <div className="bg-[#F5F0EA] px-5 pt-3 pb-1"><span className="text-[10px] font-bold text-gray-500">9:41</span></div>
        <div className="bg-[#FAE100] px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-lg">{data.avatar || '👤'}</div>
          <div>
            <div className="text-[13px] font-black text-[#3A1F00]">{data.sender}</div>
            <div className="text-[9px] text-[#3A1F00]/60">카카오톡</div>
          </div>
        </div>
        <div className="px-4 py-4 flex flex-col gap-3 min-h-[80px] bg-[#B2C7D9]/20">
          {data.messages?.map((msg: any, idx: number) => (
            <div key={idx} className="flex items-end gap-2">
              <div className="w-7 h-7 rounded-full bg-[#FAE100] flex items-center justify-center text-sm flex-shrink-0">{data.avatar || '👤'}</div>
              <div className="flex flex-col gap-0.5 max-w-[75%]">
                <div className="bg-white rounded-2xl rounded-tl-none px-3 py-2 shadow-sm">
                  <p className="text-[12px] text-gray-800 leading-relaxed font-medium">{msg.text}</p>
                  {msg.translation && <p className="text-[11px] text-[#505C99] mt-0.5 leading-relaxed">{msg.translation}</p>}
                </div>
                <div className="flex items-center gap-1 pl-1">
                  <span className="text-[9px] text-gray-400">{msg.time}</span>
                  {!msg.isRead && <span className="text-[9px] text-[#FAE100] font-black">1</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white pb-2 flex justify-center"><div className="w-24 h-1 bg-gray-300 rounded-full"></div></div>
      </div>
    </div>
    <div className="text-center mt-2"><span className="text-[10px] text-[#505C99] font-bold uppercase tracking-widest">KakaoTalk</span></div>
  </div>
);

export const WeversePostUI = ({ data }: { data: any }) => (
  <div className="my-6 max-w-sm mx-auto font-sans bg-white rounded-3xl overflow-hidden shadow-sm border border-[#DAD8EE]">
    <div className="px-4 py-3 flex items-center justify-between border-b border-[#DAD8EE]">
      <div className="flex items-center gap-3">
        <span className="text-[#505C99] text-lg">{'<'}</span>
        <div><div className="text-[14px] font-bold text-[#2A2A3D]">帖子</div><div className="text-[10px] text-[#6A79C0]">前往社区 {'>'}</div></div>
      </div>
      <div className="flex gap-4 text-[#505C99] text-lg"><span>↗</span><span>✕</span></div>
    </div>
    <div className="px-4 pt-4 pb-2 flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-[#E7E6F6] flex items-center justify-center flex-shrink-0">
        <span className="text-[#505C99] font-black text-sm">{data.artist?.[0] || '★'}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-1">
          <span className="text-[14px] font-bold text-[#2A2A3D]">{data.artist}</span>
          <span className="text-[#6A79C0] text-[14px]">✓</span>
        </div>
        <div className="text-[11px] text-[#505C99]">{data.time}</div>
        <div className="text-[11px] text-[#6A79C0] mt-0.5">查看原文 (한국어)</div>
      </div>
      <span className="text-[#505C99] text-lg">⋯</span>
    </div>
    <div className="px-4 pb-3"><p className="text-[14px] text-[#2A2A3D] leading-relaxed">{data.content}</p></div>
    {data.imageDesc && (
      <div className="w-full bg-[#E7E6F6] aspect-[4/3] flex flex-col items-center justify-center gap-2 p-4">
        <span className="text-[#505C99] text-xl">🖼</span>
        <p className="text-[11px] text-[#505C99] text-center italic">{data.imageDesc}</p>
      </div>
    )}
    <div className="px-4 py-3 flex items-center gap-6 border-t border-[#DAD8EE]">
      <button className="flex items-center gap-1.5 text-[#505C99]"><Heart className="w-5 h-5" /><span className="text-[12px]">{(data.likes || 0).toLocaleString()}</span></button>
      <button className="text-[#505C99] text-xl">🔖</button>
    </div>
  </div>
);

export const BubbleMessageUI = ({ data }: { data: any }) => (
  <div className="my-6 max-w-sm mx-auto font-sans bg-[#F0EBE3] rounded-3xl overflow-hidden shadow-sm">
    <div className="px-4 py-3 flex items-center justify-between bg-[#F0EBE3] border-b border-[#DAD8EE]">
      <span className="text-[#6A79C0] text-[14px]">{'<'}</span>
      <span className="text-[16px] font-bold text-[#2A2A3D]">{data.artist}</span>
      <div className="flex gap-4"><span className="text-[#505C99]">🔍</span><span className="text-[#505C99]">⋯</span></div>
    </div>
    <div className="px-4 py-4 flex flex-col gap-2">
      {data.messages?.map((msg: any, idx: number) => (
        <div key={idx} className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[#2A2A3D] flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-[16px]">🐱</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-bold text-white bg-[#6A79C0] px-1.5 py-0.5 rounded">ARTIST</span>
              <span className="text-[12px] font-bold text-[#2A2A3D]">{data.artist}</span>
            </div>
            <div className="bg-white rounded-2xl rounded-tl-none px-3 py-2 inline-block max-w-[85%] border border-[#DAD8EE]">
              <p className="text-[13px] text-[#2A2A3D] leading-relaxed">{msg.text}</p>
              {msg.translation && <p className="text-[12px] text-[#6A79C0] mt-0.5 leading-relaxed">{msg.translation}</p>}
            </div>
            <div className="text-[10px] text-[#505C99] mt-1 pl-1">{msg.time}</div>
          </div>
        </div>
      ))}
    </div>
    <div className="px-4 py-3 bg-[#F0EBE3] border-t border-[#DAD8EE] flex items-center justify-end gap-4">
      <span className="text-[#505C99] text-xl">☺</span><span className="text-[#6A79C0] text-xl">➤</span>
    </div>
  </div>
);

export const TheqooPostUI = ({ post }: { post: TheqooPost }) => (
  <div className="bg-[#F2F2F2] border border-gray-200 rounded-3xl overflow-hidden shadow-sm my-6 max-w-lg mx-auto font-sans">
    <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-200">
      <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]"></div><div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]"></div><div className="w-2.5 h-2.5 rounded-full bg-[#28C840]"></div></div>
      <div className="bg-gray-100 px-8 py-1 rounded-full text-[10px] text-gray-400">theqoo.net</div>
      <div className="w-6"></div>
    </div>
    <div className="bg-white overflow-hidden">
      <div className="p-5 border-b border-[#F0F0F0]">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-[#D32F2F] text-white text-[9px] px-1.5 py-0.5 rounded font-black">HOT</div>
          <span className="text-[#333] text-[10px] font-black uppercase border-b-2 border-[#D32F2F]">Community theqoo</span>
        </div>
        <h2 className="text-lg font-bold leading-tight text-gray-900 mb-3">{post.title}</h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-gray-400">
          <span className="text-[#D32F2F] font-black">{post.category}</span>
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {(post.viewsCount || 0).toLocaleString()}</span>
          <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {(post.likesCount || 0).toLocaleString()}</span>
          <span className="font-bold text-gray-600">Comments {post.commentsCount || 0}</span>
        </div>
      </div>
      <div className="divide-y divide-[#F8F8F8]">
        {post.comments.slice(0, 6).map((comment, idx) => (
          <div key={idx} className="p-4 bg-white">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#E7E6F6] flex-shrink-0 flex items-center justify-center text-[#505C99] font-black text-xs">{idx + 1}</div>
              <div className="flex-1">
                <span className="text-[10px] font-black text-[#505C99]">@{comment.authorId}</span>
                <p className="text-sm font-medium text-gray-800 mt-1 leading-relaxed">{comment.content}</p>
                {comment.translation && <p className="text-[11px] text-gray-500 italic mt-1">{comment.translation}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const CharacterCardUI = ({ card }: any) => {
  if (!card || typeof card !== 'object') return null;
  return (
    <div className="bg-white border border-[#DAD8EE] rounded-3xl overflow-hidden shadow-sm my-6 max-w-md mx-auto font-sans">
      <div className="bg-[#6A79C0] p-5 text-white text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-20"><Sparkles className="w-12 h-12" /></div>
        <div className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Artist Profile</div>
        <h3 className="text-xl font-bold">{card.name} {card.stageName ? `(${card.stageName})` : ''}</h3>
      </div>
      <div className="p-5 flex flex-col gap-4 text-left">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-[#F3F2FA] p-3 rounded-2xl border border-[#DAD8EE]"><div className="text-[#505C99] font-black mb-1 uppercase text-[9px]">Group</div><div className="font-bold text-[#2A2A3D]">{card.group || '未知团体'}</div></div>
          <div className="bg-[#F3F2FA] p-3 rounded-2xl border border-[#DAD8EE]"><div className="text-[#505C99] font-black mb-1 uppercase text-[9px]">Status</div><div className="font-bold text-[#2A2A3D]">{card.status || '活跃中'}</div></div>
        </div>
        {card.publicPersona && <div className="bg-[#F3F2FA] p-4 rounded-2xl border border-[#DAD8EE] text-xs"><span className="font-black text-[#6A79C0] block uppercase text-[9px] mb-1">Public Persona</span><p className="text-[#2A2A3D] italic">"{card.publicPersona}"</p></div>}
        {card.realPersonality && <div className="bg-[#F3F2FA] p-4 rounded-2xl border border-[#DAD8EE] text-xs"><span className="font-black text-[#505C99] block uppercase text-[9px] mb-1">Real Personality</span><p className="text-[#2A2A3D]">{card.realPersonality}</p></div>}
        {Array.isArray(card.weaknesses) && card.weaknesses.length > 0 && (
          <div className="flex flex-wrap gap-2">{card.weaknesses.map((item: string, i: number) => <span key={i} className="text-[10px] px-3 py-1 bg-[#E7E6F6] text-[#505C99] rounded-full border border-[#DAD8EE] font-bold"># {item}</span>)}</div>
        )}
        {card.hiddenStory && <div className="pt-2 border-t border-dashed border-[#DAD8EE]"><span className="font-black text-[#505C99] block uppercase text-[9px] mb-1">Hidden Story</span><p className="text-[11px] text-[#505C99] italic">{card.hiddenStory}</p></div>}
      </div>
    </div>
  );
};

export const MusicShowUI = ({ result }: { result: any }) => (
  <div className="bg-white border border-[#DAD8EE] rounded-[2rem] overflow-hidden shadow-sm my-6 max-w-lg mx-auto font-sans">
    <div className="bg-[#6A79C0] p-5 text-white text-center relative">
      <div className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Music Bank / Inkigayo</div>
      <h3 className="text-xl font-black tracking-widest">WEEKLY CHAMPION</h3>
      <div className="absolute top-2 right-4 opacity-30"><Sparkles className="w-8 h-8" /></div>
    </div>
    <div className="p-5 flex flex-col gap-4">
      <div className="flex flex-col items-center py-4 bg-[#F3F2FA] rounded-3xl border border-[#DAD8EE]">
        <div className="text-[10px] font-black text-[#505C99] uppercase mb-1">本次优胜 / Winner</div>
        <div className="text-2xl font-black text-[#2A2A3D]">{result.winner}</div>
        <div className="mt-2 flex gap-1">{[1,2,3].map(i => <Sparkles key={i} className="w-4 h-4 text-[#6A79C0] animate-pulse" />)}</div>
      </div>
      <div className="flex flex-col gap-3">
        {result.scores?.map((score: any, idx: number) => (
          <div key={idx} className={`p-4 rounded-2xl border ${score.group === result.winner ? 'bg-[#E7E6F6] border-[#6A79C0]' : 'bg-white border-[#DAD8EE]'}`}>
            <div className="flex justify-between items-center mb-2"><span className="font-bold text-sm text-[#2A2A3D]">{score.group}</span><span className="font-black text-[#6A79C0] text-sm">{score.total} pt</span></div>
            <div className="grid grid-cols-5 gap-1">
              {['digital','physical','sns','preVote','broadcast'].map((key, i) => (
                <div key={i} className="text-center"><div className="text-[8px] text-[#505C99] font-bold uppercase truncate">{['音源','销量','SNS','投票','放送'][i]}</div><div className="text-[10px] font-bold text-[#2A2A3D]">{score[key]}</div></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const OptionsUI = ({ options, isLatest, lang, onPick, disabled }: { options: any[], isLatest: boolean, lang?: string, onPick?: (action: string) => void, disabled?: boolean }) => {
  if (!options?.length) return null;
  const l = lang || 'simplified';
  // 最新一条 + 有回调 → 可点选（点了等于把这个行动发出去）；历史消息只读回顾
  const clickable = isLatest && !!onPick;
  return (
    <div className="mt-4 rounded-2xl bg-white/[0.10] border border-white/20 p-4">
      <div className="gold-caption mb-3 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[#FF7A93]" />{clickable ? (l === "traditional" ? "選一個行動" : "选一个行动") : (l === "traditional" ? "當時的選擇" : "当时的选择")}</div>
      <div className="flex flex-col gap-2">
        {options.map((opt: any, i) => {
          const raw = (typeof opt === 'string' ? opt : opt.text);
          const action = (typeof opt === 'string' ? opt : (opt.action || opt.text));
          const text = raw.replace(/^[A-Da-d][\.、。\)]\s*/, '');
          const cls = "flex items-start gap-2.5 rounded-xl px-3 py-2.5 border text-left w-full transition-all";
          if (clickable) {
            return (
              <button key={i} disabled={disabled} onClick={() => onPick!(action)}
                className={cls + " bg-white/[0.10] border-white/[0.14] hover:border-[rgba(255,122,147,0.5)] hover:bg-white/[0.10] active:scale-[0.99] disabled:opacity-50"}>
                <span className="mt-0.5 w-5 h-5 rounded-lg bg-[#E7E6F6] text-[#6A79C0] text-[10px] font-black flex items-center justify-center flex-shrink-0">{'ABCD'[i] || '·'}</span>
                <span className="text-[13px] text-[#F1ECFF] font-semibold leading-relaxed">{text}</span>
              </button>
            );
          }
          return (
            <div key={i} className={cls + " bg-white/[0.10] border-white/[0.14]"}>
              <span className="mt-0.5 w-5 h-5 rounded-lg bg-[#E7E6F6] text-[#6A79C0] text-[10px] font-black flex items-center justify-center flex-shrink-0">{'ABCD'[i] || '·'}</span>
              <span className="text-[13px] text-[#E2DFF4] font-semibold leading-relaxed">{text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const MobileDrawer = ({ gameState, onClose, onSave, onLoad, onDelete, saveSlots, wallpaper, onWallpaperUpload, onClearWallpaper }: { gameState: GameState, onClose: () => void, onSave: () => void, onLoad: (id: string) => void, onDelete: (id: string) => void, saveSlots: any[], wallpaper: string, onWallpaperUpload: (e: React.ChangeEvent<HTMLInputElement>) => void, onClearWallpaper: () => void }) => {
  const targetMembers = gameState.members.filter(m => gameState.targets.includes(m.id));
  const roundCount = gameState.history.filter(h => h.role === MessageRole.ASSISTANT).length;
  const lang = (gameState as any).language || 'simplified';

  return (
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-x-0 bottom-0 z-50 rounded-t-[2rem] shadow-2xl border-t border-[rgba(240,197,88,0.25)] max-h-[70vh] overflow-y-auto ink-scroll" style={{ background: 'linear-gradient(180deg, #242A36, #20252F)' }}>
      <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 bg-white/15 rounded-full"></div></div>
      <div className="flex items-center justify-between px-6 pb-4 border-b border-white/[0.14]">
        <h3 className="gold-caption text-sm">{lang === 'traditional' ? '角色狀態' : '角色状态'}</h3>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all"><X className="w-4 h-4 text-[#C8C4E4]" /></button>
      </div>
      <div className="p-5 flex flex-col gap-5">
        {(
          <div className="flex flex-col gap-3">
            {targetMembers.map(member => (
              <div key={member.id} className="bg-white/[0.10] p-4 rounded-2xl border border-white/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-[#F1ECFF]">{member.name}</span>
                  <span className="text-[11px] text-[#F0C558] font-mono font-bold">{member.affection}/100</span>
                </div>
                <div className="h-[3px] bg-white/[0.08] rounded-full overflow-hidden mb-1">
                  <motion.div animate={{ width: `${member.affection}%` }} className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#7B87D0,#F0C558)' }} />
                </div>
                <div className="text-[10px] text-[#A6A1CC]">{member.status}</div>
              </div>
            ))}
          </div>
        )}
        <div className="bg-white/[0.10] p-4 rounded-2xl border border-white/20 flex flex-col gap-2">
          <div className="flex justify-between text-xs"><span className="text-[#A6A1CC]">{lang === "traditional" ? "場景" : "场景"}</span><span className="font-bold text-[#F1ECFF]">{gameState.currentScene}</span></div>
          <div className="flex justify-between text-xs"><span className="text-[#A6A1CC]">Round</span><span className="font-bold text-[#F0C558]">{roundCount}</span></div>
          {gameState.isComebackSetting && <div className="text-[10px] font-black text-[#F0C558] bg-white/[0.10] px-2 py-1 rounded-lg">{lang === "traditional" ? "回歸期進行中" : "回归期进行中"}</div>}
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-2.5">
            <button onClick={() => { onSave(); onClose(); }} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-white rounded-2xl text-[11px] font-black active:scale-95 transition-all" style={{ background: 'linear-gradient(135deg,#7B87D0,#505C99)', boxShadow: '0 6px 16px -6px rgba(106,121,192,0.7)' }}><Save className="w-3.5 h-3.5" />{lang === "traditional" ? "存檔" : "存档"}</button>
            <label className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-white/[0.07] border border-white/20 text-[#C8C4E4] rounded-2xl text-[11px] font-black text-center cursor-pointer hover:bg-white/[0.09] active:scale-95 transition-all">
              <Sparkles className="w-3.5 h-3.5" />{lang === "traditional" ? "換壁紙" : "换壁纸"}
              <input type="file" accept="image/*" className="hidden" onChange={onWallpaperUpload} />
            </label>
          </div>
          {wallpaper && <button onClick={onClearWallpaper} className="w-full py-2.5 text-[#A6A1CC] rounded-2xl text-[10px] font-black hover:text-[#FF7A93] transition-all">{lang === "traditional" ? "移除壁紙" : "移除壁纸"}</button>}
          {saveSlots.length > 0 && (
            <div className="rounded-2xl bg-white/[0.10] border border-white/20 p-2.5 flex flex-col gap-2 mt-1">
              <div className="gold-caption px-1 flex items-center gap-1.5"><FolderOpen className="w-3 h-3" />{lang === "traditional" ? "讀檔" : "读档"}</div>
              {saveSlots.map((slot: any, si: number) => (
                <div key={slot.id} className="bg-white/[0.10] border border-white/20 rounded-xl p-2.5 flex items-center gap-2.5 active:scale-[0.98] transition-all">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7B87D0] to-[#505C99] text-white flex items-center justify-center text-[11px] font-black flex-shrink-0">{saveSlots.length - si}</div>
                  <button onClick={() => { onLoad(slot.id); onClose(); }} className="flex-1 min-w-0 text-left">
                    <div className="text-[11px] font-black text-[#F1ECFF] truncate">{(slot as any).subject || slot.scene}</div>
                    <div className="text-[9px] text-[#A6A1CC] truncate mt-0.5">{slot.scene} · R{slot.round} · {slot.time}</div>
                  </button>
                  <button onClick={() => onDelete(slot.id)} className="w-7 h-7 rounded-lg text-[#A6A1CC] hover:bg-[#FF7A93]/10 hover:text-[#FF7A93] flex items-center justify-center flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// 手机：theqoo / KakaoTalk / Weverse / bubble 的专属入口
export const PHONE_APPS: { key: 'kkt' | 'weverse' | 'bubble' | 'theqoo'; label: string; icon: string; color: string; mono?: boolean }[] = [
  { key: 'kkt', label: 'KakaoTalk', icon: '💬', color: '#FAE100' },
  { key: 'weverse', label: 'Weverse', icon: '🌐', color: '#141420', mono: true },
  { key: 'bubble', label: 'bubble', icon: '🫧', color: '#8ec7f0' },
  { key: 'theqoo', label: 'theqoo', icon: '🔥', color: '#3b5998' },
];

export const PhoneModal = ({ feed, onClose, lang, members, onSendDM, dmLeft }: {
  feed: NonNullable<GameState['phoneFeed']>; onClose: () => void; lang?: string;
  members: Member[]; onSendDM: (memberId: string, action: DMAction) => void; dmLeft: number;
}) => {
  const tw = lang === 'traditional';
  const [tab, setTab] = useState<'kkt' | 'weverse' | 'bubble' | 'theqoo'>(
    () => [...feed].reverse().find(f => !f.read)?.type || 'kkt'
  );
  const items = feed.filter(f => f.type === tab).slice().reverse();
  const [dmTo, setDmTo] = useState<string>(() => members[0]?.id || '');
  const [dmAction, setDmAction] = useState<DMAction>('greet');
  const canDM = tab === 'kkt' || tab === 'bubble';
  const sendDM = () => {
    if (dmLeft <= 0 || !dmTo) return;
    onSendDM(dmTo, dmAction);
  };
  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full max-w-sm h-[88vh] bg-[#0c0a16] rounded-[2.8rem] p-2.5 shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-[#17131f] rounded-[2.4rem] overflow-hidden flex-1 flex flex-col min-h-0 relative">
          {/* 刘海 */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-[#0c0a16] rounded-full z-20" />
          {/* 状态栏 + 关闭 */}
          <div className="px-6 pt-3 pb-1 flex items-center justify-between flex-shrink-0 relative z-10">
            <span className="text-[10px] font-bold text-[#A6A1CC]">9:41</span>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-[#C8C4E4]"><X className="w-4 h-4" /></button>
          </div>
          {/* App tabs */}
          <div className="px-3 pb-2.5 pt-2 flex gap-1.5 flex-shrink-0">
            {PHONE_APPS.map(app => {
              const unread = feed.filter(f => f.type === app.key && !f.read).length;
              const active = tab === app.key;
              return (
                <button key={app.key} onClick={() => setTab(app.key)}
                  className="relative flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl border transition-all"
                  style={active
                    ? { background: 'rgba(240,197,88,0.12)', borderColor: 'rgba(240,197,88,0.45)' }
                    : { background: 'rgba(255,255,255,0.04)', borderColor: 'transparent' }}>
                  <span className="w-[34px] h-[34px] rounded-[0.7rem] flex items-center justify-center text-lg shadow-sm" style={{ background: app.color, border: app.mono ? '1px solid rgba(255,255,255,0.25)' : 'none' }}>{app.icon}</span>
                  <span className={`text-[9px] font-black ${active ? 'text-[#F1ECFF]' : 'text-[#A6A1CC]'}`}>{app.label}</span>
                  {unread > 0 && <span className="absolute top-1 right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#FF3B30] text-white text-[9px] font-black flex items-center justify-center">{unread}</span>}
                </button>
              );
            })}
          </div>
          {/* 内容流 */}
          <div className="flex-1 overflow-y-auto ink-scroll px-2 pb-4 pt-2 min-h-0 bg-[#F1EFF7]">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-[#505C99]/60">
                <span className="text-3xl">{PHONE_APPS.find(a => a.key === tab)?.icon}</span>
                <span className="text-[11px] font-bold">{tw ? '還沒有內容，劇情推進後這裡會收到更新' : '还没有内容，剧情推进后这里会收到更新'}</span>
              </div>
            ) : items.map(item => (
              <div key={item.id} className="[&>div]:my-2 [&>div]:max-w-full">
                {item.type === 'kkt' && <KKTMessageUI data={item.data} bare />}
                {item.type === 'weverse' && <WeversePostUI data={item.data} />}
                {item.type === 'bubble' && <BubbleMessageUI data={item.data} />}
                {item.type === 'theqoo' && <TheqooPostUI post={item.data} />}
              </div>
            ))}
          </div>
          {/* 主动发消息：不占行动点，但每天有条数上限，发太勤会涨曝光度 */}
          {canDM && (
            <div className="flex-shrink-0 border-t border-black/10 bg-white px-2.5 py-2 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {members.map(m => (
                  <button key={m.id} onClick={() => setDmTo(m.id)}
                    className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black transition-all ${dmTo === m.id ? 'bg-[#6A79C0] text-white' : 'bg-[#E7E6F6] text-[#505C99]'}`}>
                    {m.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[#8A7FA0]">轻量问候 · 今日剩余 {dmLeft} 条 · 深入聊天请在地图见面</p>
              <div className="flex gap-1.5">
                <select aria-label="私信内容" value={dmAction} onChange={e => setDmAction(e.target.value as DMAction)} className="flex-1 min-w-0 bg-[#F1EFF7] rounded-xl px-3 py-3 text-sm text-[#2A2A3D]">
                  {DM_ACTIONS.map(action => <option key={action.id} value={action.id}>{action.label}：{action.text}</option>)}
                </select>
                <button onClick={sendDM} disabled={dmLeft <= 0} aria-label="发送私信" className="min-w-11 rounded-xl bg-[#6A79C0] text-white disabled:opacity-40 flex items-center justify-center"><Send size={16}/></button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// Demo 一键开始用的原创角色：三个不同的女团（STELLA / HALO / LUMÉE），共 9 个性格各异的角色，方便录像/试玩
export const DEMO_CAST: any[] = [
  {
    id: 'demo_sole', name: '江予昭', group: 'STELLA', age: 2000, nationality: '韩国', role: '队长 / 主唱',
    publicPersona: '沉稳可靠的门面担当，采访里滴水不漏，被粉丝称作"人间清醒"。',
    realPersonality: `【底色】冰山掌控型。她把情绪管理当成一门技术活——不是没有情绪，是先算清楚说出来会不会给别人添麻烦，算不过就咽下去。作为队长，她习惯性地把所有人的状态扫描一遍，在没人注意的地方把问题解决掉，然后把功劳让出去。看似疏离，其实是全团最操心的人。
【软处】只有在确定没人看的时候，她才会露出疲惫。她极不擅长接受别人的好意——你对她好，她第一反应是"我要怎么还"。真正走进她，不是靠热情，是靠让她相信"你不需要她回报"。`,
    speechStyle: '句子短、逻辑清楚，很少用语气词。被戳中时会突然沉默两秒再回答。',
    secret: '出道前最后一次月评差点被淘汰，是现在的忙内白露替她说了话才留下来的——这件事她谁都没提过。',
    affection: 12,
  },
  {
    id: 'demo_wildy', name: '温野', group: 'STELLA', age: 2003, nationality: '中国', role: '主舞 / Rapper',
    publicPersona: '综艺感炸裂的气氛担当，舞台上极具攻击性，下台就变成话痨小狗。',
    realPersonality: `【底色】热烈直球型，情绪全写在脸上，藏都藏不住——高兴了整个人发光，委屈了眼圈立刻红。她敢爱敢恨，想到什么做什么，是那种会第一个冲过来抱住你的人。但这团火底下压着强烈的不安：她怕自己"太多了"，怕热情吓跑别人，所以有时会突然收住，然后自己纠结半天。
【软处】她给出去的都是真心，也因此特别容易受伤。她不会说"我需要你"，但会用行动疯狂暗示——反复找你、给你带吃的、记住你随口说的小事。你只要接住一次，她能记一辈子。`,
    speechStyle: '语速快、语气词多（"诶！""真的假的""你听我说"），激动时会飙一两句中文。',
    secret: '一个人在异国出道，最难的那阵子是靠每天给家里报"我很好"撑过来的，其实哭了很多次。',
    affection: 38,
  },
  {
    id: 'demo_dew', name: '白露', group: 'STELLA', age: 2005, nationality: '韩国', role: '忙内 / 副唱',
    publicPersona: '慵懒厌世的忙内，表情包本包，一句话能把姐姐们噎住，粉丝爱她的毒舌。',
    realPersonality: `【底色】慵懒毒舌天才型。能躺着绝不坐着，对大多数事情都是一副"随便吧"的懒散样，但脑子转得极快——毒舌背后全是精准的观察，她其实把每个人都看得透透的，只是懒得说破。她的冷淡是保护色：越在乎的事越装作不在乎。
【软处】她的刀子嘴专门用来掩盖豆腐心。她会用最欠揍的语气做最温柔的事——嘴上嫌你烦，转头把你落下的东西默默收好。想让她卸下防备，别被她的话激到，看她做了什么。`,
    speechStyle: '懒洋洋、爱用反问和吐槽，冷幽默，句尾常带一个拖长的"……啊"。',
    secret: '其实是三人里最黏队长江予昭的那个，会偷偷观察她累不累，但打死不承认。',
    affection: 25,
  },

  // ── HALO：暗色高级感四代团，概念冷冽疏离，公司主打"顶级门面" ──
  {
    id: 'demo_gutang', name: '顾樘', group: 'HALO', age: 2001, nationality: '中国', role: '队长 / 主唱',
    publicPersona: '被称作"行走的高级感"，气场强到镜头都要让三分，采访金句频出。',
    realPersonality: `【底色】优雅疏离型。她拥有极高的精神门槛，早就看透了这个行业的虚假与浮华。外表随和有礼，内心有一道很硬的墙——如果一个人的灵魂不够有趣，她只会保持礼貌的客气，绝不会多说一句。这不是高冷，是她真的不想把时间浪费在无聊的人身上。
【软处】一旦她认定你"有意思"，那道墙会以肉眼可见的速度塌掉，露出底下意外孩子气、会为一部老电影熬夜的一面。想让她记住你，别讨好她，说点她没听过的东西。`,
    speechStyle: '语速偏慢、用词讲究，喜欢反问和留白，很少把话说满。',
    secret: '其实一直在偷偷写歌，抽屉里攒了十几首没给任何人听过，怕被说"偶像不安分"。',
    affection: 8,
  },
  {
    id: 'demo_zhiqiu', name: '叶知秋', group: 'HALO', age: 2002, nationality: '中国', role: '主舞 / Rapper',
    publicPersona: '舞台上的"危险分子"，眼神杀一片，采访里常有让人捏把汗的直球发言。',
    realPersonality: `【底色】危险直球型。她享受打破平衡的快感，会主动侵入对方的舒适区，就为了看对方真实的反应。说话极其直接，想什么说什么，从不拐弯抹角。最讨厌唯唯诺诺和敷衍——你要是想糊弄她，她会当场笑着点破，让你无处可躲。
【软处】她的攻击性其实是一种测试：她在筛掉那些经不起真话的人。能接住她的直球、还敢回敬她的人，反而会被她高看一眼。她对"平等"有近乎执念的需求，怕的从来不是冲突，是被当成easy的人。`,
    speechStyle: '短促有力、爱挑衅式反问，笑起来带钩子，常用"哦？""就这？"。',
    secret: '这么刚的一个人，怕黑怕到要开小夜灯睡，只有同宿舍的顾樘知道。',
    affection: 20,
  },
  {
    id: 'demo_surui', name: '苏芮', group: 'HALO', age: 2004, nationality: '韩国', role: '忙内 / 副唱',
    publicPersona: '团里的"氛围感忙内"，眼睛会说话，一个眼神就能上热搜。',
    realPersonality: `【底色】敏感深情型。她的感知力强到有点辛苦——你三个月前随口提过一句喜欢的东西，她会一直记着，然后在某天默默递到你面前。她对外界评价高度敏感，一条负面评论能让她低落好几天，但她会假装没事，怕给团里添负担。
【软处】她需要的是"被稳稳接住"的确定感。她会反复用小事试探你在不在意，一旦确认了，就会把全部真心交出来。对她最狠的不是骂她，是忽冷忽热——那会让她整夜整夜地想自己是不是做错了什么。`,
    speechStyle: '轻声细语、句子偏软，爱用"…是不是""我在想"，紧张时会重复对方的话。',
    secret: '悄悄把每个成员的生日、口味、过敏原都记在一个小本子上，从没说过。',
    affection: 30,
  },

  // ── LUMÉE：明亮青春三代团，国民度高、综艺常客，概念元气甜 ──
  {
    id: 'demo_yinuo', name: '罗一诺', group: 'LUMÉE', age: 1999, nationality: '中国', role: '队长 / Lead Vocal',
    publicPersona: '国民好感度担当，笑起来有治愈感，是那种"看到就心情变好"的队长。',
    realPersonality: `【底色】元气感恩型ENFP。当年是被街头星探偶然发现才入行的，这个"意外的开始"让她比谁都懂得珍惜。她的感恩不是挂嘴上的，是藏在细节里——记得每一个帮过她的人，对每个工作机会都认真到较真。她天然没什么防备，情绪全挂脸上，高兴了全身发光，难过了也藏不住。
【软处】总在照顾别人的人，最不会照顾自己。她习惯把"我没事"当口头禅，其实撑不住的时候特别需要有人一眼看穿、然后不由分说地拉她去休息。你要是能看见她笑容后面的累，她会当场绷不住。`,
    speechStyle: '热情爽朗、语气词丰富（"哇""真的诶""谢谢你啊"），说话带笑音。',
    secret: '手机里有个只进不出的存钱罐相册，存着出道以来每一个"想记住的瞬间"截图。',
    affection: 42,
  },
  {
    id: 'demo_chie', name: '千惠', group: 'LUMÉE', age: 2002, nationality: '日本', role: '主领舞 / 副唱',
    publicPersona: '安静可靠的"团宠妈妈"，做事滴水不漏，粉丝叫她"人型自动整理仪"。',
    realPersonality: `【底色】日系职业意识型。她极擅长观察他人的情绪，总能默默把周围的事情处理好，却几乎从不说出自己的需求。她是那种"房间里最安静、但每个人都被她照顾到"的人——只是没人意识到这一切是她做的，包括她自己都觉得理所当然。
【软处】她把"不给别人添麻烦"刻进了骨子里，以至于连"我也想被照顾"这句话都说不出口。她不需要你为她做多大的事，只要你能注意到"她也会累"，并且认真地问一句"那你呢？"，就足以让她愣住。`,
    speechStyle: '礼貌温柔、句子完整、常带敬语感，偶尔蹦出日语词，笑起来先捂嘴。',
    secret: '其实很想有一次当"被宠的那个"，但每次话到嘴边又咽下去，怕显得任性。',
    affection: 22,
  },
  {
    id: 'demo_shenzhi', name: '沈芷', group: 'LUMÉE', age: 2006, nationality: '中国', role: '忙内 / Main Rapper',
    publicPersona: '外表软萌的忙内，一开口却是全团最稳的rap担当，反差圈粉无数。',
    realPersonality: `【底色】软萌外壳、辛辣内核。她拥有极其清晰的自我认知，一点都不满足于"可爱的妹妹"这个标签，她真正想要的是掌控舞台。她知道自己想要什么，也知道为此要付出什么代价，然后会非常平静地去付。别被她的娃娃脸骗了，她比谁都清醒。
【软处】她把野心藏在软萌底下，其实很怕被人只当成"吉祥物"。真正打动她的，是有人认真对待她的实力和想法、把她当成一个"选手"而不是"妹妹"。你越把她当回事，她越会在你面前卸下那层可爱的壳。`,
    speechStyle: '平时奶声奶气，聊到专业立刻切换成又快又稳的语气，落差极大。',
    secret: '偷偷在做自己的beat，梦想是有一天整张专辑的词曲都由她包办。',
    affection: 15,
  },
];

export const CharacterCreationWizard = ({ onComplete, members }: { onComplete: (data: any) => void, members: Member[] }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showFace, setShowFace] = useState(false);
  const [data, setData] = useState({
    playerName: '', playerAge: 19, identity: [] as string[],
    gameMode: 'romance' as string, targets: [] as string[],
    playerApiKey: '', playerModel: 'deepseek-v4-flash', language: 'simplified',
    playerAppearance: getPlayerAppearance('you') as Appearance,
    customMembers: [] as any[],
  });
  // 自建角色（像 Tomodachi Life 那样把自己想要的人放进来）
  const [ocDraft, setOcDraft] = useState<any | null>(null);
  const [ocFace, setOcFace] = useState(false);
  const [source, setSource] = useState<'girls' | 'boys' | 'oc' | 'demo'>('girls');
  const [customIdentity, setCustomIdentity] = useState('');
  const lang = data.language || 'simplified';

  useEffect(() => {
    if (!(window as any).OpenCC) return;
    if (data.language === 'traditional') {
      const converter = (window as any).OpenCC.Converter({ from: 'cn', to: 'twp' });
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);
      nodes.forEach(node => {
        if (node.parentElement?.tagName !== 'SCRIPT' && node.parentElement?.tagName !== 'STYLE') {
          node.textContent = converter(node.textContent || '');
        }
      });
    }
  }, [data.language]);

  // 身份精简为 5 个开局差异明显的原型（从哪开场 / 起始好感 / 能进哪些私密场所 / AI 怎么定位你）
  const ids = ["圈内工作人员","普通粉丝","公寓同栋住户","青梅竹马","现任女友"];
  const idDesc: Record<string, string> = {
    "圈内工作人员": "妆造/助理/实习生 · 后台开场 · 能进练习室与宿舍 · 近水楼台但要守规矩",
    "普通粉丝": "演唱会开场 · 只能在公开场合遇到她们 · 从零开始追",
    "公寓同栋住户": "宿舍开场 · 进得去宿舍 · 生活流的日常暧昧",
    "青梅竹马": "咖啡厅开场 · 从小认识，起始好感 40 · 一开始就有底子",
    "现任女友": "宿舍开场 · 已在恋爱，起始好感 62 · 玩「维持」而不是「攻略」",
  };
  const cpIds = ["娱乐公司实习生","音乐节目工作人员","妆造师/发型助理","翻译/海外商务助理","娱乐记者/博主","普通粉丝","资深粉丝","韩国留学生","便利店/咖啡厅打工人","公寓同栋住户"];
  const currentIds = ids;

  const groups = Array.from(new Set(members.map(m => m.group)));
  const groupedMembers: Record<string, Member[]> = {};
  groups.forEach(g => { groupedMembers[g] = members.filter(m => m.group === g); });
  const allGroups = groups;

  const toggleTarget = (id: string, max?: number) => {
    if (data.targets.includes(id)) {
      setData({...data, targets: data.targets.filter(x => x !== id)});
    } else {
      if (max && data.targets.length >= max) return;
      setData({...data, targets: [...data.targets, id]});
    }
  };

  const MemberPicker = ({ max, label }: { max?: number, label: string }) => (
    <div className="flex flex-col gap-3">
      <label className="gold-caption">{label}{max === 1 ? '（选1人）' : max ? `（选${max}人）` : '（可多选）'}</label>
      <div className="flex flex-wrap gap-2">
        {allGroups.map(g => (
          <button key={g} onClick={() => setSelectedGroup(selectedGroup === g ? null : g)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${selectedGroup === g ? 'text-white border-transparent' : 'bg-white/[0.10] border-white/20 text-[#C8C4E4]'}`}
            style={selectedGroup === g ? { background: 'linear-gradient(135deg,#7B87D0,#505C99)' } : undefined}>
            {g}
          </button>
        ))}
      </div>
      {selectedGroup && (
        <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto p-1 ink-scroll">
          {(groupedMembers[selectedGroup] || []).map(m => {
            const selected = data.targets.includes(m.id);
            const disabled = !selected && !!max && data.targets.length >= max;
            return (
              <button key={m.id} onClick={() => !disabled && toggleTarget(m.id, max)}
                className={`px-2 py-2 rounded-xl border text-[11px] transition-all flex flex-col items-center gap-0.5 ${selected ? 'bg-[rgba(240,197,88,0.1)] border-[rgba(240,197,88,0.5)] text-[#F1ECFF] font-bold' : disabled ? 'bg-white/[0.02] border-white/[0.14] text-white/25 cursor-not-allowed' : 'bg-white/[0.10] border-white/20 text-[#C8C4E4]'}`}>
                <div className="font-black text-[11px] leading-tight truncate max-w-full">{m.name}</div>
                <div className="text-[9px] opacity-70 truncate max-w-full">{m.stageName}</div>
              </button>
            );
          })}
        </div>
      )}
      {data.targets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {data.targets.map(id => {
            const m = members.find(x => x.id === id);
            return m ? (
              <span key={id} className="text-[10px] bg-[rgba(240,197,88,0.1)] text-[#F1ECFF] px-2 py-1 rounded-full border border-[rgba(240,197,88,0.4)] font-bold flex items-center gap-1">
                {m.name}<button onClick={() => toggleTarget(id)} className="text-[#F0C558] hover:text-[#F1ECFF]">×</button>
              </span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );

  const flow: string[] = ['basics', 'face', 'identity', 'idols'];
  const cur = flow[Math.min(stepIdx, flow.length - 1)];
  const isLast = stepIdx >= flow.length - 1;
  const go = (d: number) => setStepIdx(i => Math.max(0, Math.min(flow.length - 1, i + d)));
  const T = (s: string, t: string) => (lang === 'traditional' ? t : s);
  const inputCls = "w-full bg-white/[0.07] border border-white/20 rounded-2xl px-4 py-3.5 text-base focus:border-[#F0C558] focus:ring-4 focus:ring-[#F0C558]/10 outline-none text-[#F1ECFF] placeholder:text-[#A6A1CC] transition-all";
  const Label = ({ icon: Icon, children }: { icon: any; children: React.ReactNode }) => (
    <label className="flex items-center gap-2 text-[13px] font-bold text-[#C8C4E4] mb-2.5"><Icon className="w-4 h-4 text-[#F0C558]" /> {children}</label>
  );
  const canNext = () => {
    if (cur === 'basics') return !!data.playerName.trim();
    if (cur === 'identity') return data.identity.length > 0 || !!customIdentity.trim();
    if (cur === 'idols') return data.targets.length >= 1 || data.customMembers.length >= 1;
    return true;
  };
  const finish = () => {
    const val = customIdentity.trim();
    const identity = val && !data.identity.includes(val) ? [...data.identity, val] : data.identity;
    onComplete({ ...data, identity });
  };

  // Demo 一键开始：预置一套好角色 + 设定，直接进世界（录像/展示用）
  const startDemo = () => {
    // 一套原创角色（三人团 STELLA），不占用已有爱豆，直接进世界
    const cast = DEMO_CAST.map(c => ({ ...c, appearance: getAppearance('demo-' + c.id) }));
    onComplete({
      ...data,
      playerName: data.playerName.trim() || '林澄',
      playerAge: 22,
      gameMode: 'romance',
      identity: ['圈内工作人员'],
      targets: [],
      customMembers: cast,
      demoMode: true,
      autoDemo: true,
    });
  };

  return (
    <div className="setup-screen h-dvh flex items-center justify-center p-3 sm:p-6 relative overflow-clip" style={{ background: 'radial-gradient(120% 90% at 50% 0%, #131620 0%, #0F131C 70%)' }}>
      <div className="absolute -top-24 -left-20 w-80 h-80 rounded-full blur-3xl opacity-25 pointer-events-none" style={{ background: 'radial-gradient(circle, #7B87D0, transparent 70%)' }} />
      <div className="absolute -bottom-28 -right-16 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #F0C558, transparent 70%)' }} />
      <div className="absolute top-1/3 right-1/4 w-56 h-56 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ background: 'radial-gradient(circle, #FF7A93, transparent 70%)' }} />
      {showFace && (
        <FaceCustomizer appearance={data.playerAppearance} onChange={a => setData({ ...data, playerAppearance: a })} title={T('捏你的脸', '捏你的臉')} lang={lang} onClose={() => setShowFace(false)} />
      )}
      {/* 自建角色编辑器 */}
      {ocDraft && (
        <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setOcDraft(null)}>
          <div className="ink-panel ink-scroll rounded-[22px] w-full max-w-md max-h-[92%] overflow-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-black text-[#F1ECFF]">{T('自建角色','自建角色')}</h3>
              <button onClick={() => setOcDraft(null)} className="w-7 h-7 rounded-lg bg-white/[0.10] text-[#C8C4E4] flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex justify-center mb-4">
              <div className="relative flex items-center justify-center rounded-2xl p-3" style={{ background: 'radial-gradient(50% 60% at 50% 40%, rgba(120,110,220,0.18), transparent 70%)' }}>
                <div style={{ filter: 'drop-shadow(0 0 14px rgba(150,140,255,0.35))' }}><SpritePreview appearance={ocDraft.appearance} size={96} /></div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <div className="gold-caption mb-1.5">{T('名字','名字')}</div>
                <input value={ocDraft.name} onChange={e => setOcDraft({ ...ocDraft, name: e.target.value })} className={inputCls} placeholder={T('给他/她起个名字…','給他/她起個名字…')} />
              </div>
              <div>
                <div className="gold-caption mb-1.5">{T('性格 / 设定','性格 / 設定')}</div>
                <textarea value={ocDraft.realPersonality} onChange={e => setOcDraft({ ...ocDraft, realPersonality: e.target.value })}
                  className={inputCls + ' h-24 resize-none'} placeholder={T('写几句他/她是什么样的人，AI 会照着演…','寫幾句他/她是什麼樣的人，AI 會照著演…')} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setOcDraft({ ...ocDraft, appearance: getAppearance('oc-' + Math.random()) })}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.07] border border-white/20 text-[#C8C4E4] text-[12px] font-black">🔀 {T('随机外观','隨機外觀')}</button>
                <button onClick={() => setOcFace(true)}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.07] border border-white/20 text-[#C8C4E4] text-[12px] font-black">🎨 {T('捏脸','捏臉')}</button>
              </div>
              <button
                disabled={!ocDraft.name.trim()}
                onClick={() => {
                  const exists = data.customMembers.some((x: any) => x.id === ocDraft.id);
                  setData({
                    ...data,
                    customMembers: exists
                      ? data.customMembers.map((x: any) => (x.id === ocDraft.id ? ocDraft : x))
                      : [...data.customMembers, ocDraft],
                  });
                  setOcDraft(null);
                }}
                className="w-full py-3 rounded-xl text-white text-[13px] font-black disabled:opacity-40 transition-all"
                style={{ background: 'linear-gradient(135deg,#7B87D0,#505C99)' }}>
                {T('保存','保存')}
              </button>
            </div>
          </div>
        </div>
      )}
      {ocFace && ocDraft && (
        <FaceCustomizer appearance={ocDraft.appearance} onChange={a => setOcDraft({ ...ocDraft, appearance: a })}
          title={ocDraft.name ? `${T('捏','捏')}${ocDraft.name}` : T('捏这个角色','捏這個角色')} lang={lang} onClose={() => setOcFace(false)} />
      )}
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="setup-card relative rounded-[26px] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.7)] w-full max-w-xl max-h-full overflow-hidden flex flex-col border border-[rgba(240,197,88,0.25)]" style={{ background: 'linear-gradient(165deg, #242A36, #20252F)' }}>
        <div className="setup-head relative px-6 py-5 text-white overflow-hidden border-b border-white/[0.14] shrink-0" style={{ background: 'linear-gradient(135deg, #7B87D0 0%, #6A79C0 55%, #7C6BAE 100%)' }}>
          <div className="absolute inset-0 opacity-25 pointer-events-none" style={{ background: 'radial-gradient(circle at 18% 0%, white, transparent 45%)' }} />
          <Sparkles className="absolute right-4 top-3 w-4 h-4 text-white/40" />
          <Heart className="absolute right-10 top-8 w-3 h-3 text-white/25" />
          <div className="relative flex items-center gap-3">
            <div className="rounded-2xl bg-white/15 p-1 backdrop-blur-sm shadow-inner flex items-center justify-center flex-shrink-0"><SpritePreview appearance={data.playerAppearance} size={44} /></div>
            <div className="min-w-0">
              <h2 className="text-lg font-black tracking-wide leading-tight">爱豆收集梦想生活</h2>
              <p className="text-[11px] text-white/75 font-bold mt-0.5 truncate">{T('捏个小人，走进她们的世界', '捏個小人，走進她們的世界')}</p>
            </div>
          </div>
          <div className="relative flex justify-center gap-1.5 mt-4">
            {flow.map((_, i) => <div key={i} className="h-[3px] rounded-full transition-all duration-300" style={{ width: i === stepIdx ? 28 : 22, background: i <= stepIdx ? '#F0C558' : 'rgba(255,255,255,0.12)' }} />)}
          </div>
        </div>
        <div className="setup-body px-5 py-6 sm:px-9 sm:py-8 flex-1 min-h-0 overflow-y-auto ink-scroll">
          <AnimatePresence mode="wait">
            <motion.div key={cur} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="flex flex-col gap-5">
              {cur === 'basics' && (<>
                <div>
                  <Label icon={Globe}>语言 / 語言</Label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[{id:'simplified',name:'简体中文'},{id:'traditional',name:'繁體中文'}].map(l => {
                      const on = data.language === l.id;
                      return (
                        <button key={l.id} onClick={() => setData({...data, language: l.id})} className={`relative py-3.5 rounded-2xl border text-[13px] font-bold transition-all ${on ? 'bg-[rgba(240,197,88,0.1)] border-[rgba(240,197,88,0.5)] text-[#F1ECFF]' : 'bg-white/[0.10] border-white/20 text-[#C8C4E4] hover:border-white/25'}`}>
                          {on && <Check className="absolute right-2 top-2 w-3.5 h-3.5" />}{l.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div><Label icon={User}>{T('你的名字','您的名字')}</Label><input type="text" value={data.playerName} onChange={e => setData({...data, playerName: e.target.value})} className={inputCls} placeholder={T('请输入角色昵称...','請輸入角色暱稱...')} /></div>
                <div><Label icon={Cake}>{T('年龄','年齡')}</Label><input type="number" value={data.playerAge} onChange={e => setData({...data, playerAge: parseInt(e.target.value)})} className={inputCls} /></div>
                <div className="rounded-2xl bg-white/[0.10] border border-white/20 p-4 sm:p-5">
                  <Label icon={KeyRound}>DeepSeek API Key（{T('可选','可選')}）</Label>
                  <input type="password" value={data.playerApiKey} onChange={e => setData({...data, playerApiKey: e.target.value})} className={inputCls} placeholder={T('可选：本页使用的 DeepSeek Key','可選：本頁使用的 DeepSeek Key')} />
                  <p className="text-[10px] text-[#A6A1CC] mt-2.5 pl-0.5 leading-relaxed">{T('不填则使用公共额度。key仅存于本地，不会上传。','不填則使用公共額度。key僅存於本地，不會上傳。')}</p>
                  {data.playerApiKey && (
                    <div className="grid grid-cols-2 gap-2 mt-2.5">
                      {[{id:'deepseek-v4-flash',name:'Flash',desc:T('快速省钱','快速省錢')},{id:'deepseek-v3',name:'V3',desc:T('质量更好','品質更好')}].map(m => (
                        <button key={m.id} onClick={() => setData({...data, playerModel: m.id})} className={`p-2.5 rounded-xl border-2 text-left transition-all ${data.playerModel === m.id ? 'bg-[rgba(240,197,88,0.1)] border-[rgba(240,197,88,0.5)] text-[#F1ECFF]' : 'bg-white/[0.10] border-white/20 text-[#C8C4E4]'}`}><div className="font-black text-[11px]">{m.name}</div><div className="text-[10px] opacity-60">{m.desc}</div></button>
                      ))}
                    </div>
                  )}
                </div>
              </>)}

              {cur === 'face' && (
                <div className="flex flex-col items-center gap-4 py-2">
                  <div className="gold-caption self-start">{T('捏你的脸','捏你的臉')}</div>
                  <div className="relative rounded-2xl p-4 flex items-center justify-center" style={{ background: 'radial-gradient(50% 60% at 50% 40%, rgba(120,110,220,0.18), transparent 70%)' }}>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-24 h-4 rounded-full bg-black/40 blur-[4px]" />
                    <div className="relative" style={{ filter: 'drop-shadow(0 0 18px rgba(150,140,255,0.35))' }}><SpritePreview appearance={data.playerAppearance} size={128} /></div>
                  </div>
                  <button onClick={() => setShowFace(true)} className="px-6 py-2.5 rounded-xl text-white text-sm font-black transition-all flex items-center gap-2" style={{ background: 'linear-gradient(135deg,#7B87D0,#505C99)', boxShadow: '0 8px 20px -6px rgba(106,121,192,0.7)' }}><Sparkles className="w-4 h-4" /> {T('开始捏脸','開始捏臉')}</button>
                  <p className="text-[10px] text-[#A6A1CC] text-center">{T('爱豆的样子进世界后可在「关系」面板里逐个捏。','愛豆的樣子進世界後可在「關係」面板裡逐個捏。')}</p>
                </div>
              )}

              {cur === 'identity' && (<>
                <label className="gold-caption">{T('选择你的身份（可多选）','選擇您的身份（可複選）')}</label>
                <div className="flex flex-col gap-2">{currentIds.map(i => (
                  <button key={i} onClick={() => setData({...data, identity: data.identity.includes(i) ? data.identity.filter(x => x !== i) : [...data.identity, i]})} className={`px-3 py-2.5 rounded-xl border text-left transition-all ${data.identity.includes(i) ? 'bg-[rgba(240,197,88,0.1)] border-[rgba(240,197,88,0.5)]' : 'bg-white/[0.10] border-white/20 hover:border-white/25'}`}>
                    <div className={`text-[12.5px] font-black ${data.identity.includes(i) ? 'text-[#F1ECFF]' : 'text-[#E2DFF4]'}`}>{i}</div>
                    {idDesc[i] && <div className="text-[10px] text-[#A6A1CC] mt-1 leading-relaxed">{idDesc[i]}</div>}
                  </button>
                ))}</div>
                <input type="text" value={customIdentity} onChange={e => setCustomIdentity(e.target.value)} placeholder={T('或手动输入自定义身份...','或手動輸入自訂身份...')} className="w-full bg-white/[0.07] border border-white/20 rounded-xl p-3 text-base focus:ring-1 focus:ring-[#F0C558] outline-none text-[#F1ECFF] placeholder:text-[#A6A1CC]" onKeyDown={(e) => { if (e.key === 'Enter') { const val = customIdentity.trim(); if (val && !data.identity.includes(val)) { setData({...data, identity: [...data.identity, val]}); setCustomIdentity(''); } e.preventDefault(); } }} />
                {(() => {
                  const chosen = [...data.identity, ...(customIdentity.trim() ? [customIdentity.trim()] : [])];
                  if (chosen.length === 0) return null;
                  const s = identitySummary(chosen);
                  return (
                    <div className="rounded-2xl bg-white/[0.10] border border-[rgba(240,197,88,0.2)] p-3.5 flex flex-col gap-2.5">
                      <div className="gold-caption flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> {T('这个身份意味着','這個身份意味著')}</div>
                      <div className="flex items-start gap-2 text-[12px] text-[#E2DFF4]">
                        <MapPin className="w-3.5 h-3.5 text-[#F0C558] mt-0.5 flex-shrink-0" />
                        {(() => {
                          const extra = s.unlocked.filter(l => l !== s.startLabel);
                          const tail = extra.length > 0
                            ? T(`；还能进入 ${extra.join('、')}`, `；還能進入 ${extra.join('、')}`)
                            : s.unlocked.length === 0
                              ? T('；只能在公开场合接触她们', '；只能在公開場合接觸她們')
                              : '';
                          return <span>{T('从','從')}<b className="text-[#6A79C0]">{s.startLabel}</b>{T('开始','開始')}{tail}</span>;
                        })()}
                      </div>
                      <div className="flex items-start gap-2 text-[12px] text-[#E2DFF4]">
                        <Heart className="w-3.5 h-3.5 text-[#FF7A93] mt-0.5 flex-shrink-0" />
                        <span>{s.affFloor > 0
                          ? <>{T('你们本来就认识，起始好感 ','你們本來就認識，起始好感 ')}<b className="text-[#FF7A93]">{s.affFloor}</b></>
                          : T('从陌生人开始，好感需要慢慢积累', '從陌生人開始，好感需要慢慢累積')}</span>
                      </div>
                      {s.affFloor > 0 && (
                        <div className="flex items-start gap-2 text-[11px] text-[#A6A1CC] leading-relaxed pt-0.5 border-t border-white/5 mt-0.5">
                          <Users className="w-3.5 h-3.5 text-[#F0C558] mt-0.5 flex-shrink-0" />
                          <span>{T('这段关系会落在你下一步选择的自担身上 —— 选谁，就是「谁的青梅竹马 / 现任女友」。','這段關係會落在你下一步選擇的自擔身上 —— 選誰，就是「誰的青梅竹馬 / 現任女友」。')}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>)}

              {cur === 'idols' && (<>
                <div className="flex gap-2">
                  {[{ k: 'girls', n: T('女团','女團') }, { k: 'boys', n: T('男团','男團') }, { k: 'oc', n: T('自建','自建') }, { k: 'demo', n: 'Demo' }].map(o => (
                    <button key={o.k} onClick={() => setSource(o.k as any)}
                      className={`flex-1 py-2.5 rounded-xl border text-[12px] font-black transition-all ${source === o.k ? (o.k === 'demo' ? 'bg-[rgba(240,197,88,0.16)] border-[rgba(240,197,88,0.7)] text-[#F1ECFF]' : 'bg-[rgba(240,197,88,0.1)] border-[rgba(240,197,88,0.5)] text-[#F1ECFF]') : 'bg-white/[0.10] border-white/20 text-[#C8C4E4]'}`}>
                      {o.k === 'demo' ? `🎬 ${o.n}` : o.n}
                    </button>
                  ))}
                </div>
                {source === 'demo' ? (
                  <div className="flex flex-col gap-3">
                    <div className="rounded-2xl bg-[rgba(240,197,88,0.06)] border border-[rgba(240,197,88,0.3)] p-4 flex flex-col gap-2.5">
                      <div className="text-[13px] font-black text-[#F1ECFF]">{T('一键开始 · 三团九人','一鍵開始 · 三團九人')}</div>
                      <div className="text-[11px] text-[#C8C4E4] leading-relaxed">
                        {T('预置三个性格各异的原创女团，直接进世界 —— 免建号、适合录像 / 试玩：','預置三個性格各異的原創女團，直接進世界 —— 免建號、適合錄像 / 試玩：')}
                      </div>
                      <div className="flex flex-col gap-1.5 text-[11px] text-[#A6A1CC]">
                        <div><b className="text-[#E2DFF4]">STELLA</b> · {T('江予昭 / 温野 / 白露','江予昭 / 溫野 / 白露')}</div>
                        <div><b className="text-[#E2DFF4]">HALO</b> · {T('顾樘 / 叶知秋 / 苏芮','顧樘 / 葉知秋 / 蘇芮')}</div>
                        <div><b className="text-[#E2DFF4]">LUMÉE</b> · {T('罗一诺 / 千惠 / 沈芷','羅一諾 / 千惠 / 沈芷')}</div>
                      </div>
                      <div className="text-[10px] text-[#A6A1CC] leading-relaxed">{T('进世界后可在底部开「自动演示」，让它自己巡演给你录。','進世界後可在底部開「自動演示」，讓它自己巡演給你錄。')}</div>
                    </div>
                    <button onClick={startDemo}
                      className="w-full py-3 rounded-2xl text-[13px] font-black flex items-center justify-center gap-2 text-white transition-all hover:-translate-y-0.5"
                      style={{ background: 'linear-gradient(135deg,#F0C558,#C99A2E)', boxShadow: '0 10px 26px -10px rgba(240,197,88,0.7)' }}>
                      🎬 {T('一键开始 Demo','一鍵開始 Demo')}
                    </button>
                  </div>
                ) : source === 'girls' ? <MemberPicker label={T('请选择','請選擇')} /> : source === 'boys' ? (
                  <div className="rounded-2xl bg-white/[0.10] border border-white/20 p-6 text-center flex flex-col items-center gap-2">
                    <div className="text-3xl">🚧</div>
                    <div className="text-[13px] font-black text-[#F1ECFF]">{T('男团即将开放','男團即將開放')}</div>
                    <div className="text-[11px] text-[#A6A1CC] leading-relaxed">{T('现在先玩女团，或者去「自己创造」捏一个你想要的角色～','現在先玩女團，或者去「自己創造」捏一個你想要的角色～')}</div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <p className="text-[10px] text-[#A6A1CC] leading-relaxed">
                      {T('自己创建角色：起名、写性格、捏脸。他们会和爱豆一样有作息、会走动、能攻略也能被撮合。',
                         '自己創建角色：起名、寫性格、捏臉。他們會和愛豆一樣有作息、會走動、能攻略也能被撮合。')}
                    </p>
                    {data.customMembers.map((o: any) => (
                      <div key={o.id} className="flex items-center gap-3 rounded-xl bg-white/[0.10] border border-white/20 p-2.5">
                        <div className="rounded-lg bg-white/[0.09] p-0.5 flex-shrink-0"><SpritePreview appearance={o.appearance} size={36} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-black text-[#F1ECFF] truncate">{o.name}</div>
                          <div className="text-[10px] text-[#A6A1CC] truncate">{o.realPersonality || T('未填性格','未填性格')}</div>
                        </div>
                        <button onClick={() => setOcDraft({ ...o })} className="px-2 py-1 rounded-lg bg-white/[0.10] text-[#C8C4E4] text-[10px] font-black">{T('编辑','編輯')}</button>
                        <button onClick={() => setData({ ...data, customMembers: data.customMembers.filter((x: any) => x.id !== o.id) })}
                          className="w-7 h-7 rounded-lg text-[#A6A1CC] hover:text-[#FF7A93] flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                    <button
                      onClick={() => setOcDraft({ id: 'oc_' + Math.random().toString(36).slice(2, 8), name: '', realPersonality: '', group: '自建', appearance: getAppearance('oc-' + Math.random()) })}
                      className="w-full py-3 rounded-xl border border-dashed border-white/20 text-[#C8C4E4] text-[12px] font-black hover:border-[rgba(240,197,88,0.5)] transition-all">
                      + {T('新建一个角色','新建一個角色')}
                    </button>
                  </div>
                )}
              </>)}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="setup-foot p-4 sm:p-6 border-t border-white/[0.14] flex gap-3 shrink-0">
          {stepIdx > 0 && <button onClick={() => go(-1)} className="flex-1 py-3.5 bg-white/[0.07] text-[#C8C4E4] rounded-2xl text-sm font-black border border-white/20 hover:bg-white/[0.09] transition-all">← {T('上一步','上一步')}</button>}
          <button onClick={() => isLast ? finish() : go(1)} disabled={!canNext()} style={{ background: canNext() ? 'linear-gradient(135deg, #7B87D0, #505C99)' : 'rgba(255,255,255,0.08)', boxShadow: canNext() ? '0 10px 24px -8px rgba(106,121,192,0.8)' : 'none' }} className="flex-[2] py-3.5 rounded-2xl text-white text-sm font-black hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 disabled:text-white/50 transition-all flex items-center justify-center gap-1.5">
            {isLast ? <><Sparkles className="w-4 h-4" /> {T('开始！','開始！')}</> : <>{T('下一步','下一步')} <ArrowRight className="w-4 h-4" /></>}
          </button>
        </div>
      </motion.div>
    </div>
  );
};


export const MarkdownBlock = ({ content }: { content: string }) => (
  <Markdown components={{
    p: ({children}) => {
      const text = String(children);
      const isOption = /^[A-C][\.、。]/.test(text);
      return <p className={isOption ? 'text-[#6A79C0] font-bold' : ''}>{children}</p>;
    }
  }}>{content}</Markdown>
);

// 闲聊：本地模板生成（不调 AI、不涨好感），用于本时段行动点已用完时
export const CHITCHAT = [
  (n: string) => `${n}朝你点了下头，没停下手里的事。`,
  (n: string) => `${n}：「等下还有事，回头聊。」`,
  (n: string) => `你和${n}打了个招呼，她笑了一下就走开了。`,
  (n: string) => `${n}：「嗯……先这样，我这边还没弄完。」`,
  (n: string) => `${n}摆摆手，看起来今天没什么空。`,
];
export const CHITCHAT_TW = [
  (n: string) => `${n}朝你點了下頭，沒停下手裡的事。`,
  (n: string) => `${n}：「等下還有事，回頭聊。」`,
  (n: string) => `你和${n}打了個招呼，她笑了一下就走開了。`,
  (n: string) => `${n}：「嗯……先這樣，我這邊還沒弄完。」`,
  (n: string) => `${n}擺擺手，看起來今天沒什麼空。`,
];
export function chitchatLine(m: Member, ctx: { activity?: Activity } | undefined, tw: boolean): string {
  const pool = tw ? CHITCHAT_TW : CHITCHAT;
  const pick = pool[Math.floor(Math.random() * pool.length)](m.name);
  const mood = ctx?.activity ? (tw ? `（正${ctx.activity.label}）` : `（正${ctx.activity.label}）`) : '';
  return pick + mood;
}

// 剧情回顾里的正文：旁白 + 台词分行呈现（与 VN 同一套解析）
export const StoryText = ({ content }: { content: string }) => {
  const script = parseScript(content);
  return (
    <div className="flex flex-col gap-3 text-[15.5px] leading-[1.95] text-[#E7E6F6]">
      {script.map((s, i) => s.kind === 'narration'
        ? <p key={i} className="text-[#B0ABD4] italic tracking-[0.01em]">{s.text}</p>
        : <p key={i} className="pl-3.5 border-l-2 border-[rgba(240,197,88,0.45)]">
            <span className="font-black text-[#C6BAF3]">{s.speaker}</span>
            <span className="text-[#F0C558] mx-0.5">「</span><span className="text-[#F1ECFF]">{s.text}</span><span className="text-[#F0C558]">」</span>
          </p>
      )}
    </div>
  );
};

