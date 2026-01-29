
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { motion, AnimatePresence } from 'framer-motion';
import { deductCredits, getSystemSettings, rotateApiKey } from '../lib/api';

interface StoryboardItem {
  scene: string;
  visual: string;
  audio: string;
  duration: number;
}

interface StudioCreatorProps {
  onBack: () => void;
  lang: 'id' | 'en';
  userEmail: string;
  credits: number;
  refreshCredits: () => void;
}

export const StudioCreator: React.FC<StudioCreatorProps> = ({ onBack, lang, userEmail, credits, refreshCredits }) => {
  const [title, setTitle] = useState('');
  const [videoStyle, setVideoStyle] = useState('Disney Pixar');
  const [refImages, setRefImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'input' | 'story'>('input');
  const [storyboard, setStoryboard] = useState<StoryboardItem[]>([]);
  const [costStudio, setCostStudio] = useState(600);

  useEffect(() => {
    getSystemSettings().then(s => setCostStudio(s.cost_studio || 600));
  }, []);

  const constructProject = async (retryCount = 0) => {
    if (!title || credits < costStudio) return;
    setIsProcessing(true);
    
    try {
      if (retryCount === 0) {
        await deductCredits(userEmail, costStudio);
        refreshCredits();
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const systemPrompt = `Role: Direktur Kreatif. Proyek: "${title}". Gaya Visual: ${videoStyle}. Buat 4 adegan storyboard dalam format JSON ARRAY.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', 
        contents: systemPrompt,
        config: { 
          responseMimeType: "application/json", 
          responseSchema: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT, 
              properties: { 
                scene: { type: Type.STRING }, 
                visual: { type: Type.STRING }, 
                audio: { type: Type.STRING }, 
                duration: { type: Type.NUMBER }
              },
              required: ["scene", "visual", "audio", "duration"]
            } 
          } 
        }
      });
      
      const data = JSON.parse(response.text || '[]');
      setStoryboard(data);
      setStep('story');
    } catch (e: any) {
      if (retryCount < 2) { rotateApiKey(); return constructProject(retryCount + 1); }
    } finally { setIsProcessing(false); }
  };

  const handleRefImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setRefImages(prev => [...prev, reader.result as string].slice(0, 3));
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all active:scale-95"><i className="fa-solid fa-chevron-left"></i></button>
          <h2 className="text-2xl font-bold uppercase italic text-white">Studio <span className="text-cyan-400">Creator</span></h2>
        </div>
      </div>

      {step === 'input' ? (
        <div className="max-w-4xl mx-auto glass-panel p-10 rounded-[3rem] bg-slate-900/40 space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest px-1">Judul Project</label>
                 <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Contoh: Iklan Kopi Viral" className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:border-cyan-500/30 outline-none" />
              </div>
              <div className="space-y-4">
                 <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest px-1">Referensi Karakter</label>
                 <div className="grid grid-cols-3 gap-2">
                    {refImages.map((img, i) => (
                      <div key={i} className="aspect-square rounded-xl overflow-hidden border border-white/10"><img src={img} className="w-full h-full object-cover" /></div>
                    ))}
                    {refImages.length < 3 && (
                      <label className="aspect-square rounded-xl border border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/5">
                        <i className="fa-solid fa-plus text-slate-700"></i>
                        <input type="file" onChange={handleRefImage} className="hidden" accept="image/*" />
                      </label>
                    )}
                 </div>
              </div>
           </div>
           <button onClick={constructProject} disabled={isProcessing || !title} className="w-full py-6 bg-cyan-500 text-black font-bold uppercase rounded-3xl shadow-xl hover:bg-white transition-all active:scale-95">
             {isProcessing ? "MENGKONSTRUKSI..." : "BUAT STORYBOARD SEKARANG"}
           </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {storyboard.map((scene, i) => (
             <div key={i} className="glass-panel p-6 rounded-[2.5rem] bg-[#0d1117] border border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                   <span className="px-3 py-1 bg-cyan-500 text-black rounded-lg text-[10px] font-black uppercase">{scene.scene}</span>
                   <p className="text-[10px] font-bold text-slate-500">{scene.duration}s</p>
                </div>
                <p className="text-xs text-white leading-relaxed">{scene.visual}</p>
                <div className="p-4 bg-black/40 rounded-2xl border border-white/5 italic text-slate-400 text-[11px]">"{scene.audio}"</div>
             </div>
           ))}
           <button onClick={() => setStep('input')} className="lg:col-span-2 py-4 text-slate-500 font-bold uppercase text-[10px] tracking-widest hover:text-white">Kembali Ke Pengaturan</button>
        </div>
      )}
    </div>
  );
};
