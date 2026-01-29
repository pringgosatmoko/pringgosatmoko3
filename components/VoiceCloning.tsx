
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { motion, AnimatePresence } from 'framer-motion';
import { deductCredits, getSystemSettings, rotateApiKey } from '../lib/api';

interface LogEntry {
  id: string;
  msg: string;
  type: 'info' | 'success' | 'warning' | 'error';
  time: string;
}

interface SceneResult {
  text: string;
  videoUrl: string | null;
  audioUrl: string | null;
  isRendering: boolean;
  isAudioLoading: boolean;
}

interface VoiceCloningProps {
  onBack: () => void;
  lang: 'id' | 'en';
  userEmail: string;
  credits: number;
  refreshCredits: () => void;
}

export const VoiceCloning: React.FC<VoiceCloningProps> = ({ onBack, lang, userEmail, credits, refreshCredits }) => {
  const [refImage, setRefImage] = useState<string | null>(null);
  const [script, setScript] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [visualPrompt, setVisualPrompt] = useState('');
  const [scenes, setScenes] = useState<SceneResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedVideoUrl, setMergedVideoUrl] = useState<string | null>(null);
  const [processLogs, setProcessLogs] = useState<LogEntry[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [costs, setCosts] = useState({ voice: 150, video: 150 });

  useEffect(() => {
    getSystemSettings().then(s => setCosts({ voice: s.cost_voice || 150, video: s.cost_video || 150 }));
  }, []);

  const voices = [
    { name: 'Zephyr', desc: 'Wibawa' },
    { name: 'Puck', desc: 'Ceria' },
    { name: 'Kore', desc: 'Lembut' },
    { name: 'Fenrir', desc: 'Berat' }
  ];

  const addLog = (msg: string, type: LogEntry['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setProcessLogs(prev => {
      const newLogs = [...prev, { id, msg, type, time }];
      return newLogs.length > 5 ? newLogs.slice(1) : newLogs;
    });
  };

  const removeLog = (id: string) => {
    setProcessLogs(prev => prev.filter(log => log.id !== id));
  };

  const downloadAudio = (url: string, index: number) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `suara_adegan_${index + 1}.wav`;
    a.click();
    addLog(`Suara adegan ${index + 1} diunduh.`, "success");
  };

  const decodeBase64Audio = async (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const dataInt16 = new Int16Array(bytes.buffer);
    const buffer = audioContext.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
    
    const wavBlob = await new Promise<Blob>((resolve) => {
      const worker = new Worker(URL.createObjectURL(new Blob([`
        onmessage = function(e) {
          const buffer = e.data;
          const length = buffer.length * 2;
          const view = new DataView(new ArrayBuffer(44 + length));
          const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
          };
          writeString(0, 'RIFF');
          view.setUint32(4, 36 + length, true);
          writeString(8, 'WAVE');
          writeString(12, 'fmt ');
          view.setUint32(16, 16, true); view.setUint16(20, 1, true);
          view.setUint16(22, 1, true); view.setUint32(24, 24000, true);
          view.setUint32(28, 48000, true); view.setUint16(32, 2, true);
          view.setUint16(34, 16, true); writeString(36, 'data');
          view.setUint32(40, length, true);
          for (let i = 0; i < buffer.length; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, buffer[i])) * 0x7FFF, true);
          postMessage(new Blob([view], { type: 'audio/wav' }));
        }
      `], { type: 'application/javascript' })));
      worker.onmessage = (e) => resolve(e.data);
      worker.postMessage(channelData);
    });
    return URL.createObjectURL(wavBlob);
  };

  const generateVoice = async () => {
    if (credits < costs.voice) return addLog("Kredit Habis!", "error");
    setIsProcessing(true);
    setMergedVideoUrl(null);
    setScenes([]);
    addLog(`Menyiapkan naskah...`);
    try {
      const success = await deductCredits(userEmail, costs.voice);
      if (!success) { setIsProcessing(false); return; }
      refreshCredits();
      
      const splitText = script.split(/[.!?\n]+/).filter(t => t.trim().length > 3);
      setScenes(splitText.map(t => ({ 
        text: t.trim(), 
        videoUrl: null, 
        audioUrl: null, 
        isRendering: false, 
        isAudioLoading: false 
      })));
      
      addLog(`Naskah diproses menjadi ${splitText.length} bagian.`, "success");
    } catch (e: any) { addLog(`Gagal: ${e.message}`, "error"); } finally { setIsProcessing(false); refreshCredits(); }
  };

  const generateSceneAudio = async (index: number, retryCount = 0) => {
    addLog(retryCount > 0 ? `Coba ulang audio adegan ${index + 1}... (${retryCount})` : `Sedang membuat suara adegan ${index + 1}...`);
    setScenes(prev => prev.map((s, i) => i === index ? { ...s, isAudioLoading: true } : s));
    try {
      // Correct: Use process.env.API_KEY directly as per guidelines.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: scenes[index].text }] }],
        config: {
          responseModalalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } }
        }
      });
      const base64Output = response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Output) {
        const audioUrl = await decodeBase64Audio(base64Output);
        setScenes(prev => prev.map((s, i) => i === index ? { ...s, audioUrl, isAudioLoading: false } : s));
        addLog(`Suara adegan ${index + 1} siap.`, "success");
      }
    } catch (e: any) { 
      const errorMsg = e?.message || "";
      if (errorMsg.includes("Requested entity was not found.")) {
        if (window.aistudio) window.aistudio.openSelectKey();
      }

      if ((errorMsg.includes('429') || errorMsg.includes('quota')) && retryCount < 3) {
        rotateApiKey();
        const backoff = Math.pow(2, retryCount) * 1000;
        await new Promise(r => setTimeout(r, backoff));
        return generateSceneAudio(index, retryCount + 1);
      }
      setScenes(prev => prev.map((s, i) => i === index ? { ...s, isAudioLoading: false } : s));
      addLog(`Gagal membuat suara.`, "error"); 
    }
  };

  const renderScene = async (index: number, retryCount = 0) => {
    if (credits < costs.video && retryCount === 0) return addLog("Kredit Habis!", "error");
    addLog(retryCount > 0 ? `Coba ulang visual adegan ${index + 1}... (${retryCount})` : `Sedang menggambar visual adegan ${index + 1}...`);
    setScenes(prev => prev.map((s, i) => i === index ? { ...s, isRendering: true } : s));
    try {
      if (retryCount === 0) {
        const success = await deductCredits(userEmail, costs.video);
        if (!success) {
          setScenes(prev => prev.map((s, i) => i === index ? { ...s, isRendering: false } : s));
          return;
        }
        refreshCredits();
      }

      // Correct: Use process.env.API_KEY directly as per guidelines.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const scenePrompt = `${visualPrompt}, adegan: ${scenes[index].text}, cinematic style.`;
      const modelName = refImage ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview';
      
      let operation = await ai.models.generateVideos({
        model: modelName,
        prompt: scenePrompt,
        image: refImage ? { imageBytes: refImage.split(',')[1], mimeType: 'image/png' } : undefined,
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: aspectRatio as any }
      });
      while (!operation.done) {
        await new Promise(r => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
        if (operation.error) throw operation.error;
      }
      const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (uri) {
        // Correct: Append API key for fetching the video bytes as per guidelines.
        const resp = await fetch(`${uri}&key=${process.env.API_KEY}`);
        const blob = await resp.blob();
        const videoUrl = URL.createObjectURL(blob);
        setScenes(prev => prev.map((s, i) => i === index ? { ...s, videoUrl, isRendering: false } : s));
        addLog(`Visual selesai (-${costs.video} CR)`, "success");
      }
    } catch (e: any) {
      const errorMsg = e?.message || "";
      if (errorMsg.includes("Requested entity was not found.")) {
        if (window.aistudio) window.aistudio.openSelectKey();
      }

      if ((errorMsg.includes('429') || errorMsg.includes('quota')) && retryCount < 3) {
        rotateApiKey();
        const backoff = Math.pow(2, retryCount) * 2000;
        await new Promise(r => setTimeout(r, backoff));
        return renderScene(index, retryCount + 1);
      }
      setScenes(prev => prev.map((s, i) => i === index ? { ...s, isRendering: false } : s));
      addLog(`Gagal membuat visual.`, "error");
    } finally { refreshCredits(); }
  };
