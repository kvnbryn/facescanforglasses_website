'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

type GlassesCardProps = {
  name: string;
  img: string;
  desc: string;
  matchScore: number;
  index: number;
  isPrimary?: boolean;
};

export default function GlassesCard({
  name,
  img,
  desc,
  matchScore,
  index,
  isPrimary = false,
}: GlassesCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15 + 0.2, duration: 0.5 }}
      className={`flex h-full flex-col overflow-hidden rounded-2xl bg-zinc-900/40 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
        isPrimary
          ? 'border border-[#38bdf8]/40 shadow-[0_10px_40px_rgba(163,230,53,0.1)]'
          : 'border border-white/5 shadow-xl hover:border-white/20'
      }`}
    >
      <div className="relative flex h-48 sm:h-56 items-center justify-center bg-black/20 p-6">
        {isPrimary && (
          <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-r from-[#38bdf8]/20 to-sky-500/10 px-4 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-[#38bdf8]">
            Paling Cocok Untuk Anda
          </div>
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(163,230,53,0.05),transparent_60%)] pointer-events-none" />
        <img
          src={img}
          alt={name}
          className="relative z-10 max-h-full max-w-full object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)] transition-transform duration-500 hover:scale-110"
        />
        <div className={`absolute right-4 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-md border border-white/5 z-20 ${isPrimary ? 'top-8' : 'top-4'}`}>
          <Star className="h-3 w-3 fill-[#38bdf8] text-[#38bdf8]" />
          <span className="font-mono text-xs font-bold text-white">{matchScore}% Match</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="mb-3 text-xl font-semibold tracking-wide text-white">{name}</h3>
        <p className="text-sm leading-relaxed text-zinc-400">{desc}</p>
      </div>
    </motion.article>
  );
}
