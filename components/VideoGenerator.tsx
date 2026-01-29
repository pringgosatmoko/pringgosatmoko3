
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
    if (isGenerating) interval = setInterval(() => setLoadingStep(prev => (prev + 1) % loadingMessages.length), 10000);
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

      // Initialize GoogleGenAI right before use to ensure latest API key
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
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: aspectRatio as any, referenceImages: isMultiImage ? referenceImagesPayload : undefined }
      });

      while (!operation.done) {
        addLog(loadingMessages[loadingStep]);
        await new Promise(r => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
        if (operation.error) throw operation.error;
      }

      const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (uri) {
        // Fetch the video content using the download link and append the API key
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

  const guideContent = lang === 'id' 
    ? "PANDUAN AI VIDEO:\n1. Masukkan prompt teks untuk mendeskripsikan gerakan video.\n2. (Opsional) Upload gambar sebagai referensi visual awal.\n3. Pilih Rasio (16:9 atau 9:16).\n4. Klik 'Mulai Buat Video'. Proses ini memakan waktu 1-3 menit."
    : "AI VIDEO GUIDE:\n1. Enter a text prompt to describe the video motion.\n2. (Optional) Upload an image as a visual reference.\n3. Choose Aspect Ratio (16:9 or 9:16).\n4. Click 'Start Video Generation'. This process takes 1-3 minutes.";

  return (
    <div className="space-y-6 pb-40 relative">
      <div className="fixed top-6 right-6 z-[300] w-72 lg:w-80 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence initial={false}>
          {processLogs.map((log) => (
            <motion.div key={log.id} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }} className="p-4 rounded-2xl glass-panel border-l-4 shadow-xl flex flex-col gap-1">
              <span className="text-[7px] font-bold uppercase text-slate-500">{log.time}</span>
              <p className="text-[10px] font-medium text-white leading-tight">{log.msg}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-xl"><i className="fa-solid fa-arrow-left"></i></button>
          <button onClick={() => setShowGuide(!showGuide)} className={`w-10 h-10 rounded-xl border transition-all flex items-center justify-center shadow-xl ${showGuide ? 'bg-cyan-500 text-black border-cyan-400 shadow-cyan-500/20' : 'bg-white/5 border-white/5 text-cyan-400'}`}>
            <i className={`fa-solid ${showGuide ? 'fa-xmark' : 'fa-question'} text-[10px]`}></i>
          </button>
          <div>
            <h2 className="text-2xl font-bold uppercase italic">AI <span className="text-cyan-500">Video</span></h2>
            <p className="text-[8px] font-black uppercase text-slate-600 tracking-[0.4em]">Copyright by Satmoko</p>
          </div>
        </div>
        <div className="text-right px-4 py-2 bg-white/5 border border-white/5 rounded-2xl">
           <p className="text-[9px] font-bold uppercase text-slate-600 tracking-widest leading-none mb-1">Saldo</p>
           <p className="text-xl font-bold text-cyan-400 leading-none">{credits.toLocaleString()} CR</p>
        </div>
      </div>

      <AnimatePresence>
        {showGuide && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="glass-panel p-6 rounded-[2.5rem] bg-cyan-500/5 border border-cyan-500/20 mb-4 shadow-2xl">
               <p className="text-[9px] font-black text-cyan-500 uppercase tracking-[0.4em] mb-3">{lang === 'id' ? 'INSTRUKSI VIDEO' : 'VIDEO INSTRUCTIONS'}</p>
               <p className="text-[11px] text-slate-300 font-bold uppercase tracking-widest leading-relaxed whitespace-pre-line">
                 {guideContent}
               </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-4 space-y-6">
          <section className="glass-panel p-8 rounded-[3rem] bg-slate-900/40 space-y-6 shadow-2xl border-white/5">
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} className="w-full h-32 bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-cyan-500/50" placeholder="Tulis instruksi video Master di sini..." />
            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase text-slate-500 px-1">Gambar Referensi</label>
