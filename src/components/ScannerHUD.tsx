'use client';

import { motion } from 'framer-motion';

type ScannerHUDProps = {
  isScanning: boolean;
  progress: number;
  activeStep: 1 | 2 | 3;
  fps: number;
};

const stepLabels: Record<ScannerHUDProps['activeStep'], string> = {
  1: 'FRONTAL_CRANIAL_MESH',
  2: 'SAGITTAL_CALIBRATION',
  3: 'MANDIBULAR_ARC_VERIFY',
};

export default function ScannerHUD({ isScanning, progress, activeStep, fps }: ScannerHUDProps) {
  const scanColor = activeStep === 3 ? '#f59e0b' : '#10b981';

  return (
    <div className="pointer-events-none absolute inset-0 z-20 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-100/80">
      <div className="absolute inset-4 border border-emerald-400/25 shadow-[0_0_15px_rgba(16,185,129,0.15)]" />
      <div className="absolute inset-8 border border-zinc-700/45" />

      <div className="absolute left-4 top-4 h-16 w-16 border-l-2 border-t-2 border-emerald-400" />
      <div className="absolute right-4 top-4 h-16 w-16 border-r-2 border-t-2 border-emerald-400" />
      <div className="absolute bottom-4 left-4 h-16 w-16 border-b-2 border-l-2 border-emerald-400" />
      <div className="absolute bottom-4 right-4 h-16 w-16 border-b-2 border-r-2 border-emerald-400" />

      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-emerald-300/40 to-transparent" />
      <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-gradient-to-r from-transparent via-emerald-300/35 to-transparent" />

      {isScanning && (
        <>
          <motion.div
            initial={{ top: '6%' }}
            animate={{ top: '94%' }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }}
            className="absolute left-5 right-5 h-[2px] -translate-y-1/2"
            style={{
              background: `linear-gradient(90deg, transparent, ${scanColor}, #d1fae5, transparent)`,
              boxShadow: `0 0 24px ${scanColor}`,
            }}
          />
          <motion.div
            initial={{ top: '6%' }}
            animate={{ top: '94%' }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }}
            className="absolute left-8 right-8 h-20 -translate-y-1/2 bg-gradient-to-b from-transparent via-emerald-400/12 to-transparent"
          />
        </>
      )}

      <div className="absolute left-8 top-8 w-[min(70%,24rem)] border border-zinc-800/60 bg-zinc-950/60 p-3 backdrop-blur-md">
        <div className="mb-2 flex items-center justify-between border-b border-zinc-800 pb-2">
          <span className="text-emerald-300">INVESTIGATION MODE</span>
          <span className="text-zinc-500">SHAPE_DETECTOR_3D</span>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-zinc-400">
          <span>TARGET_ID</span>
          <span className="text-right text-emerald-200">REF-X984_USER</span>
          <span>STREAM_FPS</span>
          <span className="text-right text-emerald-200">{fps.toFixed(1)}</span>
          <span>ACTIVE_NODE</span>
          <span className="text-right text-amber-300">{stepLabels[activeStep]}</span>
          <span>SYS_STATUS</span>
          <motion.span
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 0.9, repeat: Infinity }}
            className="text-right text-emerald-300"
          >
            MESH_STABLE
          </motion.span>
        </div>
      </div>

      <div className="absolute bottom-8 left-8 right-8">
        <div className="mb-2 flex items-center justify-between text-zinc-500">
          <span>CALIBRATION_PROGRESS</span>
          <span className="text-emerald-300">{progress.toString().padStart(3, '0')}%</span>
        </div>
        <div className="h-1 overflow-hidden bg-zinc-900">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 via-emerald-300 to-amber-400 shadow-[0_0_15px_rgba(16,185,129,0.35)]"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.15 }}
          />
        </div>
      </div>
    </div>
  );
}
