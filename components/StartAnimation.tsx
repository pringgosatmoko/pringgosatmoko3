
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface StartAnimationProps {
  onComplete: () => void;
}

export const StartAnimation: React.FC<StartAnimationProps> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-[#000000] z-[999] flex flex-col items-center justify-center overflow-hidden">
      {/* HUD Backdrop - Minimalist */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[100px] animate-pulse"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* SA Logo Reconstruction */}
        <div className="w-64 h-64 flex items-center justify-center relative">
          <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-[0_0_30px_rgba(34,211,238,0.4)]">
            <defs>
              <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>

            {/* S Path */}
            <motion.path 
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: "easeInOut" }}
              d="M160 100 C80 100, 60 160, 100 200 S160 260, 100 300 S20 240, 20 240" 
              fill="none" 
              stroke="url(#logo-grad)" 
              strokeWidth="28" 
              strokeLinecap="round"
            />

            {/* A Path */}
            <motion.path 
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, delay: 0.3, ease: "easeInOut" }}
              d="M200 320 L270 80 L340 320" 
              fill="none" 
              stroke="url(#logo-grad)" 
              strokeWidth="28" 
              strokeLinecap="round"
            />
            
            {/* Brain/Core Circle in A */}
            <motion.circle 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.5, type: "spring" }}
              cx="270" cy="220" r="35" 
              fill="#000" 
              stroke="#22d3ee" 
              strokeWidth="2"
            />
            <motion.path
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 1.8 }}
               d="M255 220 L285 220 M270 205 L270 235"
               stroke="#22d3ee"
               strokeWidth="1.5"
            />
          </svg>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="mt-4 flex flex-col items-center gap-2"
        >
          <h1 className="text-white text-xs font-black tracking-[0.8em] uppercase italic">
            SATMOKO <span className="text-cyan-500">STUDIO</span>
          </h1>
          <div className="h-px w-20 bg-cyan-500/40"></div>
          <p className="text-[7px] text-slate-700 font-bold uppercase tracking-[0.4em] mt-1">NEURAL_LINK: ESTABLISHED</p>
        </motion.div>
      </motion.div>

      {/* Subtle Scanlines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
    </div>
  );
};
