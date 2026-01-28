
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LandingHero } from './LandingHero';

interface StartAnimationProps {
  onComplete: () => void;
}

export const StartAnimation: React.FC<StartAnimationProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 2500; // Total waktu animasi 2.5 detik
    const intervalTime = 50;
    const increment = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-[#010409] z-[999] flex flex-col items-center justify-center p-6 font-mono overflow-hidden">
      {/* Background Matrix-like grid halus */}
      <div className="absolute inset-0 opacity-5">
        <div className="h-full w-full bg-[radial-gradient(#22d3ee_1px,transparent_1px)] [background-size:32px_32px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-sm flex flex-col items-center space-y-12 relative z-10"
      >
        {/* Visual Brand Identity */}
        <div className="scale-90 md:scale-110">
          <LandingHero />
        </div>

        <div className="w-full space-y-6">
          <div className="text-center space-y-1">
             <motion.h1 
               initial={{ letterSpacing: "0.5em", opacity: 0 }}
               animate={{ letterSpacing: "0.2em", opacity: 1 }}
               className="text-lg font-black text-white italic uppercase tracking-widest"
             >
               Satmoko <span className="text-cyan-400">Studio</span>
             </motion.h1>
             <p className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.4em]">Initializing Creative Engine</p>
          </div>

          {/* Progress Bar Minimalis */}
          <div className="relative h-1 w-full bg-white/5 rounded-full overflow-hidden">
             <motion.div 
               animate={{ width: `${progress}%` }}
               className="h-full bg-cyan-500 shadow-[0_0_15px_#22d3ee]"
               transition={{ ease: "linear" }}
             />
          </div>

          <div className="flex justify-center items-center opacity-30">
             <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">
               {progress < 100 ? `Loading Core Modules... ${Math.round(progress)}%` : 'System Ready'}
             </p>
          </div>
        </div>
      </motion.div>

      {/* Decorative corners */}
      <div className="absolute top-10 left-10 w-4 h-4 border-t-2 border-l-2 border-white/10"></div>
      <div className="absolute top-10 right-10 w-4 h-4 border-t-2 border-r-2 border-white/10"></div>
      <div className="absolute bottom-10 left-10 w-4 h-4 border-b-2 border-l-2 border-white/10"></div>
      <div className="absolute bottom-10 right-10 w-4 h-4 border-b-2 border-r-2 border-white/10"></div>
    </div>
  );
};
