import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // Matikan optimasi gambar (Wajib untuk Static Export)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;