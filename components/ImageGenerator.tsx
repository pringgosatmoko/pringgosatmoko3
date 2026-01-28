
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'framer-motion';
import { deductCredits, getSystemSettings, rotateApiKey } from '../lib/api';

interface LogEntry {
  id: string;
  msg: string;
  type: 'info' | 'success' | 'warning' | 'error';
  time: string;
}

interface ImageGeneratorProps {
  onBack: () => void;
  lang: 'id' | 'en';
  userEmail: string;
  credits: number;
  refreshCredits: () => void;
}

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({ onBack, lang, userEmail, credits, refreshCredits }) => {
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('Nyata (Foto)');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3'>('1:1');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [numToGenerate] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImages, setResultImages] = useState<string[]>([]);
  const [processLogs, setProcessLogs] = useState<LogEntry[]>([]);
  const [costPerImage, setCostPerImage] = useState(25);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    getSystemSettings().then(s => setCostPerImage(s.cost_image || 25));
  }, []);

  const totalCost = numToGenerate * costPerImage * (imageSize === '4K' ? 3 : imageSize === '2K' ? 2 : 1);

  const addLog = (msg: string, type: LogEntry['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setProcessLogs(prev => [...prev, { id, msg, type, time }].slice(-5));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSourceImages(prev => [...prev, reader.result as string].slice(-3));
          addLog("Referensi visual dimuat.", "success");
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const generateImage = async (retryCount = 0) => {
    if (!prompt.trim() || credits < totalCost) return;
    setIsGenerating(true);
    setResultImages([]);
    addLog(retryCount > 0 ? `Retransmisi ke Node Cadangan... (${retryCount})` : "Menghubungkan ke Mesin Render Visual...");

    try {
      if (retryCount === 0) {
        const success = await deductCredits(userEmail, totalCost);
        if (!success) { 
          addLog("Gagal: Saldo Kredit Habis!", "error");
          setIsGenerating(false); 
          return; 
        }
        refreshCredits();
      }

      const baseParts: any[] = sourceImages.map(img => {
        const dataMatch = img.match(/base64,(.*)$/);
        return { 
          inlineData: { 
            data: dataMatch ? dataMatch[1] : "", 
            mimeType: img.match(/data:([^;]+);/)?.[1] || 'image/png' 
          } 
        };
      });

      const compositionDirective = `MASTER DIRECTIVE: Subject: ${prompt}. Artistic Style: ${style}. Visual Composition: Cinematic. Ensure wide vertical clearance at the bottom. The subject must NOT be cut off at the bottom. High-end professional output.`;
      baseParts.push({ text: compositionDirective });

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const response = await ai.models.generateContent({ 
        model: 'gemini-3-pro-image-preview', 
        contents: { parts: baseParts },
        config: { imageConfig: { aspectRatio: aspectRatio as any, imageSize: imageSize as any }, temperature: 0.8 }
      });

      if (response?.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            setResultImages([`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`]);
            addLog("Masterpiece Berhasil Dibuat!", "success");
            setIsGenerating(false);
            return;
          }
        }
      }
      throw new Error("Empty AI response");
    } catch (e: any) { 
      const errMsg = e?.message || "";
      if ((errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('entity')) && retryCount < 3) {
        rotateApiKey();
        setTimeout(() => generateImage(retryCount + 1), 1000);
      } else {
        addLog("Node sibuk. Klik 'Mulai' lagi.", "error"); 
        setIsGenerating(false);
      }
    } finally { refreshCredits(); }
  };

  const guideContent = lang === 'id' 
    ? "PANDUAN VISUAL ARTIST:\n1. Upload hingga 3 gambar referensi untuk panduan wajah/objek.\n2. Pilih Gaya (Style) dan Rasio gambar yang diinginkan.\n3. Masukkan deskripsi detail pada kolom prompt.\n4. Klik 'Mulai Render' untuk menghasilkan gambar resolusi tinggi."
    : "VISUAL ARTIST GUIDE:\n1. Upload up to 3 reference images for face/object guidance.\n2. Choose your preferred Style and Aspect Ratio.\n3. Enter a detailed description in the prompt field.\n4. Click 'Start Render' to generate high-resolution images.";

  return (
    <div className="w-full flex flex-col gap-6 relative pb-40">
      {/* Logs Overlay */}
      <div className="fixed top-6 right-6 z-[400] w-64 lg:w-80 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {processLogs.map((log) => (
            <motion.div key={log.id} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }} className={`p-4 rounded-2xl glass-panel border-l-4 backdrop-blur-3xl shadow-2xl flex flex-col gap-1 ${log.type === 'success' ? 'border-l-cyan-500' : log.type === 'error' ? 'border-l-red-500' : 'border-l-white/20'}`}>
              <span className="text-[7px] font-black uppercase text-slate-500">{log.time}</span>
              <p className="text-[10px] font-bold text-white leading-tight">{log.msg}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 px-2">
        <div className="flex items-center gap-3 lg:gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-xl active:scale-95"><i className="fa-solid fa-chevron-left"></i></button>
          <button onClick={() => setShowGuide(!showGuide)} className={`w-10 h-10 rounded-xl border transition-all flex items-center justify-center shadow-xl ${showGuide ? 'bg-cyan-500 text-black border-cyan-400 shadow-cyan-500/20' : 'bg-white/5 border-white/5 text-cyan-400'}`}>
            <i className={`fa-solid ${showGuide ? 'fa-xmark' : 'fa-question'} text-[10px]`}></i>
          </button>
          <div>
            <h2 className="text-xl lg:text-3xl font-black italic uppercase tracking-tighter text-white">Visual <span className="text-cyan-500">Artist</span></h2>
            <p className="text-[7px] font-black uppercase tracking-[0.4em] text-slate-600">Copyright by Satmoko</p>
          </div>
        </div>
        <div className="text-right px-4 py-2 bg-white/5 border border-white/5 rounded-2xl border-cyan-500/10 shadow-lg">
           <p className="text-[7px] font-black uppercase text-slate-600 tracking-widest leading-none mb-1">SALDO ANDA</p>
           <p className="text-sm lg:text-xl font-black italic text-cyan-400 leading-none">{credits.toLocaleString()} CR</p>
        </div>
      </div>

      <AnimatePresence>
        {showGuide && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden px-2">
            <div className="glass-panel p-6 rounded-[2.5rem] bg-cyan-500/5 border border-cyan-500/20 mb-2 shadow-2xl">
               <p className="text-[9px] font-black text-cyan-500 uppercase tracking-[0.4em] mb-3">{lang === 'id' ? 'INSTRUKSI RENDER' : 'RENDER INSTRUCTIONS'}</p>
               <p className="text-[11px] text-slate-300 font-bold uppercase tracking-widest leading-relaxed whitespace-pre-line">
                 {guideContent}
               </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area - Scrollable on mobile */}
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar/Form - Rendered FIRST on mobile */}
        <div className="w-full lg:w-[400px] flex flex-col gap-6 order-1">
          <section className="glass-panel p-6 lg:p-8 rounded-[2.5rem] lg:rounded-[3rem] space-y-6 bg-slate-900/40 border-white/5 shadow-2xl">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-slate-500 px-1 tracking-widest">Gambar Referensi (Maks 3)</label>
              <div className="grid grid-cols-3 gap-3">
                {sourceImages.map((img, i) => (
                  <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-white/10 bg-black relative group shadow-xl">
                    <img src={img} className="w-full h-full object-cover" />
                    <button onClick={() => setSourceImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                       <i className="fa-solid fa-trash text-white text-xs"></i>
                    </button>
                  </div>
                ))}
                {sourceImages.length < 3 && (
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-white/5 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-all text-slate-700 hover:text-cyan-500">
                    <i className="fa-solid fa-plus text-lg"></i>
                    <input type="file" multiple onChange={handleImageUpload} className="hidden" accept="image/*" />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-slate-500 px-1 tracking-widest">Gaya & Rasio</label>
              <select value={style} onChange={e => setStyle(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-xs text-white font-black uppercase outline-none focus:border-cyan-500/30">
                <option>Nyata (Foto)</option><option>Animasi 3D</option><option>Kartun / Anime</option><option>Seni Lukis</option><option>Futuristik</option>
              </select>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {['1:1', '16:9', '9:16', '4:3'].map(r => (
                  <button key={r} onClick={() => setAspectRatio(r as any)} className={`py-3 rounded-xl text-[9px] font-black border transition-all ${aspectRatio === r ? 'bg-cyan-500 text-black border-cyan-400 shadow-lg shadow-cyan-500/20' : 'bg-black/20 border-white/5 text-slate-600'}`}>{r}</button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-slate-500 px-1 tracking-widest">Resolusi</label>
              <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
                {['1K', '2K', '4K'].map((size) => (
                  <button key={size} onClick={() => setImageSize(size as any)} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${imageSize === size ? 'bg-cyan-500 text-black shadow-lg' : 'text-slate-500'}`}>{size}</button>
                ))}
              </div>
            </div>

            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} className="w-full h-32 bg-black/40 border border-white/10 rounded-[2rem] p-5 text-sm text-white focus:border-cyan-500/50 outline-none resize-none leading-relaxed shadow-inner" placeholder="Jelaskan mahakarya Master..." />

            <div className="p-4 rounded-[1.5rem] bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-between">
              <p className="text-[8px] font-black text-cyan-500 uppercase tracking-widest">BIAYA</p>
              <p className="text-xl font-black italic text-white leading-none">{totalCost} <span className="text-[10px] text-slate-500 font-bold">CR</span></p>
            </div>
            
            <button onClick={() => generateImage(0)} disabled={isGenerating || !prompt.trim() || credits < totalCost} className="w-full py-5 bg-white text-black font-black uppercase rounded-[1.8rem] hover:bg-cyan-400 transition-all shadow-xl active:scale-95 disabled:opacity-20 flex items-center justify-center gap-3 text-[11px] tracking-widest">
              {isGenerating ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
              {isGenerating ? "MERENDER..." : `MULAI RENDER`}
            </button>
          </section>
        </div>

        {/* Preview Area - Rendered SECOND on mobile */}
        <div className="flex-1 order-2">
          <div className="glass-panel min-h-[350px] lg:h-full rounded-[3rem] lg:rounded-[4rem] flex flex-col items-center justify-center p-6 bg-black/30 border-white/5 shadow-2xl overflow-hidden relative">
            {resultImages.length > 0 ? (
              <div className="w-full h-full flex items-center justify-center">
                {resultImages.map((img, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative group rounded-3xl overflow-hidden border-2 border-white/5 bg-black shadow-2xl h-full max-w-full">
                    <img src={img} className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-8 backdrop-blur-md">
                       <a href={img} download={`satmoko_art_${Date.now()}.png`} className="w-14 h-14 rounded-full bg-cyan-500 text-black flex items-center justify-center hover:bg-white transition-all shadow-lg"><i className="fa-solid fa-download"></i></a>
                       <button onClick={() => window.open(img, '_blank')} className="w-14 h-14 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 border border-white/10"><i className="fa-solid fa-expand"></i></button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center opacity-10 flex flex-col items-center py-10">
                <i className="fa-solid fa-wand-magic-sparkles text-[60px] lg:text-[100px] mb-6"></i>
                <p className="text-xs lg:text-xl font-black uppercase tracking-[0.6em] lg:tracking-[1.2em] text-white">SIAP UNTUK RENDER</p>
              </div>
            )}
            
            {isGenerating && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl z-30 flex flex-col items-center justify-center p-6 text-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full mb-6 shadow-[0_0_30px_rgba(34,211,238,0.3)]" />
                <p className="text-sm font-black text-cyan-400 uppercase tracking-[0.3em] animate-pulse">SISTEM SEDANG BEKERJA...</p>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-4">Node: Master_Active • Security: AES-256</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
