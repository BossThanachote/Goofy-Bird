'use client'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Coins, Store, ShoppingCart, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSFX } from '@/hook/useSFX'

interface ShopModalProps {
  isOpen: boolean
  onClose: () => void
  user: any
  onUpdatePoints?: (newPoints: number) => void
}

const rarityConfig: any = {
  Common: { color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' },
  Rare: { color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-400' },
  Epic: { color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-400' },
  Legendary: { color: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-400' },
  Mystic: { color: 'bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-green-500 to-blue-500', bg: 'bg-white', border: 'border-slate-200' }
}

const playerRarityWeight: any = { Common: 1, Rare: 2, Epic: 3, Legendary: 4, Mystic: 5 }

export default function ShopModal({ isOpen, onClose, user, onUpdatePoints }: ShopModalProps) {
  const [shopItems, setShopItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [buying, setBuying] = useState(false)
  const [activeFilter, setActiveFilter] = useState('All')
  const [ownedBirdIds, setOwnedBirdIds] = useState<string[]>([])
  const DEFAULT_BIRD_ID = 'e114c607-b017-4ea6-a306-8e5c0808092a'
  const { playHover, playClick, playBack } = useSFX()
  const [resultModal, setResultModal] = useState<{ isOpen: boolean, type: 'success' | 'error', title: string, message: string }>({ isOpen: false, type: 'success', title: '', message: '' })

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, bird: any | null }>({ isOpen: false, bird: null })

  useEffect(() => {
    if (isOpen) {
      fetchShopItems()
      fetchOwnedBirds()
    }
  }, [isOpen, user])

  const fetchOwnedBirds = async () => {
    if (!user) return
    try {
      const { data } = await supabase
        .from('inventory')
        .select('character_id')
        .eq('user_id', user.id)

      if (data) {
        const ids = data.map((item: any) => item.character_id)
        setOwnedBirdIds([...ids, DEFAULT_BIRD_ID])
      }
    } catch (error) {
      console.error("Error fetching owned birds:", error)
    }
  }

  const fetchShopItems = async () => {
    setLoading(true)
    try {
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

  const handleBuyClick = (bird: any) => {
    if (!user) return alert("Please login to buy birds!")
    setConfirmModal({ isOpen: true, bird })
  }

  const executeBuy = async () => {
    const bird = confirmModal.bird;
    if (!bird || !user) return;

    setBuying(true)

    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_point')
        .eq('user_id', user.id)
        .single()

      if (userError || !userData) throw new Error("Cannot fetch user points")

      const currentPoints = userData.user_point || 0
      const birdPrice = bird.price || 0

      if (currentPoints < birdPrice) {
        setConfirmModal({ isOpen: false, bird: null })
        setResultModal({ isOpen: true, type: 'error', title: 'Not Enough Coins', message: "You don't have enough coins to buy this bird! Keep playing to earn more." })
        setBuying(false)
        return
      }

      const { data: existingItem } = await supabase
        .from('inventory')
        .select('*')
        .eq('user_id', user.id)
        .eq('character_id', bird.character_id)
        .maybeSingle()

      if (existingItem) {
        setConfirmModal({ isOpen: false, bird: null })
        setResultModal({ isOpen: true, type: 'error', title: 'Already Owned', message: "You already own this bird! Check your inventory to see your collection." })
        setBuying(false)
        return
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ user_point: currentPoints - birdPrice })
        .eq('user_id', user.id)

      if (updateError) throw updateError

      const { error: insertError } = await supabase
        .from('inventory')
        .insert([{ user_id: user.id, character_id: bird.character_id }])

      if (insertError) throw insertError

      if (typeof onUpdatePoints === 'function') {
        onUpdatePoints(currentPoints - birdPrice);
      }

      setConfirmModal({ isOpen: false, bird: null })
      setResultModal({ isOpen: true, type: 'success', title: 'Purchase Successful!', message: `🎉 You have acquired "${bird.character_name}".` })

      setOwnedBirdIds(prev => [...prev, bird.character_id])

      setTimeout(() => {
        setResultModal(prev => ({ ...prev, isOpen: false }))
      }, 2000)

    } catch (err: any) {
      setConfirmModal({ isOpen: false, bird: null })
      setResultModal({ isOpen: true, type: 'error', title: 'Transaction Failed', message: err.message })
    } finally {
      setBuying(false)
    }
  }

  const displayItems = shopItems
    .filter(c => activeFilter === 'All' ? true : c.rarity === activeFilter)
    .sort((a, b) => (playerRarityWeight[a.rarity] || 99) - (playerRarityWeight[b.rarity] || 99))

  const filterOptions = ['All', 'Common', 'Rare', 'Epic', 'Legendary', 'Mystic']

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* ✅ 1. เพิ่ม min-h-[75vh] md:min-h-[700px] เข้าไปเพื่อล็อคความสูงหน้าต่างหลัก */}
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20, opacity: 0 }} className="relative bg-[#F8FAFC] w-full max-w-5xl rounded-[3em] shadow-2xl p-6 md:p-8 border-[6px] border-[#FFD151] flex flex-col min-h-[75vh] md:min-h-[700px] max-h-[90vh]">

              <button 
                onClick={() => {
                  playClick()
                  onClose()
                }}
                onMouseEnter={playHover}
                className="absolute top-4 right-4 md:top-6 md:right-6 z-50 p-3 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all shadow-md border-2 border-slate-50 cursor-pointer">
                <X size={24} />
              </button>

              {/* 🔝 Header & Tabs */}
              <div className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-6 pr-0 md:pr-16 pt-2">
                <div>
                  <h2 className="text-3xl md:text-4xl font-black text-[#FFD151] [text-shadow:-2px_-2px_0_#000,2px_-2px_0_#000,-2px_2px_0_#000,2px_2px_0_#000] uppercase italic tracking-tighter drop-shadow-sm">Bird Shop</h2>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1 text-center md:text-left">
                    Spend your coins to collect new birds!
                  </p>
                </div>

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
                        onClick={() => {
                          playClick()
                          setActiveFilter(option)
                        }}
                        onMouseEnter={playHover}
                        className={`px-4 py-2 rounded-full font-black text-[10px] md:text-xs uppercase tracking-wider transition-all ${btnStyle} cursor-pointer`}
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
                // ✅ 2. เพิ่ม min-h-[300px] เผื่อไว้ดึงให้พื้นที่ตรงนี้กว้างรอเสมอ
                <div className="flex-1 flex items-center justify-center text-slate-400 font-bold animate-pulse min-h-[300px]">Stocking up the shop...</div>
              ) : displayItems.length === 0 ? (
                // ✅ 3. เพิ่ม min-h-[300px] ในกล่อง Empty State เช่นกัน
                <div className="flex-1 flex items-center justify-center flex-col text-slate-400 opacity-50 min-h-[300px]">
                  <Store size={64} className="mb-4" />
                  <p className="font-black uppercase tracking-widest">No birds available in this category</p>
                </div>
              ) : (
                <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 pb-4 min-h-[300px]">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {displayItems.map((bird) => (
                      <motion.div
                        key={bird.character_id}
                        className="group relative bg-white p-4 md:p-6 rounded-[2.5em] border-2 border-slate-100 hover:border-[#FFD151] shadow-sm hover:shadow-xl flex flex-col items-center transition-all overflow-hidden cursor-pointer"
                      >
                        <div className={`absolute top-3 left-3 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider z-10 ${rarityConfig[bird.rarity]?.bg} ${rarityConfig[bird.rarity]?.color}`}>
                          {bird.rarity}
                        </div>

                        <div className="relative w-full aspect-square bg-slate-50 rounded-[2em] flex items-center justify-center overflow-hidden border-2 border-slate-50 shadow-inner mb-4 mt-4">
                          {bird.image_url ? (
                            <img src={bird.image_url} alt={bird.character_name} className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-300" />
                          ) : (
                            <div className="text-5xl">🐦</div>
                          )}
                        </div>

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
                          <button
                            disabled
                            className="w-full bg-slate-100 text-slate-400 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_4px_0_#E2E8F0] cursor-not-allowed flex items-center justify-center gap-2 border-2 border-slate-200"
                          >
                            <span className="text-green-500 text-lg leading-none">✓</span> OWNED
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              playClick()
                              handleBuyClick(bird)
                            }}
                            onMouseEnter={playHover}
                            className="w-full bg-[#FFD151] text-yellow-900 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_4px_0_#CA8A04] hover:bg-[#FACC15] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <ShoppingCart size={16} /> BUY
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

      <AnimatePresence>
        {confirmModal.isOpen && confirmModal.bird && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => {
                if (!buying) {
                  playBack()
                  setConfirmModal({ isOpen: false, bird: null })
                }
              }}
              className="absolute inset-0 bg-slate-900/60"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[2em] p-8 max-w-sm w-full shadow-2xl border-[6px] border-[#FFD151] flex flex-col items-center text-center"
            >
              <div className="p-4 bg-yellow-50 text-yellow-500 rounded-full mb-4 shadow-sm">
                <ShoppingCart size={40} />
              </div>

              <h2 className="text-2xl font-black uppercase italic text-slate-800 mb-2">Confirm Purchase</h2>

              <div className="w-24 h-24 bg-slate-50 rounded-2xl flex items-center justify-center border-2 border-slate-100 shadow-inner mb-4 overflow-hidden">
                {confirmModal.bird.image_url ? (
                  <img src={confirmModal.bird.image_url} alt={confirmModal.bird.character_name} className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="text-4xl">🐦</div>
                )}
              </div>

              <p className="text-slate-500 font-bold text-sm mb-6 leading-relaxed">
                Do you want to buy <br />
                <span className={`font-black text-lg ${rarityConfig[confirmModal.bird.rarity]?.color || 'text-slate-800'}`}>"{confirmModal.bird.character_name}"</span> <br />
                for <span className="text-yellow-500 font-black">{confirmModal.bird.price?.toLocaleString()} coins</span>?
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => {
                    playBack()
                    setConfirmModal({ isOpen: false, bird: null })
                  }} 
                  onMouseEnter={playHover}
                  disabled={buying}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-2xl font-black uppercase text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    playClick()
                    executeBuy()
                  }} 
                  onMouseEnter={playHover}
                  disabled={buying}
                  className="flex-1 py-4 bg-[#FFD151] text-yellow-900 hover:bg-[#FACC15] rounded-2xl font-black uppercase text-sm transition-all shadow-[0_4px_0_#CA8A04] active:scale-95 active:translate-y-1 active:shadow-none disabled:opacity-50 flex justify-center items-center cursor-pointer"
                >
                  {buying ? 'Processing...' : 'Yes, Buy It!'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {resultModal.isOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60"
              onClick={() => {
                if (resultModal.type === 'error') {
                  playBack()
                  setResultModal({ ...resultModal, isOpen: false })
                }
              }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="relative bg-white rounded-[2em] p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center overflow-hidden"
            >
              <div className={`absolute top-0 left-0 w-full h-3 ${resultModal.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />

              <div className={`p-4 rounded-full mb-4 mt-2 ${resultModal.type === 'success' ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}`}>
                {resultModal.type === 'success' ? <CheckCircle size={56} /> : <XCircle size={56} />}
              </div>

              <h2 className={`text-2xl font-black uppercase italic mb-2 ${resultModal.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {resultModal.title}
              </h2>

              <p className="text-slate-500 font-bold text-sm mb-6 leading-relaxed">
                {resultModal.message}
              </p>

              {resultModal.type === 'error' ? (
                <button
                  onClick={() => {
                    playBack()
                    setResultModal({ ...resultModal, isOpen: false })
                  }}
                  onMouseEnter={playHover}
                  className="w-full py-4 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-2xl font-black uppercase text-sm transition-colors active:scale-95 cursor-pointer"
                >
                  Close
                </button>
              ) : (
                <div className="w-full py-4 text-green-500 font-black uppercase tracking-widest text-xs animate-pulse">
                  processing your new bird...
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}