import type { Metadata } from "next";
import { Fredoka } from "next/font/google"; 
import "./globals.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fredoka",
});


export const metadata: Metadata = {
  title: "Goofy Bird - Real-time Multiplayer Web Game", 
  description: "กระพือปีกหลบอุปสรรคสุดป่วนไปพร้อมกับเพื่อนๆ ใน Goofy Bird เกมเว็บบราวเซอร์ Multiplayer แบบเรียลไทม์ สร้างด้วย Next.js",
  keywords: ["Goofy Bird", "เกมเล่นกับเพื่อน", "เกมบนเว็บ", "multiplayer web game", "nextjs game"],
  authors: [{ name: "Boss" }],
  openGraph: {
    title: "Goofy Bird - Real-time Multiplayer Web Game",
    description: "กระพือปีกหลบอุปสรรคสุดป่วนไปพร้อมกับเพื่อนๆ ใน Goofy Bird เกมเว็บบราวเซอร์ Multiplayer แบบเรียลไทม์",
    url: "https://goofy-bird.vercel.app/", 
    siteName: "Goofy Bird",
    images: [
      {
        url: "/og-image.png", 
        width: 1200,
        height: 630,
        alt: "Goofy Bird Game Preview",
      },
    ],
    locale: "th_TH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Goofy Bird - Multiplayer Web Game",
    description: "กระพือปีกหลบอุปสรรคสุดป่วนไปพร้อมกับเพื่อนๆ",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th"> 
      <body className={`${fredoka.variable} antialiased bg-[#D0F4FF]`}>
        {children}
      </body>
    </html>
  );
}