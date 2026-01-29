
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { motion } from 'framer-motion';
import { deductCredits, getSystemSettings, rotateApiKey } from '../lib/api';

interface AspectRatioEditorProps {
  onBack: () => void;
  lang: 'id' | 'en';
  userEmail: string;
  credits: number;
  refreshCredits: () => void;
}

export const AspectRatioEditor: React.FC<AspectRatioEditorProps> = ({ onBack, lang, userEmail, credits, refreshCredits }) => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [costPerProcess, setCostPerProcess] = useState(25);

  useEffect(() => {
    getSystemSettings().then(s => setCostPerProcess(s.cost_image || 25));
  }, []);

  const processReframe = async (retryCount = 0) => {
    if (!sourceImage || credits < costPerProcess) return;
    setIsProcessing(true);

    try {
      if (retryCount === 0) {
        await deductCredits(userEmail, costPerProcess);
        refreshCredits();
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ inlineData: { data: sourceImage.split(',')[1], mimeType: 'image/png' } }, { text: `Extend background to ${aspectRatio}.` }] },
        config: { imageConfig: { aspectRatio: aspectRatio as any } }
      });

      if (response?.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            setResultImage(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
            setIsProcessing(false);
            return;
          }
        }
      }
    } catch (e: any) {
      if (retryCount < 2) { rotateApiKey(); return processReframe(retryCount + 1); }
      setIsProcessing(false);
    } finally { refreshCredits(); }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all active:scale-95"><i className="fa-solid fa-chevron-left"></i></button>
          <h2 className="text-2xl font-bold uppercase italic text-white">Smart <span className="text-emerald-500">Outpaint</span></h2>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-5 space-y-6">
           <section className="glass-panel p-8 rounded-[2.5rem] bg-slate-900/40 border-white/5 space-y-6 shadow-2xl">
              <div className="aspect-video rounded-2xl border-2 border-dashed border-white/5 flex items-center justify-center cursor-pointer hover:bg-white/5 relative overflow-hidden">
                {sourceImage ? <img src={sourceImage} className="w-full h-full object-contain" /> : (
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                    <i className="fa-solid fa-cloud-arrow-up text-slate-700 text-3xl mb-2"></i>
                    <input type="file" onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const r = new FileReader();
                        r.onloadend = () => setSourceImage(r.result as string);
                        r.readAsDataURL(f);
                      }
                    }} className="hidden" accept="image/*" />
                  </label>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                 {['1:1', '16:9', '9:16', '4:3'].map(r => (
                   <button key={r} onClick={() => setAspectRatio(r)} className={`py-3 rounded-xl text-[10px] font-bold uppercase transition-all border ${aspectRatio === r ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-black/20 border-white/5 text-slate-500'}`}>{r}</button>
                 ))}
              </div>
              <button onClick={() => processReframe()} disabled={isProcessing || !sourceImage} className="w-full py-5 bg-white text-black font-bold uppercase rounded-2xl hover:bg-emerald-400 transition-all shadow-xl active:scale-95 disabled:opacity-20 text-[10px] tracking-widest">
                {isProcessing ? "MENGKONSTRUKSI..." : "START REFRAME"}
              </button>
           </section>
        </div>
        <div className="xl:col-span-7">
           <div className="glass-panel min-h-[500px] rounded-[3.5rem] bg-black/30 border-white/5 shadow-2xl flex items-center justify-center overflow-hidden relative">
              {resultImage ? (
                <div className="flex flex-col items-center gap-6">
                   <img src={resultImage} className="max-w-full max-h-[450px] rounded-2xl shadow-2xl border border-white/10" />
                   <a href={resultImage} download="satmoko_reframe.png" className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-white hover:text-black transition-all">UNDUH HASIL</a>
                </div>
              ) : (
                <div className="text-center opacity-10 flex flex-col items-center">
                   <i className="fa-solid fa-vector-square text-8xl mb-6"></i>
                   <p className="text-[11px] font-black uppercase tracking-[0.8em]">WAITING_FOR_INPUT</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};
