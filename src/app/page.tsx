export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#050505] p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center text-center">
        {/* Animated Lock Icon */}
        <div className="w-24 h-24 mb-8 relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-sky-500/20 animate-ping opacity-50" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-2 rounded-full border border-sky-500/30 animate-pulse" />
          <div className="w-14 h-14 bg-black border border-sky-500/50 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(14,165,233,0.3)] backdrop-blur-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-3 tracking-wide">
          Sistem Terkunci
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed mb-10 max-w-sm">
          Aplikasi Face Scanner Glasses ini bersifat eksklusif (private). Silakan gunakan link khusus yang telah dikirimkan oleh admin untuk masuk.
        </p>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent mb-10" />

        <div className="text-xs text-zinc-600 font-mono uppercase tracking-[0.2em]">
          Private Access Only
        </div>
      </div>
    </main>
  );
}
