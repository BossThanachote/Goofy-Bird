'use client'
import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Bird, Package, Map as MapIcon, Store, Trash2, Activity } from 'lucide-react'

export default function DashboardHomePage() {
  // ข้อมูลเมนูต่างๆ ใน Dashboard เพื่อให้ใช้ map วนลูปสร้างการ์ดได้ง่ายๆ โค้ดจะคลีนครับ
  const menuItems = [
    { name: 'Characters', path: '/admin/dashboard/characters', icon: <Bird size={32} />, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { name: 'Items', path: '/admin/dashboard/items', icon: <Package size={32} />, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
    { name: 'Maps', path: '/admin/dashboard/maps', icon: <MapIcon size={32} />, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    { name: 'Shop', path: '/admin/dashboard/shop', icon: <Store size={32} />, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  ]

  return (
    <div className="space-y-8 px-4 md:px-10 py-6">
      
      {/* 🔝 Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-6 rounded-[2.5em] shadow-sm border-2 border-slate-50">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Activity size={28} /></div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 italic uppercase">System Overview</h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Goofy Bird Admin Dashboard</p>
          </div>
        </div>
      </div>

      {/* 🗂️ Main Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {menuItems.map((item, index) => (
          <Link href={item.path} key={index}>
            <motion.div 
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              className={`flex flex-col items-center justify-center p-8 bg-white rounded-[2.5em] border-2 ${item.border} shadow-sm cursor-pointer transition-all group`}
            >
              <div className={`p-5 rounded-3xl ${item.bg} ${item.color} mb-4 group-hover:scale-110 transition-transform`}>
                {item.icon}
              </div>
              <h3 className={`text-xl font-black italic uppercase ${item.color}`}>
                {item.name}
              </h3>
              <p className="text-slate-400 font-bold text-[10px] mt-2 uppercase tracking-widest">Manage Data</p>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* 🗑️ Recycle Bin Section (แยกส่วนออกมาให้เห็นชัดเจน) */}
      <div className="mt-12 pt-8 border-t-2 border-dashed border-slate-200">
        <Link href="/admin/dashboard/trash">
          <motion.div 
            whileHover={{ y: -5, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-between p-6 bg-white rounded-[2.5em] border-2 border-red-100 shadow-sm cursor-pointer transition-all group max-w-2xl"
          >
            <div className="flex items-center gap-6">
              <div className="p-5 rounded-3xl bg-red-50 text-red-500 group-hover:scale-110 transition-transform group-hover:rotate-12">
                <Trash2 size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black italic uppercase text-red-500">Recycle Bin</h3>
                <p className="text-slate-400 font-bold text-[11px] mt-1 uppercase tracking-widest">
                  กู้คืนหรือลบข้อมูล Characters, Items, Maps ถาวร
                </p>
              </div>
            </div>
            <div className="hidden sm:block px-6 py-3 bg-red-50 text-red-500 font-black text-xs uppercase rounded-full">
              Open Trash
            </div>
          </motion.div>
        </Link>
      </div>

    </div>
  )
}