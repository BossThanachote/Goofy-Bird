'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

let sfxCache: Record<string, { url: string, base_volume: number }> = {}
let isFetched = false

export const useSFX = () => {
  const [isReady, setIsReady] = useState(isFetched)

  useEffect(() => {
    if (!isFetched) fetchSFX()
  }, [])

  const fetchSFX = async () => {
    try {
      const { data, error } = await supabase
        .from('sounds')
        .select('action_trigger, file_url, base_volume') // 🎯 ดึง base_volume
        .eq('category', 'SFX')
        .eq('is_active', true)
        .eq('is_deleted', false)

      if (error) {
        console.error('Supabase Error (SFX):', error.message)
        return
      }

      if (data) {
        data.forEach((sound) => {
          sfxCache[sound.action_trigger] = {
            url: sound.file_url,
            // ถ้าไม่มีค่าใน DB ให้ถือว่าเป็น 1.0 (100%) ไปเลย กันระบบพัง
            base_volume: sound.base_volume !== null && sound.base_volume !== undefined ? sound.base_volume : 1.0
          }
        })
        isFetched = true
        setIsReady(true)
      }
    } catch (error) {
      console.error('Error fetching SFX:', error)
    }
  }

  const playSound = (trigger: string) => {
    if (sfxCache[trigger]) {
      const soundData = sfxCache[trigger]
      const audio = new Audio(soundData.url)
      
      const savedSfx = localStorage.getItem('goofy_sfx_volume')
      const userMultiplier = savedSfx !== null ? Number(savedSfx) / 100 : 1
      
      // 🧮 คำนวณความดัง: (Base Volume จากแอดมิน) x (เปอร์เซ็นต์จากผู้เล่น)
      let finalVol = Math.min((soundData.base_volume * 0.5) * userMultiplier, 1.0)
      if (isNaN(finalVol) || finalVol < 0) finalVol = 1.0 // กันค่าติดลบหรือ Error

      audio.volume = finalVol
      audio.play().catch(e => console.log('SFX play prevented:', e))
    }
  }

  return {
    isReady,
    playHover: () => playSound('sfx_hover'),
    playClick: () => playSound('sfx_click'),
    playBack: () => playSound('sfx_back'),
    playHit: () => playSound('sfx_hit'),
    // 🦘 ผมเห็นในรูประบบหลังบ้าน บอสมี sfx_jump4 ด้วย เลยเพิ่มให้ในรายชื่อสุ่มครับ
    playJump: () => {
      const jumpSounds = ['sfx_jump1', 'sfx_jump2', 'sfx_jump3', 'sfx_jump4'];
      const randomSound = jumpSounds[Math.floor(Math.random() * jumpSounds.length)];
      playSound(randomSound);
    }
  }
}