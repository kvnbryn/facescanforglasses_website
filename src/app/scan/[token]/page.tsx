import { verifyToken } from '@/lib/jwt';
import ScanApp from '@/components/ScanApp';
import { redirect } from 'next/navigation';

export default async function ScanPage({ params }: { params: { token: string } }) {
  // Await the params in Next.js 15 (if applicable, but works fine in older versions too)
  const token = params.token;

  if (!token) {
    redirect('/');
  }

  // Verify the JWT token
  const payload = await verifyToken(token);

  if (!payload) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-6">
        <div className="max-w-md w-full border border-red-500/30 bg-red-950/20 p-8 rounded-3xl text-center shadow-[0_0_40px_rgba(220,38,38,0.1)]">
          <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-full bg-red-500/20 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2 tracking-wide">Akses Ditolak</h1>
          <p className="text-zinc-400 text-sm leading-relaxed mb-6">
            Link ini tidak valid atau sudah kadaluarsa. Silakan minta link baru kepada admin.
          </p>
          <a href="/" className="inline-block px-6 py-3 bg-zinc-800 text-white text-sm font-medium rounded-xl hover:bg-zinc-700 transition-colors">
            Kembali
          </a>
        </div>
      </div>
    );
  }

  // If token is valid, render the actual app
  return <ScanApp />;
}
