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
      // ดึง Top 10 ที่คะแนนมากกว่า 0 เรียงจากมากไปน้อย
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
            onClick={onClose}
            // 1. ลบ backdrop-blur-md ออก 
            // 2. ปรับความเข้มสีดำเพิ่มขึ้นนิดนึง (เช่น bg-black/60 หรือ bg-slate-900/70) เพื่อให้เห็น Modal ชัดๆ
            className="absolute inset-0 bg-black/70"
          />

          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20, opacity: 0 }} className="relative bg-[#F8FAFC] w-full max-w-2xl rounded-[3em] shadow-2xl p-6 md:p-8 border-[6px] border-[#FFD151] flex flex-col min-h-[70vh] md:min-h-[600px]">

            <button 
              onClick={() => {
              playClick()
              onClose() }}
              onMouseEnter={playHover} className="absolute top-6 right-6 p-3 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all shadow-sm z-10 cursor-pointer"><X size={24} /></button>

            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-4xl md:text-5xl font-black text-[#FFD151] uppercase italic tracking-tighter drop-shadow-sm flex items-center justify-center gap-3">
                <Trophy size={40} className="text-[#FFD151]" /> Hall of Fame
              </h2>
            </div>

            {/* Tabs */}
            <div className="flex justify-center gap-2 mb-6 bg-slate-100 p-2 rounded-full border-2 border-slate-200">
              {(['easy', 'normal', 'hard'] as Difficulty[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    playClick()
                    setActiveTab(tab)
                  }}
                  onMouseEnter={playHover}
                  className={`flex-1 py-3 rounded-full font-black text-xs md:text-sm uppercase tracking-widest transition-all cursor-pointer ${activeTab === tab
                      ? (tab === 'easy' ? 'bg-green-400 text-green-900 shadow-md' : tab === 'normal' ? 'bg-yellow-400 text-yellow-900 shadow-md' : 'bg-red-500 text-white shadow-md')
                      : 'bg-transparent text-slate-400 hover:bg-slate-200'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Leaderboard List */}
            <div className="flex-1 flex flex-col overflow-y-auto pr-2 custom-scrollbar bg-white rounded-3xl p-2 border-2 border-slate-100">
              {loading ? (
                <div className="py-20 text-center text-slate-400 font-bold animate-pulse uppercase tracking-widest">Loading Champions...</div>
              ) : leaders.length === 0 ? (
                <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest">No scores yet in this mode</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {leaders.map((player, index) => {
                    const scoreCol = activeTab === 'easy' ? 'high_score' : (activeTab === 'normal' ? 'high_score_normal' : 'high_score_hard')
                    const isTop3 = index < 3

                    return (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
                        key={index}
                        className={`flex items-center justify-between p-4 rounded-2xl border-2 ${index === 0 ? 'bg-yellow-50 border-yellow-300 shadow-sm' :
                            index === 1 ? 'bg-slate-50 border-slate-300' :
                              index === 2 ? 'bg-orange-50 border-orange-300' : 'bg-white border-slate-100'
                          }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 flex items-center justify-center rounded-full font-black text-lg ${index === 0 ? 'bg-yellow-400 text-yellow-900' :
                              index === 1 ? 'bg-slate-300 text-slate-700' :
                                index === 2 ? 'bg-orange-400 text-orange-900' : 'bg-slate-100 text-slate-400'
                            }`}>
                            {index === 0 ? <Crown size={20} /> : index === 1 || index === 2 ? <Medal size={20} /> : `#${index + 1}`}
                          </div>
                          <span className={`font-black text-lg uppercase italic ${isTop3 ? 'text-slate-800' : 'text-slate-600'}`}>
                            {player.username || 'Unknown Player'}
                          </span>
                        </div>
                        <div className="font-black text-2xl text-[#35A7FF] tracking-tighter">
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