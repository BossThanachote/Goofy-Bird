'use client'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import SuccessModal from './SuccessModal'

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RegisterModal({ isOpen, onClose }: RegisterModalProps) {
  const initialFormState = {
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  }

  const [formData, setFormData] = useState(initialFormState)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [generatedCode, setGeneratedCode] = useState('')

  // ✅ ฟังก์ชันตรวจสอบรูปแบบ Email ที่ถูกต้อง
  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

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
    setError('')

    // 🛡️ 1. Validation เบื้องต้น
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('PLEASE FILL IN ALL FIELDS')
      return
    }

    if (!validateEmail(formData.email)) {
      setError('PLEASE ENTER A VALID EMAIL (e.g., name@example.com)')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('PASSWORDS DO NOT MATCH !')
      return
    }

    setLoading(true)

    try {
      // 🎲 2. สุ่ม Tag 4 หลัก และเช็คว่าการจับคู่ ชื่อ+Tag นี้ซ้ำไหม
      let randomTag = Math.floor(1000 + Math.random() * 9000).toString()
      let isUnique = false

      while (!isUnique) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('user_id')
          .eq('username', formData.username)
          .eq('user_tag', randomTag)
          .maybeSingle()

        if (!existingUser) {
          isUnique = true // รอด! ไม่มีคนใช้ชื่อและ Tag คู่นี้
        } else {
          randomTag = Math.floor(1000 + Math.random() * 9000).toString() // สุ่มใหม่ถ้าแจ็คพอตไปซ้ำคนอื่น
        }
      }

      // 🚀 3. สมัครสมาชิกผ่าน Supabase Auth (แนบ user_tag ไปกับ metadata ด้วย)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            display_name: formData.username,
            user_tag: randomTag // ส่งข้อมูลนี้เผื่อ Trigger หลังบ้านเอาไปใช้ได้
          }
        }
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('THIS EMAIL IS ALREADY IN USE!')
        } else {
          throw authError
        }
        return
      }

      // 🔄 4. รอ Trigger หลังบ้านสร้าง Profile ให้เสร็จ
      let retryCount = 0
      let profileData = null

      while (retryCount < 10 && !profileData) {
        const { data } = await supabase
          .from('users')
          .select('secret_code, user_tag')
          .eq('user_id', authData.user?.id)
          .maybeSingle()
        
        if (data) {
          profileData = data
        } else {
          await new Promise(res => setTimeout(res, 500)) 
          retryCount++
        }
      }

      // ✅ 5. อัปเดต user_tag ลง Database (ในกรณีที่ Trigger สมัครสมาชิกไม่ได้จัดการให้)
      if (profileData && !profileData.user_tag) {
        await supabase
          .from('users')
          .update({ user_tag: randomTag })
          .eq('user_id', authData.user?.id)
      }

      setGeneratedCode(profileData?.secret_code || 'CHECK SETTINGS')
      setIsSuccessOpen(true)
      
    } catch (err: any) {
      if (err.message.includes('unique constraint')) {
        setError('DATABASE ERROR: PLEASE TRY AGAIN')
      } else {
        setError(err.message.toUpperCase())
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin }
    })
    if (error) setError(error.message.toUpperCase())
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
            className="relative bg-white w-full max-w-[90%] sm:max-w-[28em] rounded-[2.5em] sm:rounded-[3em] border-[8px] border-[#35A7FF] shadow-[0_15px_0_rgba(0,0,0,0.1)] overflow-y-auto max-h-[90vh] scrollbar-hide"
          >
            <button onClick={handleClose} className="absolute right-6 top-6 text-[#35A7FF] text-2xl font-black hover:scale-125 transition-transform z-50">✕</button>

            <div className="px-6 sm:px-10 py-10 sm:py-14 text-center">
              <h2 className="text-5xl sm:text-6xl font-black text-[#35A7FF] mb-10 uppercase tracking-tighter">Register</h2>

              {/* Social Buttons */}
              <div className="space-y-4 mb-8">
                <button onClick={() => handleSocialLogin('google')} className="w-full flex items-center justify-center gap-3 bg-white border-[4px] border-[#EEEEEE] py-3 rounded-full text-black font-bold shadow-[0_4px_0_#DDDDDD] active:translate-y-1 transition-all">
                  <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="G" /> SIGN UP WITH GOOGLE
                </button>
                <button onClick={() => handleSocialLogin('facebook')} className="w-full flex items-center justify-center gap-3 bg-[#1877F2] py-3 rounded-full text-white font-bold shadow-[0_4px_0_#0C52AB] active:translate-y-1 transition-all">
                  <span className="text-2xl font-black">f</span> SIGN UP WITH FACEBOOK
                </button>
              </div>

              <div className="flex items-center gap-4 mb-8 text-[#DDDDDD] font-black italic text-sm">
                <div className="flex-1 h-1 bg-[#EEEEEE] rounded-full" /> OR <div className="flex-1 h-1 bg-[#EEEEEE] rounded-full" />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <input name="username" type="text" placeholder="USERNAME" value={formData.username} onChange={handleInputChange} className="w-full bg-[#F5FBFF] border-[4px] border-[#35A7FF] py-4 px-8 rounded-full text-black font-bold focus:outline-none placeholder:text-blue-200" />
                <input name="email" type="email" placeholder="EMAIL ADDRESS" value={formData.email} onChange={handleInputChange} className="w-full bg-[#F5FBFF] border-[4px] border-[#35A7FF] py-4 px-8 rounded-full text-black font-bold focus:outline-none placeholder:text-blue-200" />
                <input name="password" type="password" placeholder="PASSWORD" value={formData.password} onChange={handleInputChange} className="w-full bg-[#F5FBFF] border-[4px] border-[#35A7FF] py-4 px-8 rounded-full text-black font-bold focus:outline-none placeholder:text-blue-200" />
                <input name="confirmPassword" type="password" placeholder="CONFIRM PASSWORD" value={formData.confirmPassword} onChange={handleInputChange} className="w-full bg-[#F5FBFF] border-[4px] border-[#35A7FF] py-4 px-8 rounded-full text-black font-bold focus:outline-none placeholder:text-blue-200" />

                {error && <div className="text-red-500 font-black text-sm animate-pulse uppercase tracking-tight">{error}</div>}
                
                <button disabled={loading} type="submit" className="w-full bg-[#FFD151] py-4 rounded-full text-3xl font-black text-white shadow-[0_6px_0_#A37B00] border-4 border-white uppercase hover:brightness-105 active:translate-y-1 transition-all disabled:opacity-50">
                  {loading ? '...' : 'SIGN UP'}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    <SuccessModal 
      isOpen={isSuccessOpen} 
      onClose={() => { setIsSuccessOpen(false); handleClose(); }}
      secretCode={generatedCode}
    />
    </>
  )
}