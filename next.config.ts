import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // Mode Static Export (Wajib untuk Cloudflare Pages)
  output: 'export',

  // Matikan optimasi gambar (Wajib untuk Static Export)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;