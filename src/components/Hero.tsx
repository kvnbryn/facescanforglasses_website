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
      {/* Background ambient light if needed, though the design is mostly dark */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(163,230,53,0.03),transparent_40%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col items-center justify-between px-6 py-12 lg:flex-row lg:px-12">

        {/* Left Content */}
        <div className="relative z-20 flex w-full max-w-xl flex-col items-start justify-center pt-32 lg:w-1/2 lg:pt-0">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl font-medium leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-[4.5rem]"
          >
            Face Geometry<br />
            Analysis
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-xl font-light leading-relaxed text-[#a1a1aa] sm:text-2xl"
          >
            Precision eyewear matching<br />
            based on facial structure
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
              className="group relative flex items-center justify-center rounded-xl border border-[#4ade80]/60 bg-[#0a2e18]/40 px-8 py-4 font-medium text-[#4ade80] transition-all duration-300 hover:bg-[#0a2e18]/60 disabled:opacity-50"
            >
              {/* Green Glow effect */}
              <div className="absolute inset-0 -z-10 rounded-xl bg-[#4ade80]/10 blur-xl transition-all duration-300 group-hover:bg-[#4ade80]/25 group-hover:blur-2xl" />
              <span className="text-lg tracking-wide">{isLaunching ? 'Starting...' : 'Start Face Scan'}</span>
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
            {/* Edge blending overlays to hide hard image borders */}
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#0a0a0a] to-transparent sm:w-24" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#0a0a0a] to-transparent sm:w-24" />
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-[#0a0a0a] to-transparent sm:h-24" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-[#0a0a0a] to-transparent sm:h-24" />

            <Image
              src="/anatomy1.png"
              alt="Facial Anatomy Map"
              width={800}
              height={800}
              className="h-auto w-full object-contain mix-blend-screen"
              priority
            />
          </motion.div>
        </div>

      </div>

      {/* Screen flash transition on launch */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-50 bg-[#4ade80]"
        initial={{ opacity: 0 }}
        animate={{ opacity: isLaunching ? [0, 0.1, 0] : 0 }}
        transition={{ duration: 0.6, times: [0, 0.3, 1] }}
      />
    </section>
  );
}
