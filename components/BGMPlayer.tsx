'use client'
import React, { useState, useEffect, useRef } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function BGMPlayer() {
  const [bgmUrl, setBgmUrl] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    fetchBGM()
  }, [])

  const fetchBGM = async () => {
    try {
      const { data, error } = await supabase
        .from('sounds')
        .select('file_url')
        .eq('action_trigger', 'bgm_lobby')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .single()

      if (data) setBgmUrl(data.file_url)
    } catch (err) {
      console.error("Error fetching BGM:", err)
    }
  }

  // ทริคปลดล็อกเสียงเมื่อผู้เล่นคลิกครั้งแรก
  useEffect(() => {
    const unlockAudio = () => {
      if (audioRef.current && !audioUnlocked) {
        audioRef.current.muted = false
        audioRef.current.play().catch(e => console.log('ยังเล่นไม่ได้:', e))
        setAudioUnlocked(true)
        setIsMuted(false)
      }
      document.removeEventListener('click', unlockAudio)
      document.removeEventListener('keydown', unlockAudio)
    }

    if (!audioUnlocked) {
      document.addEventListener('click', unlockAudio)
      document.addEventListener('keydown', unlockAudio)
    }

    return () => {
      document.removeEventListener('click', unlockAudio)
      document.removeEventListener('keydown', unlockAudio)
    }
  }, [audioUnlocked])

  // พยายามเล่นเพลงทันทีที่โหลด URL เสียงเสร็จ
  useEffect(() => {
    if (bgmUrl && audioRef.current) {
      audioRef.current.play().then(() => {
        setAudioUnlocked(true)
        setIsMuted(false)
      }).catch((err) => {
        console.log("Autoplay blocked by browser. Waiting for first interaction...")
        setIsMuted(true) 
      })
    }
  }, [bgmUrl])

  // 📡 ✅ จุดที่แก้: ดักฟังสัญญาณ volumeChange จากหน้า Settings แบบ Real-time!
  useEffect(() => {
    const updateVolume = () => {
      if (audioRef.current) {
        // ดึงค่าเสียงจากเครื่อง (ถ้าไม่มีให้ถือว่า 100%)
        const savedBgm = localStorage.getItem('goofy_bgm_volume')
        const multiplier = savedBgm !== null ? Number(savedBgm) / 100 : 1
        
        // อัปเดตความดังทันที (ค่าปกติหน้าล็อบบี้ผมตั้งไว้ที่ 0.4 จะได้ไม่ดังแสบแก้วหูครับ)
        audioRef.current.volume = Math.min(0.4 * multiplier, 1.0)
      }
    }

    // เซ็ตค่าเสียงตอนเริ่มเปิดเว็บ
    updateVolume()

    // เปิดเรดาร์รับสัญญาณเวลาผู้เล่นรูดสไลเดอร์
    window.addEventListener('volumeChange', updateVolume)
    
    // ปิดเรดาร์ตอนเปลี่ยนหน้า
    return () => window.removeEventListener('volumeChange', updateVolume)
  }, [bgmUrl]) // ทำงานเมื่อโหลด URL เสียงเสร็จ

  const toggleMute = () => {
    if (audioRef.current) {
      const newMutedState = !audioRef.current.muted
      audioRef.current.muted = newMutedState
      setIsMuted(newMutedState)

      if (!newMutedState) {
        audioRef.current.play().catch(e => console.log('Play prevented:', e))
        setAudioUnlocked(true)
      }
    }
  }

  if (!bgmUrl) return null

  return (
    <>
      <audio 
        ref={audioRef} 
        src={bgmUrl} 
        loop 
        autoPlay 
        muted={isMuted} 
      />

      <button 
        onClick={toggleMute}
        className="fixed bottom-6 right-6 z-50 bg-white/80 backdrop-blur-md border-2 border-slate-200 text-slate-600 p-3 rounded-full shadow-lg hover:bg-white hover:text-[#35A7FF] hover:border-[#35A7FF] hover:scale-110 active:scale-95 transition-all cursor-pointer"
        title={isMuted ? "Unmute BGM" : "Mute BGM"}
      >
        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
      </button>
    </>
  )
}