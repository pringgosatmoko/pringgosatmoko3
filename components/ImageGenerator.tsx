
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'framer-motion';
import { deductCredits, getSystemSettings, rotateApiKey } from '../lib/api';

interface ImageGeneratorProps { onBack: () => void; userEmail: string; credits: number; refreshCredits: () => void; }

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({ onBack, userEmail, credits, refreshCredits }) => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('Cinematic Cinematic');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [cost, setCost] = useState(25);

  const stylePresets = [
    { name: 'Cinematic Cinematic', icon: 'fa-film' },
    { name: 'Cyberpunk Neon', icon: 'fa-bolt' },
    { name: 'Disney Pixar', icon: 'fa-magic' },
    { name: 'Vintage 35mm', icon: 'fa-camera' },
    { name: 'Anime Studio', icon: 'fa-sparkles' }
  ];

  useEffect(() => { getSystemSettings().then(s => setCost(s.cost_image || 25)); }, []);

  const totalCost = cost * (imageSize === '4K' ? 3 : imageSize === '2K' ? 2 : 1);

  const generateImage = async (retryCount = 0) => {
    if (!prompt.trim() || credits < totalCost) return;
    setIsGenerating(true);
    setResult(null);
    try {
      if (retryCount === 0) { await deductCredits(userEmail, totalCost); refreshCredits(); }
      // Correct: Use process.env.API_KEY directly
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [{ text: `${prompt}. Style: ${style}. Ultra HD, Masterpiece quality.` }] },
        config: { imageConfig: { aspectRatio: aspectRatio as any, imageSize: imageSize as any } }
      });
      const part = response.candidates[0].content.parts.find(p => p.inlineData);
      if (part) setResult(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
    } catch (e: any) {
      if ((e.message?.includes('429') || e.message?.includes('quota')) && retryCount < 2) { rotateApiKey(); return generateImage(retryCount + 1); }
    } finally { setIsGenerating(false); refreshCredits(); }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white active:scale-95"><i className="fa-solid fa-chevron-left"></i></button>
          <h2 className="text-2xl font-black italic uppercase text-white">Visual <span className="text-fuchsia-500">Artist</span></h2>
        </div>
        <div className="px-6 py-2 bg-white/5 border border-white/5 rounded-2xl"><p className="text-[10px] font-black text-slate-500 uppercase leading-none mb-1">Cost</p><p className="text-xl font-black text-fuchsia-400 leading-none">{totalCost} CR</p></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
           <section className="glass-panel p-8 rounded-[3rem] space-y-6">
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} className="w-full h-32 bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-fuchsia-500/50" placeholder="Deskripsikan imajinasi Master..." />
              <div className="space-y-3">
                 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Pilih Style Preset</p>
                 <div className="grid grid-cols-2 gap-2">
                    {stylePresets.map(s => (
                      <button key={s.name} onClick={() => setStyle(s.name)} className={`p-3 rounded-xl text-[9px] font-black border flex items-center gap-3 transition-all ${style === s.name ? 'bg-fuchsia-500 text-black border-fuchsia-400' : 'bg-white/5 text-slate-500 border-white/5 hover:text-white'}`}><i className={`fa-solid ${s.icon}`}></i> {s.name.split(' ')[0]}</button>
                    ))}
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><p className="text-[9px] font-black text-slate-600 uppercase px-1">Rasio</p><select value={aspectRatio} onChange={e => setAspectRatio(e.target.value as any)} className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-[10px] text-white outline-none focus:border-fuchsia-500/50">{['1:1', '16:9', '9:16'].map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                <div className="space-y-2"><p className="text-[9px] font-black text-slate-600 uppercase px-1">Resolusi</p><select value={imageSize} onChange={e => setImageSize(e.target.value as any)} className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-[10px] text-white outline-none focus:border-fuchsia-500/50">{['1K', '2K', '4K'].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              </div>
              <button onClick={() => generateImage()} disabled={isGenerating || !prompt} className="w-full py-5 bg-white text-black font-black uppercase rounded-2xl hover:bg-fuchsia-500 transition-all active:scale-95 disabled:opacity-20 text-xs tracking-widest">{isGenerating ? "MENGRENDERING..." : "GENERATE ART"}</button>
           </section>
        </div>
        <div className="lg:col-span-7 h-[600px] glass-panel rounded-[3.5rem] bg-black/30 border-white/5 shadow-2xl flex flex-col items-center justify-center overflow-hidden relative p-8">
           {result ? (
             <div className="flex flex-col items-center gap-8"><img src={result} className="max-w-full max-h-[450px] rounded-2xl shadow-2xl border border-white/10" /><a href={result} download="satmoko_art.png" className="px-12 py-4 bg-fuchsia-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white hover:text-black transition-all shadow-xl">UNDUH KARYA (4K)</a></div>
           ) : (
             <div className="text-center opacity-10 flex flex-col items-center"><i className="fa-solid fa-palette text-8xl mb-6"></i><p className="text-[11px] font-black uppercase tracking-[0.8em]">READY_FOR_NEURAL_DRAW</p></div>
           )}
           {isGenerating && <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="w-16 h-16 border-4 border-fuchsia-500 border-t-transparent rounded-full mb-6" /><p className="text-[10px] font-black text-fuchsia-400 uppercase tracking-[0.4em] animate-pulse">RENDER_ENGINE_ACTIVE</p></div>}
        </div>
      </div>
    </div>
  );
};
