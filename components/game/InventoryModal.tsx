'use client'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase' // ✅ ใช้ดึงข้อมูล

interface InventoryModalProps {
  isOpen: boolean
  onClose: () => void
  user: any
}

// 🦅 ID นกเริ่มต้นที่ทุกคนต้องมี
const DEFAULT_BIRD_ID = 'e114c607-b017-4ea6-a306-8e5c0808092a'

// สี Rarity ให้ตรงกับหน้า Dashboard
const rarityConfig: any = {
  Common: { color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' },
  Rare: { color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-400' },
  Epic: { color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-400' },
  Legendary: { color: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-400' },
  Mystic: { color: 'bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-green-500 to-blue-500', bg: 'bg-slate-50', border: 'border-rainbow' }
}

export default function InventoryModal({ isOpen, onClose, user }: InventoryModalProps) {
  const [inventory, setInventory] = useState<any[]>([]) 
  const [equippedBirdId, setEquippedBirdId] = useState<string>(DEFAULT_BIRD_ID)
  const [loading, setLoading] = useState(false)

  // 🔄 ดึงข้อมูลเมื่อเปิด Modal
  useEffect(() => {
    if (isOpen) {
      fetchInventory()
      fetchEquippedBird()
    }
  }, [isOpen, user])

 const fetchInventory = async () => {
    setLoading(true)
    try {
      // 1. ดึงข้อมูลนกเริ่มต้น (เปลี่ยนจาก single() เป็น maybeSingle())
      const { data: defaultBirdData, error: defaultErr } = await supabase
        .from('characters')
        .select('*')
        .eq('character_id', DEFAULT_BIRD_ID)
        .maybeSingle() // ✅ แก้ตรงนี้: จะไม่ Error แม้ส่งกลับมา 0 แถว

      if (defaultErr) throw defaultErr
      
      let allBirds = []
      
      // 2. ถ้าดึงข้อมูลสำเร็จ (ติด RLS หรือไม่ก็ผ่าน)
      if (defaultBirdData) {
         allBirds.push(defaultBirdData) 
      } else {
         // 🛡️ 3. FALLBACK: ถ้าหาไม่เจอ หรือโดนบล็อกเพราะเป็น Guest
         // ให้ใช้ข้อมูลจำลอง (Mock) โชว์ไปเลย จะได้ไม่จอขาว
         allBirds.push({
           character_id: DEFAULT_BIRD_ID,
           character_name: 'GEGE',
           rarity: 'Common',
           // ⚠️ บอสอย่าลืมเอา URL รูป Gege มาใส่ในเครื่องหมายคำพูดด้านล่างนี้นะครับ
           image_url: 'https://mtfzqtuojkjjbqxvocgc.supabase.co/storage/v1/object/public/character-images/birds/1773485319441.png', 
           description: 'An orange bird just like orange'
         })
      }

      
      
      // ✅ 2. ดึงข้อมูลนกที่ผู้เล่นซื้อไว้ (ถ้าล็อกอินอยู่)
      if (user) {
        const { data: userInventoryData, error: invError } = await supabase
          .from('inventory')
          .select(`
            characters (*)
          `)
          .eq('user_id', user.id)
          
        if (!invError && userInventoryData) {
           // ดึงเฉพาะก้อนข้อมูล character ออกมาจากการ Join ตาราง
           const boughtBirds = userInventoryData
             .filter((item: any) => item.characters !== null) 
             .map((item: any) => item.characters)
           
           // เอาของที่ซื้อมาต่อท้ายน้อง Gege
           allBirds = [...allBirds, ...boughtBirds]
        }
      }

      setInventory(allBirds)
    } catch (err: any) {
      console.error("Error fetching inventory:", err.message)
    } finally {
      setLoading(false)
    }

    
  }

  // 📥 ฟังก์ชันใหม่: ดึงข้อมูลว่าผู้เล่นคนนี้ใส่นกตัวไหนอยู่
  const fetchEquippedBird = async () => {
    if (!user) return // ถ้าเป็น Guest ให้ใช้ค่า Default (Gege) ที่ตั้งไว้แต่แรก

    try {
      const { data, error } = await supabase
        .from('users')
        .select('equipped_bird')
        .eq('user_id', user.id)
        .single()
      
      // ถ้ามีข้อมูลนกที่เคยใส่ไว้ ให้เปลี่ยนป้าย EQUIPPED ไปที่ตัวนั้น
      if (data && data.equipped_bird) {
        setEquippedBirdId(data.equipped_bird)
      }
    } catch (err: any) {
      console.error("Error fetching equipped bird:", err.message)
    }
  }

  const handleEquip = async (birdId: string) => {
    setEquippedBirdId(birdId)
    if (user) {
      try {
        const { error } = await supabase
          .from('users')
          .update({ equipped_bird: birdId })
          .eq('user_id', user.id) // เซฟเฉพาะของไอดีตัวเอง

        if (error) throw error
        console.log("✅ บันทึกนกที่สวมใส่ลง Database เรียบร้อย!")
      } catch (err: any) {
        alert("Error saving equip state: " + err.message)
      }
    } else {
      console.log("⚠️ ผู้เล่นเป็น Guest จะจำค่าได้แค่ตอนที่ยังไม่ปิดเว็บนะ")
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* พื้นหลังเบลอ */}
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
          />
          
          <motion.div 
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20, opacity: 0 }} 
            className="relative bg-[#F8FAFC] w-full max-w-4xl rounded-[3em] shadow-2xl p-8 border-[6px] border-white text-slate-800 flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-3xl font-black text-[#35A7FF] uppercase italic tracking-tighter">My Inventory</h2>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
                  {user ? `Backpack of ${user.user_metadata?.username || 'Player'}` : 'Guest Inventory'}
                </p>
              </div>
              <button onClick={onClose} className="p-3 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all shadow-sm">
                <X size={24} />
              </button>
            </div>

            {/* Content Area */}
            {loading ? (
               <div className="flex-1 flex items-center justify-center text-slate-400 font-bold animate-pulse">Loading Inventory...</div>
            ) : (
              <div className="overflow-y-auto pr-2 custom-scrollbar flex-1">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  
                  {inventory.map((bird) => {
                    const isEquipped = equippedBirdId === bird.character_id

                    return (
                      <motion.div 
                        key={bird.character_id}
                        whileHover={{ y: -5 }}
                        // ใช้ UI การ์ดแบบเดียวกับ Dashboard เป๊ะๆ
                        className={`group relative bg-white p-6 rounded-[2.5em] border-2 ${isEquipped ? 'border-[#C7EF00]' : rarityConfig[bird.rarity]?.border || 'border-slate-100'} shadow-lg flex flex-col items-center transition-all overflow-hidden`}
                      >
                        {/* 🏷️ Rarity Badge */}
                        <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider z-10 ${rarityConfig[bird.rarity]?.bg} ${rarityConfig[bird.rarity]?.color}`}>
                          {bird.rarity}
                        </div>

                        {/* 📸 กรอบรูป (ถ้า Equipped ให้เบลอ) */}
                        <div className="relative w-full aspect-square bg-white rounded-[2em] flex items-center justify-center overflow-hidden mb-6 mt-4">
                           {/* รูปรถ */}
                           {bird.image_url ? (
                             <img 
                               src={bird.image_url} 
                               alt={bird.character_name} 
                               className={`w-full h-full object-contain p-4 transition-all duration-300 ${isEquipped ? 'blur-[2px] opacity-60 scale-105' : ''}`} 
                             />
                           ) : (
                             <div className="text-5xl">🐦</div>
                           )}

                           {/* 🛡️ ป้าย EQUIPPED ทับบนรูปตอนเบลอ */}
                           {isEquipped && (
                             <div className="absolute inset-0 flex items-center justify-center">
                               <div className="bg-[#C7EF00] text-slate-900 px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-1 shadow-lg transform rotate-[-5deg]">
                                 <Check size={14} /> EQUIPPED
                               </div>
                             </div>
                           )}
                        </div>

                        {/* 📝 รายละเอียดนก */}
                        <div className="text-center space-y-1 w-full px-2">
                          <h3 className={`text-xl font-black italic uppercase tracking-tighter truncate ${rarityConfig[bird.rarity]?.color || 'text-slate-700'}`}>
                            {bird.character_name}
                          </h3>
                          <p className="text-slate-400 font-bold text-[9px] line-clamp-2 leading-relaxed">
                            {bird.description || 'No description'}
                          </p>
                        </div>

                        {/* 🔘 ปุ่มกดสวมใส่ (ซ่อนตอนที่ใส่อยู่ โผล่ตอน Hover ถ้ายังไม่ใส่) */}
                        {!isEquipped && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5em]">
                            <button 
                              onClick={() => handleEquip(bird.character_id)}
                              className="bg-[#35A7FF] text-white px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-[0_5px_0_#288DE0] hover:scale-105 active:translate-y-1 active:shadow-none transition-all"
                            >
                              EQUIP BIRD
                            </button>
                          </div>
                        )}
                        
                      </motion.div>
                    )
                  })}

                </div>
              </div>
            )}

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}