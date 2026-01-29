
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

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
      if (errMsg.includes("Requested entity was not found.")) {
        if (window.aistudio) window.aistudio.openSelectKey();
      }

      if ((errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('entity')) && retryCount < 3) {
        rotateApiKey();
        setTimeout(() => generateImage(retryCount + 1), 1000);
      } else {
        addLog("Node sibuk. Klik 'Mulai' lagi.", "error"); 
        setIsGenerating(false);
      }
    } finally { refreshCredits(); }
  };
