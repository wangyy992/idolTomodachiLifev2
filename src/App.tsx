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
import { nextTime, idolsAt, getLocation, getActivity, unitKeyOf, getStartLocation, startingAffection, identitySummary, WORLD_LOCATIONS, type WorldLocation, type Activity } from './worldConfig';
import { seedIdolRelations, pairKey, deriveType, hasFlag, PLAYER, type Intent } from './relations';
import { computeMusicShow, isMusicShowDay, weekOf, DAYS_PER_YEAR } from './calendar';
import { availableEnding, buildYearbook } from './endings';
import EndingCard from './EndingCard';

const LOCAL_STORAGE_KEY = 'star_reality_kpop_game_state';

const KKTMessageUI = ({ data, bare }: { data: any; bare?: boolean }) => bare ? (
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
              {msg.translation && <p className="text-[11px] text-[#454F87] mt-0.5 leading-relaxed">{msg.translation}</p>}
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
                  {msg.translation && <p className="text-[11px] text-[#454F87] mt-0.5 leading-relaxed">{msg.translation}</p>}
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
    <div className="text-center mt-2"><span className="text-[10px] text-[#454F87] font-bold uppercase tracking-widest">KakaoTalk</span></div>
  </div>
);

const WeversePostUI = ({ data }: { data: any }) => (
  <div className="my-6 max-w-sm mx-auto font-sans bg-white rounded-3xl overflow-hidden shadow-sm border border-[#DAD8EE]">
    <div className="px-4 py-3 flex items-center justify-between border-b border-[#DAD8EE]">
      <div className="flex items-center gap-3">
        <span className="text-[#454F87] text-lg">{'<'}</span>
        <div><div className="text-[14px] font-bold text-[#2A2A3D]">帖子</div><div className="text-[10px] text-[#5B6BB0]">前往社区 {'>'}</div></div>
      </div>
      <div className="flex gap-4 text-[#454F87] text-lg"><span>↗</span><span>✕</span></div>
    </div>
    <div className="px-4 pt-4 pb-2 flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-[#E7E6F6] flex items-center justify-center flex-shrink-0">
        <span className="text-[#454F87] font-black text-sm">{data.artist?.[0] || '★'}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-1">
          <span className="text-[14px] font-bold text-[#2A2A3D]">{data.artist}</span>
          <span className="text-[#5B6BB0] text-[14px]">✓</span>
        </div>
        <div className="text-[11px] text-[#454F87]">{data.time}</div>
        <div className="text-[11px] text-[#5B6BB0] mt-0.5">查看原文 (한국어)</div>
      </div>
      <span className="text-[#454F87] text-lg">⋯</span>
    </div>
    <div className="px-4 pb-3"><p className="text-[14px] text-[#2A2A3D] leading-relaxed">{data.content}</p></div>
    {data.imageDesc && (
      <div className="w-full bg-[#E7E6F6] aspect-[4/3] flex flex-col items-center justify-center gap-2 p-4">
        <span className="text-[#454F87] text-xl">🖼</span>
        <p className="text-[11px] text-[#454F87] text-center italic">{data.imageDesc}</p>
      </div>
    )}
    <div className="px-4 py-3 flex items-center gap-6 border-t border-[#DAD8EE]">
      <button className="flex items-center gap-1.5 text-[#454F87]"><Heart className="w-5 h-5" /><span className="text-[12px]">{(data.likes || 0).toLocaleString()}</span></button>
      <button className="text-[#454F87] text-xl">🔖</button>
    </div>
  </div>
);

const BubbleMessageUI = ({ data }: { data: any }) => (
  <div className="my-6 max-w-sm mx-auto font-sans bg-[#F0EBE3] rounded-3xl overflow-hidden shadow-sm">
    <div className="px-4 py-3 flex items-center justify-between bg-[#F0EBE3] border-b border-[#DAD8EE]">
      <span className="text-[#5B6BB0] text-[14px]">{'<'}</span>
      <span className="text-[16px] font-bold text-[#2A2A3D]">{data.artist}</span>
      <div className="flex gap-4"><span className="text-[#454F87]">🔍</span><span className="text-[#454F87]">⋯</span></div>
    </div>
    <div className="px-4 py-4 flex flex-col gap-2">
      {data.messages?.map((msg: any, idx: number) => (
        <div key={idx} className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[#2A2A3D] flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-[16px]">🐱</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-bold text-white bg-[#5B6BB0] px-1.5 py-0.5 rounded">ARTIST</span>
              <span className="text-[12px] font-bold text-[#2A2A3D]">{data.artist}</span>
            </div>
            <div className="bg-white rounded-2xl rounded-tl-none px-3 py-2 inline-block max-w-[85%] border border-[#DAD8EE]">
              <p className="text-[13px] text-[#2A2A3D] leading-relaxed">{msg.text}</p>
              {msg.translation && <p className="text-[12px] text-[#5B6BB0] mt-0.5 leading-relaxed">{msg.translation}</p>}
            </div>
            <div className="text-[10px] text-[#454F87] mt-1 pl-1">{msg.time}</div>
          </div>
        </div>
      ))}
    </div>
    <div className="px-4 py-3 bg-[#F0EBE3] border-t border-[#DAD8EE] flex items-center justify-end gap-4">
      <span className="text-[#454F87] text-xl">☺</span><span className="text-[#5B6BB0] text-xl">➤</span>
    </div>
  </div>
);

const TheqooPostUI = ({ post }: { post: TheqooPost }) => (
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
              <div className="w-8 h-8 rounded-xl bg-[#E7E6F6] flex-shrink-0 flex items-center justify-center text-[#454F87] font-black text-xs">{idx + 1}</div>
              <div className="flex-1">
                <span className="text-[10px] font-black text-[#454F87]">@{comment.authorId}</span>
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

const CharacterCardUI = ({ card }: any) => {
  if (!card || typeof card !== 'object') return null;
  return (
    <div className="bg-white border border-[#DAD8EE] rounded-3xl overflow-hidden shadow-sm my-6 max-w-md mx-auto font-sans">
      <div className="bg-[#5B6BB0] p-5 text-white text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-20"><Sparkles className="w-12 h-12" /></div>
        <div className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Artist Profile</div>
        <h3 className="text-xl font-bold">{card.name} {card.stageName ? `(${card.stageName})` : ''}</h3>
      </div>
      <div className="p-5 flex flex-col gap-4 text-left">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-[#F3F2FA] p-3 rounded-2xl border border-[#DAD8EE]"><div className="text-[#454F87] font-black mb-1 uppercase text-[9px]">Group</div><div className="font-bold text-[#2A2A3D]">{card.group || '未知团体'}</div></div>
          <div className="bg-[#F3F2FA] p-3 rounded-2xl border border-[#DAD8EE]"><div className="text-[#454F87] font-black mb-1 uppercase text-[9px]">Status</div><div className="font-bold text-[#2A2A3D]">{card.status || '活跃中'}</div></div>
        </div>
        {card.publicPersona && <div className="bg-[#F3F2FA] p-4 rounded-2xl border border-[#DAD8EE] text-xs"><span className="font-black text-[#5B6BB0] block uppercase text-[9px] mb-1">Public Persona</span><p className="text-[#2A2A3D] italic">"{card.publicPersona}"</p></div>}
        {card.realPersonality && <div className="bg-[#F3F2FA] p-4 rounded-2xl border border-[#DAD8EE] text-xs"><span className="font-black text-[#454F87] block uppercase text-[9px] mb-1">Real Personality</span><p className="text-[#2A2A3D]">{card.realPersonality}</p></div>}
        {Array.isArray(card.weaknesses) && card.weaknesses.length > 0 && (
          <div className="flex flex-wrap gap-2">{card.weaknesses.map((item: string, i: number) => <span key={i} className="text-[10px] px-3 py-1 bg-[#E7E6F6] text-[#454F87] rounded-full border border-[#DAD8EE] font-bold"># {item}</span>)}</div>
        )}
        {card.hiddenStory && <div className="pt-2 border-t border-dashed border-[#DAD8EE]"><span className="font-black text-[#454F87] block uppercase text-[9px] mb-1">Hidden Story</span><p className="text-[11px] text-[#454F87] italic">{card.hiddenStory}</p></div>}
      </div>
    </div>
  );
};

const MusicShowUI = ({ result }: { result: any }) => (
  <div className="bg-white border border-[#DAD8EE] rounded-[2rem] overflow-hidden shadow-sm my-6 max-w-lg mx-auto font-sans">
    <div className="bg-[#5B6BB0] p-5 text-white text-center relative">
      <div className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Music Bank / Inkigayo</div>
      <h3 className="text-xl font-black tracking-widest">WEEKLY CHAMPION</h3>
      <div className="absolute top-2 right-4 opacity-30"><Sparkles className="w-8 h-8" /></div>
    </div>
    <div className="p-5 flex flex-col gap-4">
      <div className="flex flex-col items-center py-4 bg-[#F3F2FA] rounded-3xl border border-[#DAD8EE]">
        <div className="text-[10px] font-black text-[#454F87] uppercase mb-1">本次优胜 / Winner</div>
        <div className="text-2xl font-black text-[#2A2A3D]">{result.winner}</div>
        <div className="mt-2 flex gap-1">{[1,2,3].map(i => <Sparkles key={i} className="w-4 h-4 text-[#5B6BB0] animate-pulse" />)}</div>
      </div>
      <div className="flex flex-col gap-3">
        {result.scores?.map((score: any, idx: number) => (
          <div key={idx} className={`p-4 rounded-2xl border ${score.group === result.winner ? 'bg-[#E7E6F6] border-[#5B6BB0]' : 'bg-white border-[#DAD8EE]'}`}>
            <div className="flex justify-between items-center mb-2"><span className="font-bold text-sm text-[#2A2A3D]">{score.group}</span><span className="font-black text-[#5B6BB0] text-sm">{score.total} pt</span></div>
            <div className="grid grid-cols-5 gap-1">
              {['digital','physical','sns','preVote','broadcast'].map((key, i) => (
                <div key={i} className="text-center"><div className="text-[8px] text-[#454F87] font-bold uppercase truncate">{['音源','销量','SNS','投票','放送'][i]}</div><div className="text-[10px] font-bold text-[#2A2A3D]">{score[key]}</div></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const OptionsUI = ({ options, isLatest, lang }: { options: any[], isLatest: boolean, lang?: string }) => {
  if (!isLatest || !options?.length) return null;
  const l = lang || 'simplified';
  return (
    <div className="mt-4 rounded-2xl bg-white/[0.03] border border-white/10 p-4">
      <div className="gold-caption mb-3 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[#FF7A93]" />{l === "traditional" ? "當時的選擇" : "当时的选择"}</div>
      <div className="flex flex-col gap-2">
        {options.map((opt: any, i) => {
          const text = (typeof opt === 'string' ? opt : opt.text).replace(/^[A-Da-d][\.、。\)]\s*/, '');
          return (
            <div key={i} className="flex items-start gap-2.5 bg-white/[0.03] rounded-xl px-3 py-2.5 border border-white/[0.06]">
              <span className="mt-0.5 w-5 h-5 rounded-lg bg-[#E7E6F6] text-[#5B6BB0] text-[10px] font-black flex items-center justify-center flex-shrink-0">{'ABCD'[i] || '·'}</span>
              <span className="text-[13px] text-[#D8D4EE] font-semibold leading-relaxed">{text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MobileDrawer = ({ gameState, onClose, onSave, onLoad, onDelete, saveSlots, wallpaper, onWallpaperUpload, onClearWallpaper }: { gameState: GameState, onClose: () => void, onSave: () => void, onLoad: (id: string) => void, onDelete: (id: string) => void, saveSlots: any[], wallpaper: string, onWallpaperUpload: (e: React.ChangeEvent<HTMLInputElement>) => void, onClearWallpaper: () => void }) => {
  const isCPMode = gameState.gameMode === 'CPCP';
  const isMomMode = gameState.gameMode === 'mom';
  const targetMembers = gameState.members.filter(m => gameState.targets.includes(m.id));
  const cpAffection = targetMembers[0]?.affection || 0;
  const daughterProfile = (gameState as any).daughterProfile;
  const roundCount = gameState.history.filter(h => h.role === MessageRole.ASSISTANT).length;
  const lang = (gameState as any).language || 'simplified';

  return (
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-x-0 bottom-0 z-50 rounded-t-[2rem] shadow-2xl border-t border-[rgba(201,162,39,0.25)] max-h-[70vh] overflow-y-auto ink-scroll" style={{ background: 'linear-gradient(180deg, #1C1830, #0E0C1C)' }}>
      <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 bg-white/15 rounded-full"></div></div>
      <div className="flex items-center justify-between px-6 pb-4 border-b border-white/[0.06]">
        <h3 className="gold-caption text-sm">
          {isMomMode ? '母女信任度' : isCPMode ? (lang === 'traditional' ? 'CP 羈絆值' : 'CP 羁绊值') : (lang === 'traditional' ? '角色狀態' : '角色状态')}
        </h3>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all"><X className="w-4 h-4 text-[#B7B2D9]" /></button>
      </div>
      <div className="p-5 flex flex-col gap-5">
        {isCPMode ? (
          <div className="bg-white/[0.03] p-4 rounded-2xl border border-[rgba(201,162,39,0.3)]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-[#F1ECFF]">{targetMembers.map(m => m.name).join(' ♡ ')}</span>
              <span className="text-[11px] text-[#C9A227] font-black">{cpAffection}/100</span>
            </div>
            <div className="h-[3px] bg-white/[0.08] rounded-full overflow-hidden">
              <motion.div animate={{ width: `${cpAffection}%` }} className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#6C79C4,#C9A227)' }} />
            </div>
          </div>
        ) : isMomMode ? (
          <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/10">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-[#F1ECFF]">{daughterProfile?.name || '女儿'}</span>
              <span className="text-[11px] text-[#C9A227] font-mono font-bold">{(gameState as any).momTrustLevel || 50}/100</span>
            </div>
            <div className="h-[3px] bg-white/[0.08] rounded-full overflow-hidden">
              <motion.div animate={{ width: `${(gameState as any).momTrustLevel || 50}%` }} className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#6C79C4,#C9A227)' }} />
            </div>
            {daughterProfile && <div className="text-[10px] text-[#8B86B8] mt-2">{daughterProfile.nationality} · {daughterProfile.personality}</div>}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {targetMembers.map(member => (
              <div key={member.id} className="bg-white/[0.03] p-4 rounded-2xl border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-[#F1ECFF]">{member.name}</span>
                  <span className="text-[11px] text-[#C9A227] font-mono font-bold">{member.affection}/100</span>
                </div>
                <div className="h-[3px] bg-white/[0.08] rounded-full overflow-hidden mb-1">
                  <motion.div animate={{ width: `${member.affection}%` }} className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#6C79C4,#C9A227)' }} />
                </div>
                <div className="text-[10px] text-[#8B86B8]">{member.status}</div>
              </div>
            ))}
          </div>
        )}
        <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/10 flex flex-col gap-2">
          <div className="flex justify-between text-xs"><span className="text-[#8B86B8]">{lang === "traditional" ? "場景" : "场景"}</span><span className="font-bold text-[#F1ECFF]">{gameState.currentScene}</span></div>
          <div className="flex justify-between text-xs"><span className="text-[#8B86B8]">Round</span><span className="font-bold text-[#C9A227]">{roundCount}</span></div>
          {gameState.isComebackSetting && <div className="text-[10px] font-black text-[#C9A227] bg-white/[0.06] px-2 py-1 rounded-lg">{lang === "traditional" ? "回歸期進行中" : "回归期进行中"}</div>}
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-2.5">
            <button onClick={() => { onSave(); onClose(); }} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-white rounded-2xl text-[11px] font-black active:scale-95 transition-all" style={{ background: 'linear-gradient(135deg,#6C79C4,#454F87)', boxShadow: '0 6px 16px -6px rgba(91,107,176,0.7)' }}><Save className="w-3.5 h-3.5" />{lang === "traditional" ? "存檔" : "存档"}</button>
            <label className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-white/[0.04] border border-white/10 text-[#B7B2D9] rounded-2xl text-[11px] font-black text-center cursor-pointer hover:bg-white/[0.09] active:scale-95 transition-all">
              <Sparkles className="w-3.5 h-3.5" />{lang === "traditional" ? "換壁紙" : "换壁纸"}
              <input type="file" accept="image/*" className="hidden" onChange={onWallpaperUpload} />
            </label>
          </div>
          {wallpaper && <button onClick={onClearWallpaper} className="w-full py-2.5 text-[#8b90b8] rounded-2xl text-[10px] font-black hover:text-[#FF7A93] transition-all">{lang === "traditional" ? "移除壁紙" : "移除壁纸"}</button>}
          {saveSlots.length > 0 && (
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-2.5 flex flex-col gap-2 mt-1">
              <div className="gold-caption px-1 flex items-center gap-1.5"><FolderOpen className="w-3 h-3" />{lang === "traditional" ? "讀檔" : "读档"}</div>
              {saveSlots.map((slot: any, si: number) => (
                <div key={slot.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-2.5 flex items-center gap-2.5 active:scale-[0.98] transition-all">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6C79C4] to-[#454F87] text-white flex items-center justify-center text-[11px] font-black flex-shrink-0">{saveSlots.length - si}</div>
                  <button onClick={() => { onLoad(slot.id); onClose(); }} className="flex-1 min-w-0 text-left">
                    <div className="text-[11px] font-black text-[#F1ECFF] truncate">{(slot as any).subject || slot.scene}</div>
                    <div className="text-[9px] text-[#8B86B8] truncate mt-0.5">{slot.scene} · R{slot.round} · {slot.time}</div>
                  </button>
                  <button onClick={() => onDelete(slot.id)} className="w-7 h-7 rounded-lg text-[#8b90b8] hover:bg-[#FF7A93]/10 hover:text-[#FF7A93] flex items-center justify-center flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
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
const PHONE_APPS: { key: 'kkt' | 'weverse' | 'bubble' | 'theqoo'; label: string; icon: string; color: string; mono?: boolean }[] = [
  { key: 'kkt', label: 'KakaoTalk', icon: '💬', color: '#FAE100' },
  { key: 'weverse', label: 'Weverse', icon: '🌐', color: '#141420', mono: true },
  { key: 'bubble', label: 'bubble', icon: '🫧', color: '#8ec7f0' },
  { key: 'theqoo', label: 'theqoo', icon: '🔥', color: '#3b5998' },
];

const PhoneModal = ({ feed, onClose, lang, members, onSendDM, dmLeft }: {
  feed: NonNullable<GameState['phoneFeed']>; onClose: () => void; lang?: string;
  members: Member[]; onSendDM: (memberId: string, text: string) => void; dmLeft: number;
}) => {
  const tw = lang === 'traditional';
  const [tab, setTab] = useState<'kkt' | 'weverse' | 'bubble' | 'theqoo'>(
    () => [...feed].reverse().find(f => !f.read)?.type || 'kkt'
  );
  const items = feed.filter(f => f.type === tab).slice().reverse();
  const [dmTo, setDmTo] = useState<string>(() => members[0]?.id || '');
  const [dmText, setDmText] = useState('');
  const canDM = tab === 'kkt' || tab === 'bubble';
  const sendDM = () => {
    const t = dmText.trim();
    if (!t || dmLeft <= 0 || !dmTo) return;
    setDmText('');
    onSendDM(dmTo, t);
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
            <span className="text-[10px] font-bold text-[#8B86B8]">9:41</span>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-[#B7B2D9]"><X className="w-4 h-4" /></button>
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
                    ? { background: 'rgba(201,162,39,0.12)', borderColor: 'rgba(201,162,39,0.45)' }
                    : { background: 'rgba(255,255,255,0.04)', borderColor: 'transparent' }}>
                  <span className="w-[34px] h-[34px] rounded-[0.7rem] flex items-center justify-center text-lg shadow-sm" style={{ background: app.color, border: app.mono ? '1px solid rgba(255,255,255,0.25)' : 'none' }}>{app.icon}</span>
                  <span className={`text-[9px] font-black ${active ? 'text-[#F1ECFF]' : 'text-[#8B86B8]'}`}>{app.label}</span>
                  {unread > 0 && <span className="absolute top-1 right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#FF3B30] text-white text-[9px] font-black flex items-center justify-center">{unread}</span>}
                </button>
              );
            })}
          </div>
          {/* 内容流 */}
          <div className="flex-1 overflow-y-auto ink-scroll px-2 pb-4 pt-2 min-h-0 bg-[#F1EFF7]">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-[#454F87]/60">
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
                    className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black transition-all ${dmTo === m.id ? 'bg-[#5B6BB0] text-white' : 'bg-[#E7E6F6] text-[#454F87]'}`}>
                    {m.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  value={dmText} onChange={e => setDmText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendDM(); }}
                  placeholder={dmLeft > 0 ? (tw ? `發條消息…（今天還能發 ${dmLeft} 條）` : `发条消息…（今天还能发 ${dmLeft} 条）`) : (tw ? '今天發太多了，明天再說' : '今天发太多了，明天再说')}
                  disabled={dmLeft <= 0}
                  className="flex-1 min-w-0 bg-[#F1EFF7] border border-[#DAD8EE] rounded-full px-3 py-2 text-[12px] outline-none text-[#2A2A3D] disabled:opacity-50"
                />
                <button onClick={sendDM} disabled={dmLeft <= 0 || !dmText.trim()}
                  className="px-3 rounded-full bg-[#5B6BB0] text-white disabled:opacity-40 flex items-center justify-center">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const CharacterCreationWizard = ({ onComplete, members }: { onComplete: (data: any) => void, members: Member[] }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showFace, setShowFace] = useState(false);
  const [data, setData] = useState({
    playerName: '', playerAge: 19, identity: [] as string[],
    gameMode: 'romance' as string, targets: [] as string[], selectedCPs: [] as string[],
    daughterNationality: '', daughterPersonality: '', daughterBackground: '', daughterName: '',
    playerApiKey: '', playerModel: 'deepseek-v4-flash', language: 'simplified',
    playerAppearance: getPlayerAppearance('you') as Appearance,
    customMembers: [] as any[],
  });
  // 自建角色（像 Tomodachi Life 那样把自己想要的人放进来）
  const [ocDraft, setOcDraft] = useState<any | null>(null);
  const [ocFace, setOcFace] = useState(false);
  const [source, setSource] = useState<'idol' | 'oc'>('idol');
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

  const modes = [
    { id: 'romance', name: '自由世界', desc: '在地图上认识爱豆，恋爱和拉郎都在里面' },
    { id: 'mom', name: '宝妈模式', desc: '养一个出道女儿（旧版剧情）' }
  ];
  const nationalities = ['韩国', '中国', '日本', '其他'];
  const personalities = [
    { id: '完美主义型', desc: '对自己要求极高，进步快但容易崩' },
    { id: '野心勃勃型', desc: '目标明确，为出道可以牺牲一切' },
    { id: '敏感共情型', desc: '感知力极强，很容易被周围情绪影响' },
    { id: '隐忍内敛型', desc: '什么都藏着，积累到一定程度会爆发' },
    { id: '乐天抗压型', desc: '天生抗打击，但有时候不够专注' },
    { id: '讨好型', desc: '把所有人放在自己前面，内心积压很多' },
  ];
  const backgrounds = ['贫困', '小资', '富裕'];

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
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${selectedGroup === g ? 'text-white border-transparent' : 'bg-white/[0.03] border-white/10 text-[#B7B2D9]'}`}
            style={selectedGroup === g ? { background: 'linear-gradient(135deg,#6C79C4,#454F87)' } : undefined}>
            {g}
          </button>
        ))}
      </div>
      {selectedGroup && (
        <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1 ink-scroll">
          {(groupedMembers[selectedGroup] || []).map(m => {
            const selected = data.targets.includes(m.id);
            const disabled = !selected && !!max && data.targets.length >= max;
            return (
              <button key={m.id} onClick={() => !disabled && toggleTarget(m.id, max)}
                className={`p-3 rounded-2xl border text-[11px] transition-all flex flex-col items-center gap-1 ${selected ? 'bg-[rgba(201,162,39,0.1)] border-[rgba(201,162,39,0.5)] text-[#F1ECFF] font-bold' : disabled ? 'bg-white/[0.02] border-white/[0.06] text-white/25 cursor-not-allowed' : 'bg-white/[0.03] border-white/10 text-[#B7B2D9]'}`}>
                <div className="font-black text-xs">{m.name}</div>
                <div className="text-[9px] opacity-60">{m.stageName}</div>
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
              <span key={id} className="text-[10px] bg-[rgba(201,162,39,0.1)] text-[#F1ECFF] px-2 py-1 rounded-full border border-[rgba(201,162,39,0.4)] font-bold flex items-center gap-1">
                {m.name}<button onClick={() => toggleTarget(id)} className="text-[#C9A227] hover:text-[#F1ECFF]">×</button>
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
  const inputCls = "w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3.5 text-base focus:border-[#C9A227] focus:ring-4 focus:ring-[#C9A227]/10 outline-none text-[#F1ECFF] placeholder:text-[#8B86B8] transition-all";
  const Label = ({ icon: Icon, children }: { icon: any; children: React.ReactNode }) => (
    <label className="flex items-center gap-2 text-[13px] font-bold text-[#B7B2D9] mb-2.5"><Icon className="w-4 h-4 text-[#C9A227]" /> {children}</label>
  );
  const canNext = () => {
    if (cur === 'basics') return !!data.playerName.trim();
    if (cur === 'identity') return data.identity.length > 0 || !!customIdentity.trim();
    if (cur === 'idols') return data.targets.length >= 1 || data.customMembers.length >= 1;
    if (cur === 'daughter') return !!(data.daughterNationality && data.daughterPersonality && data.daughterBackground);
    return true;
  };
  const finish = () => {
    const val = customIdentity.trim();
    const identity = val && !data.identity.includes(val) ? [...data.identity, val] : data.identity;
    onComplete({ ...data, identity });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 sm:p-8 relative overflow-hidden" style={{ background: 'radial-gradient(120% 90% at 50% 0%, #0B0A14 0%, #05040a 70%)' }}>
      <div className="absolute -top-24 -left-20 w-80 h-80 rounded-full blur-3xl opacity-25 pointer-events-none" style={{ background: 'radial-gradient(circle, #6C79C4, transparent 70%)' }} />
      <div className="absolute -bottom-28 -right-16 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #C9A227, transparent 70%)' }} />
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
              <button onClick={() => setOcDraft(null)} className="w-7 h-7 rounded-lg bg-white/[0.06] text-[#B7B2D9] flex items-center justify-center"><X className="w-4 h-4" /></button>
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
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[#B7B2D9] text-[12px] font-black">🔀 {T('随机外观','隨機外觀')}</button>
                <button onClick={() => setOcFace(true)}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[#B7B2D9] text-[12px] font-black">🎨 {T('捏脸','捏臉')}</button>
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
                style={{ background: 'linear-gradient(135deg,#6C79C4,#454F87)' }}>
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
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative rounded-[26px] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.7)] w-full max-w-xl overflow-hidden flex flex-col border border-[rgba(201,162,39,0.25)]" style={{ background: 'linear-gradient(165deg, #1C1830, #0E0C1C)' }}>
        <div className="relative px-6 py-6 text-white overflow-hidden border-b border-white/[0.06]" style={{ background: 'linear-gradient(135deg, #6C79C4 0%, #5B6BB0 55%, #7C6BAE 100%)' }}>
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
            {flow.map((_, i) => <div key={i} className="h-[3px] rounded-full transition-all duration-300" style={{ width: i === stepIdx ? 28 : 22, background: i <= stepIdx ? '#C9A227' : 'rgba(255,255,255,0.12)' }} />)}
          </div>
        </div>
        <div className="px-6 py-8 sm:px-9 sm:py-9 flex-1 overflow-y-auto max-h-[70vh] ink-scroll">
          <AnimatePresence mode="wait">
            <motion.div key={cur} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="flex flex-col gap-7">
              {cur === 'basics' && (<>
                <div>
                  <Label icon={Globe}>语言 / 語言</Label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[{id:'simplified',name:'简体中文'},{id:'traditional',name:'繁體中文'}].map(l => {
                      const on = data.language === l.id;
                      return (
                        <button key={l.id} onClick={() => setData({...data, language: l.id})} className={`relative py-3.5 rounded-2xl border text-[13px] font-bold transition-all ${on ? 'bg-[rgba(201,162,39,0.1)] border-[rgba(201,162,39,0.5)] text-[#F1ECFF]' : 'bg-white/[0.03] border-white/10 text-[#B7B2D9] hover:border-white/25'}`}>
                          {on && <Check className="absolute right-2 top-2 w-3.5 h-3.5" />}{l.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div><Label icon={User}>{T('你的名字','您的名字')}</Label><input type="text" value={data.playerName} onChange={e => setData({...data, playerName: e.target.value})} className={inputCls} placeholder={T('请输入角色昵称...','請輸入角色暱稱...')} /></div>
                <div><Label icon={Cake}>{T('年龄','年齡')}</Label><input type="number" value={data.playerAge} onChange={e => setData({...data, playerAge: parseInt(e.target.value)})} className={inputCls} /></div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 sm:p-5">
                  <Label icon={KeyRound}>DeepSeek API Key（{T('可选','可選')}）</Label>
                  <input type="password" value={data.playerApiKey} onChange={e => setData({...data, playerApiKey: e.target.value})} className={inputCls} placeholder={T('填入自己的key可免费无限玩～','填入自己的key可免費無限玩～')} />
                  <p className="text-[10px] text-[#8B86B8] mt-2.5 pl-0.5 leading-relaxed">{T('不填则使用公共额度。key仅存于本地，不会上传。','不填則使用公共額度。key僅存於本地，不會上傳。')}</p>
                  {data.playerApiKey && (
                    <div className="grid grid-cols-2 gap-2 mt-2.5">
                      {[{id:'deepseek-v4-flash',name:'Flash',desc:T('快速省钱','快速省錢')},{id:'deepseek-v3',name:'V3',desc:T('质量更好','品質更好')}].map(m => (
                        <button key={m.id} onClick={() => setData({...data, playerModel: m.id})} className={`p-2.5 rounded-xl border-2 text-left transition-all ${data.playerModel === m.id ? 'bg-[rgba(201,162,39,0.1)] border-[rgba(201,162,39,0.5)] text-[#F1ECFF]' : 'bg-white/[0.03] border-white/10 text-[#B7B2D9]'}`}><div className="font-black text-[11px]">{m.name}</div><div className="text-[10px] opacity-60">{m.desc}</div></button>
                      ))}
                    </div>
                  )}
                </div>
              </>)}

              {cur === 'mode' && (<>
                <label className="text-xs font-black text-[#454F87] uppercase">{T('选择模式','選擇模式')}</label>
                <div className="flex flex-col gap-3">{modes.map(m => (
                  <button key={m.id} onClick={() => { setData({...data, gameMode: m.id, targets: [], daughterNationality: '', daughterPersonality: '', daughterBackground: '', daughterName: ''}); setSelectedGroup(null); }} className={`w-full p-4 rounded-2xl border text-left transition-all ${data.gameMode === m.id ? 'bg-[#E7E6F6] border-[#5B6BB0] text-[#454F87]' : 'bg-white border-[#DAD8EE] text-[#2A2A3D]'}`}>
                    <div className="font-black text-sm">{m.name}</div><div className="text-[10px] opacity-60 mt-1">{m.desc}</div>
                  </button>
                ))}</div>
              </>)}

              {cur === 'face' && (
                <div className="flex flex-col items-center gap-4 py-2">
                  <div className="gold-caption self-start">{T('捏你的脸','捏你的臉')}</div>
                  <div className="relative rounded-2xl p-4 flex items-center justify-center" style={{ background: 'radial-gradient(50% 60% at 50% 40%, rgba(120,110,220,0.18), transparent 70%)' }}>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-24 h-4 rounded-full bg-black/40 blur-[4px]" />
                    <div className="relative" style={{ filter: 'drop-shadow(0 0 18px rgba(150,140,255,0.35))' }}><SpritePreview appearance={data.playerAppearance} size={128} /></div>
                  </div>
                  <button onClick={() => setShowFace(true)} className="px-6 py-2.5 rounded-xl text-white text-sm font-black transition-all flex items-center gap-2" style={{ background: 'linear-gradient(135deg,#6C79C4,#454F87)', boxShadow: '0 8px 20px -6px rgba(91,107,176,0.7)' }}><Sparkles className="w-4 h-4" /> {T('开始捏脸','開始捏臉')}</button>
                  <p className="text-[10px] text-[#8B86B8] text-center">{T('爱豆的样子进世界后可在「关系」面板里逐个捏。','愛豆的樣子進世界後可在「關係」面板裡逐個捏。')}</p>
                </div>
              )}

              {cur === 'identity' && (<>
                <label className="gold-caption">{T('选择你的身份（可多选）','選擇您的身份（可複選）')}</label>
                <div className="flex flex-col gap-2">{currentIds.map(i => (
                  <button key={i} onClick={() => setData({...data, identity: data.identity.includes(i) ? data.identity.filter(x => x !== i) : [...data.identity, i]})} className={`p-3 rounded-xl border text-left transition-all ${data.identity.includes(i) ? 'bg-[rgba(201,162,39,0.1)] border-[rgba(201,162,39,0.5)]' : 'bg-white/[0.03] border-white/10 hover:border-white/25'}`}>
                    <div className={`text-[12.5px] font-black ${data.identity.includes(i) ? 'text-[#F1ECFF]' : 'text-[#D8D4EE]'}`}>{i}</div>
                    {idDesc[i] && <div className="text-[10px] text-[#8B86B8] mt-1 leading-relaxed">{idDesc[i]}</div>}
                  </button>
                ))}</div>
                <input type="text" value={customIdentity} onChange={e => setCustomIdentity(e.target.value)} placeholder={T('或手动输入自定义身份...','或手動輸入自訂身份...')} className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3 text-base focus:ring-1 focus:ring-[#C9A227] outline-none text-[#F1ECFF] placeholder:text-[#8B86B8]" onKeyDown={(e) => { if (e.key === 'Enter') { const val = customIdentity.trim(); if (val && !data.identity.includes(val)) { setData({...data, identity: [...data.identity, val]}); setCustomIdentity(''); } e.preventDefault(); } }} />
                {(() => {
                  const chosen = [...data.identity, ...(customIdentity.trim() ? [customIdentity.trim()] : [])];
                  if (chosen.length === 0) return null;
                  const s = identitySummary(chosen);
                  return (
                    <div className="rounded-2xl bg-white/[0.03] border border-[rgba(201,162,39,0.2)] p-3.5 flex flex-col gap-2.5">
                      <div className="gold-caption flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> {T('这个身份意味着','這個身份意味著')}</div>
                      <div className="flex items-start gap-2 text-[12px] text-[#D8D4EE]">
                        <MapPin className="w-3.5 h-3.5 text-[#C9A227] mt-0.5 flex-shrink-0" />
                        {(() => {
                          const extra = s.unlocked.filter(l => l !== s.startLabel);
                          const tail = extra.length > 0
                            ? T(`；还能进入 ${extra.join('、')}`, `；還能進入 ${extra.join('、')}`)
                            : s.unlocked.length === 0
                              ? T('；只能在公开场合接触她们', '；只能在公開場合接觸她們')
                              : '';
                          return <span>{T('从','從')}<b className="text-[#5B6BB0]">{s.startLabel}</b>{T('开始','開始')}{tail}</span>;
                        })()}
                      </div>
                      <div className="flex items-start gap-2 text-[12px] text-[#D8D4EE]">
                        <Heart className="w-3.5 h-3.5 text-[#FF7A93] mt-0.5 flex-shrink-0" />
                        <span>{s.affFloor > 0
                          ? <>{T('你们本来就认识，起始好感 ','你們本來就認識，起始好感 ')}<b className="text-[#FF7A93]">{s.affFloor}</b></>
                          : T('从陌生人开始，好感需要慢慢积累', '從陌生人開始，好感需要慢慢累積')}</span>
                      </div>
                    </div>
                  );
                })()}
              </>)}

              {cur === 'idols' && (<>
                <div className="flex gap-2">
                  {[{ k: 'idol', n: T('从爱豆里选','從愛豆裡選') }, { k: 'oc', n: T('我自己创建','我自己創建') }].map(o => (
                    <button key={o.k} onClick={() => setSource(o.k as any)}
                      className={`flex-1 py-2.5 rounded-xl border text-[12px] font-black transition-all ${source === o.k ? 'bg-[rgba(201,162,39,0.1)] border-[rgba(201,162,39,0.5)] text-[#F1ECFF]' : 'bg-white/[0.03] border-white/10 text-[#B7B2D9]'}`}>
                      {o.n}
                    </button>
                  ))}
                </div>
                {source === 'idol' ? <MemberPicker label={T('选择你的自担','選擇您的自擔')} /> : (
                  <div className="flex flex-col gap-3">
                    <p className="text-[10px] text-[#8B86B8] leading-relaxed">
                      {T('自己创建角色：起名、写性格、捏脸。他们会和爱豆一样有作息、会走动、能攻略也能被撮合。',
                         '自己創建角色：起名、寫性格、捏臉。他們會和愛豆一樣有作息、會走動、能攻略也能被撮合。')}
                    </p>
                    {data.customMembers.map((o: any) => (
                      <div key={o.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/10 p-2.5">
                        <div className="rounded-lg bg-white/[0.05] p-0.5 flex-shrink-0"><SpritePreview appearance={o.appearance} size={36} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-black text-[#F1ECFF] truncate">{o.name}</div>
                          <div className="text-[10px] text-[#8B86B8] truncate">{o.realPersonality || T('未填性格','未填性格')}</div>
                        </div>
                        <button onClick={() => setOcDraft({ ...o })} className="px-2 py-1 rounded-lg bg-white/[0.06] text-[#B7B2D9] text-[10px] font-black">{T('编辑','編輯')}</button>
                        <button onClick={() => setData({ ...data, customMembers: data.customMembers.filter((x: any) => x.id !== o.id) })}
                          className="w-7 h-7 rounded-lg text-[#8b90b8] hover:text-[#FF7A93] flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                    <button
                      onClick={() => setOcDraft({ id: 'oc_' + Math.random().toString(36).slice(2, 8), name: '', realPersonality: '', group: '自建', appearance: getAppearance('oc-' + Math.random()) })}
                      className="w-full py-3 rounded-xl border border-dashed border-white/20 text-[#B7B2D9] text-[12px] font-black hover:border-[rgba(201,162,39,0.5)] transition-all">
                      + {T('新建一个角色','新建一個角色')}
                    </button>
                  </div>
                )}
              </>)}

              {cur === 'daughter' && (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black text-[#454F87] uppercase">{T('女儿国籍','女兒國籍')}</label>
                    <div className="grid grid-cols-2 gap-2">{nationalities.map(n => (
                      <button key={n} onClick={() => setData({...data, daughterNationality: n})} className={`p-3 rounded-xl border text-[11px] transition-all ${data.daughterNationality === n ? 'bg-[#E7E6F6] border-[#5B6BB0] text-[#454F87] font-bold' : 'bg-white border-[#DAD8EE] text-[#2A2A3D]'}`}>{n}</button>
                    ))}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black text-[#454F87] uppercase">{T('女儿性格','女兒性格')}</label>
                    <div className="flex flex-col gap-2">{personalities.map(p => (
                      <button key={p.id} onClick={() => setData({...data, daughterPersonality: p.id})} className={`w-full p-3 rounded-xl border text-left transition-all ${data.daughterPersonality === p.id ? 'bg-[#E7E6F6] border-[#5B6BB0] text-[#454F87]' : 'bg-white border-[#DAD8EE] text-[#2A2A3D]'}`}><div className="font-bold text-[11px]">{p.id}</div><div className="text-[10px] opacity-60 mt-0.5">{p.desc}</div></button>
                    ))}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black text-[#454F87] uppercase">{T('女儿的名字（选填，不填由AI生成）','女兒的名字（選填，不填由AI生成）')}</label>
                    <input type="text" value={data.daughterName} onChange={e => setData({...data, daughterName: e.target.value})} className="w-full bg-white border border-[#DAD8EE] rounded-2xl p-4 text-base focus:ring-2 focus:ring-[#5B6BB0] outline-none text-[#2A2A3D]" placeholder={T('给女儿起个名字...','給女兒起個名字...')} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black text-[#454F87] uppercase">{T('家庭背景','家庭背景')}</label>
                    <div className="grid grid-cols-3 gap-2">{backgrounds.map(b => (
                      <button key={b} onClick={() => setData({...data, daughterBackground: b})} className={`p-3 rounded-xl border text-[11px] transition-all ${data.daughterBackground === b ? 'bg-[#E7E6F6] border-[#5B6BB0] text-[#454F87] font-bold' : 'bg-white border-[#DAD8EE] text-[#2A2A3D]'}`}>{b}</button>
                    ))}</div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="p-5 sm:p-6 border-t border-white/[0.06] flex gap-3">
          {stepIdx > 0 && <button onClick={() => go(-1)} className="flex-1 py-3.5 bg-white/[0.04] text-[#B7B2D9] rounded-2xl text-sm font-black border border-white/10 hover:bg-white/[0.09] transition-all">← {T('上一步','上一步')}</button>}
          <button onClick={() => isLast ? finish() : go(1)} disabled={!canNext()} style={{ background: canNext() ? 'linear-gradient(135deg, #6C79C4, #454F87)' : 'rgba(255,255,255,0.08)', boxShadow: canNext() ? '0 10px 24px -8px rgba(91,107,176,0.8)' : 'none' }} className="flex-[2] py-3.5 rounded-2xl text-white text-sm font-black hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 disabled:text-white/50 transition-all flex items-center justify-center gap-1.5">
            {isLast ? <><Sparkles className="w-4 h-4" /> {T('开始！','開始！')}</> : <>{T('下一步','下一步')} <ArrowRight className="w-4 h-4" /></>}
          </button>
        </div>
      </motion.div>
    </div>
  );
};


type ContentBlock =
  | { type: 'text'; content: string }
  | { type: 'kkt'; data: any }
  | { type: 'weverse'; data: any }
  | { type: 'bubble'; data: any }
  | { type: 'theqoo'; data: any }
  | { type: 'card'; data: any }
  | { type: 'musicshow'; data: any };

function parseContentBlocks(text: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const tags = [
    { start: 'KKTMSG_START', end: 'KKTMSG_END', type: 'kkt' },
    { start: 'WEVERSE_START', end: 'WEVERSE_END', type: 'weverse' },
    { start: 'BUBBLE_START', end: 'BUBBLE_END', type: 'bubble' },
    { start: 'THEQOO_START', end: 'THEQOO_END', type: 'theqoo' },
    { start: 'CARD_START', end: 'CARD_END', type: 'card' },
    { start: 'MUSICSHOW_START', end: 'MUSICSHOW_END', type: 'musicshow' },
  ];

  let remaining = text;
  while (remaining.length > 0) {
    let earliest = { index: Infinity, tag: null as any };
    for (const tag of tags) {
      const idx = remaining.indexOf(tag.start);
      if (idx !== -1 && idx < earliest.index) earliest = { index: idx, tag };
    }

    if (earliest.tag === null) {
      const cleaned = remaining
        .replace(/^\*{0,2}[A-D]\.\*{0,2}.+$/gm, '')
        .replace(/^[A-D][\.、。\s].+$/gm, '')
        .replace(/\[.*?\]/g, '')
        .replace(/^---+$/gm, '')
        .replace(/\n{3,}/g, '\n\n').trim();
      if (cleaned) blocks.push({ type: 'text', content: cleaned });
      break;
    }

    if (earliest.index > 0) {
      const textBefore = remaining.slice(0, earliest.index)
        .replace(/^\*{0,2}[A-D]\.\*{0,2}.+$/gm, '')
        .replace(/^[A-D][\.、。\s].+$/gm, '')
        .replace(/\[.*?\]/g, '')
        .replace(/^---+$/gm, '')
        .replace(/\n{3,}/g, '\n\n').trim();
      if (textBefore) blocks.push({ type: 'text', content: textBefore });
    }

    const endIdx = remaining.indexOf(earliest.tag.end, earliest.index);
    if (endIdx === -1) break;
    const content = remaining.slice(earliest.index + earliest.tag.start.length, endIdx).trim();
    try {
      blocks.push({ type: earliest.tag.type as any, data: JSON.parse(content) });
    } catch(e) {}
    remaining = remaining.slice(endIdx + earliest.tag.end.length);
  }

  return blocks;
}

function extractBlock(text: string, startTag: string, endTag: string): { content: string; remaining: string } | null {
  const start = text.indexOf(startTag);
  if (start === -1) return null;
  const end = text.indexOf(endTag, start + startTag.length);
  if (end === -1) return null;
  const content = text.slice(start + startTag.length, end).trim();
  const remaining = text.slice(0, start) + text.slice(end + endTag.length);
  return { content, remaining };
}

function parseOptions(text: string): { text: string; action: string }[] {
  const abcdPattern = /^\*{0,2}([A-C])[\.、。\s]\*{0,2}\s*(.+)$/gm;
  const options: { text: string; action: string }[] = [];
  let match;
  while ((match = abcdPattern.exec(text)) !== null) {
    const content = match[2].trim();
    if (content.length > 2 && !content.includes('自由行动')) {
      options.push({ text: `${match[1]}. ${content}`, action: content });
    }
  }
  if (options.length >= 2) return options;
  const numberedPattern = /^\d+[\.、]\s*(.+)$/gm;
  const numbered: { text: string; action: string }[] = [];
  while ((match = numberedPattern.exec(text)) !== null) {
    const content = match[1].trim();
    if (content.length > 2) numbered.push({ text: content, action: content });
  }
  if (numbered.length >= 2) return numbered;
  return [];
}

export type ScriptEntry = { kind: 'narration'; text: string } | { kind: 'line'; speaker: string; text: string };

// 把叙事正文解析成"旁白/台词"序列，做 VN 演出用；AI 不守格式时优雅降级为整段旁白
export function parseScript(text: string): ScriptEntry[] {
  const out: ScriptEntry[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (let line of lines) {
    if (/^\*{0,2}[A-C][\.、。]/.test(line)) continue;       // 选项行
    if (/^【.*】/.test(line)) continue;                     // 【本轮可选行动】等标题
    if (/^-{3,}$/.test(line)) continue;
    line = line.replace(/^\*+/, '').replace(/\*+$/, '').trim();
    let m = line.match(/^(旁白|旁白君|N|narration)[：:]\s*(.+)$/i);
    if (m) { out.push({ kind: 'narration', text: m[2].trim() }); continue; }
    // 角色名：「台词」
    m = line.match(/^([^\s：:，。！？、]{1,8})[：:]\s*[「"“](.+?)[」"”]?$/);
    if (m) { out.push({ kind: 'line', speaker: m[1].trim(), text: m[2].replace(/[」"”]\s*$/, '').trim() }); continue; }
    // 角色名：台词（无引号，名字较短）
    m = line.match(/^([^\s：:，。！？、]{2,6})[：:]\s*(.+)$/);
    if (m) { out.push({ kind: 'line', speaker: m[1].trim(), text: m[2].trim() }); continue; }
    out.push({ kind: 'narration', text: line });
  }
  return out.length ? out : [{ kind: 'narration', text: text.trim() }];
}

const MarkdownBlock = ({ content }: { content: string }) => (
  <Markdown components={{
    p: ({children}) => {
      const text = String(children);
      const isOption = /^[A-C][\.、。]/.test(text);
      return <p className={isOption ? 'text-[#5B6BB0] font-bold' : ''}>{children}</p>;
    }
  }}>{content}</Markdown>
);

// 闲聊：本地模板生成（不调 AI、不涨好感），用于本时段行动点已用完时
const CHITCHAT = [
  (n: string) => `${n}朝你点了下头，没停下手里的事。`,
  (n: string) => `${n}：「等下还有事，回头聊。」`,
  (n: string) => `你和${n}打了个招呼，她笑了一下就走开了。`,
  (n: string) => `${n}：「嗯……先这样，我这边还没弄完。」`,
  (n: string) => `${n}摆摆手，看起来今天没什么空。`,
];
const CHITCHAT_TW = [
  (n: string) => `${n}朝你點了下頭，沒停下手裡的事。`,
  (n: string) => `${n}：「等下還有事，回頭聊。」`,
  (n: string) => `你和${n}打了個招呼，她笑了一下就走開了。`,
  (n: string) => `${n}：「嗯……先這樣，我這邊還沒弄完。」`,
  (n: string) => `${n}擺擺手，看起來今天沒什麼空。`,
];
function chitchatLine(m: Member, ctx: { activity?: Activity } | undefined, tw: boolean): string {
  const pool = tw ? CHITCHAT_TW : CHITCHAT;
  const pick = pool[Math.floor(Math.random() * pool.length)](m.name);
  const mood = ctx?.activity ? (tw ? `（正${ctx.activity.label}）` : `（正${ctx.activity.label}）`) : '';
  return pick + mood;
}

// 剧情回顾里的正文：旁白 + 台词分行呈现（与 VN 同一套解析）
const StoryText = ({ content }: { content: string }) => {
  const script = parseScript(content);
  return (
    <div className="flex flex-col gap-2.5 text-[15px] leading-[1.85] text-[#E7E6F6]">
      {script.map((s, i) => s.kind === 'narration'
        ? <p key={i} className="text-[#B7B2D9] italic">{s.text}</p>
        : <p key={i} className="pl-3 border-l-2 border-[rgba(201,162,39,0.3)]"><span className="font-black text-[#B7A9E8]">{s.speaker}</span><span className="text-[#8B86B8]">：</span>「{s.text}」</p>
      )}
    </div>
  );
};

export default function App() {
  const getInitialGameState = (): GameState => ({
    members: INITIAL_MEMBERS, exposure: 0, relationships: [], currentScene: '首尔', history: [],
    turnCount: 0, identity: [], setupStep: SetupStep.CREATION, playerName: '', playerAge: 20,
    playerMoney: 2300000, playerMood: 80, targets: [], selectedCPs: [], collectedCards: [],
    playerImpact: { albumImpact: 0, voteImpact: 0 }
  });

  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) { try { const p = JSON.parse(saved); return { ...p, collectedCards: p.collectedCards || [], playerImpact: p.playerImpact || { albumImpact: 0, voteImpact: 0 } }; } catch(e) {} }
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
  const [scene, setScene] = useState<{ ids: string[]; anchor: number } | null>(null);
  const worldDay = gameState.worldDay ?? 1;
  const worldSlot = gameState.worldSlot ?? 0;
  const worldLocation = gameState.worldLocation ?? 'practice_room';
  // 行动点：每时段全员共享一次深度互动，用掉后只能闲聊，推进时段自动恢复
  const actionUsed = gameState.actionUsedAt === `${worldDay}-${worldSlot}`;
  const phoneFeed = gameState.phoneFeed || [];
  const phoneUnread = phoneFeed.filter(f => !f.read).length;
  const openPhone = () => setShowPhone(true);
  const closePhone = () => {
    setShowPhone(false);
    // 关掉手机时全部标记已读，红点熄灭
    setGameState(prev => ({ ...prev, phoneFeed: (prev.phoneFeed || []).map(f => (f.read ? f : { ...f, read: true })) }));
  };
  const setWorldLocation = (loc: string) => setGameState(p => ({ ...p, worldLocation: loc }));
  const pushToast = (text: string, kind: string) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    setToasts(t => [...t, { id, text, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4800);
  };
  const [wallpaper, setWallpaper] = useState<string>(() => localStorage.getItem('wallpaper') || '');

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
    const isCPSave = gameState.gameMode === 'CPCP';
    const isMomSave = gameState.gameMode === 'mom';
    const targetNames = gameState.members.filter(m => gameState.targets.includes(m.id)).map(m => m.name);
    const daughterName = (gameState as any).daughterProfile?.name || '';
    const subject = isMomSave ? (daughterName || '女儿') : isCPSave ? targetNames.join(' ♡ ') : targetNames.join(', ');
    const slot = { id, name: `存档 ${time}`, time, scene: gameState.currentScene, round: gameState.turnCount || 0, subject };
    const newSlots = [slot, ...saveSlots].slice(0, 10);
    setSaveSlots(newSlots);
    localStorage.setItem('save_slots', JSON.stringify(newSlots));
    localStorage.setItem(`save_data_${id}`, JSON.stringify(gameState));
    alert('存档成功！');
  };

  const loadGame = (id: string) => {
    const data = localStorage.getItem(`save_data_${id}`);
    if (data) { try { setGameState(JSON.parse(data)); setShowSaveSlots(false); } catch {} }
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

  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(gameState)); }, [gameState]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [gameState.history]);
  // 密钥现由服务端持有，前端不再探测（真缺失时由 /api/chat 报错提示）

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
    const isCPMode = data.gameMode === 'CPCP';
    const isMomMode = data.gameMode === 'mom';
    const targetNames = INITIAL_MEMBERS.filter(m => data.targets.includes(m.id)).map(m => m.name);

    let summary = `我的名字是 ${data.playerName}，`;
    if (isMomMode) {
      summary += `我是一位妈妈。女儿设定：国籍${data.daughterNationality}，性格${data.daughterPersonality}，家庭背景${data.daughterBackground}${data.daughterName ? `，名字${data.daughterName}` : ''}。请根据这些设定生成女儿的虚构角色，然后从她8岁那年开始故事。`;
    } else {
      const startLabel = getLocation(getStartLocation(data.identity))?.label;
      summary += `身份是 ${(data.identity || []).join(', ') || '普通人'}。${isCPMode ? `我想撮合 ${targetNames.join(' 和 ')}。` : `我想关注 ${targetNames.join(', ')}。`}游戏模式：${data.gameMode}。${startLabel ? `故事从我以这个身份自然会出现的地方——${startLabel}——开始，开场地点要符合我的身份。` : ''}故事开始。`;
    }

    const affFloor = isCPMode || isMomMode ? 0 : startingAffection(data.identity);
    const initializedMembers = INITIAL_MEMBERS.map(m => {
      if (isCPMode && data.targets.includes(m.id)) {
        const otherTargetId = data.targets.find((id: string) => id !== m.id);
        const relation = (m as any).initialRelationships?.find((r: any) => r.targetId === otherTargetId);
        return { ...m, affection: relation ? relation.affinity : 0 };
      }
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
      affection: affFloor > 0 ? affFloor : 0,
      careerPressure: 40, status: '自由',
    }));
    const allMembers = [...initializedMembers, ...ocs];
    // 自建角色也算"你关注的人"，否则不会出现在世界地图/关系网里
    const allTargets = [...(data.targets || []), ...ocs.map(o => o.id)];

    const daughterProfile = isMomMode ? {
      nationality: data.daughterNationality,
      personality: data.daughterPersonality,
      background: data.daughterBackground,
      name: data.daughterName || '',
      trustLevel: 50,
    } : null;

    const startLoc = isMomMode ? undefined : getStartLocation(data.identity);
    const startScene = startLoc ? getLocation(startLoc)?.label : undefined;
    const newState: GameState = {
      ...gameState, ...data, members: allMembers, targets: allTargets,
      setupStep: SetupStep.CARDS, history: [], turnCount: 0,
      ...(startLoc ? { worldLocation: startLoc, worldDay: 1, worldSlot: 0, currentScene: startScene } : {}),
      ...(daughterProfile ? { daughterProfile, momTrustLevel: 50 } : {}),
      ...(data.playerApiKey ? { playerApiKey: data.playerApiKey, playerModel: data.playerModel } : {}),
      language: data.language,
      appearances: {
        ...(gameState.appearances || {}),
        ...Object.fromEntries((data.customMembers || []).filter((o: any) => o.appearance).map((o: any) => [o.id, o.appearance])),
      },
    } as any;
    setGameState(newState);
    handleAIStep(summary, newState);
  };

  const handleAIStep = async (userContent: string, stateToUse: GameState) => {
    try {
      const response = await Promise.race([
        callGeminiAPI(stateToUse.history.slice(-10), stateToUse),
        new Promise((_, reject) => setTimeout(() => reject(new Error("通讯超时，请重试。")), 60000))
      ]) as string;
      processAIResponse(response, stateToUse);
    } catch(e) {
      setGameState(prev => ({ ...prev, history: [...prev.history, { role: MessageRole.ASSISTANT, content: `抱歉，出现错误。\n错误信息: ${e instanceof Error ? e.message : String(e)}`, timestamp: Date.now() }] }));
    } finally { setIsLoading(false); }
  };

  const handleReset = () => setShowConfirmReset(true);
  const executeReset = () => { localStorage.removeItem(LOCAL_STORAGE_KEY); setShowConfirmReset(false); setGameState(getInitialGameState()); setInput(''); setIsLoading(false); };

  const processAIResponse = (response: string, stateAtCall: GameState) => {
    let remaining = response;
    remaining = remaining.replace(/\*\*([A-Z_]+(?:START|END))\*\*/g, '$1');
    remaining = remaining.replace(/---+\s*\n(SNAPSHOT_START)/g, '$1');
    remaining = remaining.replace(/KATALK_START|KATALK START/g, 'KKTMSG_START');
    remaining = remaining.replace(/KATALK_END|KATALK END/g, 'KKTMSG_END');

    let snapshot: any = null;
    let musicResult: any = null;
    const snapshotBlock = extractBlock(remaining, 'SNAPSHOT_START', 'SNAPSHOT_END');
    if (snapshotBlock) { remaining = snapshotBlock.remaining; try { snapshot = JSON.parse(snapshotBlock.content); } catch(e) {} }
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
        const cpNewAffection = prev.gameMode === 'CPCP' && snapshot.members?.length > 0
          ? snapshot.members[0].affection : null;

        if (prev.gameMode === 'mom' && snapshot.members?.length > 0) {
          next.momTrustLevel = snapshot.members[0].affection ?? next.momTrustLevel;
        }

        next = {
          ...next,
          currentScene: snapshot.currentScene ?? next.currentScene,
          hiddenSummary: snapshot.hiddenSummary ?? next.hiddenSummary,
          isComebackSetting: snapshot.isComebackSetting ?? false,
          groupHeats: snapshot.groupHeats ?? next.groupHeats,
          currentMusicShow: musicResult || next.currentMusicShow,
          members: next.members.map((m: Member) => {
            if (prev.gameMode === 'CPCP' && prev.targets.includes(m.id) && cpNewAffection !== null) {
              return { ...m, affection: cpNewAffection };
            }
            const u = snapshot.members?.find((sm: any) => sm.id === m.id);
            return u ? { ...m, ...u } : m;
          })
        };
      }
      if (musicResult) next.musicShowHistory = [...(next.musicShowHistory || []), musicResult];
      if (newCards.length > 0) next.collectedCards = [...(next.collectedCards || []), ...newCards];
      if (newCards.length > 0 && prev.setupStep === SetupStep.CARDS) next.setupStep = SetupStep.STARTED;

      // RELDELTA：把 DeepSeek 输出的爱豆间关系增量应用到关系网
      if (relDeltas?.pairs && Array.isArray(relDeltas.pairs)) {
        const clampR = (v: number) => (v < 0 ? 0 : v > 100 ? 100 : v);
        const rels = { ...(next.worldRelations || {}) };
        for (const p of relDeltas.pairs) {
          if (!p || !p.a || !p.b) continue;
          const a = p.a === 'player' ? PLAYER : p.a;
          const b = p.b === 'player' ? PLAYER : p.b;
          const k = pairKey(a, b);
          const cur = rels[k] || { affinity: 0, tension: 0 };
          rels[k] = {
            ...cur,
            affinity: clampR((cur.affinity || 0) + (Number(p.affinity) || 0)),
            tension: clampR((cur.tension || 0) + (Number(p.tension) || 0)),
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
      // 阶段突破：记录已触发，避免重复
      if (firedMilestones.length) {
        next.milestones = Array.from(new Set([...(prev.milestones || []), ...firedMilestones]));
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

  const handleSend = async (content?: any, opts?: { focusIds?: string[]; consumeAction?: boolean }) => {
    const textToSend = typeof content === 'string' ? content : input;
    if (!textToSend || !textToSend.trim()) return;
    if (isLoading) return;
    setInput(''); setIsLoading(true);
    let nextState: GameState = { ...gameState };
    // 本场登场的人：走近/围观时显式传入；同一场景内后续对话沿用当前 scene
    const focus = opts?.focusIds ?? scene?.ids;
    nextState.sceneFocusIds = focus && focus.length ? focus : undefined;
    // 深度互动消耗本时段的行动点（每时段全员共享一次）
    if (opts?.consumeAction) nextState.actionUsedAt = `${nextState.worldDay ?? 1}-${nextState.worldSlot ?? 0}`;
    nextState.history = [...nextState.history, { role: MessageRole.USER, content: textToSend, timestamp: Date.now() }];
    setGameState(nextState);
    await handleAIStep(textToSend, nextState);
  };

  // 从俯视世界点击爱豆 → 切回剧情，预填带场景/心情语境的“走近”动作交给 DeepSeek
  const handleTalkTo = (m: Member, ctx?: { location: WorldLocation; activity: Activity }) => {
    const isTw = (gameState as any).language === 'traditional';
    // 本时段的行动点已用掉 → 只能闲聊：本地生成一句，不调 AI、不涨好感
    if (actionUsed) {
      pushToast(chitchatLine(m, ctx, isTw), 'friendly');
      return;
    }
    const where = ctx ? `在${ctx.location.label}` : '';
    const doing = ctx ? `（她正${ctx.activity.label}，${ctx.activity.mood}）` : '';
    const line = isTw
      ? `（我${where}走近${m.name}，和ta打個招呼）${doing}`
      : `（我${where}走近${m.name}，和ta打个招呼）${doing}`;
    setScene({ ids: [m.id], anchor: gameState.history.length });
    handleSend(line, { focusIds: [m.id], consumeAction: true });
  };

  // 手机私信：不占行动点，但每天有条数上限；发太勤会涨曝光度（"他手机被工作人员关注"）
  const DM_PER_DAY = 3;
  const dmSentToday = (gameState as any).dmSentAt === `d${worldDay}` ? ((gameState as any).dmCount || 0) : 0;
  const dmLeft = Math.max(0, DM_PER_DAY - dmSentToday);
  const handleSendDM = (memberId: string, text: string) => {
    const m = gameState.members.find(x => x.id === memberId);
    if (!m || dmLeft <= 0) return;
    const isTw = (gameState as any).language === 'traditional';
    const activity = getActivity(m.id, worldDay, worldSlot, m.group);
    const busy = !activity.available;
    const n = dmSentToday + 1;
    setGameState(prev => ({
      ...prev,
      dmSentAt: `d${worldDay}`, dmCount: n,
      // 发得越勤，越容易被工作人员注意到
      exposureLevel: Math.min(100, (prev.exposureLevel || 0) + (n >= 3 ? 3 : 1)),
      phoneFeed: [...(prev.phoneFeed || []), {
        id: `dm-${Date.now()}`, type: 'kkt' as const, ts: Date.now(), read: true,
        data: { sender: m.name, avatar: '👤', messages: [{ text, time: '방금', isRead: true, translation: '' }] },
      }],
    }));
    // 她不一定秒回：忙的时候更慢，回复用本地模板（不烧 token）
    const delay = busy ? 2600 : 1200 + Math.random() * 1200;
    setTimeout(() => {
      const aff = m.affection || 0;
      const pool = busy
        ? (isTw ? ['現在在外地，回頭說', '在忙…晚點回你'] : ['现在在外地，回头说', '在忙…晚点回你'])
        : aff >= 60
          ? (isTw ? ['剛看到，今天好累', '嗯，我在', '想你了（打錯了）'] : ['刚看到，今天好累', '嗯，我在', '想你了（打错了）'])
          : aff >= 30
            ? (isTw ? ['嗯嗯', '剛結束，怎麼了', '哈哈好'] : ['嗯嗯', '刚结束，怎么了', '哈哈好'])
            : (isTw ? ['嗯', '好的', '收到'] : ['嗯', '好的', '收到']);
      const reply = pool[Math.floor(Math.random() * pool.length)];
      setGameState(prev => ({
        ...prev,
        phoneFeed: [...(prev.phoneFeed || []), {
          id: `dmr-${Date.now()}`, type: 'kkt' as const, ts: Date.now(), read: false,
          data: { sender: m.name, avatar: '👤', messages: [{ text: reply, time: '방금', isRead: false, translation: '' }] },
        }],
      }));
    }, delay);
  };

  // 应援打投：占用本时段行动点，累积到打歌成绩（回归期才有）
  const handleSupport = () => {
    const isTw = (gameState as any).language === 'traditional';
    if (actionUsed) { pushToast(isTw ? '這個時段的精力用完了' : '这个时段的精力用完了', 'friendly'); return; }
    setGameState(prev => {
      const p = prev.playerImpact || { albumImpact: 0, voteImpact: 0 };
      return {
        ...prev,
        playerImpact: { albumImpact: Math.min(60, p.albumImpact + 6), voteImpact: Math.min(60, p.voteImpact + 8) },
        actionUsedAt: `${prev.worldDay ?? 1}-${prev.worldSlot ?? 0}`,
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
    if (actionUsed) {
      pushToast(isTw ? '這個時段的精力用完了，先推進時段吧' : '这个时段的精力用完了，先推进时段吧', 'friendly');
      return;
    }
    const hint = isMatch ? '（我想撮合她们，留意有没有暧昧的火花）' : '';
    const line = isTw
      ? `（我在${ctx.location.label}，看到 ${a.name} 和 ${b.name} 湊在一起，我在旁邊靜靜觀察她們的互動）${hint}`
      : `（我在${ctx.location.label}，看到 ${a.name} 和 ${b.name} 凑在一起，我在旁边静静观察她们的互动）${hint}`;
    setScene({ ids: [a.id, b.id], anchor: gameState.history.length });
    handleSend(line, { focusIds: [a.id, b.id], consumeAction: true });
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
    setGameState(prev => {
      const day = prev.worldDay ?? 1, slot = prev.worldSlot ?? 0;
      const here = prev.worldLocation ?? 'practice_room';
      const rels = { ...(prev.worldRelations || {}) };
      const feed = [...(prev.worldFeed || [])];
      const tmembers = prev.members.filter(m => (prev.targets || []).includes(m.id));
      for (const L of WORLD_LOCATIONS) {
        if (L.id === here) continue; // 你在的地方已经现场结算过
        const present = idolsAt(tmembers, L.id, day, slot);
        for (let i = 0; i < present.length; i++) {
          for (let j = i + 1; j < present.length; j++) {
            // 私密地点（练习室/天台/宿舍/演唱会）不同公司/团不同屏，不产生跨单位相遇
            if (unitKeyOf(L.id, present[i]) !== unitKeyOf(L.id, present[j])) continue;
            if (Math.random() > 0.6) continue;
            const a = present[i], b = present[j], k = pairKey(a.id, b.id);
            const match = (prev.matchmakes || []).includes(k);
            const cur = rels[k] || { affinity: 0, tension: 0 };
            rels[k] = {
              ...cur,
              affinity: Math.min(100, (cur.affinity || 0) + (match ? 2 : 1)),
              tension: Math.max(0, (cur.tension || 0) + ((cur.tension || 0) >= 50 ? (match ? -1 : 1) : 0)),
            };
            feed.unshift({ id: `${k}-${day}-${slot}-${Math.random().toString(36).slice(2, 6)}`, text: `${a.name} × ${b.name} 在${L.label}相处`, kind: match ? 'romance' : 'friendly', day, slot });
          }
        }
      }
      const nt = nextTime(day, slot);
      let next: any = { ...prev, worldRelations: rels, worldFeed: feed.slice(0, 15), worldDay: nt.day, worldSlot: nt.slot };

      // 打歌日晚上结算一位：分数由代码算（可累积、可对比），玩家的应援与爱豆士气都算进去
      const mainGroup = tmembers[0]?.group;
      if (mainGroup && nt.slot === 2 && isMusicShowDay(mainGroup, nt.day)) {
        const rivals = Array.from(new Set(prev.members.map(m => m.group))).filter(g => g !== mainGroup).slice(0, 3);
        const morale = tmembers.length
          ? Math.round(tmembers.reduce((s, m) => s + (m.affection || 0), 0) / tmembers.length * 0.5 + 50)
          : 50;
        const boost = prev.playerImpact || { albumImpact: 0, voteImpact: 0 };
        const res = computeMusicShow(mainGroup, rivals.length ? rivals : ['其他团'], nt.day, {
          morale,
          boost: { vote: boost.voteImpact, sns: Math.round(boost.voteImpact * 0.6), digital: boost.albumImpact },
        });
        const result = { week: weekOf(nt.day), winner: res.winner, scores: res.scores };
        next.currentMusicShow = result;
        next.musicShowHistory = [...(prev.musicShowHistory || []), result];
        next.playerImpact = { albumImpact: 0, voteImpact: 0 }; // 每场结算后清空本轮投入
        const won = res.winner === mainGroup;
        next.worldFeed = [{
          id: `ms-${nt.day}`,
          text: won ? `${mainGroup} 拿下本周一位！` : `本周一位是 ${res.winner}，${mainGroup} 差 ${res.scores[0].total - (res.scores.find(s => s.group === mainGroup)?.total || 0)} 分`,
          kind: won ? 'romance' : 'tension', day: nt.day, slot: nt.slot,
        }, ...next.worldFeed].slice(0, 15);
        next.phoneFeed = [...(prev.phoneFeed || []), {
          id: `msp-${nt.day}`, type: 'theqoo' as const, ts: Date.now(), read: false,
          data: {
            title: won ? `${mainGroup} 今天一位了…真的哭了` : `今天一位是 ${res.winner}，${mainGroup} 也太可惜了`,
            category: '음악방송', viewsCount: 40000 + Math.floor(Math.random() * 60000),
            likesCount: 800 + Math.floor(Math.random() * 3000), commentsCount: 120,
            comments: [
              { authorId: 'ㅇㅇ', content: won ? '무대 진짜 미쳤다' : '아쉽다 다음엔 꼭', translation: won ? '舞台真的绝了' : '好可惜，下次一定' },
              { authorId: 'ㅇㅇ', content: `총점 ${res.scores[0].total}`, translation: `总分 ${res.scores[0].total}` },
            ],
          },
        }];
        setTimeout(() => pushToast(won ? `🏆 ${mainGroup} 本周一位！` : `本周一位：${res.winner}`, won ? 'romance' : 'tension'), 0);
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
  const handleIdolEncounter = (aId: string, bId: string, kind: 'romance' | 'tension' | 'friendly') => {
    setGameState(prev => {
      const rels = { ...(prev.worldRelations || {}) };
      const k = pairKey(aId, bId);
      const rel = rels[k] || { affinity: 0, tension: 0 };
      const affGain = kind === 'romance' ? 2 : kind === 'tension' ? 0 : 1;
      const tenDelta = kind === 'romance' ? -1 : kind === 'tension' ? 1 : 0;
      rels[k] = {
        ...rel,
        affinity: Math.min(100, (rel.affinity || 0) + affGain),
        tension: Math.max(0, Math.min(100, (rel.tension || 0) + tenDelta)),
      };
      return { ...prev, worldRelations: rels };
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

  const isCPMode = gameState.gameMode === 'CPCP';
  const isMomMode = gameState.gameMode === 'mom';
  const targetMembers = gameState.members.filter(m => gameState.targets.includes(m.id));
  const primaryTarget = targetMembers[0];
  const cpAffection = primaryTarget?.affection || 0;
  const daughterProfile = (gameState as any).daughterProfile;
  const momTrustLevel = (gameState as any).momTrustLevel || 50;
  const roundCount = gameState.turnCount || 0;

  // 俯视世界里出现的爱豆：优先玩家关注的对象，否则取前若干位
  const worldMembers = targetMembers.length > 0 ? targetMembers : gameState.members.slice(0, 6);

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
  let sceneScript: ScriptEntry[] = [];
  let sceneOptions: { text: string; action: string }[] = [];
  if (scene) {
    const hist = gameState.history;
    let msg: any = null;
    for (let i = hist.length - 1; i >= scene.anchor; i--) { if (hist[i].role === MessageRole.ASSISTANT) { msg = hist[i]; break; } }
    if (msg) {
      const txt = (msg.contentBlocks || []).filter((b: any) => b.type === 'text').map((b: any) => b.content).join('\n') || msg.content || '';
      sceneScript = parseScript(txt);
      sceneOptions = msg.options || [];
    }
  }
  const sceneMembers = scene ? gameState.members.filter(m => scene.ids.includes(m.id)) : [];
  const sceneLoc = getLocation(worldLocation);
  // 强制脱出：一次相遇最多聊 MAX_SCENE_ROUNDS 轮，之后只给「结束本次互动」
  const MAX_SCENE_ROUNDS = 3;
  const sceneRounds = scene
    ? gameState.history.slice(scene.anchor).filter(h => h.role === MessageRole.ASSISTANT).length
    : 0;
  const sceneCanContinue = sceneRounds < MAX_SCENE_ROUNDS;

  const lang = (gameState as any).language || 'simplified';
  const sidebarLabel = isMomMode ? '母女信任度' : isCPMode ? (lang === 'traditional' ? 'CP 羈絆值' : 'CP 羁绊值') : (lang === 'traditional' ? '角色狀態' : '角色状态');
  const modeLabel = isMomMode ? '宝妈' : isCPMode ? '助攻' : '攻略';

  const sceneConfig = getSceneConfig(gameState.currentScene);

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* 手机竖屏：提示横屏游玩 */}
      <div className="rotate-gate fixed inset-0 z-[300] bg-[#1b1830] flex-col items-center justify-center gap-5 px-8 text-center">
        <div className="w-16 h-24 rounded-xl border-[3px] border-[#8f9bd6] relative animate-[tilt_1.8s_ease-in-out_infinite]">
          <div className="absolute inset-x-3 top-2 h-1 rounded bg-[#8f9bd6]/70" />
          <div className="absolute inset-x-4 bottom-2 h-1.5 rounded-full bg-[#8f9bd6]/70" />
        </div>
        <div className="text-white font-black text-base">{lang === 'traditional' ? '請橫過手機遊玩' : '请横过手机游玩'}</div>
        <div className="text-[#b6bde6] text-xs leading-relaxed">{lang === 'traditional' ? '這個世界是寬螢幕的，橫屏才能完整看到場景' : '这个世界是宽屏的，横屏才能完整看到场景'}</div>
      </div>
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
          options={sceneCanContinue ? sceneOptions : []}
          canContinue={sceneCanContinue}
          isLoading={isLoading}
          lang={lang}
          onChoose={(a) => handleSend(a)}
          onSend={(t) => handleSend(t)}
          onLeave={() => setScene(null)}
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

      {sidebarOpen && <div className="hidden lg:block fixed inset-0 z-[90] bg-black/25" onClick={() => setSidebarOpen(false)} />}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-56 border-r border-white/[0.06] flex-col hidden lg:flex fixed left-0 top-0 bottom-0 z-[95] transition-transform duration-300 shadow-2xl`} style={{background: 'linear-gradient(180deg, #14121f, #0B0A14)'}}>
        <div className="p-4 border-b border-white/[0.06]">
          <h1 className="text-sm font-black text-[#F1ECFF] tracking-tighter flex items-center gap-1.5"><Gamepad2 className="w-4 h-4 flex-shrink-0 text-[#C9A227]" /> 爱豆收集梦想生活</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[9px] text-white px-2 py-0.5 rounded-full font-black uppercase" style={{ background: 'linear-gradient(135deg,#6C79C4,#454F87)' }}>{modeLabel}</span>
            <span className="text-[10px] text-[#8B86B8] font-bold">Idol Tomodachi Life</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-5 ink-scroll">
          {worldMode && !isMomMode && !isCPMode ? (
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
            {isCPMode ? (
              <div className="bg-white/[0.03] p-4 rounded-2xl border border-[rgba(201,162,39,0.3)]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-[#F1ECFF]">{targetMembers.map(m => m.name).join(' ♡ ')}</span>
                  <span className="text-[10px] text-[#C9A227] font-black">{cpAffection}/100</span>
                </div>
                <div className="h-[3px] bg-white/[0.08] rounded-full overflow-hidden">
                  <motion.div animate={{ width: `${cpAffection}%` }} className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#6C79C4,#C9A227)' }} />
                </div>
                <div className="text-[9px] text-[#8B86B8] mt-2 italic">
                  {cpAffection < 15 ? '互相不熟，公事公办' : cpAffection < 30 ? '有些微妙的默契' : cpAffection < 50 ? '暧昧模糊，互相试探' : cpAffection < 70 ? '明显的特殊感' : cpAffection < 85 ? '没有说破，但都知道了' : '只差最后一步'}
                </div>
              </div>
            ) : isMomMode ? (
              <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-[#F1ECFF]">{daughterProfile?.name || '女儿'}</span>
                  <span className="text-[10px] text-[#C9A227] font-mono font-bold">{momTrustLevel}/100</span>
                </div>
                <div className="h-[3px] bg-white/[0.08] rounded-full overflow-hidden">
                  <motion.div animate={{ width: `${momTrustLevel}%` }} className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#6C79C4,#C9A227)' }} />
                </div>
                {daughterProfile && <div className="text-[9px] text-[#8B86B8] mt-1">{daughterProfile.nationality} · {daughterProfile.personality}</div>}
              </div>
            ) : (
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

      <main className="flex-1 flex flex-col h-full lg:rounded-l-[2rem] lg:shadow-sm overflow-hidden" style={{background: 'rgba(11,10,20,0.72)'}}>
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
          {(primaryTarget || isMomMode) && (
            <button onClick={() => setShowDrawer(true)} className="lg:hidden flex items-center gap-2 bg-white/[0.06] px-3 py-2 rounded-2xl border border-white/10 active:scale-95 transition-all">
              <Heart className="w-3 h-3 text-[#C9A227]" />
              <span className="text-[11px] font-bold text-[#F1ECFF]">
                {isMomMode ? (daughterProfile?.name || '女儿') : isCPMode ? targetMembers.map(m => m.name).join(' ♡ ') : primaryTarget?.name}
              </span>
              <span className="text-[11px] font-black text-[#C9A227]">{isMomMode ? momTrustLevel : cpAffection}</span>
              <ChevronUp className="w-3 h-3 text-[#8B86B8]" />
            </button>
          )}
          {apiKeyMissing && <div className="bg-white/[0.06] text-[#C9A227] text-[10px] font-black px-3 py-1 rounded-full border border-[rgba(201,162,39,0.3)] animate-pulse">API KEY MISSING</div>}
          <div className="flex items-center gap-3">
            {!worldMode && !isMomMode && !isCPMode && (
              <button onClick={openPhone} className="relative flex items-center gap-1.5 text-[11px] font-black px-3 py-1.5 rounded-xl border bg-white/[0.06] text-[#B7B2D9] border-white/10 hover:bg-white/[0.12] transition-all">
                <Smartphone className="w-3.5 h-3.5" /> {lang === 'traditional' ? '手機' : '手机'}
                {phoneUnread > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#FF3B30] text-white text-[9px] font-black flex items-center justify-center animate-pulse">{phoneUnread}</span>}
              </button>
            )}
            <button
              onClick={() => setWorldMode(v => !v)}
              className={`flex items-center gap-1.5 text-[11px] font-black px-3 py-1.5 rounded-xl border transition-all ${worldMode ? 'text-white border-transparent' : 'bg-white/[0.06] text-[#B7B2D9] border-white/10 hover:bg-white/[0.12]'}`}
              style={worldMode ? { background: 'linear-gradient(135deg,#6C79C4,#454F87)' } : undefined}
              title={lang === 'traditional' ? '切換俯視世界 / 劇情' : '切换俯视世界 / 剧情'}
            >
              {worldMode ? <Zap className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
              {worldMode ? (lang === 'traditional' ? '劇情' : '剧情') : (lang === 'traditional' ? '世界' : '世界')}
            </button>
            <button
              onClick={() => {
                const newVal = !isTraditional;
                setIsTraditional(newVal);
                if ((window as any).OpenCC) {
                  const converter = newVal
                    ? (window as any).OpenCC.Converter({ from: 'cn', to: 'twp' })
                    : (window as any).OpenCC.Converter({ from: 'tw', to: 'cn' });
                  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                  const nodes: Text[] = [];
                  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
                  nodes.forEach(node => {
                    if (node.parentElement?.tagName !== 'SCRIPT' && node.parentElement?.tagName !== 'STYLE') {
                      node.textContent = converter(node.textContent || '');
                    }
                  });
                }
              }}
              className="text-[10px] font-black text-[#B7B2D9] bg-white/[0.06] px-2 py-1 rounded-lg border border-white/10 hover:bg-white/[0.12] transition-all"
            >
              {isTraditional ? '简' : '繁'}
            </button>
            <div className="text-right">
              <div className="text-[10px] text-[#8B86B8] font-bold uppercase">Round</div>
              <div className="text-sm font-bold text-[#C9A227]">{roundCount}</div>
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
            actionUsed={actionUsed}
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
          />
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
                    {msg.options && <OptionsUI options={msg.options} isLatest={isLatest} lang={(gameState as any).language} />}
                    {msg.content?.includes('错误信息') && (
                      <button onClick={() => { let j = -1; for (let k = i-1; k >= 0; k--) { if (gameState.history[k].role === MessageRole.USER) { j = k; break; } } if (j !== -1) { const c = gameState.history[j].content; setGameState(prev => ({ ...prev, history: prev.history.slice(0, i) })); handleSend(c); } }}
                        className="self-start flex items-center gap-2 text-xs font-black text-[#B7A9E8] bg-white/[0.04] px-3 py-2 rounded-xl border border-white/10 hover:bg-white/[0.09]"><RefreshCw className="w-3 h-3" /> {lang === "traditional" ? "重試" : "重试"}</button>
                    )}
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

        <div className="p-4 md:p-6 border-t border-white/[0.06] flex-shrink-0" style={{ background: 'rgba(14,12,28,0.85)' }}>
          <div className="max-w-3xl mx-auto flex gap-3">
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={lang === "traditional" ? "輸入您的行動..." : "输入你的行动..."}
              className="flex-1 bg-white/[0.04] border border-white/10 rounded-3xl px-6 py-4 text-base focus:ring-2 focus:ring-[#C9A227]/40 resize-none h-14 ink-scroll outline-none text-[#F1ECFF] placeholder:text-[#8B86B8]"
              disabled={isLoading} />
            <button onClick={() => handleSend()} disabled={isLoading || !input.trim()} className="text-white px-5 rounded-3xl active:scale-95 disabled:opacity-50 flex-shrink-0 transition-all" style={{ background: 'linear-gradient(135deg,#6C79C4,#454F87)' }}><Send className="w-5 h-5" /></button>
          </div>
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
