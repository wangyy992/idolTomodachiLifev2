import React, { useState, useEffect, useRef } from 'react';
import { Send, RefreshCw, Users, Eye, MapPin, Gamepad2, Heart, Zap, Sparkles, X, ChevronUp, Globe, User, Cake, KeyRound, ArrowRight, Check, Wand2, Save, FolderOpen, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { GameState, INITIAL_MEMBERS, ChatMessage, MessageRole, Member, TheqooPost, SetupStep } from './types';
import { callGeminiAPI } from './geminiService';
import { getSceneConfig } from './sceneConfig';
import WorldView from './WorldView';
import FaceCustomizer, { SpritePreview } from './FaceCustomizer';
import SceneView from './SceneView';
import WorldPanel from './WorldPanel';
import { getPlayerAppearance, getDefaultAppearance, type Appearance } from './spriteUtils';
import { nextTime, idolsAt, getLocation, getStartLocation, WORLD_LOCATIONS, type WorldLocation, type Activity } from './worldConfig';
import { seedIdolRelations, pairKey, deriveType, hasFlag, PLAYER, type Intent } from './relations';

const LOCAL_STORAGE_KEY = 'star_reality_kpop_game_state';

const KKTMessageUI = ({ data }: { data: any }) => (
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
    <div className="mt-4 rounded-2xl bg-gradient-to-br from-[#F3F2FA] to-[#E7E6F6] border border-[#DAD8EE] p-4">
      <div className="text-[9px] font-black text-[#454F87] uppercase tracking-widest mb-3 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[#FF7A93]" />{l === "traditional" ? "當時的選擇" : "当时的选择"}</div>
      <div className="flex flex-col gap-2">
        {options.map((opt: any, i) => {
          const text = (typeof opt === 'string' ? opt : opt.text).replace(/^[A-Da-d][\.、。\)]\s*/, '');
          return (
            <div key={i} className="flex items-start gap-2.5 bg-white/70 rounded-xl px-3 py-2.5 border border-white">
              <span className="mt-0.5 w-5 h-5 rounded-lg bg-[#E7E6F6] text-[#5B6BB0] text-[10px] font-black flex items-center justify-center flex-shrink-0">{'ABCD'[i] || '·'}</span>
              <span className="text-[13px] text-[#3c3752] font-semibold leading-relaxed">{text}</span>
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
      className="fixed inset-x-0 bottom-0 z-50 bg-[#F3F2FA] rounded-t-[2rem] shadow-2xl border-t border-[#DAD8EE] max-h-[70vh] overflow-y-auto">
      <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 bg-[#DAD8EE] rounded-full"></div></div>
      <div className="flex items-center justify-between px-6 pb-4 border-b border-[#DAD8EE]">
        <h3 className="font-black text-[#5B6BB0] text-sm uppercase tracking-widest">
          {isMomMode ? '母女信任度' : isCPMode ? (lang === 'traditional' ? 'CP 羈絆值' : 'CP 羁绊值') : (lang === 'traditional' ? '角色狀態' : '角色状态')}
        </h3>
        <button onClick={onClose} className="p-2 hover:bg-[#E7E6F6] rounded-full transition-all"><X className="w-4 h-4 text-[#454F87]" /></button>
      </div>
      <div className="p-5 flex flex-col gap-5">
        {isCPMode ? (
          <div className="bg-white p-4 rounded-2xl border border-[#5B6BB0]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-[#2A2A3D]">{targetMembers.map(m => m.name).join(' ♡ ')}</span>
              <span className="text-[11px] text-[#5B6BB0] font-black">{cpAffection}/100</span>
            </div>
            <div className="h-2 bg-[#E7E6F6] rounded-full overflow-hidden">
              <motion.div animate={{ width: `${cpAffection}%` }} className="h-full bg-gradient-to-r from-[#5B6BB0] to-[#454F87] rounded-full" />
            </div>
          </div>
        ) : isMomMode ? (
          <div className="bg-white p-4 rounded-2xl border border-[#DAD8EE]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-[#2A2A3D]">{daughterProfile?.name || '女儿'}</span>
              <span className="text-[11px] text-[#5B6BB0] font-mono font-bold">{(gameState as any).momTrustLevel || 50}/100</span>
            </div>
            <div className="h-2 bg-[#E7E6F6] rounded-full overflow-hidden">
              <motion.div animate={{ width: `${(gameState as any).momTrustLevel || 50}%` }} className="h-full bg-[#5B6BB0] rounded-full" />
            </div>
            {daughterProfile && <div className="text-[10px] text-[#454F87] mt-2">{daughterProfile.nationality} · {daughterProfile.personality}</div>}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {targetMembers.map(member => (
              <div key={member.id} className="bg-white p-4 rounded-2xl border border-[#DAD8EE]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-[#2A2A3D]">{member.name}</span>
                  <span className="text-[11px] text-[#5B6BB0] font-mono font-bold">{member.affection}/100</span>
                </div>
                <div className="h-2 bg-[#E7E6F6] rounded-full overflow-hidden mb-1">
                  <motion.div animate={{ width: `${member.affection}%` }} className="h-full bg-[#5B6BB0] rounded-full" />
                </div>
                <div className="text-[10px] text-[#454F87]">{member.status}</div>
              </div>
            ))}
          </div>
        )}
        <div className="bg-white p-4 rounded-2xl border border-[#DAD8EE] flex flex-col gap-2">
          <div className="flex justify-between text-xs"><span className="text-[#454F87]">{lang === "traditional" ? "場景" : "场景"}</span><span className="font-bold text-[#2A2A3D]">{gameState.currentScene}</span></div>
          <div className="flex justify-between text-xs"><span className="text-[#454F87]">Round</span><span className="font-bold text-[#5B6BB0]">{roundCount}</span></div>
          {gameState.isComebackSetting && <div className="text-[10px] font-black text-[#454F87] bg-[#E7E6F6] px-2 py-1 rounded-lg">{lang === "traditional" ? "回歸期進行中" : "回归期进行中"}</div>}
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-2.5">
            <button onClick={() => { onSave(); onClose(); }} className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-[#5B6BB0] text-white rounded-2xl text-[11px] font-black shadow-[0_6px_16px_-6px_rgba(91,107,176,0.7)] active:scale-95 transition-all"><Save className="w-3.5 h-3.5" />{lang === "traditional" ? "存檔" : "存档"}</button>
            <label className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-white border border-[#DAD8EE] text-[#454F87] rounded-2xl text-[11px] font-black text-center cursor-pointer hover:bg-[#E7E6F6] active:scale-95 transition-all">
              <Sparkles className="w-3.5 h-3.5" />{lang === "traditional" ? "換壁紙" : "换壁纸"}
              <input type="file" accept="image/*" className="hidden" onChange={onWallpaperUpload} />
            </label>
          </div>
          {wallpaper && <button onClick={onClearWallpaper} className="w-full py-2.5 text-[#8b90b8] rounded-2xl text-[10px] font-black hover:text-[#FF7A93] transition-all">{lang === "traditional" ? "移除壁紙" : "移除壁纸"}</button>}
          {saveSlots.length > 0 && (
            <div className="rounded-2xl bg-white border border-[#DAD8EE] p-2.5 flex flex-col gap-2 mt-1">
              <div className="text-[9px] font-black text-[#454F87] uppercase tracking-widest px-1 flex items-center gap-1.5"><FolderOpen className="w-3 h-3" />{lang === "traditional" ? "讀檔" : "读档"}</div>
              {saveSlots.map((slot: any, si: number) => (
                <div key={slot.id} className="bg-[#F3F2FA] border border-[#DAD8EE] rounded-xl p-2.5 flex items-center gap-2.5 active:scale-[0.98] transition-all">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6C79C4] to-[#454F87] text-white flex items-center justify-center text-[11px] font-black flex-shrink-0">{saveSlots.length - si}</div>
                  <button onClick={() => { onLoad(slot.id); onClose(); }} className="flex-1 min-w-0 text-left">
                    <div className="text-[11px] font-black text-[#2A2A3D] truncate">{(slot as any).subject || slot.scene}</div>
                    <div className="text-[9px] text-[#454F87]/80 truncate mt-0.5">{slot.scene} · R{slot.round} · {slot.time}</div>
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
  });
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

  const ids = ["韩国留学生","便利店/咖啡厅打工人","娱乐公司实习生","音乐节目工作人员","妆造师/发型助理","翻译/海外商务助理","娱乐记者/博主","普通粉丝","资深粉丝","公寓同栋住户","现任女友","前任","青梅竹马","发小","暗恋对象（单向）"];
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
      <label className="text-xs font-black text-[#454F87] uppercase">{label}{max === 1 ? '（选1人）' : max ? `（选${max}人）` : '（可多选）'}</label>
      <div className="flex flex-wrap gap-2">
        {allGroups.map(g => (
          <button key={g} onClick={() => setSelectedGroup(selectedGroup === g ? null : g)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${selectedGroup === g ? 'bg-[#5B6BB0] border-[#5B6BB0] text-white' : 'bg-white border-[#DAD8EE] text-[#2A2A3D]'}`}>
            {g}
          </button>
        ))}
      </div>
      {selectedGroup && (
        <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1 custom-scrollbar">
          {(groupedMembers[selectedGroup] || []).map(m => {
            const selected = data.targets.includes(m.id);
            const disabled = !selected && !!max && data.targets.length >= max;
            return (
              <button key={m.id} onClick={() => !disabled && toggleTarget(m.id, max)}
                className={`p-3 rounded-2xl border text-[11px] transition-all flex flex-col items-center gap-1 ${selected ? 'bg-[#E7E6F6] border-[#5B6BB0] text-[#454F87] font-bold' : disabled ? 'bg-white border-[#DAD8EE] text-gray-300 cursor-not-allowed' : 'bg-white border-[#DAD8EE] text-[#2A2A3D]'}`}>
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
              <span key={id} className="text-[10px] bg-[#E7E6F6] text-[#454F87] px-2 py-1 rounded-full border border-[#DAD8EE] font-bold flex items-center gap-1">
                {m.name}<button onClick={() => toggleTarget(id)} className="text-[#5B6BB0] hover:text-[#454F87]">×</button>
              </span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );

  const flow: string[] = data.gameMode === 'mom' ? ['basics', 'mode', 'daughter'] : ['basics', 'mode', 'face', 'identity', 'idols'];
  const cur = flow[Math.min(stepIdx, flow.length - 1)];
  const isLast = stepIdx >= flow.length - 1;
  const go = (d: number) => setStepIdx(i => Math.max(0, Math.min(flow.length - 1, i + d)));
  const T = (s: string, t: string) => (lang === 'traditional' ? t : s);
  const inputCls = "w-full bg-white border border-[#DAD8EE] rounded-2xl px-4 py-3.5 text-base focus:border-[#5B6BB0] focus:ring-4 focus:ring-[#5B6BB0]/10 outline-none text-[#2A2A3D] transition-all";
  const Label = ({ icon: Icon, children }: { icon: any; children: React.ReactNode }) => (
    <label className="flex items-center gap-2 text-[13px] font-bold text-[#454F87] mb-2.5"><Icon className="w-4 h-4 text-[#5B6BB0]" /> {children}</label>
  );
  const canNext = () => {
    if (cur === 'basics') return !!data.playerName.trim();
    if (cur === 'identity') return data.identity.length > 0 || !!customIdentity.trim();
    if (cur === 'idols') return data.targets.length >= 1;
    if (cur === 'daughter') return !!(data.daughterNationality && data.daughterPersonality && data.daughterBackground);
    return true;
  };
  const finish = () => {
    const val = customIdentity.trim();
    const identity = val && !data.identity.includes(val) ? [...data.identity, val] : data.identity;
    onComplete({ ...data, identity });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 sm:p-8 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #EDEFFB 0%, #F3F2FA 45%, #F7EEF3 100%)' }}>
      <div className="absolute -top-24 -left-20 w-80 h-80 rounded-full blur-3xl opacity-40 pointer-events-none" style={{ background: 'radial-gradient(circle, #7C83C3, transparent 70%)' }} />
      <div className="absolute -bottom-28 -right-16 w-96 h-96 rounded-full blur-3xl opacity-30 pointer-events-none" style={{ background: 'radial-gradient(circle, #FF7A93, transparent 70%)' }} />
      <div className="absolute top-1/3 right-1/4 w-56 h-56 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #5B6BB0, transparent 70%)' }} />
      {showFace && (
        <FaceCustomizer appearance={data.playerAppearance} onChange={a => setData({ ...data, playerAppearance: a })} title={T('捏你的脸', '捏你的臉')} lang={lang} onClose={() => setShowFace(false)} />
      )}
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative bg-white rounded-[2rem] shadow-[0_24px_70px_-20px_rgba(60,50,110,0.45)] w-full max-w-xl overflow-hidden flex flex-col ring-1 ring-black/5">
        <div className="relative px-6 py-6 text-white overflow-hidden" style={{ background: 'linear-gradient(135deg, #6C79C4 0%, #5B6BB0 55%, #7C6BAE 100%)' }}>
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
            {flow.map((_, i) => <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === stepIdx ? 'w-7 bg-white' : i < stepIdx ? 'w-3.5 bg-white/70' : 'w-3.5 bg-white/25'}`} />)}
          </div>
        </div>
        <div className="px-6 py-8 sm:px-9 sm:py-9 flex-1 overflow-y-auto max-h-[70vh] custom-scrollbar bg-[#F3F2FA]">
          <AnimatePresence mode="wait">
            <motion.div key={cur} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="flex flex-col gap-7">
              {cur === 'basics' && (<>
                <div>
                  <Label icon={Globe}>语言 / 語言</Label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[{id:'simplified',name:'简体中文'},{id:'traditional',name:'繁體中文'}].map(l => {
                      const on = data.language === l.id;
                      return (
                        <button key={l.id} onClick={() => setData({...data, language: l.id})} className={`relative py-3.5 rounded-2xl border text-[13px] font-bold transition-all ${on ? 'bg-[#5B6BB0] border-[#5B6BB0] text-white shadow-sm' : 'bg-white border-[#DAD8EE] text-[#454F87] hover:border-[#5B6BB0]/50'}`}>
                          {on && <Check className="absolute right-2 top-2 w-3.5 h-3.5" />}{l.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div><Label icon={User}>{T('你的名字','您的名字')}</Label><input type="text" value={data.playerName} onChange={e => setData({...data, playerName: e.target.value})} className={inputCls} placeholder={T('请输入角色昵称...','請輸入角色暱稱...')} /></div>
                <div><Label icon={Cake}>{T('年龄','年齡')}</Label><input type="number" value={data.playerAge} onChange={e => setData({...data, playerAge: parseInt(e.target.value)})} className={inputCls} /></div>
                <div className="rounded-2xl bg-white border border-[#DAD8EE] p-4 sm:p-5 shadow-sm">
                  <Label icon={KeyRound}>DeepSeek API Key（{T('可选','可選')}）</Label>
                  <input type="password" value={data.playerApiKey} onChange={e => setData({...data, playerApiKey: e.target.value})} className={inputCls} placeholder={T('填入自己的key可免费无限玩～','填入自己的key可免費無限玩～')} />
                  <p className="text-[10px] text-[#454F87]/70 mt-2.5 pl-0.5 leading-relaxed">{T('不填则使用公共额度。key仅存于本地，不会上传。','不填則使用公共額度。key僅存於本地，不會上傳。')}</p>
                  {data.playerApiKey && (
                    <div className="grid grid-cols-2 gap-2 mt-2.5">
                      {[{id:'deepseek-v4-flash',name:'Flash',desc:T('快速省钱','快速省錢')},{id:'deepseek-v3',name:'V3',desc:T('质量更好','品質更好')}].map(m => (
                        <button key={m.id} onClick={() => setData({...data, playerModel: m.id})} className={`p-2.5 rounded-xl border-2 text-left transition-all ${data.playerModel === m.id ? 'bg-white border-[#5B6BB0] text-[#454F87]' : 'bg-white border-[#DAD8EE] text-[#2A2A3D]'}`}><div className="font-black text-[11px]">{m.name}</div><div className="text-[10px] opacity-60">{m.desc}</div></button>
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
                  <div className="text-xs font-black text-[#454F87] uppercase self-start">{T('捏你的脸','捏你的臉')}</div>
                  <div className="rounded-2xl p-4" style={{ background: 'radial-gradient(circle at 50% 30%, #E7E6F6, #DAD8EE)' }}><SpritePreview appearance={data.playerAppearance} size={128} /></div>
                  <button onClick={() => setShowFace(true)} className="px-6 py-2.5 rounded-xl bg-[#5B6BB0] text-white text-sm font-black hover:bg-[#454F87] transition-all flex items-center gap-2"><Sparkles className="w-4 h-4" /> {T('开始捏脸','開始捏臉')}</button>
                  <p className="text-[10px] text-[#454F87] opacity-70 text-center">{T('爱豆的样子进世界后可在「关系」面板里逐个捏。','愛豆的樣子進世界後可在「關係」面板裡逐個捏。')}</p>
                </div>
              )}

              {cur === 'identity' && (<>
                <label className="text-xs font-black text-[#454F87] uppercase">{T('选择你的身份（可多选）','選擇您的身份（可複選）')}</label>
                <div className="grid grid-cols-2 gap-2">{currentIds.map(i => (
                  <button key={i} onClick={() => setData({...data, identity: data.identity.includes(i) ? data.identity.filter(x => x !== i) : [...data.identity, i]})} className={`p-3 rounded-xl border text-[11px] transition-all ${data.identity.includes(i) ? 'bg-[#E7E6F6] border-[#5B6BB0] text-[#454F87] font-bold' : 'bg-white border-[#DAD8EE] text-[#2A2A3D]'}`}>{i}</button>
                ))}</div>
                <input type="text" value={customIdentity} onChange={e => setCustomIdentity(e.target.value)} placeholder={T('或手动输入自定义身份...','或手動輸入自訂身份...')} className="w-full bg-white border border-[#DAD8EE] rounded-xl p-3 text-base focus:ring-1 focus:ring-[#5B6BB0] outline-none text-[#2A2A3D]" onKeyDown={(e) => { if (e.key === 'Enter') { const val = customIdentity.trim(); if (val && !data.identity.includes(val)) { setData({...data, identity: [...data.identity, val]}); setCustomIdentity(''); } e.preventDefault(); } }} />
              </>)}

              {cur === 'idols' && <MemberPicker label={T('选择你的自担','選擇您的自擔')} />}

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
        <div className="p-5 sm:p-6 bg-white border-t border-[#DAD8EE] flex gap-3">
          {stepIdx > 0 && <button onClick={() => go(-1)} className="flex-1 py-3.5 bg-[#F3F2FA] text-[#454F87] rounded-2xl text-sm font-black border-2 border-[#DAD8EE] hover:bg-[#E7E6F6] transition-all">← {T('上一步','上一步')}</button>}
          <button onClick={() => isLast ? finish() : go(1)} disabled={!canNext()} style={{ background: canNext() ? 'linear-gradient(135deg, #6C79C4, #5B6BB0)' : undefined }} className="flex-[2] py-3.5 rounded-2xl text-white text-sm font-black shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-40 disabled:shadow-none disabled:translate-y-0 disabled:bg-[#B7B4D8] transition-all flex items-center justify-center gap-1.5">
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

// 剧情回顾里的正文：旁白 + 台词分行呈现（与 VN 同一套解析）
const StoryText = ({ content }: { content: string }) => {
  const script = parseScript(content);
  return (
    <div className="flex flex-col gap-2.5 text-[15px] leading-[1.85] text-[#2A2A3D]">
      {script.map((s, i) => s.kind === 'narration'
        ? <p key={i} className="text-[#3c3752]">{s.text}</p>
        : <p key={i} className="pl-3 border-l-2 border-[#DAD8EE]"><span className="font-black text-[#5B6BB0]">{s.speaker}</span><span className="text-[#8b90b8]">：</span>「{s.text}」</p>
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
  const [isTraditional, setIsTraditional] = useState(false);
  const [showSaveSlots, setShowSaveSlots] = useState(false);
  const [worldMode, setWorldMode] = useState(true); // 俯视世界视图 ⟷ 剧情对话（临时UI，不持久化）
  const [toasts, setToasts] = useState<{ id: string; text: string; kind: string }[]>([]);
  const [customizing, setCustomizing] = useState<{ kind: 'player' } | { kind: 'idol'; id: string } | null>(null);
  const [scene, setScene] = useState<{ ids: string[]; anchor: number } | null>(null);
  const worldDay = gameState.worldDay ?? 1;
  const worldSlot = gameState.worldSlot ?? 0;
  const worldLocation = gameState.worldLocation ?? 'practice_room';
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

    const initializedMembers = INITIAL_MEMBERS.map(m => {
      if (isCPMode && data.targets.includes(m.id)) {
        const otherTargetId = data.targets.find((id: string) => id !== m.id);
        const relation = (m as any).initialRelationships?.find((r: any) => r.targetId === otherTargetId);
        return { ...m, affection: relation ? relation.affinity : 0 };
      }
      return m;
    });

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
      ...gameState, ...data, members: initializedMembers,
      setupStep: SetupStep.CARDS, history: [], turnCount: 0,
      ...(startLoc ? { worldLocation: startLoc, worldDay: 1, worldSlot: 0, currentScene: startScene } : {}),
      ...(daughterProfile ? { daughterProfile, momTrustLevel: 50 } : {}),
      ...(data.playerApiKey ? { playerApiKey: data.playerApiKey, playerModel: data.playerModel } : {}),
      language: data.language
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

      next.turnCount = (prev.turnCount || 0) + 1;

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
          contentBlocks,
          currentMusicShow: musicResult || undefined,
          options: options.length > 0 ? options : undefined,
          isWeekEnd: snapshot?.isWeekEnd === true,
        }]
      };
    });
  };

  const handleSend = async (content?: any) => {
    const textToSend = typeof content === 'string' ? content : input;
    if (!textToSend || !textToSend.trim()) return;
    if (isLoading) return;
    setInput(''); setIsLoading(true);
    let nextState: GameState = { ...gameState };
    nextState.history = [...nextState.history, { role: MessageRole.USER, content: textToSend, timestamp: Date.now() }];
    setGameState(nextState);
    await handleAIStep(textToSend, nextState);
  };

  // 从俯视世界点击爱豆 → 切回剧情，预填带场景/心情语境的“走近”动作交给 DeepSeek
  const handleTalkTo = (m: Member, ctx?: { location: WorldLocation; activity: Activity }) => {
    const isTw = (gameState as any).language === 'traditional';
    const where = ctx ? `在${ctx.location.label}` : '';
    const doing = ctx ? `（她正${ctx.activity.label}，${ctx.activity.mood}）` : '';
    const line = isTw
      ? `（我${where}走近${m.name}，和ta打個招呼）${doing}`
      : `（我${where}走近${m.name}，和ta打个招呼）${doing}`;
    setScene({ ids: [m.id], anchor: gameState.history.length });
    handleSend(line);
  };

  // 推进时段：先结算"你不在场"的其它地点里同处一地的爱豆对（后台世界推进），再跳时间
  // 围观两个爱豆相遇 → 切到剧情，让 DeepSeek 演这场戏（关系模块已在 prompt 里，结算走 RELDELTA）
  const handleWatchEncounter = (a: Member, b: Member, ctx: { location: WorldLocation }) => {
    const k = pairKey(a.id, b.id);
    const isMatch = (gameState.matchmakes || []).includes(k);
    const isTw = (gameState as any).language === 'traditional';
    const hint = isMatch ? '（我想撮合她们，留意有没有暧昧的火花）' : '';
    const line = isTw
      ? `（我在${ctx.location.label}，看到 ${a.name} 和 ${b.name} 湊在一起，我在旁邊靜靜觀察她們的互動）${hint}`
      : `（我在${ctx.location.label}，看到 ${a.name} 和 ${b.name} 凑在一起，我在旁边静静观察她们的互动）${hint}`;
    setScene({ ids: [a.id, b.id], anchor: gameState.history.length });
    handleSend(line);
  };

  // 捏脸：取当前外观（覆盖或默认）+ 应用
  const appearanceFor = (t: { kind: 'player' } | { kind: 'idol'; id: string }): Appearance =>
    t.kind === 'player'
      ? (gameState.playerAppearance || getPlayerAppearance(gameState.playerName || 'you'))
      : (gameState.appearances?.[t.id] || getDefaultAppearance(t.id));
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
      return { ...prev, worldRelations: rels, worldFeed: feed.slice(0, 15), worldDay: nt.day, worldSlot: nt.slot };
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

  const lang = (gameState as any).language || 'simplified';
  const sidebarLabel = isMomMode ? '母女信任度' : isCPMode ? (lang === 'traditional' ? 'CP 羈絆值' : 'CP 羁绊值') : (lang === 'traditional' ? '角色狀態' : '角色状态');
  const modeLabel = isMomMode ? '宝妈' : isCPMode ? '助攻' : '攻略';

  const sceneConfig = getSceneConfig(gameState.currentScene);

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* VN 相遇场景 */}
      {scene && (
        <SceneView
          members={sceneMembers}
          playerName={gameState.playerName}
          appearances={gameState.appearances || {}}
          playerAppearance={gameState.playerAppearance}
          sceneBg={getSceneConfig(sceneLoc?.sceneKey || 'practice_room').bg}
          sceneLabel={sceneLoc?.label || ''}
          script={sceneScript}
          options={sceneOptions}
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
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3rem] p-10 max-w-sm w-full shadow-2xl text-center flex flex-col gap-6 border border-[#DAD8EE]">
            <div className="w-20 h-20 bg-[#E7E6F6] rounded-full flex items-center justify-center mx-auto"><RefreshCw className="w-10 h-10 text-[#5B6BB0] animate-spin-slow" /></div>
            <div><h3 className="text-xl font-black text-[#2A2A3D]">{lang === "traditional" ? "確定重置嗎？" : "确定重置吗？"}</h3><p className="text-sm text-[#454F87] mt-2">{lang === "traditional" ? "所有進度將永久刪除。" : "所有进度将永久删除。"}</p></div>
            <div className="flex flex-col gap-3">
              <button onClick={executeReset} className="w-full py-4 bg-[#2A2A3D] text-white rounded-3xl font-black text-sm hover:bg-black transition-all">{lang === "traditional" ? "確認重置" : "确认重置"}</button>
              <button onClick={() => setShowConfirmReset(false)} className="w-full py-4 bg-[#E7E6F6] text-[#454F87] rounded-3xl font-black text-sm hover:bg-[#DAD8EE] transition-all">{lang === "traditional" ? "返回" : "返回"}</button>
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

      <aside className="w-72 border-r border-[#DAD8EE] flex-shrink-0 flex-col hidden lg:flex" style={{background: 'rgba(243,242,250,0.92)'}}>
        <div className="p-6 border-b border-[#DAD8EE]">
          <h1 className="text-base font-black text-[#5B6BB0] tracking-tighter flex items-center gap-2"><Gamepad2 className="w-5 h-5" /> 爱豆收集梦想生活</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[9px] bg-[#5B6BB0] text-white px-2 py-0.5 rounded-full font-black uppercase">{modeLabel}</span>
            <span className="text-[10px] text-[#454F87] font-bold">Idol Tomodachi Life</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 custom-scrollbar">
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
            <h3 className="text-[10px] font-black text-[#454F87] uppercase tracking-widest mb-3 flex items-center gap-2"><Users className="w-3 h-3" /> {sidebarLabel}</h3>
            {isCPMode ? (
              <div className="bg-white p-4 rounded-2xl border border-[#5B6BB0]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-[#2A2A3D]">{targetMembers.map(m => m.name).join(' ♡ ')}</span>
                  <span className="text-[10px] text-[#5B6BB0] font-black">{cpAffection}/100</span>
                </div>
                <div className="h-1.5 bg-[#E7E6F6] rounded-full overflow-hidden">
                  <motion.div animate={{ width: `${cpAffection}%` }} className="h-full bg-gradient-to-r from-[#5B6BB0] to-[#454F87] rounded-full" />
                </div>
                <div className="text-[9px] text-[#454F87] mt-2 italic">
                  {cpAffection < 15 ? '互相不熟，公事公办' : cpAffection < 30 ? '有些微妙的默契' : cpAffection < 50 ? '暧昧模糊，互相试探' : cpAffection < 70 ? '明显的特殊感' : cpAffection < 85 ? '没有说破，但都知道了' : '只差最后一步'}
                </div>
              </div>
            ) : isMomMode ? (
              <div className="bg-white p-4 rounded-2xl border border-[#DAD8EE]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-[#2A2A3D]">{daughterProfile?.name || '女儿'}</span>
                  <span className="text-[10px] text-[#5B6BB0] font-mono font-bold">{momTrustLevel}/100</span>
                </div>
                <div className="h-1.5 bg-[#E7E6F6] rounded-full overflow-hidden">
                  <motion.div animate={{ width: `${momTrustLevel}%` }} className="h-full bg-[#5B6BB0] rounded-full" />
                </div>
                {daughterProfile && <div className="text-[9px] text-[#454F87] mt-1">{daughterProfile.nationality} · {daughterProfile.personality}</div>}
              </div>
            ) : (
              <div className="flex flex-col gap-2">{targetMembers.map(member => (
                <div key={member.id} className="bg-white p-4 rounded-2xl border border-[#DAD8EE]">
                  <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-[#2A2A3D]">{member.name}</span><span className="text-[10px] text-[#5B6BB0] font-mono font-bold">{member.affection}/100</span></div>
                  <div className="h-1.5 bg-[#E7E6F6] rounded-full overflow-hidden"><motion.div animate={{ width: `${member.affection}%` }} className="h-full bg-[#5B6BB0] rounded-full" /></div>
                  <div className="text-[9px] text-[#454F87] mt-1">{member.status}</div>
                </div>
              ))}</div>
            )}
          </section>
          )}
        </div>
        <div className="p-5 border-t border-[#DAD8EE] flex flex-col gap-3">
          <div className="flex gap-2.5">
            <button onClick={saveGame} className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-[#5B6BB0] text-white rounded-2xl text-[11px] font-black shadow-[0_6px_16px_-6px_rgba(91,107,176,0.7)] hover:bg-[#454F87] hover:-translate-y-0.5 transition-all"><Save className="w-3.5 h-3.5" />{lang === "traditional" ? "存檔" : "存档"}</button>
            <button onClick={() => setShowSaveSlots(!showSaveSlots)} className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-[11px] font-black border transition-all ${showSaveSlots ? 'bg-[#E7E6F6] text-[#454F87] border-[#5B6BB0]' : 'bg-white text-[#454F87] border-[#DAD8EE] hover:bg-[#E7E6F6]'}`}><FolderOpen className="w-3.5 h-3.5" />{lang === "traditional" ? "讀檔" : "读档"} <span className="px-1.5 rounded-full bg-[#5B6BB0]/10 text-[9px]">{saveSlots.length}</span></button>
          </div>
          {showSaveSlots && (
            <div className="rounded-2xl bg-[#F3F2FA] border border-[#DAD8EE] p-2.5 flex flex-col gap-2 max-h-56 overflow-y-auto custom-scrollbar">
              {saveSlots.length > 0 ? saveSlots.map((slot, si) => (
                <div key={slot.id} className="group bg-white border border-[#DAD8EE] rounded-xl p-2.5 flex items-center gap-2.5 hover:border-[#5B6BB0] hover:shadow-md transition-all">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6C79C4] to-[#454F87] text-white flex items-center justify-center text-[11px] font-black flex-shrink-0">{saveSlots.length - si}</div>
                  <button onClick={() => loadGame(slot.id)} className="flex-1 min-w-0 text-left">
                    <div className="text-[11px] font-black text-[#2A2A3D] truncate">{(slot as any).subject || slot.scene}</div>
                    <div className="text-[9px] text-[#454F87]/80 truncate mt-0.5">{slot.scene} · R{slot.round} · {slot.time}</div>
                  </button>
                  <button onClick={() => deleteSlot(slot.id)} title={lang === "traditional" ? "刪除" : "删除"} className="w-6 h-6 rounded-lg text-[#8b90b8] hover:bg-[#FF7A93]/10 hover:text-[#FF7A93] flex items-center justify-center flex-shrink-0 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )) : (
                <div className="text-[10px] text-[#454F87]/60 text-center py-4 font-bold">{lang === "traditional" ? "暫無存檔" : "暂无存档"}</div>
              )}
            </div>
          )}
          <button onClick={handleReset} className="w-full flex items-center justify-center gap-2 py-2.5 text-[#8b90b8] rounded-2xl text-[10px] font-black hover:bg-[#F3F2FA] hover:text-[#5B6BB0] transition-all"><RefreshCw className="w-3.5 h-3.5" /> {lang === "traditional" ? "重新開始" : "重新开始"}</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full lg:rounded-l-[2rem] lg:shadow-sm overflow-hidden" style={{background: 'rgba(255,255,255,0.85)'}}>
        <header className="h-16 bg-white border-b border-[#DAD8EE] px-4 flex items-center justify-between z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={handleReset} className="lg:hidden p-2 text-[#5B6BB0] hover:bg-[#E7E6F6] rounded-xl"><RefreshCw className="w-4 h-4" /></button>
            <div>
              <div className="text-[10px] text-[#454F87] font-black uppercase tracking-widest">Scene</div>
              <h2 className="text-sm font-bold flex items-center gap-1 text-[#2A2A3D]"><MapPin className="w-3 h-3 text-[#5B6BB0]" /> {gameState.currentScene}</h2>
            </div>
          </div>
          {(primaryTarget || isMomMode) && (
            <button onClick={() => setShowDrawer(true)} className="lg:hidden flex items-center gap-2 bg-[#F3F2FA] px-3 py-2 rounded-2xl border border-[#DAD8EE] active:scale-95 transition-all">
              <Heart className="w-3 h-3 text-[#5B6BB0]" />
              <span className="text-[11px] font-bold text-[#2A2A3D]">
                {isMomMode ? (daughterProfile?.name || '女儿') : isCPMode ? targetMembers.map(m => m.name).join(' ♡ ') : primaryTarget?.name}
              </span>
              <span className="text-[11px] font-black text-[#5B6BB0]">{isMomMode ? momTrustLevel : cpAffection}</span>
              <ChevronUp className="w-3 h-3 text-[#454F87]" />
            </button>
          )}
          {apiKeyMissing && <div className="bg-[#E7E6F6] text-[#454F87] text-[10px] font-black px-3 py-1 rounded-full border border-[#DAD8EE] animate-pulse">API KEY MISSING</div>}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setWorldMode(v => !v)}
              className={`flex items-center gap-1.5 text-[11px] font-black px-3 py-1.5 rounded-xl border transition-all ${worldMode ? 'bg-[#5B6BB0] text-white border-[#5B6BB0]' : 'bg-[#E7E6F6] text-[#454F87] border-[#DAD8EE] hover:bg-[#DAD8EE]'}`}
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
              className="text-[10px] font-black text-[#454F87] bg-[#E7E6F6] px-2 py-1 rounded-lg border border-[#DAD8EE] hover:bg-[#DAD8EE] transition-all"
            >
              {isTraditional ? '简' : '繁'}
            </button>
            <div className="text-right">
              <div className="text-[10px] text-[#454F87] font-bold uppercase">Round</div>
              <div className="text-sm font-bold text-[#5B6BB0]">{roundCount}</div>
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
            onTravel={setWorldLocation}
            onAdvanceTime={handleAdvanceTime}
            onTalk={handleTalkTo}
            lang={lang}
            relations={gameState.worldRelations || {}}
            intents={gameState.relationIntents || {}}
            matchmakes={gameState.matchmakes || []}
            onSetIntent={handleSetIntent}
            onToggleMatchmake={handleToggleMatchmake}
            onConfess={handleConfess}
            onIdolEncounter={handleIdolEncounter}
            worldFeed={gameState.worldFeed || []}
            onWatchEncounter={handleWatchEncounter}
            appearances={gameState.appearances || {}}
            playerAppearance={gameState.playerAppearance}
            onCustomize={setCustomizing}
          />
        </div>
        ) : (
        <>
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 custom-scrollbar" style={{background: "transparent"}}>
          <div className="max-w-2xl w-full mx-auto flex flex-col gap-6">
            <div className="flex items-center justify-center gap-2 text-[10px] font-black text-[#454F87]/60 uppercase tracking-[0.2em]">
              <span className="h-px w-8 bg-[#DAD8EE]" /><Zap className="w-3 h-3" /> {lang === 'traditional' ? '劇情回顧' : '剧情回顾'}<span className="h-px w-8 bg-[#DAD8EE]" />
            </div>
            <AnimatePresence initial={false}>
            {gameState.history.map((msg, i) => {
              const isLatest = i === gameState.history.length - 1;
              const blocks = (msg as any).contentBlocks as ContentBlock[] | undefined;
              if (msg.role === MessageRole.USER) {
                return (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 my-0.5">
                    <div className="flex-1 h-px bg-[#DAD8EE]/70" />
                    <div className="px-3.5 py-1.5 rounded-full bg-[#E7E6F6] text-[#454F87] text-[12px] font-bold max-w-[80%] truncate">{msg.content}</div>
                    <div className="flex-1 h-px bg-[#DAD8EE]/70" />
                  </motion.div>
                );
              }
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-white/95 border border-[#DAD8EE] shadow-[0_6px_24px_-12px_rgba(60,50,110,0.3)] overflow-hidden">
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
                        className="self-start flex items-center gap-2 text-xs font-black text-[#5B6BB0] bg-[#F3F2FA] px-3 py-2 rounded-xl border border-[#DAD8EE] hover:bg-[#E7E6F6]"><RefreshCw className="w-3 h-3" /> {lang === "traditional" ? "重試" : "重试"}</button>
                    )}
                  </div>
                </motion.div>
              );
            })}
            </AnimatePresence>
            {isLoading && (
              <div className="rounded-3xl bg-white/95 border border-[#DAD8EE] p-5 flex gap-2 w-fit">
                <div className="w-2 h-2 bg-[#5B6BB0] rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-[#5B6BB0] rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-[#5B6BB0] rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        <div className="p-4 md:p-6 bg-white border-t border-[#DAD8EE] flex-shrink-0">
          <div className="max-w-3xl mx-auto flex gap-3">
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={lang === "traditional" ? "輸入您的行動..." : "输入你的行动..."}
              className="flex-1 bg-[#F3F2FA] border border-[#DAD8EE] rounded-3xl px-6 py-4 text-base focus:ring-2 focus:ring-[#5B6BB0] resize-none h-14 custom-scrollbar outline-none text-[#2A2A3D]"
              disabled={isLoading} />
            <button onClick={() => handleSend()} disabled={isLoading || !input.trim()} className="bg-[#5B6BB0] text-white px-5 rounded-3xl active:scale-95 disabled:opacity-50 flex-shrink-0 hover:bg-[#454F87] transition-all"><Send className="w-5 h-5" /></button>
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
        .markdown-container blockquote { border-left: 3px solid #DAD8EE; padding-left: 0.75rem; color: #454F87; margin: 0.75rem 0; }
        .markdown-container strong { font-weight: 900; color: #5B6BB0; }
        .markdown-container hr { border: none; border-top: 1px solid #DAD8EE; margin: 1rem 0; }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
      `}</style>
    </div>
  );
}
