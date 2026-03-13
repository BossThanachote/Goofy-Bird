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
    <html lang="en">
      <body className="antialiased overflow-x-hidden">
        {/* บอสสามารถใส่ Navbar ของแอดมินไว้ตรงนี้ในอนาคตได้ครับ */}
        <main>{children}</main>
      </body>
    </html>
  )
}