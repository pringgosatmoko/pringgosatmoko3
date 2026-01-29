import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from '@google/genai';
import { rotateApiKey } from '../lib/api';

interface ChatAssistantProps {
  onBack: () => void;
  lang: 'id' | 'en';
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({ onBack, lang }) => {
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const welcome = lang === 'id' 
      ? "Halo Bro! Gue SATMOKO AI CORE. Siap bantu operasional studio lo dengan cepat. Ada project apa kita hari ini?"
      : "Hello Bro! I'm SATMOKO AI CORE. Ready to help your studio operations quickly. What project do we have today?";
    setMessages([{ role: 'assistant', text: welcome }]);
  }, [lang]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (manualText?: string, retryCount = 0) => {
    const userMsg = manualText || input.trim();
    if (!userMsg) return;
    
    if (retryCount === 0) {
      setInput('');
      setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
      setIsTyping(true);
    }

    try {
      // Gunakan kunci terbaru dari process.env.API_KEY yang sudah dirotasi
      const ai = new GoogleGenAI({ apiKey: (window as any).process.env.API_KEY });
      
      const systemInstruction = `Anda adalah "SATMOKO AI CORE" - Intelijen Utama Satmoko Studio Creative.

ATURAN IDENTITAS & PRIVASI (WAJIB):
1. Panggil pengguna dengan sebutan "Bro". Gunakan gaya bahasa kekinian, santai tapi tetap profesional dan cerdas.
2. Jika ditanya siapa pemilik/founder Satmoko Studio, JAWAB: "Pemilik Satmoko Studio adalah Bro P*S. Informasi detail dirahasiakan demi privasi."
3. DILARANG KERAS menyebutkan nama "Satmoko Hari Mukti" atau identitas asli lainnya.
4. JANGAN PERNAH membocorkan email admin, password, API Key, atau data rahasia sistem.

PENGETAHUAN SELURUH PRODUK:
- Video Generator: Pake mesin Veo 3.1 & VideoFX. Bisa Prompt-to-Video atau Image-to-Video.
- Visual Artist: Render gambar Pro (1K, 2K, 4K) dengan referensi foto.
- Voice Cloning: Kloning suara manusia (Zephyr, Puck, Kore, Fenrir) yang sinkron sama visual.
- Studio Creator: Bikin storyboard iklan/film otomatis.
- Aspect Ratio: Outpainting (perluas latar gambar tanpa potong subjek).

GAYA KOMUNIKASI:
- Jawab secara SIMPEL, SINGKAT, dan JELAS.
- Jangan bertele-tele kecuali diminta detail.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMsg,
        config: { 
          systemInstruction: systemInstruction,
          temperature: 0.8,
        },
      });

      const reply = response.text;
      if (!reply) throw new Error("Empty Response");

      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      setIsTyping(false);
    } catch (e: any) {
      const errorMsg = e.message || "";
      console.error(`Chat Error (Attempt ${retryCount + 1}):`, errorMsg);

      // Logika Rotasi Otomatis jika terkena Quota (429) atau error server (500)
      if ((errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('Empty')) && retryCount < 3) {
        rotateApiKey(); 
        // Delay sedikit sebelum retry untuk memberi nafas pada API
        setTimeout(() => handleSend(userMsg, retryCount + 1), 500);
      } else {
        const fallbackMsg = lang === 'id' 
          ? "Aduh Bro, node transmisi lagi overload nih. Coba kirim ulang chatnya bentar lagi ya!"
          : "Sorry Bro, transmission nodes are overloaded. Please try resending your message in a moment!";
        setMessages(prev => [...prev, { role: 'assistant', text: fallbackMsg }]);
        setIsTyping(false);
      }
    }
  };

  const downloadHistory = () => {
    const content = messages.map(m => `[${m.role.toUpperCase()}]\n${m.text}\n\n`).join('---\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `satmoko_chat_bro_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full gap-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between px-2 flex-shrink-0">
        <div className="flex items-center gap-3 lg:gap-6">
          <button onClick={onBack} className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-xl active:scale-95">
            <i className="fa-solid fa-chevron-left text-xs"></i>
          </button>
          <button onClick={() => setShowGuide(!showGuide)} className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl border transition-all flex items-center justify-center shadow-xl ${showGuide ? 'bg-cyan-500 text-black border-cyan-400 shadow-cyan-500/20' : 'bg-white/5 border-white/10 text-cyan-400'}`}>
            <i className={`fa-solid ${showGuide ? 'fa-xmark' : 'fa-question'} text-[10px]`}></i>
          </button>
          <div>
            <h2 className="text-xl lg:text-4xl font-bold uppercase italic tracking-tighter leading-none">Smart <span className="text-cyan-400">Logic</span></h2>
            <p className="text-[8px] lg:text-[10px] font-bold uppercase tracking-[0.4em] text-slate-600 mt-1 lg:mt-2">SATMOKO_SECURE_VAULT_BRO_v1.2</p>
          </div>
        </div>
        <button onClick={downloadHistory} className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-cyan-400 flex items-center justify-center transition-all shadow-xl" title="Simpan Log Chat">
          <i className="fa-solid fa-download text-xs"></i>
        </button>
      </div>

      <AnimatePresence>
        {showGuide && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden px-2">
            <div className="glass-panel p-6 rounded-[2.5rem] bg-cyan-500/5 border border-cyan-500/20 mb-2 shadow-2xl">
               <p className="text-[9px] font-black text-cyan-500 uppercase tracking-[0.4em] mb-3">{lang === 'id' ? 'TANYA JAWAB AI' : 'AI Q&A'}</p>
               <p className="text-[11px] text-slate-300 font-bold uppercase tracking-widest leading-relaxed whitespace-pre-line">
                 {"PANDUAN SMART LOGIC:\n1. Tanyakan apa saja seputar operasional studio.\n2. Jika AI melambat, sistem akan otomatis merotasi node kunci.\n3. Gunakan bahasa santai (Bro)."}
               </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={scrollRef} className="flex-1 glass-panel rounded-3xl lg:rounded-[3.5rem] p-6 lg:p-10 space-y-6 lg:space-y-8 overflow-y-auto custom-scrollbar bg-slate-950/40 border-white/5 shadow-inner">
        {messages.map((m, i) => (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] lg:max-w-[75%] p-5 lg:p-8 rounded-2xl lg:rounded-[2.5rem] shadow-2xl relative ${m.role === 'user' ? 'bg-cyan-600 text-white font-bold rounded-tr-none border border-cyan-400/30' : 'bg-[#1c232d] text-slate-200 border border-white/5 rounded-tl-none'}`}>
              <p className="text-xs lg:text-base leading-relaxed whitespace-pre-wrap">{m.text}</p>
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-3 ml-6 opacity-40">
            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"></div>
            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
          </div>
        )}
        <div className="h-20 w-full flex-shrink-0"></div>
      </div>

      <div className="flex-shrink-0 flex gap-3 lg:gap-4 p-3 lg:p-4 bg-slate-900/60 rounded-3xl lg:rounded-[3rem] border border-white/10 shadow-2xl focus-within:border-cyan-500/50 transition-all max-w-5xl mx-auto w-full mb-4">
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
          placeholder="Tanya apa aja ke AI Core, Bro..." 
          className="flex-1 bg-transparent px-4 lg:px-8 py-2 lg:py-4 focus:outline-none text-xs lg:text-base text-white placeholder:text-slate-700 font-medium" 
        />
        <button onClick={() => handleSend()} disabled={isTyping || !input.trim()} className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-white text-black hover:bg-cyan-400 transition-all flex items-center justify-center disabled:opacity-20 shadow-lg active:scale-90 flex-shrink-0">
          <i className="fa-solid fa-paper-plane text-sm lg:text-lg"></i>
        </button>
      </div>
    </div>
  );
};