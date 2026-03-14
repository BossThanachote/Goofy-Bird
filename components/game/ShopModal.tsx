'use client'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Coins, Store, ShoppingCart } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ShopModalProps {
  isOpen: boolean
  onClose: () => void
  user: any
}

// สีและสไตล์ตาม Rarity
const rarityConfig: any = {
  Common: { color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' },
  Rare: { color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-400' },
  Epic: { color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-400' },
  Legendary: { color: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-400' },
  Mystic: { color: 'bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-green-500 to-blue-500', bg: 'bg-white', border: 'border-slate-200' }
}

// 🧮 น้ำหนักการเรียงลำดับฝั่งผู้เล่น (Common ไป Mystic)
const playerRarityWeight: any = { Common: 1, Rare: 2, Epic: 3, Legendary: 4, Mystic: 5 }

export default function ShopModal({ isOpen, onClose, user }: ShopModalProps) {
  const [shopItems, setShopItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [buying, setBuying] = useState(false) // State ป้องกันคนกดซื้อรัวๆ
  const [activeFilter, setActiveFilter] = useState('All')
  const [ownedBirdIds, setOwnedBirdIds] = useState<string[]>([])
  const DEFAULT_BIRD_ID = 'e114c607-b017-4ea6-a306-8e5c0808092a' // ID ของน้อง Gege นกฟรีที่ทุกคนมีอยู่แล้ว

  useEffect(() => {
    if (isOpen) 
        fetchShopItems()
        fetchOwnedBirds()
  }, [isOpen, user])

  const fetchOwnedBirds = async () => {
    if (!user) return
    try {
      const { data } = await supabase
        .from('inventory')
        .select('character_id')
        .eq('user_id', user.id)
      
      if (data) {
        // เอาเฉพาะ character_id มาเก็บเป็น Array เช่น ['id-1', 'id-2']
        const ids = data.map((item: any) => item.character_id)
        // ยัด ID น้อง Gege (นกฟรี) เข้าไปด้วย เผื่อบอสเผลอเอาไปวางขายในร้าน ผู้เล่นจะได้ไม่ต้องซื้อซ้ำ
        setOwnedBirdIds([...ids, DEFAULT_BIRD_ID]) 
      }
    } catch (error) {
      console.error("Error fetching owned birds:", error)
    }
  }
  
  const fetchShopItems = async () => {
    setLoading(true)
    try {
      // ดึงเฉพาะตัวที่ไม่ได้ถูกลบ และ "เปิดขาย (is_for_sale = true)" เท่านั้น
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('is_deleted', false)
        .eq('is_for_sale', true)

      if (error) throw error
      if (data) setShopItems(data)
    } catch (err: any) {
      console.error("Error fetching shop:", err.message)
    } finally {
      setLoading(false)
    }
  }

  // 🛒 ฟังก์ชันซื้อนกจริง (หักเงิน + ยัดเข้ากระเป๋า)
  const handleBuy = async (bird: any) => {
    if (!user) return alert(" Please login to buy birds! ")
    setBuying(true)

    try {
      // 1. ดึงแต้มปัจจุบันของผู้เล่นมาเช็คอีกรอบเพื่อความชัวร์
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_point')
        .eq('user_id', user.id)
        .single()

      if (userError || !userData) throw new Error("ไม่สามารถดึงข้อมูลแต้มผู้เล่นได้")

      const currentPoints = userData.user_point || 0
      const birdPrice = bird.price || 0

      // 2. เช็คว่าเงินพอไหม
      if (currentPoints < birdPrice) {
        alert("You don't have enough coins to buy this bird! Keep playing to earn more.")
        setBuying(false)
        return
      }

      // 3. เช็คว่าผู้เล่นมีนกตัวนี้อยู่แล้วหรือยังในตาราง inventory
      const { data: existingItem } = await supabase
        .from('inventory')
        .select('*')
        .eq('user_id', user.id)
        .eq('character_id', bird.character_id)
        .maybeSingle() // ใช้ maybeSingle เพื่อไม่ให้พังถ้ายังไม่มีนกตัวนี้

      if (existingItem) {
        alert("ํYou already own this bird! Check your inventory to see your collection.")
        setBuying(false)
        return
      }

      // 4. หักเงินผู้เล่น
      const { error: updateError } = await supabase
        .from('users')
        .update({ user_point: currentPoints - birdPrice })
        .eq('user_id', user.id)

      if (updateError) throw updateError

      // 5. เพิ่มนกเข้า Inventory
      const { error: insertError } = await supabase
        .from('inventory')
        .insert([
          { 
            user_id: user.id, 
            character_id: bird.character_id
          }
        ])

      if (insertError) throw insertError

      alert(`🎉 ยินดีด้วยครับ! บอสได้รับ "${bird.character_name}" เข้ากระเป๋าเรียบร้อยแล้ว`)
      
      // 6. บังคับรีเฟรชหน้าเว็บเบาๆ เพื่ออัปเดตยอดเงินที่มุมซ้ายล่างให้เห็นทันที
      window.location.reload()

    } catch (err: any) {
      alert("เกิดข้อผิดพลาดในการซื้อ: " + err.message)
    } finally {
      setBuying(false)
    }
  }

  // 🚀 กรองและเรียงลำดับข้อมูล
  const displayItems = shopItems
    .filter(c => activeFilter === 'All' ? true : c.rarity === activeFilter)
    .sort((a, b) => (playerRarityWeight[a.rarity] || 99) - (playerRarityWeight[b.rarity] || 99))

  const filterOptions = ['All', 'Common', 'Rare', 'Epic', 'Legendary', 'Mystic']

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">          
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20, opacity: 0 }} className="relative bg-[#F8FAFC] w-full max-w-5xl rounded-[3em] shadow-2xl p-6 md:p-8 border-[6px] border-[#FFD151] flex flex-col max-h-[90vh]">

            <button onClick={onClose} className="absolute top-4 right-4 md:top-6 md:right-6 z-50 p-3 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all shadow-md border-2 border-slate-50">
              <X size={24} />
            </button>

            {/* 🔝 Header & Tabs */}
           <div className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-6 pr-0 md:pr-16 pt-2">
              <div>
                <h2 className="text-3xl md:text-4xl font-black text-[#FFD151] uppercase italic tracking-tighter drop-shadow-sm">Bird Shop</h2>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1 text-center md:text-left">
                  Spend your coins to collect new birds!
                </p>
              </div>

              {/* 🔘 Filter Tabs (ฝั่งผู้เล่น) */}
              <div className="flex flex-wrap justify-center gap-2 bg-white p-2 rounded-full shadow-sm border-2 border-slate-100">
                {filterOptions.map((option) => {
                  const isActive = activeFilter === option
                  let btnStyle = 'text-slate-400 hover:bg-slate-50'
                  
                  if (isActive) {
                    if (option === 'All') btnStyle = 'bg-slate-800 text-white shadow-md'
                    else if (option === 'Mystic') btnStyle = 'bg-white shadow-md border-transparent text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-green-500 to-blue-500 ring-2 ring-offset-1 ring-blue-400'
                    else btnStyle = `${rarityConfig[option]?.bg} ${rarityConfig[option]?.color} shadow-md`
                  }

                  return (
                    <button
                      key={option}
                      onClick={() => setActiveFilter(option)}
                      className={`px-4 py-2 rounded-full font-black text-[10px] md:text-xs uppercase tracking-wider transition-all ${btnStyle}`}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            </div>
            
            {!user && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="mx-6 md:mx-8 mb-6 bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-center gap-3 text-red-500 shadow-sm"
              >
                <div className="text-3xl">🔒</div>
                <div className="text-center md:text-left">
                  <h3 className="font-black italic uppercase text-sm md:text-base">Guest Mode (Read Only)</h3>
                  <p className="font-bold text-[10px] uppercase tracking-widest text-red-400">
                    Want a cool bird to fly with? Please login or register first!
                  </p>
                </div>
              </motion.div>
            )}

            {/* 🦅 Shop Grid */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 font-bold animate-pulse">Stocking up the shop...</div>
            ) : displayItems.length === 0 ? (
              <div className="flex-1 flex items-center justify-center flex-col text-slate-400 opacity-50">
                <Store size={64} className="mb-4" />
                <p className="font-black uppercase tracking-widest">No birds available in this category</p>
              </div>
            ) : (
              <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 pb-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {displayItems.map((bird) => (
                    <motion.div 
                      key={bird.character_id}
                      whileHover={{ y: -5 }}
                      className="group relative bg-white p-4 md:p-6 rounded-[2.5em] border-2 border-slate-100 hover:border-[#FFD151] shadow-sm hover:shadow-xl flex flex-col items-center transition-all overflow-hidden"
                    >
                      {/* 🏷️ Rarity Badge */}
                      <div className={`absolute top-3 left-3 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider z-10 ${rarityConfig[bird.rarity]?.bg} ${rarityConfig[bird.rarity]?.color}`}>
                        {bird.rarity}
                      </div>

                      {/* 📸 กรอบรูป */}
                      <div className="relative w-full aspect-square bg-slate-50 rounded-[2em] flex items-center justify-center overflow-hidden border-2 border-slate-50 shadow-inner mb-4 mt-4">
                         {bird.image_url ? (
                           <img src={bird.image_url} alt={bird.character_name} className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-300" />
                         ) : (
                           <div className="text-5xl">🐦</div>
                         )}
                      </div>

                      {/* 📝 รายละเอียดและราคา */}
                      <div className="text-center w-full px-1 mb-4">
                        <h3 className={`text-lg font-black italic uppercase tracking-tighter truncate ${rarityConfig[bird.rarity]?.color || 'text-slate-700'}`}>
                          {bird.character_name}
                        </h3>
                        <div className="flex items-center justify-center gap-1 mt-1 bg-yellow-50 text-yellow-600 rounded-lg py-1 px-2 w-max mx-auto border border-yellow-100">
                          <Coins size={14} />
                          <span className="font-black text-sm">{bird.price?.toLocaleString() || '0'}</span>
                        </div>
                      </div>

                      {ownedBirdIds.includes(bird.character_id) ? (
                        // 🟢 ถ้ามีแล้ว: โชว์ปุ่ม OWNED กดไม่ได้
                        <button 
                          disabled
                          className="w-full bg-slate-100 text-slate-400 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_4px_0_#E2E8F0] cursor-not-allowed flex items-center justify-center gap-2 border-2 border-slate-200"
                        >
                          <span className="text-green-500 text-lg leading-none">✓</span> OWNED
                        </button>
                      ) : (
                        // 🟡 ถ้ายังไม่มี: โชว์ปุ่ม BUY ปกติ
                        <button 
                          disabled={buying}
                          onClick={() => handleBuy(bird)}
                          className="w-full bg-[#FFD151] text-yellow-900 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_4px_0_#CA8A04] hover:bg-[#FACC15] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {buying ? 'PROCESSING...' : <><ShoppingCart size={16} /> BUY</>}
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}