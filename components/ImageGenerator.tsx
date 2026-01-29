
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'framer-motion';
import { deductCredits, getSystemSettings, rotateApiKey } from '../lib/api';

interface ImageGeneratorProps {
  onBack: () => void;
  lang: 'id' | 'en';
  userEmail: string;
  credits: number;
  refreshCredits: () => void;
}

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({ onBack, lang, userEmail, credits, refreshCredits }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3'>('1:1');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImages, setResultImages] = useState<string[]>([]);
  const [costPerImage, setCostPerImage] = useState(25);

  useEffect(() => {
    getSystemSettings().then(s => setCostPerImage(s.cost_image || 25));
  }, []);

  const totalCost = costPerImage * (imageSize === '4K' ? 3 : imageSize === '2K' ? 2 : 1);

  const generateImage = async (retryCount = 0) => {
    if (!prompt.trim() || credits < totalCost) return;
    setIsGenerating(true);
    setResultImages([]);

    try {
      if (retryCount === 0) {
        await deductCredits(userEmail, totalCost);
        refreshCredits();
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({ 
        model: 'gemini-3-pro-image-preview', 
        contents: { parts: [{ text: `${prompt}. Kualitas sinematik, detail tinggi.` }] },
        config: { imageConfig: { aspectRatio: aspectRatio as any, imageSize: imageSize as any } }
      });

      if (response?.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            setResultImages([`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`]);
            setIsGenerating(false);
            return;
          }
        }
      }
    } catch (e: any) { 
      if (retryCount < 2) { rotateApiKey(); return generateImage(retryCount + 1); }
      setIsGenerating(false);
    } finally { refreshCredits(); }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all active:scale-95"><i className="fa-solid fa-chevron-left"></i></button>
          <h2 className="text-2xl font-bold uppercase italic text-white">Visual <span className="text-cyan-400">Artist</span></h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
           <section className="glass-panel p-8 rounded-[3rem] bg-slate-900/40 space-y-6 shadow-2xl border-white/5">
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} className="w-full h-32 bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-cyan-500/50" placeholder="Deskripsikan gambar Master..." />
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-500 px-1">Rasio</label>
                    <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value as any)} className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-[10px] text-white outline-none">
                       <option value="1:1">1:1</option>
                       <option value="16:9">16:9</option>
                       <option value="9:16">9:16</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-500 px-1">Size</label>
                    <select value={imageSize} onChange={e => setImageSize(e.target.value as any)} className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-[10px] text-white outline-none">
                       <option value="1K">1K</option>
                       <option value="2K">2K</option>
                       <option value="4K">4K</option>
                    </select>
                 </div>
              </div>
              <button onClick={() => generateImage()} disabled={isGenerating || !prompt} className="w-full py-5 bg-white text-black font-bold uppercase rounded-2xl hover:bg-cyan-500 transition-all shadow-xl active:scale-95 disabled:opacity-20 text-[10px] tracking-widest">
                {isGenerating ? "MENGRENDERING..." : "GENERATE GAMBAR"}
              </button>
           </section>
        </div>
        <div className="lg:col-span-8">
           <div className="glass-panel min-h-[500px] rounded-[3.5rem] bg-black/30 border-white/5 shadow-2xl flex items-center justify-center overflow-hidden relative">
              {resultImages.length > 0 ? (
                <div className="flex flex-col items-center gap-6">
                   <img src={resultImages[0]} className="max-w-full max-h-[450px] rounded-2xl shadow-2xl border border-white/10" />
                   <a href={resultImages[0]} download="satmoko_art.png" className="px-10 py-4 bg-cyan-600 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-white hover:text-black transition-all">UNDUH KARYA</a>
                </div>
              ) : (
                <div className="text-center opacity-10 flex flex-col items-center">
                   <i className="fa-solid fa-palette text-8xl mb-6"></i>
                   <p className="text-[11px] font-black uppercase tracking-[0.8em]">READY_FOR_RENDER</p>
                </div>
              )}
              {isGenerating && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center">
                   <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full mb-6" />
                   <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] animate-pulse">NEURAL_DRAWING_ACTIVE</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};
