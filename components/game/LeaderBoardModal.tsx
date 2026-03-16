'use client'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trophy, Medal, Crown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSFX } from '@/hook/useSFX'

interface LeaderboardModalProps {
  isOpen: boolean
  onClose: () => void
}

type Difficulty = 'easy' | 'normal' | 'hard'

export default function LeaderboardModal({ isOpen, onClose }: LeaderboardModalProps) {
  const [activeTab, setActiveTab] = useState<Difficulty>('easy')
  const [leaders, setLeaders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { playHover, playClick, playBack } = useSFX()

  useEffect(() => {
    if (isOpen) fetchLeaderboard(activeTab)
  }, [isOpen, activeTab])

  const fetchLeaderboard = async (diff: Difficulty) => {
    setLoading(true)
    const column = diff === 'easy' ? 'high_score' : (diff === 'normal' ? 'high_score_normal' : 'high_score_hard')

    try {
      const { data, error } = await supabase
        .from('users')
        .select(`username, ${column}`)
        .gt(column, 0)
        .order(column, { ascending: false })
        .limit(10)

      if (error) throw error
      if (data) setLeaders(data)
    } catch (err: any) {
      console.error("Error fetching leaderboard:", err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => {
              playBack()
              onClose()
            }}
            className="absolute inset-0 bg-black/70"
          />

          {/* ✅ ปรับกรอบ Modal ให้ขอบบางลงบนมือถือ */}
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20, opacity: 0 }} 
          className="relative bg-[#F8FAFC] w-full max-w-2xl rounded-[2.5em] sm:rounded-[3em] shadow-2xl p-4 sm:p-6 md:p-8 border-[4px] sm:border-[6px] border-[#FFD151] flex flex-col min-h-[60vh] sm:min-h-[70vh] md:min-h-[600px] max-h-[85vh]">

            <button 
              onClick={() => {
              playClick()
              onClose() }}
              onMouseEnter={playHover} 
              className="absolute top-3 right-3 sm:top-6 sm:right-6 p-2 sm:p-3 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all shadow-sm z-10 cursor-pointer">
                <X size={20} className="sm:w-6 sm:h-6" />
            </button>

            {/* Header ✅ ปรับขนาดตัวอักษรและระยะห่างบนมือถือ */}
            <div className="text-center mb-4 sm:mb-6 mt-2 sm:mt-0">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#FFD151] uppercase italic tracking-tighter drop-shadow-sm flex items-center justify-center gap-2 sm:gap-3 leading-none">
                <Trophy size={28} className="sm:w-10 sm:h-10 text-[#FFD151]" /> Hall of Fame
              </h2>
            </div>

            {/* Tabs ✅ ปรับขนาดปุ่มและตัวอักษร */}
            <div className="flex justify-center gap-1 sm:gap-2 mb-4 sm:mb-6 bg-slate-100 p-1 sm:p-2 rounded-full border-2 border-slate-200 shrink-0">
              {(['easy', 'normal', 'hard'] as Difficulty[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    playClick()
                    setActiveTab(tab)
                  }}
                  onMouseEnter={playHover}
                  className={`flex-1 py-2 sm:py-3 rounded-full font-black text-[10px] sm:text-xs md:text-sm uppercase tracking-widest transition-all cursor-pointer ${activeTab === tab
                      ? (tab === 'easy' ? 'bg-green-400 text-green-900 shadow-md' : tab === 'normal' ? 'bg-yellow-400 text-yellow-900 shadow-md' : 'bg-red-500 text-white shadow-md')
                      : 'bg-transparent text-slate-400 hover:bg-slate-200'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Leaderboard List ✅ ปรับ Padding ให้โปร่งขึ้นบนมือถือ */}
            <div className="flex-1 flex flex-col overflow-y-auto pr-1 sm:pr-2 custom-scrollbar bg-white rounded-2xl sm:rounded-3xl p-2 border-2 border-slate-100 min-h-[30vh]">
              {loading ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs sm:text-base py-10">Loading Champions...</div>
              ) : leaders.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs sm:text-base py-10">No scores yet in this mode</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {leaders.map((player, index) => {
                    const scoreCol = activeTab === 'easy' ? 'high_score' : (activeTab === 'normal' ? 'high_score_normal' : 'high_score_hard')
                    const isTop3 = index < 3

                    return (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
                        key={index}
                        // ✅ ลดขนาด Padding ในรายชื่อ
                        className={`flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 ${index === 0 ? 'bg-yellow-50 border-yellow-300 shadow-sm' :
                            index === 1 ? 'bg-slate-50 border-slate-300' :
                              index === 2 ? 'bg-orange-50 border-orange-300' : 'bg-white border-slate-100'
                          }`}
                      >
                        <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
                          {/* ✅ ลดขนาดไอคอนลำดับ */}
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full font-black text-sm sm:text-lg shrink-0 ${index === 0 ? 'bg-yellow-400 text-yellow-900' :
                              index === 1 ? 'bg-slate-300 text-slate-700' :
                                index === 2 ? 'bg-orange-400 text-orange-900' : 'bg-slate-100 text-slate-400'
                            }`}>
                            {index === 0 ? <Crown size={16} className="sm:w-5 sm:h-5"/> : index === 1 || index === 2 ? <Medal size={16} className="sm:w-5 sm:h-5"/> : `#${index + 1}`}
                          </div>
                          {/* ✅ ลดขนาดชื่อและจัดการตัดคำถ้าชื่อยาวไป */}
                          <span className={`font-black text-sm sm:text-lg uppercase italic truncate ${isTop3 ? 'text-slate-800' : 'text-slate-600'}`}>
                            {player.username || 'Unknown Player'}
                          </span>
                        </div>
                        {/* ✅ ปรับขนาดคะแนน */}
                        <div className="font-black text-lg sm:text-2xl text-[#35A7FF] tracking-tighter shrink-0 ml-2">
                          {player[scoreCol]?.toLocaleString() || 0}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}