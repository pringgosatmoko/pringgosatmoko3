
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from '@google/genai';
import { rotateApiKey } from '../lib/api';

interface ChatAssistantProps { onBack: () => void; lang: 'id' | 'en'; }

export const ChatAssistant: React.FC<ChatAssistantProps> = ({ onBack, lang }) => {
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const welcome = lang === 'id' ? "Halo Bro! Gue SATMOKO AI. Siap bantu operasional studio lo. Apa yang bisa kita eksekusi hari ini?" : "Hello Bro! I'm SATMOKO AI. Ready to assist your studio. What's the plan for today?";
    setMessages([{ role: 'assistant', text: welcome }]);
  }, [lang]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, isTyping]);

  const handleSend = async (manualText?: string, retryCount = 0) => {
    const userMsg = manualText || input.trim();
    if (!userMsg) return;
    if (retryCount === 0) { setInput(''); setMessages(prev => [...prev, { role: 'user', text: userMsg }]); setIsTyping(true); }

    try {
      // Correct: Use process.env.API_KEY directly as per guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMsg,
        config: {
          systemInstruction: `Panggil pengguna dengan "Bro". Gaya bahasa kekinian, santai tapi cerdas. Anda adalah asisten Satmoko Studio.`,
          temperature: 0.8
        }
      });
      // Correct: response.text is a property
      const reply = response.text;
      if (!reply) throw new Error("Transmisi Kosong");
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      setIsTyping(false);
    } catch (e: any) {
      if ((e.message?.includes('429') || e.message?.includes('quota')) && retryCount < 3) {
        rotateApiKey();
        setTimeout(() => handleSend(userMsg, retryCount + 1), 1000);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: "Sorry Bro, node transmisi lagi padat. Coba chat lagi sedetik kemudian ya!" }]);
        setIsTyping(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-6 px-2">
        <button onClick={onBack} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-xl active:scale-95"><i className="fa-solid fa-chevron-left text-xs"></i></button>
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter">Smart <span className="text-cyan-400">Logic</span></h2>
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-600 mt-1">SATMOKO_CORE_BRO_v1.2</p>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 glass-panel rounded-[3rem] p-8 space-y-6 overflow-y-auto no-scrollbar bg-slate-950/40 border-white/5">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-6 rounded-[2rem] shadow-2xl ${m.role === 'user' ? 'bg-cyan-600 text-white rounded-tr-none' : 'bg-[#1c232d] text-slate-200 rounded-tl-none border border-white/5'}`}>
              <p className="text-sm lg:text-base leading-relaxed whitespace-pre-wrap">{m.text}</p>
            </div>
          </div>
        ))}
        {isTyping && <div className="flex gap-2 ml-4 opacity-50"><div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.2s]"></div><div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.4s]"></div></div>}
      </div>
      <div className="flex gap-4 p-4 bg-slate-900/60 rounded-[3rem] border border-white/10 shadow-2xl focus-within:border-cyan-500/50 transition-all">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Tanya apa aja, Bro..." className="flex-1 bg-transparent px-8 py-4 focus:outline-none text-white placeholder:text-slate-700 font-medium" />
        <button onClick={() => handleSend()} disabled={isTyping || !input.trim()} className="w-14 h-14 rounded-full bg-white text-black hover:bg-cyan-400 transition-all flex items-center justify-center disabled:opacity-20 shadow-lg active:scale-90"><i className="fa-solid fa-paper-plane text-lg"></i></button>
      </div>
    </div>
  );
};
