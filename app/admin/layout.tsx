// app/admin/layout.tsx
import React from 'react'
import "../globals.css";

export const metadata = {
  title: 'Goofy Bird | Admin Panel',
  description: 'Backend management for Goofy Bird game',
}

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="antialiased overflow-x-hidden min-h-screen bg-slate-50">
      {/* บอสสามารถใส่ Navbar ของแอดมินไว้ตรงนี้ในอนาคตได้ครับ */}
      <main>{children}</main>
    </div>
  )
}