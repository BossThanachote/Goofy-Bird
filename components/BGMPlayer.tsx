'use client'
import React, { useState, useEffect, useRef } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function BGMPlayer() {
  const [bgmUrl, setBgmUrl] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(true) // 🔇 เริ่มต้นมาให้ Mute ไว้ก่อนเพื่อหลบกฎ Autoplay ของ Browser
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    fetchBGM()
  }, [])

  const fetchBGM = async () => {
    try {
      const { data, error } = await supabase
        .from('sounds')
        .select('file_url')
        .eq('action_trigger', 'bgm_lobby') // 🎯 ดึงเฉพาะเสียงที่ตั้ง Trigger นี้ไว้
        .eq('is_active', true)
        .eq('is_deleted', false)
        .single() // เอามาแค่อันเดียว

      if (data) {
        setBgmUrl(data.file_url)
      }
    } catch (err) {
      console.error("Error fetching BGM:", err)
    }
  }

  // ฟังก์ชันกดเปิด/ปิดเสียง
  const toggleMute = () => {
    if (audioRef.current) {
      // สลับสถานะ Mute
      const newMutedState = !audioRef.current.muted
      audioRef.current.muted = newMutedState
      setIsMuted(newMutedState)

      // ถ้าเปิดเสียง ให้สั่ง Play ด้วย เผื่อมันยังไม่ได้เล่น
      if (!newMutedState) {
        audioRef.current.play().catch(e => console.log('Autoplay prevented:', e))
      }
    }
  }

  if (!bgmUrl) return null // ถ้ายังไม่โหลด หรือไม่มีเสียง ก็ซ่อนไปเลย

  return (
    <>
      {/* 🎶 ตัวเล่นเสียงแบบซ่อน (loop ไปเรื่อยๆ) */}
      <audio 
        ref={audioRef} 
        src={bgmUrl} 
        loop 
        autoPlay 
        muted={isMuted} 
      />

      {/* 🎛️ ปุ่มเปิด-ปิดเสียง (ลอยอยู่มุมขวาล่าง) */}
      <button 
        onClick={toggleMute}
        className="fixed bottom-6 right-6 z-50 bg-white/80 backdrop-blur-md border-2 border-slate-200 text-slate-600 p-3 rounded-full shadow-lg hover:bg-white hover:text-[#35A7FF] hover:border-[#35A7FF] hover:scale-110 active:scale-95 transition-all"
        title={isMuted ? "Unmute BGM" : "Mute BGM"}
      >
        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
      </button>
    </>
  )
}