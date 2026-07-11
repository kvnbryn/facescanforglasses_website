'use client';

import { useState } from 'react';
import { Copy, CheckCircle2, Link as LinkIcon, ShieldAlert } from 'lucide-react';

export default function AdminGenerator() {
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [duration, setDuration] = useState('24h');
  const [generatedLink, setGeneratedLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setGeneratedLink('');
    setCopied(false);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminPassword: password,
          phone,
          duration
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat link');
      }

      setGeneratedLink(data.link);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] p-6 flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-md bg-[#111] border border-sky-500/20 rounded-3xl p-8 shadow-[0_0_40px_rgba(14,165,233,0.05)]">
        
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Admin Link Generator</h1>
            <p className="text-xs text-zinc-500 mt-1">Buat private link untuk client</p>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs uppercase tracking-widest text-zinc-400 mb-2">Password Admin</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password admin"
              required
              className="w-full bg-black border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-zinc-400 mb-2">Identifier (Opsional)</label>
            <input 
              type="text" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Misal: Nomor WA / Nama"
              className="w-full bg-black border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-zinc-400 mb-2">Masa Berlaku Link</label>
            <select 
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-black border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-sky-500/50 appearance-none"
            >
              <option value="1h">1 Jam</option>
              <option value="24h">24 Jam (1 Hari)</option>
              <option value="168h">7 Hari</option>
              <option value="720h">30 Hari</option>
            </select>
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="mt-4 w-full bg-sky-500 hover:bg-sky-400 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {isLoading ? <span className="animate-pulse">Membuat Link...</span> : 'Generate Private Link'}
          </button>
        </form>

        {generatedLink && (
          <div className="mt-8 pt-6 border-t border-zinc-800">
            <h3 className="text-xs uppercase tracking-widest text-emerald-400 mb-3">Link Berhasil Dibuat!</h3>
            <div className="flex bg-black border border-emerald-500/30 rounded-xl overflow-hidden p-1">
              <div className="flex-1 px-3 py-3 overflow-x-auto text-sm text-zinc-300 whitespace-nowrap scrollbar-hide">
                {generatedLink}
              </div>
              <button 
                onClick={copyToClipboard}
                className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-4 rounded-lg flex items-center justify-center transition-colors"
                title="Copy Link"
              >
                {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
              <LinkIcon size={12} />
              <span>Kirimkan link ini ke client Anda</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
