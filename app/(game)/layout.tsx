import type { Metadata } from "next";
import { Fredoka } from "next/font/google"; // เปลี่ยนจาก Geist เป็น Fredoka
import "../globals.css";

// ตั้งค่าฟอนต์ Fredoka
const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fredoka", // กำหนดชื่อตัวแปร CSS
});

export const metadata: Metadata = {
  title: "Goofy Bird", // เปลี่ยนชื่อ Title ให้ตรงโปรเจกต์
  description: "Multiplayer Web Game built with Next.js and Go",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${fredoka.variable} antialiased`} // ใช้ตัวแปรฟอนต์ที่นี่
      >
        {children}
      </body>
    </html>
  );
}