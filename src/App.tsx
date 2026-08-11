import React, { useState, useEffect, useRef } from 'react';
import { Send, RefreshCw, Users, Eye, MapPin, Gamepad2, Heart, Zap, Sparkles, X, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { GameState, INITIAL_MEMBERS, ChatMessage, MessageRole, Member, TheqooPost, SetupStep } from './types';
import { callGeminiAPI } from './geminiService';
import { getSceneConfig } from './sceneConfig';
import WorldView from './WorldView';
import { nextTime, type WorldLocation, type Activity } from './worldConfig';

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
        <div className="px-4 py-4 space-y-3 min-h-[80px] bg-[#B2C7D9]/20">
          {data.messages?.map((msg: any, idx: number) => (
            <div key={idx} className="flex items-end gap-2">
              <div className="w-7 h-7 rounded-full bg-[#FAE100] flex items-center justify-center text-sm flex-shrink-0">{data.avatar || '👤'}</div>
              <div className="flex flex-col gap-0.5 max-w-[75%]">
                <div className="bg-white rounded-2xl rounded-tl-none px-3 py-2 shadow-sm">
                  <p className="text-[12px] text-gray-800 leading-relaxed font-medium">{msg.text}</p>
                  {msg.translation && <p className="text-[11px] text-[#A0663A] mt-0.5 leading-relaxed">{msg.translation}</p>}
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
    <div className="text-center mt-2"><span className="text-[10px] text-[#A0663A] font-bold uppercase tracking-widest">KakaoTalk</span></div>
  </div>
);

const WeversePostUI = ({ data }: { data: any }) => (
  <div className="my-6 max-w-sm mx-auto font-sans bg-white rounded-3xl overflow-hidden shadow-sm border border-[#EAE0D5]">
    <div className="px-4 py-3 flex items-center justify-between border-b border-[#EAE0D5]">
      <div className="flex items-center gap-3">
        <span className="text-[#A0663A] text-lg">{'<'}</span>
        <div><div className="text-[14px] font-bold text-[#3D2B1F]">帖子</div><div className="text-[10px] text-[#C4936A]">前往社区 {'>'}</div></div>
      </div>
      <div className="flex gap-4 text-[#A0663A] text-lg"><span>↗</span><span>✕</span></div>
    </div>
    <div className="px-4 pt-4 pb-2 flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-[#F5E6D0] flex items-center justify-center flex-shrink-0">
        <span className="text-[#A0663A] font-black text-sm">{data.artist?.[0] || '★'}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-1">
          <span className="text-[14px] font-bold text-[#3D2B1F]">{data.artist}</span>
          <span className="text-[#C4936A] text-[14px]">✓</span>
        </div>
        <div className="text-[11px] text-[#A0663A]">{data.time}</div>
        <div className="text-[11px] text-[#C4936A] mt-0.5">查看原文 (한국어)</div>
      </div>
      <span className="text-[#A0663A] text-lg">⋯</span>
    </div>
    <div className="px-4 pb-3"><p className="text-[14px] text-[#3D2B1F] leading-relaxed">{data.content}</p></div>
    {data.imageDesc && (
      <div className="w-full bg-[#F5E6D0] aspect-[4/3] flex flex-col items-center justify-center gap-2 p-4">
        <span className="text-[#A0663A] text-xl">🖼</span>
        <p className="text-[11px] text-[#A0663A] text-center italic">{data.imageDesc}</p>
      </div>
    )}
    <div className="px-4 py-3 flex items-center gap-6 border-t border-[#EAE0D5]">
      <button className="flex items-center gap-1.5 text-[#A0663A]"><Heart className="w-5 h-5" /><span className="text-[12px]">{(data.likes || 0).toLocaleString()}</span></button>
      <button className="text-[#A0663A] text-xl">🔖</button>
    </div>
  </div>
);

const BubbleMessageUI = ({ data }: { data: any }) => (
  <div className="my-6 max-w-sm mx-auto font-sans bg-[#F0EBE3] rounded-3xl overflow-hidden shadow-sm">
    <div className="px-4 py-3 flex items-center justify-between bg-[#F0EBE3] border-b border-[#EAE0D5]">
      <span className="text-[#C4936A] text-[14px]">{'<'}</span>
      <span className="text-[16px] font-bold text-[#3D2B1F]">{data.artist}</span>
      <div className="flex gap-4"><span className="text-[#A0663A]">🔍</span><span className="text-[#A0663A]">⋯</span></div>
    </div>
    <div className="px-4 py-4 space-y-2">
      {data.messages?.map((msg: any, idx: number) => (
        <div key={idx} className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[#3D2B1F] flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-[16px]">🐱</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-bold text-white bg-[#C4936A] px-1.5 py-0.5 rounded">ARTIST</span>
              <span className="text-[12px] font-bold text-[#3D2B1F]">{data.artist}</span>
            </div>
            <div className="bg-white rounded-2xl rounded-tl-none px-3 py-2 inline-block max-w-[85%] border border-[#EAE0D5]">
              <p className="text-[13px] text-[#3D2B1F] leading-relaxed">{msg.text}</p>
              {msg.translation && <p className="text-[12px] text-[#C4936A] mt-0.5 leading-relaxed">{msg.translation}</p>}
            </div>
            <div className="text-[10px] text-[#A0663A] mt-1 pl-1">{msg.time}</div>
          </div>
        </div>
      ))}
    </div>
    <div className="px-4 py-3 bg-[#F0EBE3] border-t border-[#EAE0D5] flex items-center justify-end gap-4">
      <span className="text-[#A0663A] text-xl">☺</span><span className="text-[#C4936A] text-xl">➤</span>
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
              <div className="w-8 h-8 rounded-xl bg-[#F5E6D0] flex-shrink-0 flex items-center justify-center text-[#A0663A] font-black text-xs">{idx + 1}</div>
              <div className="flex-1">
                <span className="text-[10px] font-black text-[#A0663A]">@{comment.authorId}</span>
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
    <div className="bg-white border border-[#EAE0D5] rounded-3xl overflow-hidden shadow-sm my-6 max-w-md mx-auto font-sans">
      <div className="bg-[#C4936A] p-5 text-white text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-20"><Sparkles className="w-12 h-12" /></div>
        <div className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Artist Profile</div>
        <h3 className="text-xl font-bold">{card.name} {card.stageName ? `(${card.stageName})` : ''}</h3>
      </div>
      <div className="p-5 space-y-4 text-left">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#EAE0D5]"><div className="text-[#A0663A] font-black mb-1 uppercase text-[9px]">Group</div><div className="font-bold text-[#3D2B1F]">{card.group || '未知团体'}</div></div>
          <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#EAE0D5]"><div className="text-[#A0663A] font-black mb-1 uppercase text-[9px]">Status</div><div className="font-bold text-[#3D2B1F]">{card.status || '活跃中'}</div></div>
        </div>
        {card.publicPersona && <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#EAE0D5] text-xs"><span className="font-black text-[#C4936A] block uppercase text-[9px] mb-1">Public Persona</span><p className="text-[#3D2B1F] italic">"{card.publicPersona}"</p></div>}
        {card.realPersonality && <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#EAE0D5] text-xs"><span className="font-black text-[#A0663A] block uppercase text-[9px] mb-1">Real Personality</span><p className="text-[#3D2B1F]">{card.realPersonality}</p></div>}
        {Array.isArray(card.weaknesses) && card.weaknesses.length > 0 && (
          <div className="flex flex-wrap gap-2">{card.weaknesses.map((item: string, i: number) => <span key={i} className="text-[10px] px-3 py-1 bg-[#F5E6D0] text-[#A0663A] rounded-full border border-[#EAE0D5] font-bold"># {item}</span>)}</div>
        )}
        {card.hiddenStory && <div className="pt-2 border-t border-dashed border-[#EAE0D5]"><span className="font-black text-[#A0663A] block uppercase text-[9px] mb-1">Hidden Story</span><p className="text-[11px] text-[#A0663A] italic">{card.hiddenStory}</p></div>}
      </div>
    </div>
  );
};

const MusicShowUI = ({ result }: { result: any }) => (
  <div className="bg-white border border-[#EAE0D5] rounded-[2rem] overflow-hidden shadow-sm my-6 max-w-lg mx-auto font-sans">
    <div className="bg-[#C4936A] p-5 text-white text-center relative">
      <div className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Music Bank / Inkigayo</div>
      <h3 className="text-xl font-black tracking-widest">WEEKLY CHAMPION</h3>
      <div className="absolute top-2 right-4 opacity-30"><Sparkles className="w-8 h-8" /></div>
    </div>
    <div className="p-5 space-y-4">
      <div className="flex flex-col items-center py-4 bg-[#FAF7F2] rounded-3xl border border-[#EAE0D5]">
        <div className="text-[10px] font-black text-[#A0663A] uppercase mb-1">本次优胜 / Winner</div>
        <div className="text-2xl font-black text-[#3D2B1F]">{result.winner}</div>
        <div className="mt-2 flex gap-1">{[1,2,3].map(i => <Sparkles key={i} className="w-4 h-4 text-[#C4936A] animate-pulse" />)}</div>
      </div>
      <div className="space-y-3">
        {result.scores?.map((score: any, idx: number) => (
          <div key={idx} className={`p-4 rounded-2xl border ${score.group === result.winner ? 'bg-[#F5E6D0] border-[#C4936A]' : 'bg-white border-[#EAE0D5]'}`}>
            <div className="flex justify-between items-center mb-2"><span className="font-bold text-sm text-[#3D2B1F]">{score.group}</span><span className="font-black text-[#C4936A] text-sm">{score.total} pt</span></div>
            <div className="grid grid-cols-5 gap-1">
              {['digital','physical','sns','preVote','broadcast'].map((key, i) => (
                <div key={i} className="text-center"><div className="text-[8px] text-[#A0663A] font-bold uppercase truncate">{['音源','销量','SNS','投票','放送'][i]}</div><div className="text-[10px] font-bold text-[#3D2B1F]">{score[key]}</div></div>
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
    <div className="mt-5 rounded-2xl bg-[#FAF7F2] border border-[#EAE0D5] p-4">
      <div className="text-[9px] font-black text-[#A0663A] uppercase tracking-widest mb-3">{l === "traditional" ? "可選行動" : "可选行动"}</div>
      <div className="space-y-2.5">
        {options.map((opt: any, i) => {
          const text = typeof opt === 'string' ? opt : opt.text;
          return <div key={i} className="text-[13px] text-[#C4936A] font-bold leading-relaxed">{text}</div>;
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
      className="fixed inset-x-0 bottom-0 z-50 bg-[#FAF7F2] rounded-t-[2rem] shadow-2xl border-t border-[#EAE0D5] max-h-[70vh] overflow-y-auto">
      <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 bg-[#EAE0D5] rounded-full"></div></div>
      <div className="flex items-center justify-between px-6 pb-4 border-b border-[#EAE0D5]">
        <h3 className="font-black text-[#C4936A] text-sm uppercase tracking-widest">
          {isMomMode ? '母女信任度' : isCPMode ? (lang === 'traditional' ? 'CP 羈絆值' : 'CP 羁绊值') : (lang === 'traditional' ? '角色狀態' : '角色状态')}
        </h3>
        <button onClick={onClose} className="p-2 hover:bg-[#F5E6D0] rounded-full transition-all"><X className="w-4 h-4 text-[#A0663A]" /></button>
      </div>
      <div className="p-5 space-y-5">
        {isCPMode ? (
          <div className="bg-white p-4 rounded-2xl border border-[#C4936A]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-[#3D2B1F]">{targetMembers.map(m => m.name).join(' ♡ ')}</span>
              <span className="text-[11px] text-[#C4936A] font-black">{cpAffection}/100</span>
            </div>
            <div className="h-2 bg-[#F5E6D0] rounded-full overflow-hidden">
              <motion.div animate={{ width: `${cpAffection}%` }} className="h-full bg-gradient-to-r from-[#C4936A] to-[#A0663A] rounded-full" />
            </div>
          </div>
        ) : isMomMode ? (
          <div className="bg-white p-4 rounded-2xl border border-[#EAE0D5]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-[#3D2B1F]">{daughterProfile?.name || '女儿'}</span>
              <span className="text-[11px] text-[#C4936A] font-mono font-bold">{(gameState as any).momTrustLevel || 50}/100</span>
            </div>
            <div className="h-2 bg-[#F5E6D0] rounded-full overflow-hidden">
              <motion.div animate={{ width: `${(gameState as any).momTrustLevel || 50}%` }} className="h-full bg-[#C4936A] rounded-full" />
            </div>
            {daughterProfile && <div className="text-[10px] text-[#A0663A] mt-2">{daughterProfile.nationality} · {daughterProfile.personality}</div>}
          </div>
        ) : (
          <div className="space-y-3">
            {targetMembers.map(member => (
              <div key={member.id} className="bg-white p-4 rounded-2xl border border-[#EAE0D5]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-[#3D2B1F]">{member.name}</span>
                  <span className="text-[11px] text-[#C4936A] font-mono font-bold">{member.affection}/100</span>
                </div>
                <div className="h-2 bg-[#F5E6D0] rounded-full overflow-hidden mb-1">
                  <motion.div animate={{ width: `${member.affection}%` }} className="h-full bg-[#C4936A] rounded-full" />
                </div>
                <div className="text-[10px] text-[#A0663A]">{member.status}</div>
              </div>
            ))}
          </div>
        )}
        <div className="bg-white p-4 rounded-2xl border border-[#EAE0D5] space-y-2">
          <div className="flex justify-between text-xs"><span className="text-[#A0663A]">{lang === "traditional" ? "場景" : "场景"}</span><span className="font-bold text-[#3D2B1F]">{gameState.currentScene}</span></div>
          <div className="flex justify-between text-xs"><span className="text-[#A0663A]">Round</span><span className="font-bold text-[#C4936A]">{roundCount}</span></div>
          {gameState.isComebackSetting && <div className="text-[10px] font-black text-[#A0663A] bg-[#F5E6D0] px-2 py-1 rounded-lg">{lang === "traditional" ? "回歸期進行中" : "回归期进行中"}</div>}
        </div>
        <div className="space-y-2">
          <button onClick={() => { onSave(); onClose(); }} className="w-full py-3 bg-[#C4936A] text-white rounded-2xl text-[10px] font-black uppercase hover:bg-[#A0663A] transition-all">{lang === "traditional" ? "💾 存檔" : "💾 存档"}</button>
          <label className="w-full py-3 bg-white border border-[#EAE0D5] text-[#A0663A] rounded-2xl text-[10px] font-black uppercase text-center cursor-pointer hover:bg-[#F5E6D0] transition-all block">
            🖼 {lang === "traditional" ? "換壁紙" : "换壁纸"}
            <input type="file" accept="image/*" className="hidden" onChange={onWallpaperUpload} />
          </label>
          {wallpaper && <button onClick={onClearWallpaper} className="w-full py-3 bg-white border border-[#EAE0D5] text-[#A0663A] rounded-2xl text-[10px] font-black uppercase hover:bg-[#F5E6D0] transition-all">{lang === "traditional" ? "🗑 移除壁紙" : "🗑 移除壁纸"}</button>}
          {saveSlots.length > 0 && (
            <div className="space-y-2">
              <div className="text-[9px] font-black text-[#A0663A] uppercase">读档</div>
              {saveSlots.map((slot: any) => (
                <div key={slot.id} className="bg-white border border-[#EAE0D5] rounded-xl p-3 flex items-center justify-between gap-2">
                  <button onClick={() => { onLoad(slot.id); onClose(); }} className="flex-1 text-left">
                    <div className="text-[10px] font-black text-[#3D2B1F]">{(slot as any).subject || slot.scene}</div>
                    <div className="text-[9px] text-[#A0663A]">{slot.scene} · Round {slot.round} · {slot.time}</div>
                  </button>
                  <button onClick={() => onDelete(slot.id)} className="text-[#C4936A] text-[10px] hover:text-[#A0663A]">✕</button>
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
  const [step, setStep] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [data, setData] = useState({
    playerName: '', playerAge: 19, identity: [] as string[],
    gameMode: 'romance' as string, targets: [] as string[], selectedCPs: [] as string[],
    daughterNationality: '', daughterPersonality: '', daughterBackground: '', daughterName: '',
    playerApiKey: '', playerModel: 'deepseek-v4-flash', language: 'simplified'
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
  const currentIds = data.gameMode === 'CPCP' ? cpIds : ids;

  const modes = [
    { id: 'romance', name: '攻略模式', desc: '爱豆失德中' },
    { id: 'CPCP', name: '助攻模式', desc: '红线拉起来' },
    { id: 'mom', name: '宝妈模式', desc: '养成系养一下' }
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
    <div className="space-y-3">
      <label className="text-xs font-black text-[#A0663A] uppercase">{label}{max === 1 ? '（选1人）' : max ? `（选${max}人）` : '（可多选）'}</label>
      <div className="flex flex-wrap gap-2">
        {allGroups.map(g => (
          <button key={g} onClick={() => setSelectedGroup(selectedGroup === g ? null : g)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${selectedGroup === g ? 'bg-[#C4936A] border-[#C4936A] text-white' : 'bg-white border-[#EAE0D5] text-[#3D2B1F]'}`}>
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
                className={`p-3 rounded-2xl border text-[11px] transition-all flex flex-col items-center gap-1 ${selected ? 'bg-[#F5E6D0] border-[#C4936A] text-[#A0663A] font-bold' : disabled ? 'bg-white border-[#EAE0D5] text-gray-300 cursor-not-allowed' : 'bg-white border-[#EAE0D5] text-[#3D2B1F]'}`}>
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
              <span key={id} className="text-[10px] bg-[#F5E6D0] text-[#A0663A] px-2 py-1 rounded-full border border-[#EAE0D5] font-bold flex items-center gap-1">
                {m.name}<button onClick={() => toggleTarget(id)} className="text-[#C4936A] hover:text-[#A0663A]">×</button>
              </span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );

  const canProceedStep4 = () => {
    if (data.gameMode === 'CPCP') return data.targets.length === 2;
    if (data.gameMode === 'mom') return !!(data.daughterNationality && data.daughterPersonality && data.daughterBackground);
    return data.targets.length >= 1;
  };

  const totalSteps = data.gameMode === 'mom' ? 3 : 4;

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4 py-12">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white border border-[#EAE0D5] rounded-[2.5rem] shadow-sm w-full max-w-xl overflow-hidden flex flex-col">
        <div className="bg-[#C4936A] p-8 text-white text-center">
          <h2 className="text-2xl font-bold tracking-widest mb-1">爱豆收集梦想生活</h2>
          <p className="text-xs opacity-80">Step {step} of {totalSteps}</p>
        </div>
        <div className="p-8 flex-1 overflow-y-auto max-h-[65vh] custom-scrollbar bg-[#FAF7F2]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-black text-[#A0663A] uppercase">语言 / 語言</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{id:'simplified',name:'简体中文'},{id:'traditional',name:'繁體中文'}].map(l => (
                      <button key={l.id} onClick={() => setData({...data, language: l.id})}
                        className={`p-3 rounded-xl border text-[13px] font-bold transition-all ${data.language === l.id ? 'bg-[#F5E6D0] border-[#C4936A] text-[#A0663A]' : 'bg-white border-[#EAE0D5] text-[#3D2B1F]'}`}>
                        {l.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2"><label className="text-xs font-black text-[#A0663A] uppercase">{lang === "traditional" ? "您的名字" : "你的名字"}</label><input type="text" value={data.playerName} onChange={e => setData({...data, playerName: e.target.value})} className="w-full bg-white border border-[#EAE0D5] rounded-2xl p-4 text-base focus:ring-2 focus:ring-[#C4936A] outline-none text-[#3D2B1F]" placeholder={lang === "traditional" ? "請輸入角色暱稱..." : "请输入角色昵称..."} /></div>
                <div className="space-y-2"><label className="text-xs font-black text-[#A0663A] uppercase">{lang === "traditional" ? "年齡" : "年龄"}</label><input type="number" value={data.playerAge} onChange={e => setData({...data, playerAge: parseInt(e.target.value)})} className="w-full bg-white border border-[#EAE0D5] rounded-2xl p-4 text-base focus:ring-2 focus:ring-[#C4936A] outline-none text-[#3D2B1F]" /></div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-[#A0663A] uppercase">DeepSeek API Key（可选）</label>
                  <input type="password" value={data.playerApiKey} onChange={e => setData({...data, playerApiKey: e.target.value})} className="w-full bg-white border border-[#EAE0D5] rounded-2xl p-4 text-base focus:ring-2 focus:ring-[#C4936A] outline-none text-[#3D2B1F]" placeholder="填入自己的key可免费无限玩～" />
                  <p className="text-[10px] text-[#A0663A] opacity-70">不填则使用公共额度（可能较慢）。key仅存于本地，不会上传。</p>
                </div>
                {data.playerApiKey && (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-[#A0663A] uppercase">选择模型</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[{id:'deepseek-v4-flash',name:'Flash',desc:'快速省钱'},{id:'deepseek-v3',name:'V3',desc:'质量更好'}].map(m => (
                        <button key={m.id} onClick={() => setData({...data, playerModel: m.id})}
                          className={`p-3 rounded-xl border text-left transition-all ${data.playerModel === m.id ? 'bg-[#F5E6D0] border-[#C4936A] text-[#A0663A]' : 'bg-white border-[#EAE0D5] text-[#3D2B1F]'}`}>
                          <div className="font-bold text-[11px]">{m.name}</div>
                          <div className="text-[10px] opacity-60">{m.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={() => setStep(2)} disabled={!data.playerName} className="w-full bg-[#C4936A] text-white py-4 rounded-2xl font-bold disabled:opacity-50 hover:bg-[#A0663A] transition-all">{lang === "traditional" ? "繼續" : "继续"}</button>
              </motion.div>
            )}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <label className="text-xs font-black text-[#A0663A] uppercase">{lang === "traditional" ? "選擇模式" : "选择模式"}</label>
                <div className="space-y-3">{modes.map(m => (
                  <button key={m.id} onClick={() => { setData({...data, gameMode: m.id, targets: [], identity: [], daughterNationality: '', daughterPersonality: '', daughterBackground: '', daughterName: '', playerApiKey: data.playerApiKey}); setSelectedGroup(null); }}
                    className={`w-full p-4 rounded-2xl border text-left transition-all ${data.gameMode === m.id ? 'bg-[#F5E6D0] border-[#C4936A] text-[#A0663A]' : 'bg-white border-[#EAE0D5] text-[#3D2B1F]'}`}>
                    <div className="font-bold text-sm">{m.name}</div>
                    <div className="text-[10px] opacity-60 mt-1">{m.desc}</div>
                  </button>
                ))}</div>
                <button onClick={() => setStep(1)} className="w-full py-3 bg-white text-[#A0663A] rounded-2xl text-sm font-bold border border-[#EAE0D5] hover:bg-[#F5E6D0] transition-all">{lang === "traditional" ? "← 上一步" : "← 上一步"}</button>
                <button onClick={() => data.gameMode === 'mom' ? setStep(4) : setStep(3)} className="w-full bg-[#C4936A] text-white py-4 rounded-2xl font-bold hover:bg-[#A0663A] transition-all">{lang === "traditional" ? "下一步" : "下一步"}</button>
              </motion.div>
            )}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <label className="text-xs font-black text-[#A0663A] uppercase">{lang === "traditional" ? "選擇您的身份（可複選）" : "选择你的身份 (可多选)"}</label>
                <div className="grid grid-cols-2 gap-2">{currentIds.map(i => (
                  <button key={i} onClick={() => setData({...data, identity: data.identity.includes(i) ? data.identity.filter(x => x !== i) : [...data.identity, i]})}
                    className={`p-3 rounded-xl border text-[11px] transition-all ${data.identity.includes(i) ? 'bg-[#F5E6D0] border-[#C4936A] text-[#A0663A] font-bold' : 'bg-white border-[#EAE0D5] text-[#3D2B1F]'}`}>
                    {i}
                  </button>
                ))}</div>
                <input type="text" value={customIdentity} onChange={e => setCustomIdentity(e.target.value)}
                  placeholder={lang === "traditional" ? "或手動輸入自訂身份..." : "或手动输入自定义身份..."}
                  className="w-full bg-white border border-[#EAE0D5] rounded-xl p-3 text-base focus:ring-1 focus:ring-[#C4936A] outline-none text-[#3D2B1F]"
                  onKeyDown={(e) => { if (e.key === 'Enter') { const val = customIdentity.trim(); if (val && !data.identity.includes(val)) { setData({...data, identity: [...data.identity, val]}); setCustomIdentity(''); } e.preventDefault(); } }} />
                <button onClick={() => setStep(2)} className="w-full py-3 bg-white text-[#A0663A] rounded-2xl text-sm font-bold border border-[#EAE0D5] hover:bg-[#F5E6D0] transition-all">{lang === "traditional" ? "← 上一步" : "← 上一步"}</button>
                <button onClick={() => { const val = customIdentity.trim(); const newIdentity = val && !data.identity.includes(val) ? [...data.identity, val] : data.identity; setData({...data, identity: newIdentity}); if (newIdentity.length > 0) setStep(4); }}
                  disabled={data.identity.length === 0 && !customIdentity.trim()} className="w-full bg-[#C4936A] text-white py-4 rounded-2xl font-bold disabled:opacity-50 hover:bg-[#A0663A] transition-all">{lang === "traditional" ? "繼續" : "继续"}</button>
              </motion.div>
            )}
            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                {data.gameMode === 'romance' && <MemberPicker label={lang === "traditional" ? "選擇您的自擔" : "选择你的自担"} />}
                {data.gameMode === 'CPCP' && <MemberPicker label={lang === "traditional" ? "選兩個人來拉紅線" : "选两个人来拉郎"} max={2} />}
                {data.gameMode === 'mom' && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-[#A0663A] uppercase">{lang === "traditional" ? "女兒國籍" : "女儿国籍"}</label>
                      <div className="grid grid-cols-2 gap-2">
                        {nationalities.map(n => (
                          <button key={n} onClick={() => setData({...data, daughterNationality: n})}
                            className={`p-3 rounded-xl border text-[11px] transition-all ${data.daughterNationality === n ? 'bg-[#F5E6D0] border-[#C4936A] text-[#A0663A] font-bold' : 'bg-white border-[#EAE0D5] text-[#3D2B1F]'}`}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-[#A0663A] uppercase">{lang === "traditional" ? "女兒性格" : "女儿性格"}</label>
                      <div className="space-y-2">
                        {personalities.map(p => (
                          <button key={p.id} onClick={() => setData({...data, daughterPersonality: p.id})}
                            className={`w-full p-3 rounded-xl border text-left transition-all ${data.daughterPersonality === p.id ? 'bg-[#F5E6D0] border-[#C4936A] text-[#A0663A]' : 'bg-white border-[#EAE0D5] text-[#3D2B1F]'}`}>
                            <div className="font-bold text-[11px]">{p.id}</div>
                            <div className="text-[10px] opacity-60 mt-0.5">{p.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-[#A0663A] uppercase">{lang === "traditional" ? "女兒的名字（選填，不填由AI生成）" : "女儿的名字（选填，不填由AI生成）"}</label>
                      <input type="text" value={data.daughterName}
                        onChange={e => setData({...data, daughterName: e.target.value})}
                        className="w-full bg-white border border-[#EAE0D5] rounded-2xl p-4 text-base focus:ring-2 focus:ring-[#C4936A] outline-none text-[#3D2B1F]"
                        placeholder={lang === "traditional" ? "給女兒起個名字..." : "给女儿起个名字..."} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-[#A0663A] uppercase">{lang === "traditional" ? "家庭背景" : "家庭背景"}</label>
                      <div className="grid grid-cols-3 gap-2">
                        {backgrounds.map(b => (
                          <button key={b} onClick={() => setData({...data, daughterBackground: b})}
                            className={`p-3 rounded-xl border text-[11px] transition-all ${data.daughterBackground === b ? 'bg-[#F5E6D0] border-[#C4936A] text-[#A0663A] font-bold' : 'bg-white border-[#EAE0D5] text-[#3D2B1F]'}`}>
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <button onClick={() => { setStep(data.gameMode === 'mom' ? 2 : 3); setSelectedGroup(null); setData({...data, targets: []}); }} className="w-full py-3 bg-white text-[#A0663A] rounded-2xl text-sm font-bold border border-[#EAE0D5] hover:bg-[#F5E6D0] transition-all">{lang === "traditional" ? "← 上一步" : "← 上一步"}</button>
                <button onClick={() => onComplete(data)} disabled={!canProceedStep4()} className="w-full bg-[#C4936A] text-white py-4 rounded-2xl font-bold hover:bg-[#A0663A] transition-all disabled:opacity-50">{lang === "traditional" ? "開始！" : "Start!"}</button>
              </motion.div>
            )}
          </AnimatePresence>
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

const MarkdownBlock = ({ content }: { content: string }) => (
  <Markdown components={{
    p: ({children}) => {
      const text = String(children);
      const isOption = /^[A-C][\.、。]/.test(text);
      return <p className={isOption ? 'text-[#C4936A] font-bold' : ''}>{children}</p>;
    }
  }}>{content}</Markdown>
);

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
  const [worldMode, setWorldMode] = useState(true); // 俯视世界视图 ⟷ 剧情对话
  const [worldDay, setWorldDay] = useState(1);
  const [worldSlot, setWorldSlot] = useState(0);
  const [worldLocation, setWorldLocation] = useState('practice_room');
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

  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(gameState)); }, [gameState]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [gameState.history]);
  useEffect(() => { setApiKeyMissing(!import.meta.env.VITE_DEEPSEEK_API_KEY); }, []);

  const handleCreationComplete = (data: any) => {
    const isCPMode = data.gameMode === 'CPCP';
    const isMomMode = data.gameMode === 'mom';
    const targetNames = INITIAL_MEMBERS.filter(m => data.targets.includes(m.id)).map(m => m.name);

    let summary = `我的名字是 ${data.playerName}，`;
    if (isMomMode) {
      summary += `我是一位妈妈。女儿设定：国籍${data.daughterNationality}，性格${data.daughterPersonality}，家庭背景${data.daughterBackground}${data.daughterName ? `，名字${data.daughterName}` : ''}。请根据这些设定生成女儿的虚构角色，然后从她8岁那年开始故事。`;
    } else {
      summary += `身份是 ${(data.identity || []).join(', ') || '普通人'}。${isCPMode ? `我想撮合 ${targetNames.join(' 和 ')}。` : `我想关注 ${targetNames.join(', ')}。`}游戏模式：${data.gameMode}。故事开始。`;
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

    const newState: GameState = {
      ...gameState, ...data, members: initializedMembers,
      setupStep: SetupStep.CARDS, history: [], turnCount: 0,
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
    setWorldMode(false);
    const isTw = (gameState as any).language === 'traditional';
    const where = ctx ? `在${ctx.location.label}` : '';
    const doing = ctx ? `（她正${ctx.activity.label}，${ctx.activity.mood}）` : '';
    setInput(isTw
      ? `（我${where}走近${m.name}，和ta打個招呼）${doing}`
      : `（我${where}走近${m.name}，和ta打个招呼）${doing}`);
  };

  const handleAdvanceTime = () => {
    const { day, slot } = nextTime(worldDay, worldSlot);
    setWorldDay(day); setWorldSlot(slot);
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

  const lang = (gameState as any).language || 'simplified';
  const sidebarLabel = isMomMode ? '母女信任度' : isCPMode ? (lang === 'traditional' ? 'CP 羈絆值' : 'CP 羁绊值') : (lang === 'traditional' ? '角色狀態' : '角色状态');
  const modeLabel = isMomMode ? '宝妈' : isCPMode ? '助攻' : '攻略';

  const sceneConfig = getSceneConfig(gameState.currentScene);

  return (
    <div className="flex h-screen overflow-hidden relative">
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
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3rem] p-10 max-w-sm w-full shadow-2xl text-center space-y-6 border border-[#EAE0D5]">
            <div className="w-20 h-20 bg-[#F5E6D0] rounded-full flex items-center justify-center mx-auto"><RefreshCw className="w-10 h-10 text-[#C4936A] animate-spin-slow" /></div>
            <div><h3 className="text-xl font-black text-[#3D2B1F]">{lang === "traditional" ? "確定重置嗎？" : "确定重置吗？"}</h3><p className="text-sm text-[#A0663A] mt-2">{lang === "traditional" ? "所有進度將永久刪除。" : "所有进度将永久删除。"}</p></div>
            <div className="flex flex-col gap-3">
              <button onClick={executeReset} className="w-full py-4 bg-[#3D2B1F] text-white rounded-3xl font-black text-sm hover:bg-black transition-all">{lang === "traditional" ? "確認重置" : "确认重置"}</button>
              <button onClick={() => setShowConfirmReset(false)} className="w-full py-4 bg-[#F5E6D0] text-[#A0663A] rounded-3xl font-black text-sm hover:bg-[#EAE0D5] transition-all">{lang === "traditional" ? "返回" : "返回"}</button>
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

      <aside className="w-72 border-r border-[#EAE0D5] flex-shrink-0 flex-col hidden lg:flex" style={{background: 'rgba(250,247,242,0.88)'}}>
        <div className="p-6 border-b border-[#EAE0D5]">
          <h1 className="text-base font-black text-[#C4936A] tracking-tighter flex items-center gap-2"><Gamepad2 className="w-5 h-5" /> 爱豆收集梦想生活</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[9px] bg-[#C4936A] text-white px-2 py-0.5 rounded-full font-black uppercase">{modeLabel}</span>
            <span className="text-[10px] text-[#A0663A] font-bold">Idol Tomodachi Life</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
          <section>
            <h3 className="text-[10px] font-black text-[#A0663A] uppercase tracking-widest mb-3 flex items-center gap-2"><Users className="w-3 h-3" /> {sidebarLabel}</h3>
            {isCPMode ? (
              <div className="bg-white p-4 rounded-2xl border border-[#C4936A]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-[#3D2B1F]">{targetMembers.map(m => m.name).join(' ♡ ')}</span>
                  <span className="text-[10px] text-[#C4936A] font-black">{cpAffection}/100</span>
                </div>
                <div className="h-1.5 bg-[#F5E6D0] rounded-full overflow-hidden">
                  <motion.div animate={{ width: `${cpAffection}%` }} className="h-full bg-gradient-to-r from-[#C4936A] to-[#A0663A] rounded-full" />
                </div>
                <div className="text-[9px] text-[#A0663A] mt-2 italic">
                  {cpAffection < 15 ? '互相不熟，公事公办' : cpAffection < 30 ? '有些微妙的默契' : cpAffection < 50 ? '暧昧模糊，互相试探' : cpAffection < 70 ? '明显的特殊感' : cpAffection < 85 ? '没有说破，但都知道了' : '只差最后一步'}
                </div>
              </div>
            ) : isMomMode ? (
              <div className="bg-white p-4 rounded-2xl border border-[#EAE0D5]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-[#3D2B1F]">{daughterProfile?.name || '女儿'}</span>
                  <span className="text-[10px] text-[#C4936A] font-mono font-bold">{momTrustLevel}/100</span>
                </div>
                <div className="h-1.5 bg-[#F5E6D0] rounded-full overflow-hidden">
                  <motion.div animate={{ width: `${momTrustLevel}%` }} className="h-full bg-[#C4936A] rounded-full" />
                </div>
                {daughterProfile && <div className="text-[9px] text-[#A0663A] mt-1">{daughterProfile.nationality} · {daughterProfile.personality}</div>}
              </div>
            ) : (
              <div className="space-y-2">{targetMembers.map(member => (
                <div key={member.id} className="bg-white p-4 rounded-2xl border border-[#EAE0D5]">
                  <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-[#3D2B1F]">{member.name}</span><span className="text-[10px] text-[#C4936A] font-mono font-bold">{member.affection}/100</span></div>
                  <div className="h-1.5 bg-[#F5E6D0] rounded-full overflow-hidden"><motion.div animate={{ width: `${member.affection}%` }} className="h-full bg-[#C4936A] rounded-full" /></div>
                  <div className="text-[9px] text-[#A0663A] mt-1">{member.status}</div>
                </div>
              ))}</div>
            )}
          </section>
        </div>
        <div className="p-5 border-t border-[#EAE0D5] space-y-3">
          <button onClick={saveGame} className="w-full flex items-center justify-center gap-2 py-3 bg-[#C4936A] text-white rounded-2xl text-[10px] font-black uppercase hover:bg-[#A0663A] transition-all">{lang === "traditional" ? "💾 存檔" : "💾 存档"}</button>
          <button onClick={() => setShowSaveSlots(!showSaveSlots)} className="w-full flex items-center justify-center gap-2 py-3 bg-white text-[#A0663A] rounded-2xl text-[10px] font-black uppercase border border-[#EAE0D5] hover:bg-[#F5E6D0] transition-all">{lang === "traditional" ? "📂 讀檔" : "📂 读档"} ({saveSlots.length})</button>
          {showSaveSlots && saveSlots.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {saveSlots.map(slot => (
                <div key={slot.id} className="bg-white border border-[#EAE0D5] rounded-xl p-3 flex items-center justify-between gap-2">
                  <button onClick={() => loadGame(slot.id)} className="flex-1 text-left">
                    <div className="text-[10px] font-black text-[#3D2B1F]">{(slot as any).subject || slot.scene}</div>
                    <div className="text-[9px] text-[#A0663A]">{slot.scene} · Round {slot.round} · {slot.time}</div>
                  </button>
                  <button onClick={() => deleteSlot(slot.id)} className="text-[#C4936A] text-[10px] hover:text-[#A0663A] flex-shrink-0">✕</button>
                </div>
              ))}
            </div>
          )}
          {showSaveSlots && saveSlots.length === 0 && (
            <div className="text-[10px] text-[#A0663A] text-center py-2">{lang === "traditional" ? "暫無存檔" : "暂无存档"}</div>
          )}
          <button onClick={handleReset} className="w-full flex items-center justify-center gap-2 py-3 bg-white text-[#A0663A] rounded-2xl text-[10px] font-black uppercase border border-[#EAE0D5] hover:bg-[#F5E6D0] transition-all"><RefreshCw className="w-4 h-4" /> Reset</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full lg:rounded-l-[2rem] lg:shadow-sm overflow-hidden" style={{background: 'rgba(255,255,255,0.85)'}}>
        <header className="h-16 bg-white border-b border-[#EAE0D5] px-4 flex items-center justify-between z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={handleReset} className="lg:hidden p-2 text-[#C4936A] hover:bg-[#F5E6D0] rounded-xl"><RefreshCw className="w-4 h-4" /></button>
            <div>
              <div className="text-[10px] text-[#A0663A] font-black uppercase tracking-widest">Scene</div>
              <h2 className="text-sm font-bold flex items-center gap-1 text-[#3D2B1F]"><MapPin className="w-3 h-3 text-[#C4936A]" /> {gameState.currentScene}</h2>
            </div>
          </div>
          {(primaryTarget || isMomMode) && (
            <button onClick={() => setShowDrawer(true)} className="lg:hidden flex items-center gap-2 bg-[#FAF7F2] px-3 py-2 rounded-2xl border border-[#EAE0D5] active:scale-95 transition-all">
              <Heart className="w-3 h-3 text-[#C4936A]" />
              <span className="text-[11px] font-bold text-[#3D2B1F]">
                {isMomMode ? (daughterProfile?.name || '女儿') : isCPMode ? targetMembers.map(m => m.name).join(' ♡ ') : primaryTarget?.name}
              </span>
              <span className="text-[11px] font-black text-[#C4936A]">{isMomMode ? momTrustLevel : cpAffection}</span>
              <ChevronUp className="w-3 h-3 text-[#A0663A]" />
            </button>
          )}
          {apiKeyMissing && <div className="bg-[#F5E6D0] text-[#A0663A] text-[10px] font-black px-3 py-1 rounded-full border border-[#EAE0D5] animate-pulse">API KEY MISSING</div>}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setWorldMode(v => !v)}
              className={`flex items-center gap-1.5 text-[11px] font-black px-3 py-1.5 rounded-xl border transition-all ${worldMode ? 'bg-[#C4936A] text-white border-[#C4936A]' : 'bg-[#F5E6D0] text-[#A0663A] border-[#EAE0D5] hover:bg-[#EAE0D5]'}`}
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
              className="text-[10px] font-black text-[#A0663A] bg-[#F5E6D0] px-2 py-1 rounded-lg border border-[#EAE0D5] hover:bg-[#EAE0D5] transition-all"
            >
              {isTraditional ? '简' : '繁'}
            </button>
            <div className="text-right">
              <div className="text-[10px] text-[#A0663A] font-bold uppercase">Round</div>
              <div className="text-sm font-bold text-[#C4936A]">{roundCount}</div>
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
          />
        </div>
        ) : (
        <>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar" style={{background: "transparent"}}>
          <AnimatePresence initial={false}>
            {gameState.history.map((msg, i) => {
              const isLatest = i === gameState.history.length - 1;
              const blocks = (msg as any).contentBlocks as ContentBlock[] | undefined;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[92%] md:max-w-2xl ${msg.role === MessageRole.USER ? 'ml-8' : 'mr-8'}`}>
                    {msg.role === MessageRole.ASSISTANT && <div className="text-[9px] font-black text-[#A0663A] uppercase tracking-widest ml-3 mb-2 flex items-center gap-1"><Zap className="w-3 h-3" /> NARRATIVE</div>}
                    <div className={`rounded-[1.5rem] overflow-hidden ${msg.role === MessageRole.USER ? 'bg-[#C4936A] text-white rounded-tr-none' : 'border border-[#EAE0D5] text-[#3D2B1F] rounded-tl-none'}`}>
                      {msg.role === MessageRole.USER ? (
                        <div className="p-5 md:p-6 text-sm leading-relaxed">{msg.content}</div>
                      ) : blocks && blocks.length > 0 ? (
                        <div className="p-5 md:p-6 text-sm leading-relaxed markdown-container space-y-2">
                          {blocks.map((block, bi) => {
                            if (block.type === 'text') return <MarkdownBlock key={bi} content={block.content} />;
                            if (block.type === 'kkt') return <KKTMessageUI key={bi} data={block.data} />;
                            if (block.type === 'weverse') return <WeversePostUI key={bi} data={block.data} />;
                            if (block.type === 'bubble') return <BubbleMessageUI key={bi} data={block.data} />;
                            if (block.type === 'theqoo') return <TheqooPostUI key={bi} post={block.data} />;
                            if (block.type === 'card') return <CharacterCardUI key={bi} card={block.data} />;
                            if (block.type === 'musicshow') return isLatest ? <MusicShowUI key={bi} result={block.data} /> : null;
                            return null;
                          })}
                          {msg.options && <OptionsUI options={msg.options} isLatest={isLatest} lang={(gameState as any).language} />}
                        </div>
                      ) : (
                        <div className="p-5 md:p-6 text-sm leading-relaxed markdown-container">
                          <MarkdownBlock content={msg.content || '（剧情推进中...）'} />
                          {msg.options && <OptionsUI options={msg.options} isLatest={isLatest} lang={(gameState as any).language} />}
                        </div>
                      )}
                      {msg.content?.includes('错误信息') && (
                        <div className="px-5 pb-4">
                          <button onClick={() => { let j = -1; for (let k = i-1; k >= 0; k--) { if (gameState.history[k].role === MessageRole.USER) { j = k; break; } } if (j !== -1) { const c = gameState.history[j].content; setGameState(prev => ({ ...prev, history: prev.history.slice(0, i) })); handleSend(c); } }}
                            className="flex items-center gap-2 text-xs font-black text-[#C4936A] uppercase bg-white/50 px-3 py-2 rounded-xl border border-[#EAE0D5]"><RefreshCw className="w-3 h-3" /> {lang === "traditional" ? "重試" : "重试"}</button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {isLoading && (
            <div className="flex justify-start ml-8">
              <div className="bg-[#FAF7F2] border border-[#EAE0D5] p-4 rounded-[1.5rem] rounded-tl-none flex gap-2">
                <div className="w-2 h-2 bg-[#C4936A] rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-[#C4936A] rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-[#C4936A] rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 md:p-6 bg-white border-t border-[#EAE0D5] flex-shrink-0">
          <div className="max-w-3xl mx-auto flex gap-3">
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={lang === "traditional" ? "輸入您的行動..." : "输入你的行动..."}
              className="flex-1 bg-[#FAF7F2] border border-[#EAE0D5] rounded-3xl px-6 py-4 text-base focus:ring-2 focus:ring-[#C4936A] resize-none h-14 custom-scrollbar outline-none text-[#3D2B1F]"
              disabled={isLoading} />
            <button onClick={() => handleSend()} disabled={isLoading || !input.trim()} className="bg-[#C4936A] text-white px-5 rounded-3xl active:scale-95 disabled:opacity-50 flex-shrink-0 hover:bg-[#A0663A] transition-all"><Send className="w-5 h-5" /></button>
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
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #EAE0D5; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #C4936A; }
        .markdown-container p { margin-bottom: 0.6rem; } .markdown-container p:last-child { margin-bottom: 0; }
        .markdown-container ul,.markdown-container ol { margin-left: 1.5rem; margin-bottom: 0.6rem; }
        .markdown-container ul { list-style-type: disc; } .markdown-container ol { list-style-type: decimal; }
        .markdown-container blockquote { border-left: 3px solid #EAE0D5; padding-left: 0.75rem; color: #A0663A; margin: 0.75rem 0; }
        .markdown-container strong { font-weight: 900; color: #C4936A; }
        .markdown-container hr { border: none; border-top: 1px solid #EAE0D5; margin: 1rem 0; }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
      `}</style>
    </div>
  );
}
