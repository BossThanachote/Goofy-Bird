'use client'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Store, Edit3, X, Eye, EyeOff, Coins, Tag } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'

const rarityConfig: any = {
  Common: { color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' },
  Rare: { color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-400' },
  Epic: { color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-400' },
  Legendary: { color: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-400' },
  Mystic: { color: 'bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-green-500 to-blue-500', bg: 'bg-slate-50', border: 'border-slate-200' }
}

const rarityWeight: any = { Mystic: 1, Legendary: 2, Epic: 3, Rare: 4, Common: 5 }

export default function ShopManagementPage() {
  const [characters, setCharacters] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // 🟢 Modal States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBird, setEditingBird] = useState<any>(null)

  // 📝 Form States
  const [price, setPrice] = useState<number>(0)
  const [isForSale, setIsForSale] = useState<boolean>(false)

  useEffect(() => { fetchShopData() }, [])

  const fetchShopData = async () => {
    setLoading(true)
    const { data, error } = await supabaseAdmin
      .from('characters')
      .select('*')
      .eq('is_deleted', false)
    
    if (error) console.error("Error fetching:", error.message)
    if (data) {
      // เรียงลำดับตามความแรร์เหมือนหน้า Characters
      const sortedData = data.sort((a, b) => (rarityWeight[a.rarity] || 99) - (rarityWeight[b.rarity] || 99))
      setCharacters(sortedData)
    }
    setLoading(false)
  }

  // 🟢 เปิดหน้าต่างตั้งราคา
  const openPriceModal = (bird: any) => {
    setEditingBird(bird)
    setPrice(bird.price || 0)
    setIsForSale(bird.is_for_sale || false)
    setIsModalOpen(true)
  }

  // 💾 บันทึกการตั้งค่าร้านค้าลง Database
  const handleUpdateShopConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabaseAdmin
        .from('characters')
        .update({ 
          price: Number(price), 
          is_for_sale: isForSale 
        })
        .eq('character_id', editingBird.character_id)

      if (error) throw error

      setIsModalOpen(false)
      fetchShopData() // รีเฟรชข้อมูลใหม่
    } catch (err: any) {
      alert("Error saving shop config: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 px-4 md:px-10 py-6">
      {/* 🔝 Top Bar */}
      <div className="flex justify-between items-center bg-white p-6 rounded-[2.5em] shadow-sm border-2 border-slate-50">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-yellow-50 text-yellow-600 rounded-2xl"><Store size={28} /></div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 italic uppercase">Shop Configuration</h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Manage Prices & Visibility</p>
          </div>
        </div>
      </div>

      {/* 🦅 Shop Grid */}
      {loading && characters.length === 0 ? (
        <div className="text-center py-20 text-slate-400 font-bold uppercase animate-pulse">Loading Shop Data...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {characters.map((char) => (
              <motion.div 
                layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} 
                key={char.character_id} 
                className={`group relative bg-white p-6 rounded-[2.5em] border-2 ${char.is_for_sale ? 'border-green-400 shadow-[0_4px_0_#4ADE80]' : 'border-slate-200 shadow-sm opacity-70'} flex flex-col items-center transition-all`}
              >
                {/* 🏷️ Rarity Badge */}
                <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider ${rarityConfig[char.rarity]?.bg} ${rarityConfig[char.rarity]?.color}`}>
                  {char.rarity}
                </div>

                {/* 🟢/🔴 สถานะการขาย (มุมขวาบน) */}
                <div className={`absolute top-4 right-4 flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${char.is_for_sale ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-400'}`}>
                  {char.is_for_sale ? <><Eye size={12}/> ON SALE</> : <><EyeOff size={12}/> HIDDEN</>}
                </div>

                {/* 📸 กรอบรูป */}
                <div className={`w-full aspect-square bg-white rounded-[2em] flex items-center justify-center overflow-hidden  mb-4 mt-6 ${!char.is_for_sale && 'grayscale'}`}>
                   {char.image_url ? (
                     <img src={char.image_url} className="w-full h-full object-contain p-4" alt={char.character_name} />
                   ) : (
                     <div className="text-5xl">🐦</div>
                   )}
                </div>

                <h3 className={`text-xl font-black italic uppercase tracking-tighter truncate w-full text-center ${rarityConfig[char.rarity]?.color || 'text-slate-700'}`}>
                  {char.character_name}
                </h3>

                {/* 💰 แสดงราคาปัจจุบัน */}
                <div className="flex items-center justify-center gap-2 mt-2 mb-4 bg-slate-50 w-full py-2 rounded-xl border border-slate-100">
                   <Coins size={16} className={char.is_for_sale ? 'text-yellow-500' : 'text-slate-300'} />
                   <span className={`font-black text-lg ${char.is_for_sale ? 'text-slate-800' : 'text-slate-400'}`}>
                     {char.price?.toLocaleString() || '0'}
                   </span>
                </div>

                {/* 🔘 ปุ่มตั้งค่า (โผล่ตอน Hover) */}
                <div className="absolute inset-0 flex items-center justify-center bg-white/60  opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5em]">
                  <button 
                    onClick={() => openPriceModal(char)}
                    className="bg-yellow-400 text-yellow-900 px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-[0_5px_0_#CA8A04] hover:scale-105 active:translate-y-1 active:shadow-none transition-all flex items-center gap-2"
                  >
                    <Tag size={16} /> SET PRICE
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ⚙️ Modal ตั้งราคาและสถานะ */}
      <AnimatePresence>
        {isModalOpen && editingBird && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60" />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-white w-full max-w-sm rounded-[3.5em] shadow-2xl p-8 border-[8px] border-yellow-400">
              
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-900 uppercase italic">Shop Config</h2>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-slate-900"><X /></button>
              </div>

              <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-[2em] border-2 border-slate-100">
                <img src={editingBird.image_url} className="w-16 h-16 object-contain" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{editingBird.rarity}</p>
                  <h3 className="text-xl font-black italic uppercase text-slate-800">{editingBird.character_name}</h3>
                </div>
              </div>
              
              <form onSubmit={handleUpdateShopConfig} className="space-y-6">
                
                {/* 💰 Input ราคา */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-2">Set Price (Coins)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <Coins className="text-yellow-500" size={20} />
                    </div>
                    <input 
                      type="number" min="0" required
                      value={price} onChange={(e) => setPrice(Number(e.target.value))} 
                      className="w-full bg-white border-4 border-slate-100 rounded-full py-4 pl-12 pr-6 text-xl font-black text-slate-900 focus:border-yellow-400 outline-none transition-all" 
                    />
                  </div>
                </div>

                {/* 🟢 Toggle เปิด/ปิดการขาย */}
                <div 
                  onClick={() => setIsForSale(!isForSale)}
                  className={`cursor-pointer p-4 rounded-3xl border-4 transition-all flex items-center justify-between ${isForSale ? 'bg-green-50 border-green-400' : 'bg-slate-50 border-slate-200'}`}
                >
                  <div className="flex items-center gap-3">
                    {isForSale ? <Eye className="text-green-500" /> : <EyeOff className="text-slate-400" />}
                    <span className={`font-black uppercase text-sm ${isForSale ? 'text-green-600' : 'text-slate-400'}`}>
                      {isForSale ? 'Available in Shop' : 'Hidden from Shop'}
                    </span>
                  </div>
                  {/* Toggle Switch UI */}
                  <div className={`w-12 h-6 rounded-full p-1 transition-all ${isForSale ? 'bg-green-400' : 'bg-slate-300'}`}>
                    <motion.div layout className={`w-4 h-4 bg-white rounded-full shadow-sm ${isForSale ? 'ml-auto' : ''}`} />
                  </div>
                </div>

                <button disabled={loading} type="submit" className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black py-4 rounded-full text-xl shadow-[0_6px_0_#CA8A04] active:translate-y-1 active:shadow-none transition-all uppercase italic">
                  {loading ? 'SAVING...' : 'SAVE CONFIG'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div> 
  )
}