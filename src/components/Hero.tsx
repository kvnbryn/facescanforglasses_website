'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

type HeroProps = {
  onStart: () => void;
};

export default function Hero({ onStart }: HeroProps) {
  const [isLaunching, setIsLaunching] = useState(false);

  const startScan = useCallback(() => {
    if (isLaunching) return;
    setIsLaunching(true);
    window.setTimeout(() => onStart(), 620);
  }, [isLaunching, onStart]);

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-[#0a0a0a] font-sans">
      {/* Background ambient light and tech grid */}
      <div className="absolute inset-0 bg-[#0a0a0a]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(56,189,248,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-60" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(56,189,248,0.1),transparent_50%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col items-center justify-between px-6 py-12 lg:flex-row lg:px-12">

        {/* Left Content */}
        <div className="relative z-20 flex w-full max-w-xl flex-col items-start justify-center pt-32 lg:w-1/2 lg:pt-0">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl font-medium leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-[4.5rem]"
          >
            Clinical Biometric<br />
            <span className="text-[#38bdf8]">Face Analysis</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-xl font-light leading-relaxed text-[#a1a1aa] sm:text-2xl"
          >
            AI-powered ophthalmic measurement engine<br />
            for perfect anatomical frame matching.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-12"
          >
            <button
              onClick={startScan}
              disabled={isLaunching}
              className="group relative flex items-center justify-center rounded-xl border border-[#38bdf8]/60 bg-[#082f49]/40 px-8 py-4 font-medium text-[#38bdf8] transition-all duration-300 hover:bg-[#082f49]/60 disabled:opacity-50"
            >
              <div className="absolute inset-0 -z-10 rounded-xl bg-[#38bdf8]/10 blur-xl transition-all duration-300 group-hover:bg-[#38bdf8]/25 group-hover:blur-2xl" />
              <span className="text-lg tracking-wide">{isLaunching ? 'Initializing System...' : 'Start Clinical Scan'}</span>
            </button>
          </motion.div>
        </div>

        {/* Right Content - Anatomy Image */}
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-15 sm:opacity-20 lg:pointer-events-auto lg:relative lg:z-10 lg:w-1/2 lg:opacity-100">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[600px] lg:max-w-[500px]"
          >
            {/* Smooth radial mask to fade out all edges perfectly */}
            <div 
              style={{ 
                WebkitMaskImage: 'radial-gradient(ellipse at center, black 35%, transparent 70%)', 
                maskImage: 'radial-gradient(ellipse at center, black 35%, transparent 70%)' 
              }} 
              className="relative flex items-center justify-center"
            >
              <Image
                src="/anatomy1.png"
                alt="Facial Anatomy Map"
                width={800}
                height={800}
                className="h-auto w-full object-contain mix-blend-screen opacity-75 hue-rotate-60 brightness-125 saturate-150 contrast-125"
                priority
              />
              {/* Medical scanner crosshairs */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                <div className="absolute w-[60%] h-[60%] border border-[#38bdf8]/30 rounded-full animate-[spin_30s_linear_infinite] border-dashed" />
                <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-[#38bdf8]/40 to-transparent" />
                <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-[#38bdf8]/40 to-transparent" />
              </div>
            </div>
          </motion.div>
        </div>

      </div>

      {/* Screen flash transition on launch */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-50 bg-[#38bdf8]"
        initial={{ opacity: 0 }}
        animate={{ opacity: isLaunching ? [0, 0.1, 0] : 0 }}
        transition={{ duration: 0.6, times: [0, 0.3, 1] }}
      />
    </section>
  );
}
