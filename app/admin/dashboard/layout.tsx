'use client'
import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
// ✅ 1. เพิ่ม Trash2 icon
import { Bird, Package, Map as MapIcon, Store, LogOut, ShieldCheck, Languages, Trash2 } from 'lucide-react'

// 📖 2. เพิ่มคำแปล Recycle Bin
const translations = {
  EN: {
    system_status: 'System Online',
    management: 'Management',
    characters: 'Characters',
    items: 'Items',
    maps: 'Maps',
    shop: 'Shop',
    recycle_bin: 'Recycle Bin', // 👈 เพิ่มตรงนี้
    sign_out: 'Sign Out',
    admin_level: 'Super Admin'
  },
  TH: {
    system_status: 'ระบบออนไลน์',
    management: 'การจัดการ',
    characters: 'ตัวละคร',
    items: 'ไอเทม',
    maps: 'ด่าน/แผนที่',
    shop: 'ร้านค้า',
    recycle_bin: 'ถังขยะ', // 👈 เพิ่มตรงนี้
    sign_out: 'ออกจากระบบ',
    admin_level: 'ผู้ดูแลระบบสูงสุด'
  }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  
  const [lang, setLang] = useState<'EN' | 'TH'>('EN')
  const t = translations[lang] 

  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin')
    if (isAdmin !== 'true') router.push('/admin')

    // โหลดภาษาเริ่มต้น
    const savedLang = localStorage.getItem('appLang') as 'EN' | 'TH'
    if (savedLang) setLang(savedLang)
  }, [router])

  // 📝 3. เพิ่มเมนูถังขยะลงใน Sidebar
  const menuItems = [
    { id: 'characters', label: t.characters, path: '/admin/dashboard/characters', icon: <Bird size={20} /> },
    { id: 'items', label: t.items, path: '/admin/dashboard/items', icon: <Package size={20} /> },
    { id: 'maps', label: t.maps, path: '/admin/dashboard/maps', icon: <MapIcon size={20} /> },
    { id: 'shop', label: t.shop, path: '/admin/dashboard/shop', icon: <Store size={20} /> },
    { id: 'trash', label: t.recycle_bin, path: '/admin/dashboard/trash', icon: <Trash2 size={20} /> }, // 👈 เพิ่มบรรทัดนี้
  ]

  const toggleLang = () => {
    const newLang = lang === 'EN' ? 'TH' : 'EN'
    setLang(newLang)
    localStorage.setItem('appLang', newLang)
    window.dispatchEvent(new Event('storage')) 
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans">
      <aside className="w-72 bg-[#1E293B] text-white flex flex-col fixed h-full z-50 shadow-2xl">
        <div className="p-8 border-b border-slate-700 flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-xl shadow-lg">
            <ShieldCheck size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-black italic text-white uppercase">Goofy Admin</h1>
        </div>

        <nav className="flex-1 p-6 space-y-2">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] ml-2 mb-6 opacity-50">
            {t.management}
          </p>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${
                pathname === item.path ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
              } ${item.id === 'trash' ? 'mt-4 border border-slate-700/50' : ''}`} // 👈 พิเศษ: แยกถังขยะให้ห่างออกมานิดนึง
            >
              {item.icon}
              <span className="text-sm uppercase tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-700">
          <button onClick={() => { localStorage.removeItem('isAdmin'); router.push('/admin'); }} className="w-full flex items-center gap-4 px-6 py-4 text-red-400 font-bold hover:bg-red-500/10 rounded-2xl transition-all">
            <LogOut size={20} /> <span className="text-sm uppercase">{t.sign_out}</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 ml-72 flex flex-col min-h-screen">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.system_status}</span>
          </div>
          
          <div className="flex items-center gap-8">
            <button
              onClick={toggleLang}
              className="relative flex items-center bg-slate-100 border-2 border-slate-200 rounded-full p-1 w-20 h-10 hover:border-blue-400 transition-all shadow-inner"
            >
              <motion.div
                animate={{ x: lang === 'EN' ? 0 : 40 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute z-10 w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-md border border-slate-100"
              >
                <Languages size={16} />
              </motion.div>
              <div className="flex w-full justify-between px-2 font-black text-[10px] text-slate-400">
                <span>EN</span>
                <span>TH</span>
              </div>
            </button>

            <div className="flex items-center gap-4 border-l pl-8 border-slate-200">
              <div className="text-right">
                <p className="text-sm font-black text-slate-800 leading-none">Boss</p>
                <p className="text-[10px] font-bold text-blue-500 uppercase mt-1">{t.admin_level}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center text-white font-black">B</div>
            </div>
          </div>
        </header>

        <main className="p-10 flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}