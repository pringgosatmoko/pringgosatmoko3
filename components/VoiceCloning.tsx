import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { motion } from 'framer-motion';
import { deductCredits, getSystemSettings, rotateApiKey } from '../lib/api';

interface VoiceCloningProps {
  onBack: () => void;
  lang: 'id' | 'en';
  userEmail: string;
  credits: number;
  refreshCredits: () => void;
}

export const VoiceCloning: React.FC<VoiceCloningProps> = ({ onBack, lang, userEmail, credits, refreshCredits }) => {
  const [script, setScript] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [costs, setCosts] = useState({ voice: 150 });

  useEffect(() => {
    getSystemSettings().then(s => setCosts({ voice: s.cost_voice || 150 }));
  }, []);

  const generateVoice = async (retryCount = 0) => {
    if (credits < costs.voice || !script) return;
    setIsProcessing(true);
    setAudioUrl(null);

    try {
      if (retryCount === 0) {
        await deductCredits(userEmail, costs.voice);
        refreshCredits();
      }
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: script }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } }
        }
      });
      
      const base64Output = response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Output) {
        const binaryString = atob(base64Output);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'audio/wav' });
        setAudioUrl(URL.createObjectURL(blob));
      }
    } catch (e: any) { 
      if (retryCount < 2) { rotateApiKey(); return generateVoice(retryCount + 1); }
    } finally { setIsProcessing(false); refreshCredits(); }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all active:scale-95"><i className="fa-solid fa-chevron-left"></i></button>
          <h2 className="text-2xl font-bold uppercase italic text-white">Voice <span className="text-cyan-400">Clone</span></h2>
        </div>
      </div>

      <div className="max-w-3xl mx-auto glass-panel p-10 rounded-[3rem] bg-slate-900/40 space-y-6 shadow-2xl border-white/5">
        <textarea value={script} onChange={e => setScript(e.target.value)} className="w-full h-40 bg-black/40 border border-white/10 rounded-2xl p-6 text-sm text-white focus:border-cyan-500/30 outline-none resize-none" placeholder="Tulis naskah yang ingin Master ubah jadi suara..." />
        <div className="grid grid-cols-2 gap-4">
           {['Zephyr', 'Kore', 'Puck', 'Fenrir'].map(v => (
             <button key={v} onClick={() => setSelectedVoice(v)} className={`py-4 rounded-xl text-[10px] font-black uppercase transition-all border ${selectedVoice === v ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-black/20 border-white/5 text-slate-500'}`}>{v}</button>
           ))}
        </div>
        <button onClick={() => generateVoice()} disabled={isProcessing || !script} className="w-full py-5 bg-white text-black font-bold uppercase rounded-2xl hover:bg-cyan-500 transition-all shadow-xl active:scale-95 disabled:opacity-20 text-[10px] tracking-widest">
          {isProcessing ? "MENGKLONING..." : `SINTESIS SUARA (${costs.voice} CR)`}
        </button>
      </div>

      {audioUrl && (
        <div className="max-w-3xl mx-auto mt-8 glass-panel p-8 rounded-[2.5rem] bg-black/40 border border-white/5 flex items-center justify-between">
           <audio src={audioUrl} controls className="h-8 w-40" />
           <a href={audioUrl} download="satmoko_clone.wav" className="w-10 h-10 rounded-xl bg-cyan-500 text-black flex items-center justify-center hover:bg-white transition-all"><i className="fa-solid fa-download"></i></a>
        </div>
      )}
    </div>
  );
};