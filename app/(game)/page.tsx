'use client'
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import CurrencyBar from '@/components/game/CurrencyBar'
import LoginModal from '@/components/game/LoginModal'
import RegisterModal from '@/components/game/RegisterModal'
import SettingsModal from '@/components/game/SettingsModal'
import { Fredoka } from 'next/font/google'

const fredokaOne = Fredoka({ subsets: ['latin'], weight: '600' })

export default function LandingPage() {
  const [windowWidth, setWindowWidth] = useState(0)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  useEffect(() => {
    setWindowWidth(window.innerWidth)
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (windowWidth === 0) return <div className="min-h-screen bg-[#D0F4FF]" />

  return (
    <div className={`${fredokaOne.className} relative min-h-screen w-full overflow-hidden text-white`}>
      
      {/* 🎞️ Infinite Scrolling Background */}
      <div className="absolute inset-0 z-0 flex w-[200vw]">
        <motion.div
          className="h-full w-[100vw] bg-cover bg-bottom bg-no-repeat"
          style={{ backgroundImage: "url('/background_goofy_bird.png')" }}
          animate={{ x: [0, -windowWidth] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="h-full w-[100vw] bg-cover bg-bottom bg-no-repeat -ml-[2px]" 
          style={{ backgroundImage: "url('/background_goofy_bird.png')" }}
          animate={{ x: [0, -windowWidth] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="relative z-10 flex flex-col h-screen w-full p-6">
        
        {/* ส่วนบน: Navigation & Tools */}
        <div className="flex justify-between items-start w-full">
          <div className="flex flex-col gap-4">
            <motion.button onClick={() => setIsSettingsOpen(true)} whileHover={{ scale: 1.1 }} className="text-4xl filter drop-shadow-md">⚙️</motion.button>
            <motion.button whileHover={{ scale: 1.1 }} className="text-4xl filter drop-shadow-md">🎒</motion.button>
            <motion.button whileHover={{ scale: 1.1 }} className="text-4xl filter drop-shadow-md">👥</motion.button>
          </div>
          <div className="flex gap-3">
            <motion.button 
              onClick={() => setIsLoginOpen(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            className="bg-[#35A7FF] px-8 py-2 rounded-full font-bold shadow-[0_5px_0_#288DE0] border-2 border-white/50">LOGIN</motion.button>
            <motion.button 
              onClick={() => setIsRegisterOpen(true)} // สั่งเปิดที่นี่
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }} 
              className="bg-[#FFD151] px-8 py-2 rounded-full font-bold shadow-[0_5px_0_#A37B00] text-white border-2 border-white/50">REGISTER</motion.button>
          </div>
        </div>

        {/* ส่วนกลาง: Logo & Buttons */}
        {/* ปรับขนาดโดยรวมผ่าน scale ในจอเล็ก เพื่อไม่ให้ไปยุ่งกับค่า em ของคุณ */}
        <div className="flex-1 flex flex-col items-center w-full justify-center -mt-20 scale-[0.8] sm:scale-100 transition-transform">
          <motion.div
            initial={{ y: -10 }}
            animate={{ y: 10 }}
            transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            className="text-center"
          >
            <h1 className="text-[110px] leading-[0.85] font-black tracking-tighter drop-shadow-[0_8px_0_rgba(0,0,0,0.15)] mb-4">
              <span className="text-[#35A7FF]">GOOFY</span><br />
              <span className="text-[#FF5F5F]">BIRD</span>
            </h1>
            <div className="bg-[#C7EF00] text-black font-bold px-8 py-1 rounded-full inline-block rotate-[-5deg] shadow-lg text-2xl mb-8">
              RELEASE !
            </div>
          </motion.div>

          {/* ปุ่มกดหลัก - เปลี่ยนจาก flex-col เป็น col อัตโนมัติเมื่อจอเล็กกว่า sm */}
          <div className="space-y-6 sm:space-y-10 w-full sm:w-[40em] px-6 items-center justify-center flex flex-col">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-[10em] bg-[#35A7FF] py-4 rounded-full text-3xl font-black shadow-[0_8px_0_#288DE0] border-4 border-white uppercase"
            >
              START GAME
            </motion.button>

            {/* แถว Multiplayer & Shop: จอเล็กเรียงแนวตั้ง (col), จอใหญ่เรียงแนวนอน (row) */}
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-[5em] w-full items-center justify-center">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-[#FF5F5F] w-[15em] sm:w-[13em]  py-3 rounded-full text-xl font-bold shadow-[0_6px_0_#D14848] uppercase">
                Multiplayer
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white text-[#35A7FF] w-[15em]  sm:flex-1 py-3 rounded-full text-xl font-bold border-4 border-[#35A7FF] shadow-[0_6px_0_#35A7FF] uppercase">
                Shop
              </motion.button>
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}  
              className="bg-[#F1E4F3] text-[#E0A1FF] px-10 py-4 rounded-full font-bold text-2xl shadow-[0_5px_0_#E0A1FF] border-4 border-white uppercase">
              Leaderboard
            </motion.button>
          </div>
        </div>

        {/* ส่วนล่าง: Currency Bar */}
        <div className="mt-auto pb-4 scale-90 sm:scale-100 origin-left">
          <CurrencyBar amount="12,500" />
        </div>
      </div>
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      <RegisterModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
    
    
  )
}