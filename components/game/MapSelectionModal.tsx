'use client'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Zap, Gauge, Skull, Play, Map as MapIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSFX } from '@/hook/useSFX'
import { useRouter } from 'next/navigation'

interface MapSelectionModalProps {
  isOpen: boolean
  onClose: () => void
}

type Difficulty = 'easy' | 'normal' | 'hard'

export default function MapSelectionModal({ isOpen, onClose }: MapSelectionModalProps) {
  const router = useRouter()
  const { playHover, playClick, playBack } = useSFX()
  
  const [maps, setMaps] = useState<any[]>([])
  const [currentMapIndex, setCurrentMapIndex] = useState(0)
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchMaps()
    } else {
      setCurrentMapIndex(0)
      setDifficulty('normal')
    }
  }, [isOpen])

  const fetchMaps = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('maps')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true }) 
      
      if (error) throw error
      if (data && data.length > 0) {
        setMaps(data)
      }
    } catch (err: any) {
      console.error("Error fetching maps:", err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePrevMap = () => {
    playHover()
    setCurrentMapIndex((prev) => (prev === 0 ? maps.length - 1 : prev - 1))
  }

  const handleNextMap = () => {
    playHover()
    setCurrentMapIndex((prev) => (prev === maps.length - 1 ? 0 : prev + 1))
  }

  const handlePlay = () => {
    if (maps.length === 0) return
    playClick()
    const selectedMapId = maps[currentMapIndex].id
    
    router.push(`/play?mode=single&mapId=${selectedMapId}&diff=${difficulty}`)
  }

  const currentMap = maps[currentMapIndex]

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { playBack(); onClose(); }} className="absolute inset-0 bg-black/80" />

          {/* ✅ ล็อค max-h ไว้ที่ 85vh (มือถือ) และ 90vh (คอม) ป้องกันการล้นจอ */}
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20, opacity: 0 }} 
          className="relative bg-[#F8FAFC] w-full max-w-2xl rounded-[2.5em] sm:rounded-[3em] shadow-2xl border-[4px] sm:border-[6px] border-[#35A7FF] flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden">
            
            {/* ✅ ใช้โครงสร้างกล่องแบบใหม่ ควบคุมด้วย h-full และ flex-col ภายใน Padding */}
            <div className="p-4 sm:p-6 md:p-8 flex flex-col h-full w-full overflow-hidden">
              
              <button onClick={() => { playBack(); onClose() }} onMouseEnter={playHover} className="absolute top-3 right-3 sm:top-6 sm:right-6 p-2 sm:p-3 bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full shadow-sm z-50 transition-all cursor-pointer">
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>

              {/* 🌟 Header (ล็อคขนาดไม่ให้หด shrink-0) */}
              <div className="text-center mb-4 sm:mb-6 mt-2 sm:mt-0 shrink-0">
                <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-[#35A7FF] uppercase italic tracking-tighter drop-shadow-sm flex items-center justify-center gap-2 sm:gap-3 leading-none">
                  <MapIcon size={28} className="sm:w-9 sm:h-9 md:w-10 md:h-10 text-[#35A7FF]" /> SETUP GAME
                </h2>
              </div>

              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-10">
                  <div className="text-4xl sm:text-6xl mb-4 animate-bounce">🌍</div>
                  <div className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs sm:text-base">Loading Maps...</div>
                </div>
              ) : maps.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-10">
                  <div className="text-slate-400 font-bold uppercase tracking-widest text-xs sm:text-base">No maps available. Please add maps in database.</div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  
                  {/* 📜 โซนเนื้อหาที่เลื่อนได้ (Map + Difficulty) */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 sm:pr-2 space-y-3 sm:space-y-4 pb-2">
                    
                    {/* 🗺️ โซนเลือกด่าน */}
                    <div className="bg-white p-3 sm:p-5 rounded-2xl sm:rounded-[2em] border-2 border-slate-100 shadow-sm flex flex-col items-center">
                      <div className="flex items-center justify-between mb-3 w-full">
                        <button onClick={handlePrevMap} className="p-1.5 sm:p-3 bg-slate-100 hover:bg-[#35A7FF] text-slate-500 hover:text-white rounded-full transition-colors cursor-pointer active:scale-95 shrink-0">
                          <ChevronLeft size={18} className="sm:w-6 sm:h-6" />
                        </button>
                        
                        <div className="flex-1 mx-2 sm:mx-4 relative rounded-xl sm:rounded-2xl overflow-hidden border-2 sm:border-4 border-slate-100 aspect-video max-h-[140px] sm:max-h-[220px] shadow-inner bg-slate-200">
                          <img 
                            src={currentMap?.preview_url || 'https://placehold.co/600x400/8EC5FC/FFFFFF/png?text=No+Preview'} 
                            alt={currentMap?.map_name} 
                            className="w-full h-full object-cover transition-opacity duration-300"
                          />
                          {currentMap?.has_hazard && (
                            <div className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-red-500 text-white text-[8px] sm:text-[10px] font-black px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md uppercase tracking-wider shadow-md animate-pulse">
                              ⚠️ Hazard
                            </div>
                          )}
                        </div>

                        <button onClick={handleNextMap} className="p-1.5 sm:p-3 bg-slate-100 hover:bg-[#35A7FF] text-slate-500 hover:text-white rounded-full transition-colors cursor-pointer active:scale-95 shrink-0">
                          <ChevronRight size={18} className="sm:w-6 sm:h-6" />
                        </button>
                      </div>
                      
                      <div className="text-center overflow-hidden w-full">
                        <h3 className="text-lg sm:text-2xl font-black text-slate-800 uppercase italic tracking-tight truncate px-1">{currentMap?.map_name}</h3>
                        <p className="text-slate-400 font-bold text-[9px] sm:text-xs mt-0.5 sm:mt-1 px-2 line-clamp-2">{currentMap?.description}</p>
                      </div>
                    </div>

                    {/* 🎚️ โซนเลือกความยาก */}
                    <div className="bg-white p-3 sm:p-5 rounded-2xl sm:rounded-[2em] border-2 border-slate-100 shadow-sm">
                      <h3 className="text-center text-slate-400 font-bold uppercase tracking-widest text-[9px] sm:text-xs mb-2 sm:mb-3 leading-none">Select Difficulty</h3>
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                        {(['easy', 'normal', 'hard'] as Difficulty[]).map(diff => {
                          const Icon = diff === 'easy' ? Zap : diff === 'normal' ? Gauge : Skull
                          const colorClass = diff === 'easy' ? 'bg-green-400 text-green-900 border-green-500 shadow-[0_3px_0_#166534]' : diff === 'normal' ? 'bg-yellow-400 text-yellow-900 border-yellow-500 shadow-[0_3px_0_#854d0e]' : 'bg-red-500 text-white border-red-600 shadow-[0_3px_0_#991b1b]'
                          
                          return (
                            <button key={diff} onClick={() => { playClick(); setDifficulty(diff)}} onMouseEnter={playHover} 
                            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-black uppercase text-[9px] sm:text-sm border-2 sm:border-4 transition-all cursor-pointer active:translate-y-0.5 active:shadow-none ${difficulty === diff ? `${colorClass} scale-105` : `bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100`}`}>
                              <Icon size={14} className="sm:w-5 sm:h-5"/> {diff}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 🚀 โซนปุ่มเริ่มเกม (ล็อคติดขอบล่างเสมอ shrink-0) */}
                  <div className="shrink-0 pt-3 sm:pt-4 mb-3">
                    <button 
                      onClick={handlePlay} 
                      onMouseEnter={playHover}
                      className="w-full bg-[#35A7FF] hover:bg-[#288DE0] text-white py-3 sm:py-4 md:py-5 rounded-full font-black text-xl sm:text-2xl md:text-3xl uppercase tracking-widest shadow-[0_4px_0_#156CAE] sm:shadow-[0_6px_0_#156CAE] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer"
                    >
                      <Play fill="white" size={20} className="sm:w-7 sm:h-7 md:w-8 md:h-8" /> PLAY NOW
                    </button>
                  </div>

                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}