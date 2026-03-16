'use client'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase' // 1. อย่าลืม import supabase client
import SuccessModal from './SuccessModal'
import { useSFX } from '@/hook/useSFX'

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const initialFormState = {
    email: '', // 2. แนะนำให้ใช้ email ในการ login ผ่าน Auth จะง่ายที่สุดครับ
    password: ''
  }

  const [formData, setFormData] = useState(initialFormState)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false) // เพิ่มสถานะโหลด
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const { playHover, playClick } = useSFX() // ใช้เสียงจาก Hook ได้เลยครับ


  // ✅ 1. ฟังก์ชัน Login ด้วย Google
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin, // กลับมาที่ localhost:3000
        }
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message.toUpperCase())
    }
}
  const handleClose = () => {
    setFormData(initialFormState)
    setError('')
    onClose()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email || !formData.password) {
      setError('PLEASE ENTER BOTH EMAIL AND PASSWORD')
      return
    }

    setLoading(true)
    setError('')

    try {
      // 3. ใช้ Supabase Auth ในการล็อกอิน
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (authError) throw authError

         setIsSuccessOpen(true); // ✅ เปิด Modal แจ้งเตือนแทนการใช้ alert
      // ถ้าผ่าน ระบบจะเก็บ session ให้อัตโนมัติ

    } catch (err: any) {
      // แสดง error เช่น "Invalid login credentials"
      setError(err.message.toUpperCase())
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/70"
          />

          <motion.div 
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            className="relative bg-white w-full max-w-[90%] sm:max-w-[28em] rounded-[2.5em] sm:rounded-[3em] border-[6px] sm:border-[8px] border-[#35A7FF] shadow-[0_15px_0_rgba(0,0,0,0.1)] overflow-y-auto max-h-[90vh] scrollbar-hide"
          >
            <div className="sticky top-0 left-0 w-full z-[1001] pointer-events-none">
                <button 
                  onClick={() => {
                    playClick()
                    handleClose()
                  }}
                  onMouseEnter={playHover} 
                  className="absolute right-4 top-4 sm:right-6 sm:top-6 pointer-events-auto text-[#35A7FF] text-xl sm:text-2xl font-black hover:scale-125 transition-transform bg-white/90 backdrop-blur-sm rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shadow-md border-2 border-[#35A7FF]/20 cursor-pointer"
                >
                  ✕
                </button>
            </div>

            <div className="px-6 sm:px-10 py-10 sm:py-14 text-center">
              <h2 className="text-4xl sm:text-6xl font-black text-[#35A7FF] mb-6 sm:mb-10 uppercase tracking-tighter drop-shadow-sm">
                Login
              </h2>

              <div className="space-y-3 sm:space-y-4 px-1 sm:px-2 mb-6 sm:mb-8">
                {/* ✅ ผูกฟังก์ชัน Google */}
                <button 
                  onClick={() => {
                    playClick()
                    handleGoogleLogin()
                  }}
                  onMouseEnter={playHover}
                  type="button" 
                  className="w-full flex items-center justify-center gap-3 bg-white border-[4px] border-[#EEEEEE] py-3 rounded-full text-black font-bold shadow-[0_4px_0_#DDDDDD] active:translate-y-1 transition-all cursor-pointer"
                >
                  <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="G" />
                  CONTINUE WITH GOOGLE
                </button>
                <button 
                  onClick={() => {
                    playClick()
                  }}
                  onMouseEnter={playHover}
                  type="button" 
                  className="w-full flex items-center justify-center gap-3 bg-[#1877F2] py-2.5 sm:py-3 rounded-full text-white font-bold text-sm sm:text-base shadow-[0_4px_0_#0C52AB] active:translate-y-1 transition-all cursor-pointer"
                >
                  <span className="text-xl sm:text-2xl font-black">f</span>
                  CONTINUE WITH FACEBOOK
                </button>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 mb-6 sm:mb-8 text-[#DDDDDD] font-black italic text-xs sm:text-sm">
                <div className="flex-1 h-1 bg-[#EEEEEE] rounded-full" />
                OR
                <div className="flex-1 h-1 bg-[#EEEEEE] rounded-full" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 px-1 sm:px-2">
                {/* เปลี่ยนเป็น type="email" และ name="email" ให้ตรงกับ Auth */}
                <input name="email" type="email" placeholder="EMAIL ADDRESS" value={formData.email} onChange={handleInputChange} className="w-full bg-[#F5FBFF] border-[3px] sm:border-[4px] border-[#35A7FF] py-3 sm:py-4 px-6 sm:px-8 rounded-full text-black font-bold text-sm sm:text-base focus:outline-none" />
                <input name="password" type="password" placeholder="PASSWORD" value={formData.password} onChange={handleInputChange} className="w-full bg-[#F5FBFF] border-[3px] sm:border-[4px] border-[#35A7FF] py-3 sm:py-4 px-6 sm:px-8 rounded-full text-black font-bold text-sm sm:text-base focus:outline-none" />

                <div className="flex justify-end px-2">
                  <button 
                    onClick={() => {
                      playClick()
                    }}
                    onMouseEnter={playHover}
                    type="button" className="text-[#35A7FF] text-xs sm:text-sm font-black hover:underline uppercase cursor-pointer">
                    Forgot Password?
                  </button>
                </div>

                {error && <div className="text-red-500 font-black text-xs sm:text-sm animate-pulse">{error}</div>}
                
                <div className="flex justify-center mt-6">
                  <button 
                    onClick={() => {
                      playClick()
                    }}
                    onMouseEnter={playHover}
                    disabled={loading}
                    type="submit" 
                    className="w-full sm:w-[10em] bg-[#35A7FF] py-3 sm:py-4 rounded-full text-xl sm:text-3xl font-black text-white shadow-[0_6px_0_#288DE0] border-[3px] sm:border-4 border-white uppercase hover:brightness-105 active:translate-y-1 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? '...' : 'LOGIN'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    <SuccessModal 
        isOpen={isSuccessOpen} 
        onClose={() => {
          setIsSuccessOpen(false)
          handleClose() // ปิดหน้า Login พร้อมกัน
        }}
        secretCode="WELCOME BACK!"
        />
    </>
  )
}