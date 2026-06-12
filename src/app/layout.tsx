import type { Metadata } from "next";
import { Kalam } from "next/font/google";
import SmoothScroll from "@/components/SmoothScroll";
import "./globals.css";

const kalam = Kalam({
  weight: ["300", "400", "700"],
  subsets: ["latin"],
  variable: "--font-kalam",
});

export const metadata: Metadata = {
  title: "Face Geometry Analysis",
  description: "Precision eyewear matching based on facial structure.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${kalam.variable} bg-[#0a0a0a] font-sans text-white antialiased selection:bg-[#4ade80]/30 selection:text-white`}>
        <SmoothScroll>
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}
