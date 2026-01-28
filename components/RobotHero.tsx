
import React from 'react';
import { motion } from 'framer-motion';

export const RobotHero: React.FC = () => {
  return (
    <div className="relative w-64 h-64 flex items-center justify-center mb-10">
      {/* Outer Rotating HUD Rings */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 border-2 border-dashed border-cyan-500/20 rounded-full"
      />
      <motion.div 
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute inset-4 border border-cyan-400/10 rounded-full border-t-cyan-400/40"
      />
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute inset-8 border border-fuchsia-500/10 rounded-full border-b-fuchsia-500/40"
      />

      {/* Central Core Container */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="w-40 h-40 rounded-full flex items-center justify-center bg-black/60 backdrop-blur-3xl border border-white/10 shadow-[0_0_80px_rgba(34,211,238,0.2)] relative overflow-hidden group"
      >
        {/* Scan Line Effect */}
        <motion.div 
          animate={{ top: ["-100%", "100%", "-100%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute left-0 right-0 h-1 bg-cyan-400/40 blur-sm z-20"
        />
        
        {/* Glowing Core Icon */}
        <div className="relative z-10">
          <motion.div
            animate={{ 
              textShadow: [
                "0 0 10px rgba(34,211,238,0.5)",
                "0 0 25px rgba(34,211,238,0.8)",
                "0 0 10px rgba(34,211,238,0.5)"
              ],
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <i className="fa-solid fa-brain text-cyan-400 text-6xl"></i>
          </motion.div>
        </div>

        {/* Inner Glitch Particles */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ 
                x: [0, Math.random() * 40 - 20, 0],
                y: [0, Math.random() * 40 - 20, 0],
                opacity: [0, 1, 0]
              }}
              transition={{ duration: Math.random() * 2 + 1, repeat: Infinity }}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{ 
                left: `${Math.random() * 100}%`, 
                top: `${Math.random() * 100}%` 
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Decorative HUD Elements */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
        <motion.div 
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-10 h-1 bg-cyan-500/40 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)]"
        />
        <motion.div 
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          className="w-10 h-1 bg-fuchsia-500/40 rounded-full shadow-[0_0_10px_rgba(217,70,239,0.5)]"
        />
      </div>
    </div>
  );
};
