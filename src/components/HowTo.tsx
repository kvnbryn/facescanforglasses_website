'use client';

import { motion } from 'framer-motion';
import { ScanFace, Sparkles, MonitorSmartphone } from 'lucide-react';

const steps = [
  {
    icon: <MonitorSmartphone size={32} />,
    title: "Position",
    desc: "Pastikan wajah berada di tengah frame dan pencahayaan cukup terang."
  },
  {
    icon: <ScanFace size={32} />,
    title: "Analysis",
    desc: "AI akan memindai kontur wajah Anda selama 3 detik untuk akurasi maksimal."
  },
  {
    icon: <Sparkles size={32} />,
    title: "Reveal",
    desc: "Dapatkan rekomendasi personal berdasarkan data geometri wajah Anda."
  }
];

export default function HowTo() {
  return (
    <section className="py-20 px-6 relative z-10">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-serif text-white mb-4">How It Works</h2>
          <div className="h-1 w-20 bg-luxury-gold mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              className="glass-panel p-8 rounded-2xl text-center group hover:bg-white/5 transition-colors border border-white/5"
            >
              <div className="w-16 h-16 bg-luxury-charcoal rounded-full flex items-center justify-center text-luxury-gold mx-auto mb-6 group-hover:scale-110 transition-transform border border-luxury-gold/20 shadow-lg shadow-luxury-gold/5">
                {step.icon}
              </div>
              <h3 className="text-xl font-serif text-white mb-3">{step.title}</h3>
              <p className="text-luxury-white/50 text-sm leading-relaxed">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}