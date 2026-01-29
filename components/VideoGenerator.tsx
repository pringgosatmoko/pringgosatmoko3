
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, VideoGenerationReferenceType } from '@google/genai';
import { motion, AnimatePresence } from 'framer-motion';
import { deductCredits, getSystemSettings, rotateApiKey } from '../lib/api';

interface VideoGeneratorProps {
  mode: 'img2vid' | 'text2vid';
  onBack: () => void;
  lang: 'id' | 'en';
  userEmail: string;
  credits: number;
  refreshCredits: () => void;
}

interface LogEntry {
  id: string;
  msg: string;
  type: 'info' | 'success' | 'warning' | 'error';
  time: string;
}

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ mode, onBack, lang, userEmail, credits, refreshCredits }) => {
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [processLogs, setProcessLogs] = useState<LogEntry[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [costVideo, setCostVideo] = useState(150);

  const loadingMessages = ["Menyiapkan Data...", "Sinkronisasi AI...", "Merender Visual...", "Finalisasi Video..."];

  useEffect(() => {
    getSystemSettings().then(s => setCostVideo(s.cost_video || 150));
  }, []);

  useEffect(() => {
    let interval: any;
    if (isGenerating) interval = setInterval(() => setLoadingStep(prev => (prev + 1) % loadingMessages.length), 5000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const addLog = (msg: string, type: LogEntry['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setProcessLogs(prev => [...prev, { id, msg, type, time }].slice(-5));
  };

  const generateVideo = async (retryCount = 0) => {
    if (credits < costVideo && retryCount === 0) { addLog("Saldo Kredit Habis!", "error"); return; }
    setIsGenerating(true);
    if (retryCount === 0) setVideoUrl(null);
    addLog("Memulai mesin video otomatis...");
    
    try {
      if (retryCount === 0) {
        const success = await deductCredits(userEmail, costVideo);
        if (!success) { setIsGenerating(false); return; }
        refreshCredits();
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const isMultiImage = sourceImages.length > 1;
      const finalPrompt = `${prompt}. Hasil sinematik, gerakan halus, kualitas 720p HD.`;

      const referenceImagesPayload = sourceImages.map(img => ({
        image: { imageBytes: img.split(',')[1], mimeType: img.match(/data:([^;]+);/)?.[1] || 'image/png' },
        referenceType: VideoGenerationReferenceType.ASSET,
      }));

      let operation = await ai.models.generateVideos({
        model: isMultiImage ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview',
        prompt: finalPrompt,
        image: sourceImages.length === 1 ? { imageBytes: sourceImages[0].split(',')[1], mimeType: 'image/png' } : undefined,
        config: { 
          numberOfVideos: 1, 
          resolution: '720p', 
          aspectRatio: aspectRatio as any, 
          referenceImages: isMultiImage ? referenceImagesPayload : undefined 
        }
      });

      while (!operation.done) {
        addLog(loadingMessages[loadingStep]);
        await new Promise(r => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
        if (operation.error) throw operation.error;
      }

      const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (uri) {
        const response = await fetch(`${uri}&key=${process.env.API_KEY}`);
        const responseBlob = await response.blob();
        setVideoUrl(URL.createObjectURL(responseBlob));
        addLog("Video Selesai Dibuat!", "success");
      }
    } catch (e: any) { 
      const errorMsg = e.message || "";
      if (errorMsg.includes("Requested entity was not found.")) {
        if (window.aistudio) window.aistudio.openSelectKey();
      }

      if (retryCount < 2) {
        rotateApiKey();
        return generateVideo(retryCount + 1);
      }
      addLog("Gagal memproses video, silakan coba lagi.", "error");
    } finally { setIsGenerating(false); refreshCredits(); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSourceImages(prev => [...prev, reader.result as string].slice(-3));
          addLog("Gambar referensi dimuat.", "success");
        };
        reader.readAsDataURL(file);
      });
    }
  };

  return (
    <div className="space-y-6 pb-40 relative">
      <div className="fixed top-6 right-6 z-[300] w-72 lg:w-80 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence initial={false}>
          {processLogs.map((log) => (
            <motion.div key={log.id} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }} className="p-4 rounded-2xl glass-panel border-l-4 shadow-xl flex flex-col gap-1 border-l-cyan-500 bg-black/40">
              <span className="text-[7px] font-bold uppercase text-slate-500">{log.time}</span>
              <p className="text-[10px] font-medium text-white leading-tight">{log.msg}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-xl active:scale-95"><i className="fa-solid fa-chevron-left"></i></button>
          <div>
            <h2 className="text-2xl font-bold uppercase italic text-white">AI <span className="text-cyan-500">Video</span></h2>
            <p className="text-[8px] font-black uppercase text-slate-600 tracking-[0.4em]">SATMOKO_STUDIO_VEO_FX</p>
          </div>
        </div>
        <div className="px-6 py-2 bg-white/5 border border-white/5 rounded-2xl">
           <p className="text-[9px] font-bold uppercase text-slate-600 tracking-widest leading-none mb-1">Saldo</p>
           <p className="text-xl font-bold text-cyan-400 leading-none">{credits.toLocaleString()} CR</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-4 space-y-6">
          <section className="glass-panel p-8 rounded-[3rem] bg-slate-900/40 space-y-6 shadow-2xl border-white/5">
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} className="w-full h-32 bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-cyan-500/50" placeholder="Tulis instruksi video Master di sini..." />
            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase text-slate-500 px-1">Gambar Referensi</label>
              <div className="grid grid-cols-3 gap-2">
                {sourceImages.map((img, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden border border-white/10 relative">
                    <img src={img} className="w-full h-full object-cover" />
                    <button onClick={() => setSourceImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full text-[8px] text-white flex items-center justify-center"><i className="fa-solid fa-times"></i></button>
                  </div>
                ))}
                {sourceImages.length < 3 && (
                  <label className="aspect-square rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5">
                    <i className="fa-solid fa-plus text-slate-700"></i>
                    <input type="file" onChange={handleImageUpload} className="hidden" accept="image/*" />
                  </label>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase text-slate-500 px-1">Rasio Aspek</label>
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                <button onClick={() => setAspectRatio('16:9')} className={`flex-1 py-2 rounded-lg text-[9px] font-black transition-all ${aspectRatio === '16:9' ? 'bg-cyan-500 text-black' : 'text-slate-600'}`}>16:9</button>
                <button onClick={() => setAspectRatio('9:16')} className={`flex-1 py-2 rounded-lg text-[9px] font-black transition-all ${aspectRatio === '9:16' ? 'bg-cyan-500 text-black' : 'text-slate-600'}`}>9:16</button>
              </div>
            </div>
            <button onClick={() => generateVideo()} disabled={isGenerating || (!prompt && sourceImages.length === 0)} className="w-full py-5 bg-white text-black font-bold uppercase rounded-2xl hover:bg-cyan-500 transition-all shadow-xl active:scale-95 disabled:opacity-20 text-[10px] tracking-widest">
              {isGenerating ? "MENGKONSTRUKSI..." : "MULAI BUAT VIDEO"}
            </button>
          </section>
        </div>

        <div className="xl:col-span-8">
          <div className="glass-panel min-h-[500px] rounded-[3.5rem] flex flex-col items-center justify-center p-8 bg-black/30 border-white/5 shadow-2xl overflow-hidden relative">
            {videoUrl ? (
              <div className="w-full h-full flex flex-col items-center gap-6">
                <video src={videoUrl} controls autoPlay loop className="max-w-full max-h-[450px] rounded-2xl shadow-2xl border border-white/10" />
                <a href={videoUrl} download="satmoko_ai_video.mp4" className="px-10 py-4 bg-cyan-600 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-white hover:text-black transition-all shadow-xl">UNDUH VIDEO</a>
              </div>
            ) : (
              <div className="text-center opacity-10 flex flex-col items-center">
                <i className="fa-solid fa-film text-8xl mb-6"></i>
                <p className="text-[11px] font-black uppercase tracking-[0.8em]">WAITING_FOR_INPUT</p>
              </div>
            )}
            
            {isGenerating && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-30 flex flex-col items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full mb-6 shadow-[0_0_20px_rgba(34,211,238,0.4)]" />
                <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] animate-pulse">GENERATIVE_RENDER_ACTIVE</p>
                <p className="text-[8px] text-white/40 mt-2">{loadingMessages[loadingStep]}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
