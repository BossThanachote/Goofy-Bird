'use client'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSFX } from '@/hook/useSFX'

interface InventoryModalProps {
  isOpen: boolean
  onClose: () => void
  user: any
}

const DEFAULT_BIRD_ID = 'e114c607-b017-4ea6-a306-8e5c0808092a'

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
  const { playHover, playClick } = useSFX()

  useEffect(() => {
    if (isOpen) {
      fetchInventory()
      fetchEquippedBird()
    }
  }, [isOpen, user])

  const fetchInventory = async () => {
    setLoading(true)
    try {
      const { data: defaultBirdData, error: defaultErr } = await supabase
        .from('characters')
        .select('*')
        .eq('character_id', DEFAULT_BIRD_ID)
        .maybeSingle()

      if (defaultErr) throw defaultErr

      let allBirds = []

      if (defaultBirdData) {
        allBirds.push(defaultBirdData)
      } else {
        allBirds.push({
          character_id: DEFAULT_BIRD_ID,
          character_name: 'GEGE',
          rarity: 'Common',
          image_url: 'https://mtfzqtuojkjjbqxvocgc.supabase.co/storage/v1/object/public/character-images/birds/1773485319441.png',
          description: 'An orange bird just like orange'
        })
      }

      if (user) {
        const { data: userInventoryData, error: invError } = await supabase
          .from('inventory')
          .select(`
            characters (*)
          `)
          .eq('user_id', user.id)

        if (!invError && userInventoryData) {
          const boughtBirds = userInventoryData
            .filter((item: any) => item.characters !== null)
            .map((item: any) => item.characters)

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

  const fetchEquippedBird = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('users')
        .select('equipped_bird')
        .eq('user_id', user.id)
        .single()

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
          .eq('user_id', user.id)

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
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70"
          />

          {/* ✅ ปรับความกว้าง Modal และ Padding ให้เหมาะกับมือถือ */}
          <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="relative bg-[#F8FAFC] w-full max-w-4xl rounded-[2em] sm:rounded-[3em] shadow-2xl p-4 sm:p-8 border-[4px] sm:border-[6px] border-white text-slate-800 flex flex-col max-h-[85vh]"
          >
            {/* ✅ ปรับ Header ของ Modal */}
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#35A7FF] uppercase italic tracking-tighter leading-none">My Inventory</h2>
                <p className="text-slate-400 font-bold text-[10px] sm:text-xs uppercase tracking-widest mt-1">
                  {user ? `Backpack of ${user.user_metadata?.username || 'Player'}` : 'Guest Inventory'}
                </p>
              </div>
              <button 
                onClick={() => {
                  playClick()
                  onClose()
                }}
                onMouseEnter={playHover}
                className="p-2 sm:p-3 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all shadow-sm cursor-pointer"
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 font-bold animate-pulse text-sm sm:text-base">Loading Inventory...</div>
            ) : (
              <div className="overflow-y-auto pr-1 sm:pr-2 custom-scrollbar flex-1 pb-4">
                {/* ✅ จัด Grid เป็น 2 คอลัมน์บนมือถือ และช่องว่าง (gap) เล็กลง */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">

                  {inventory.map((bird) => {
                    const isEquipped = equippedBirdId === bird.character_id

                    return (
                      <motion.div
                        key={bird.character_id}
                  
                        className={`group relative bg-white p-3 sm:p-6 rounded-2xl sm:rounded-[2.5em] border-2 ${isEquipped ? 'border-[#C7EF00]' : rarityConfig[bird.rarity]?.border || 'border-slate-100'} shadow-md sm:shadow-lg flex flex-col items-center transition-all overflow-hidden h-full`}
                      >
                        {/* 🏷️ Rarity Badge */}
                        <div className={`absolute top-2 right-2 sm:top-4 sm:right-4 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[6px] sm:text-[8px] font-black uppercase tracking-wider z-10 ${rarityConfig[bird.rarity]?.bg} ${rarityConfig[bird.rarity]?.color}`}>
                          {bird.rarity}
                        </div>

                        {/* 📸 กรอบรูป ✅ ปรับ Margin และความมน */}
                        <div className="relative w-full aspect-square bg-white rounded-xl sm:rounded-[2em] flex items-center justify-center overflow-hidden mb-3 sm:mb-6 mt-4 sm:mt-4">
                          {bird.image_url ? (
                            <img
                              src={bird.image_url}
                              alt={bird.character_name}
                              className={`w-full h-full object-contain p-2 sm:p-4 transition-all duration-300 ${isEquipped ? ' opacity-60 scale-105' : ''}`}
                            />
                          ) : (
                            <div className="text-3xl sm:text-5xl">🐦</div>
                          )}

                          {/* 🛡️ ป้าย EQUIPPED ✅ ปรับขนาดตัวอักษร */}
                          {isEquipped && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-[#C7EF00] text-slate-900 px-2 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl font-black text-[8px] sm:text-[11px] uppercase tracking-widest flex items-center gap-1 shadow-lg transform rotate-[-5deg]">
                                <Check size={12} className="sm:w-[14px] sm:h-[14px]"/> <span className="hidden sm:inline">EQUIPPED</span><span className="sm:hidden">IN USE</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 📝 รายละเอียดนก ✅ ใช้ flex-1 ดันเนื้อหาและข้อความยาวๆ ให้ตัดสวยๆ */}
                        <div className="text-center space-y-1 w-full px-1 sm:px-2 flex-1 flex flex-col justify-end">
                          <h3 className={`text-sm sm:text-xl font-black italic uppercase tracking-tighter truncate w-full ${rarityConfig[bird.rarity]?.color || 'text-slate-700'}`}>
                            {bird.character_name}
                          </h3>
                          <p className="text-slate-400 font-bold text-[7px] sm:text-[9px] line-clamp-2 leading-tight sm:leading-relaxed h-[2em] sm:h-auto overflow-hidden">
                            {bird.description || 'No description'}
                          </p>
                        </div>

                        {/* 🔘 ปุ่มกดสวมใส่ ✅ ทำให้กดง่ายขึ้นบนมือถือ */}
                        {!isEquipped && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/40 opacity-0 group-hover:opacity-100 sm:transition-opacity rounded-2xl sm:rounded-[2.5em] active:opacity-100 touch-none">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                playClick()
                                handleEquip(bird.character_id)
                              }}
                              onMouseEnter={playHover}
                              className="bg-[#35A7FF] text-white px-3 py-2 sm:px-6 sm:py-3 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-[0_4px_0_#288DE0] sm:shadow-[0_5px_0_#288DE0] hover:scale-105 active:translate-y-1 active:shadow-none transition-all cursor-pointer whitespace-nowrap"
                            >
                              EQUIP
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