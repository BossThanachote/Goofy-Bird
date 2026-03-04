'use client'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RegisterModal({ isOpen, onClose }: RegisterModalProps) {
  // 1. ค่าเริ่มต้นของฟอร์ม
  const initialFormState = {
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  }

  const [formData, setFormData] = useState(initialFormState)
  const [error, setError] = useState('')

  // 2. ฟังก์ชันล้างข้อมูล
  const handleClose = () => {
    setFormData(initialFormState) // ล้างข้อมูลในช่องกรอก
    setError('') // ล้างข้อความ Error
    onClose() // เรียกฟังก์ชันปิด Modal จาก props
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('') // ล้าง Error เก่าก่อนเริ่มใหม่

    // Validation (คงไว้ตามเดิมของคุณ)
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('PLEASE FILL IN ALL FIELDS')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setError('PASSWORDS DO NOT MATCH !')
      return
    }

    try {
      // 2. สมัครสมาชิกผ่าน Supabase Auth
      // เราส่ง display_name เข้าไปใน metadata เพื่อให้ Trigger ใน Database ดึงไปใช้ได้
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            display_name: formData.username, 
          }
        }
      })

      if (authError) throw authError

      // 3. บันทึกข้อมูลลงตาราง 'users' ที่คุณสร้างไว้
      // หมายเหตุ: หากคุณรัน SQL Trigger ใน Supabase แล้ว ส่วนนี้อาจไม่ต้องทำก็ได้ 
      // แต่เขียนไว้เพื่อความชัวร์ว่าข้อมูล username จะถูกเก็บแน่นอน
      if (data.user) {
        const { error: dbError } = await supabase
          .from('users')
          .insert([
            { 
              user_id: data.user.id, // ใช้ user_id ตามชื่อคอลัมน์ในรูปของคุณ
              username: formData.username, 
              email: formData.email,
              user_point: 0, // ค่าเริ่มต้นตามตาราง
              high_score: 0  // ค่าเริ่มต้นตามตาราง
            }
          ])
        
        if (dbError) {
           console.error("DB Insert Error:", dbError)
           // หากสมัคร Auth สำเร็จแต่ DB พัง อาจจะแสดง Error ให้ผู้ใช้ทราบ
        }
      }

      alert('SIGN UP SUCCESS! PLEASE CHECK YOUR EMAIL FOR VERIFICATION')
      handleClose() 
      
    } catch (err: any) {
      // แสดง Error จาก Supabase เช่น Email ซ้ำ หรือ Password สั้นไป
      setError(err.message.toUpperCase())
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose} /* ✅ ล้างข้อมูลเมื่อกดพื้นหลัง */
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          <motion.div 
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            className="relative bg-white w-full max-w-[90%] sm:max-w-[28em] rounded-[2.5em] sm:rounded-[3em] border-[6px] sm:border-[8px] border-[#35A7FF] shadow-[0_15px_0_rgba(0,0,0,0.1)] overflow-y-auto max-h-[90vh] scrollbar-hide"
          >
            <div className="sticky top-0 left-0 w-full z-[1001] pointer-events-none">
                <button 
                  onClick={handleClose} /* ✅ ล้างข้อมูลเมื่อกดปุ่ม X */
                  className="absolute right-4 top-4 sm:right-6 sm:top-6 pointer-events-auto text-[#35A7FF] text-xl sm:text-2xl font-black hover:scale-125 transition-transform bg-white/90 backdrop-blur-sm rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shadow-md border-2 border-[#35A7FF]/20"
                >
                  ✕
                </button>
            </div>

            <div className="px-6 sm:px-10 py-10 sm:py-14">
              <h2 className="text-4xl sm:text-6xl font-black text-[#35A7FF] mb-6 sm:mb-10 uppercase tracking-tighter drop-shadow-sm text-center">
                Register
              </h2>

              <div className="space-y-3 sm:space-y-4 px-1 sm:px-2 mb-6 sm:mb-8">
                <button type="button" className="w-full flex items-center justify-center gap-3 bg-white border-[3px] sm:border-[4px] border-[#EEEEEE] py-2.5 sm:py-3 rounded-full text-black font-bold text-sm sm:text-base shadow-[0_4px_0_#DDDDDD] active:translate-y-1 transition-all">
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5 sm:w-6 sm:h-6" alt="G" />
                  SIGN UP WITH GOOGLE
                </button>
                <button type="button" className="w-full flex items-center justify-center gap-3 bg-[#1877F2] py-2.5 sm:py-3 rounded-full text-white font-bold text-sm sm:text-base shadow-[0_4px_0_#0C52AB] active:translate-y-1 transition-all">
                  <span className="text-xl sm:text-2xl font-black">f</span>
                  SIGN UP WITH FACEBOOK
                </button>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 mb-6 sm:mb-8 text-[#DDDDDD] font-black italic text-xs sm:text-sm">
                <div className="flex-1 h-1 bg-[#EEEEEE] rounded-full" />
                OR
                <div className="flex-1 h-1 bg-[#EEEEEE] rounded-full" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 px-1 sm:px-2 text-center">
                <input name="username" type="text" placeholder="USERNAME" value={formData.username} onChange={handleInputChange} className="w-full bg-[#F5FBFF] border-[3px] sm:border-[4px] border-[#35A7FF] py-3 sm:py-4 px-6 sm:px-8 rounded-full text-black font-bold text-sm sm:text-base focus:outline-none" />
                <input name="email" type="email" placeholder="EMAIL ADDRESS" value={formData.email} onChange={handleInputChange} className="w-full bg-[#F5FBFF] border-[3px] sm:border-[4px] border-[#35A7FF] py-3 sm:py-4 px-6 sm:px-8 rounded-full text-black font-bold text-sm sm:text-base focus:outline-none" />
                <input name="password" type="password" placeholder="PASSWORD" value={formData.password} onChange={handleInputChange} className="w-full bg-[#F5FBFF] border-[3px] sm:border-[4px] border-[#35A7FF] py-3 sm:py-4 px-6 sm:px-8 rounded-full text-black font-bold text-sm sm:text-base focus:outline-none" />
                <input name="confirmPassword" type="password" placeholder="CONFIRM PASSWORD" value={formData.confirmPassword} onChange={handleInputChange} className="w-full bg-[#F5FBFF] border-[3px] sm:border-[4px] border-[#35A7FF] py-3 sm:py-4 px-6 sm:px-8 rounded-full text-black font-bold text-sm sm:text-base focus:outline-none" />

                {error && <div className="text-red-500 font-black text-xs sm:text-sm animate-pulse mt-2">{error}</div>}
                
                <div className="flex justify-center mt-6 sm:mt-8">
                  <button type="submit" className="w-full sm:w-[12em] bg-[#FFD151] py-3 sm:py-4 rounded-full text-xl sm:text-3xl font-black text-white shadow-[0_6px_0_#A37B00] border-[3px] sm:border-4 border-white uppercase hover:brightness-105 active:translate-y-1 transition-all">SIGN UP</button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}