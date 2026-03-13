'use client'
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bird, Map as MapIcon, Users, Package, ArrowUpRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// 📖 Dictionary สำหรับเนื้อหาในหน้า Page
const contentTranslations = {
  EN: {
    welcome: "WELCOME BACK,",
    sub_welcome: "HERE IS WHAT'S HAPPENING WITH GOOFY BIRD TODAY.",
    characters: "Characters",
    maps: "Maps",
    players: "Players",
    items: "Total Items",
    quick_shortcuts: "QUICK SHORTCUTS",
    new_char: "+ New Character",
    new_map: "+ New Map",
    edit_shop: "Edit Shop Price",
    settings: "System Settings",
    admin_tip: "ADMIN TIP",
    tip_desc: "Don't forget to check the Base Difficulty in Map Management after adding new obstacles to ensure the gameplay remains balanced."
  },
  TH: {
    welcome: "ยินดีต้อนรับกลับมา,",
    sub_welcome: "นี่คือภาพรวมความเคลื่อนไหวของ GOOFY BIRD วันนี้",
    characters: "ตัวละคร",
    maps: "ด่าน/แผนที่",
    players: "ผู้เล่น",
    items: "ไอเทมทั้งหมด",
    quick_shortcuts: "ทางลัดด่วน",
    new_char: "+ เพิ่มตัวละครใหม่",
    new_map: "+ เพิ่มด่านใหม่",
    edit_shop: "แก้ไขราคาร้านค้า",
    settings: "ตั้งค่าระบบ",
    admin_tip: "คำแนะนำสำหรับแอดมิน",
    tip_desc: "อย่าลืมตรวจสอบ 'ความยากพื้นฐาน' ในการจัดการด่าน หลังจากเพิ่มอุปสรรคใหม่ๆ เพื่อให้สมดุลของเกมยังคงที่"
  }
}

export default function AdminDashboardPage() {
  const [lang, setLang] = useState<'EN' | 'TH'>('EN')
  const [stats, setStats] = useState({ characters: 0, maps: 0, players: 0, items: 0 })

  // 🔄 1. ระบบดักจับการเปลี่ยนภาษาจากปุ่มใน Layout
  useEffect(() => {
    const updateLang = () => {
      const savedLang = localStorage.getItem('appLang') as 'EN' | 'TH'
      if (savedLang) setLang(savedLang)
    }

    updateLang() // เช็คตอนโหลดหน้าครั้งแรก
    window.addEventListener('storage', updateLang) // ดักจับตอนกดปุ่มใน Layout
    
    // พิเศษ: สร้าง Interval เช็คสั้นๆ เพื่อให้การเปลี่ยนดู Real-time ขึ้น
    const interval = setInterval(updateLang, 500)
    
    return () => {
      window.removeEventListener('storage', updateLang)
      clearInterval(interval)
    }
  }, [])

  // 📊 2. ดึงข้อมูลสถิติจริงจาก Supabase
  useEffect(() => {
    const fetchStats = async () => {
      const { count: c } = await supabase.from('characters').select('*', { count: 'exact', head: true })
      const { count: m } = await supabase.from('maps').select('*', { count: 'exact', head: true })
      const { count: p } = await supabase.from('users').select('*', { count: 'exact', head: true })
      const { count: i } = await supabase.from('items').select('*', { count: 'exact', head: true })
      setStats({ characters: c || 0, maps: m || 0, players: p || 0, items: i || 0 })
    }
    fetchStats()
  }, [])

  const t = contentTranslations[lang]

  const statCards = [
    { label: t.characters, value: stats.characters, icon: <Bird className="text-blue-500" />, bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: t.maps, value: stats.maps, icon: <MapIcon className="text-green-500" />, bg: 'bg-green-50', border: 'border-green-100' },
    { label: t.players, value: stats.players, icon: <Users className="text-purple-500" />, bg: 'bg-purple-50', border: 'border-purple-100' },
    { label: t.items, value: stats.items, icon: <Package className="text-orange-500" />, bg: 'bg-orange-50', border: 'border-orange-100' },
  ]

  return (
    <div className="space-y-10">
      {/* 👋 Welcome Header (แปลครบแล้วครับบอส!) */}
      <div>
        <h1 className="text-4xl font-black text-slate-800 uppercase tracking-tight">
          {t.welcome} <span className="text-blue-600">Boss!</span>
        </h1>
        <p className="text-slate-400 font-bold mt-1 uppercase text-xs tracking-widest">
          {t.sub_welcome}
        </p>
      </div>

      {/* 📈 Stat Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-6 rounded-[2.5em] border-2 ${card.border} ${card.bg} shadow-sm hover:shadow-xl transition-all group`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                {card.icon}
              </div>
              <ArrowUpRight size={16} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-black text-[10px] uppercase tracking-wider">{card.label}</p>
            <h3 className="text-4xl font-black text-slate-800 mt-1">{card.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* 🚀 Actions & Tips Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border-2 border-slate-100 p-10 rounded-[3em] shadow-sm">
          <h3 className="text-xl font-black text-slate-800 mb-8 uppercase italic">{t.quick_shortcuts}</h3>
          <div className="grid grid-cols-2 gap-4">
            {[t.new_char, t.new_map, t.edit_shop, t.settings].map((action) => (
              <button key={action} className="p-5 bg-slate-50 hover:bg-blue-600 hover:text-white rounded-2xl text-slate-600 font-bold text-sm transition-all text-left shadow-sm">
                {action}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-blue-600 p-10 rounded-[3em] shadow-2xl shadow-blue-200 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-2xl font-black uppercase italic mb-4">{t.admin_tip}</h3>
            <p className="text-blue-100 text-sm font-bold leading-relaxed opacity-90">
              {t.tip_desc}
            </p>
          </div>
          <div className="mt-8 flex justify-end relative z-10">
             <div className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-4 py-2 rounded-full backdrop-blur-md">
               Goofy Bird Engine v1.0
             </div>
          </div>
          {/* ตกแต่ง Background ทิป */}
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        </div>
      </div>
    </div>
  )
}