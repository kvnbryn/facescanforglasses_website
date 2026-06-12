'use client';

import { motion } from 'framer-motion';

export default function FaceScannerLottie() {
  return (
    <div className="relative h-40 w-40 overflow-hidden rounded-full border border-[#a3e635]/20 bg-black/40 shadow-[0_0_30px_rgba(163,230,53,0.15)]">
      {/* Grid Background */}
      <div 
        className="absolute inset-0 opacity-20" 
        style={{
          backgroundImage: 'linear-gradient(#a3e635 1px, transparent 1px), linear-gradient(90deg, #a3e635 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      />
      
      {/* Face SVG Outline */}
      <svg 
        viewBox="0 0 100 120" 
        className="absolute inset-0 h-full w-full p-6 text-[#a3e635]"
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1.5"
      >
        <motion.path 
          d="M 50 10 C 25 10 15 30 15 55 C 15 80 30 105 50 110 C 70 105 85 80 85 55 C 85 30 75 10 50 10 Z"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Eyes */}
        <motion.path 
          d="M 35 45 C 35 45 40 43 45 45 M 55 45 C 55 45 60 43 65 45"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.8 }}
          transition={{ duration: 2, delay: 0.5, repeat: Infinity }}
        />
        {/* Nose */}
        <motion.path 
          d="M 50 45 L 50 65 L 45 70"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.8 }}
          transition={{ duration: 2, delay: 0.8, repeat: Infinity }}
        />
        {/* Lips */}
        <motion.path 
          d="M 40 85 C 45 88 55 88 60 85"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.8 }}
          transition={{ duration: 2, delay: 1.1, repeat: Infinity }}
        />
      </svg>

      {/* Biometric Dots */}
      {[
        { top: '35%', left: '30%' },
        { top: '35%', left: '70%' },
        { top: '65%', left: '50%' },
        { top: '80%', left: '40%' },
        { top: '80%', left: '60%' },
      ].map((dot, i) => (
        <motion.div
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-[#a3e635] shadow-[0_0_8px_rgba(163,230,53,1)]"
          style={dot}
          animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity }}
        />
      ))}

      {/* Scanning Laser */}
      <motion.div
        className="absolute left-0 right-0 h-1 bg-[#a3e635] shadow-[0_0_20px_rgba(163,230,53,1)]"
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
