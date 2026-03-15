import React from 'react'
import "../globals.css";

export default function PlayLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="w-screen h-screen overflow-hidden bg-[#D0F4FF] m-0 p-0 font-sans">
        {children}
      </body>
    </html>
  )
}