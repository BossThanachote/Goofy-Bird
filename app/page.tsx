'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import CurrencyBar from '@/components/game/CurrencyBar'
import LoginModal from '@/components/game/LoginModal'
import RegisterModal from '@/components/game/RegisterModal'
import SettingsModal from '@/components/game/SettingsModal'
import InventoryModal from '@/components/game/InventoryModal'
import { Fredoka } from 'next/font/google'
import { supabase } from '@/lib/supabase' // ✅ เพิ่มการนำเข้า supabase
import ShopModal from '@/components/game/ShopModal'
import LeaderboardModal from '@/components/game/LeaderBoardModal'
import FriendModal from '@/components/game/FriendModal'
import BGMPlayer from '@/components/BGMPlayer'


const fredokaOne = Fredoka({ subsets: ['latin'], weight: '600' })

export default function LandingPage() {
  const router = useRouter()
  const [windowWidth, setWindowWidth] = useState(0)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isInventoryOpen, setIsInventoryOpen] = useState(false)
  const [isShopOpen, setIsShopOpen] = useState(false)
  const [points, setPoints] = useState(0)
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false)
  const [isFriendModalOpen, setIsFriendModalOpen] = useState(false)
  
  // ✅ เพิ่ม State สำหรับจัดการข้อมูลผู้เล่น
  const [user, setUser] = useState<any>(null)
  const [username, setUsername] = useState('')

  useEffect(() => {
    setWindowWidth(window.innerWidth)
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)

    // 🔍 เช็คสถานะการเข้าสู่ระบบครั้งแรก
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        fetchUserData(session.user.id)
      }
    }
    checkUser()

    // 📡 คอยฟังว่ามีการ Login หรือ Logout หรือไม่
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        fetchUserData(session.user.id)
      } else {
        setUser(null)
        setUsername('')
        setPoints(0) // Reset เงินเมื่อ Logout
      }
    })

    return () => {
      window.removeEventListener('resize', handleResize)
      authListener.subscription.unsubscribe() // ป้องกัน Memory Leak
    }
  }, [])

  const fetchUserData = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('username, user_point') // ✅ ดึงทั้งชื่อและเงิน
      .eq('user_id', userId)
      .single()
    
    if (data) {
      setUsername(data.username)
      setPoints(data.user_point || 0) // ✅ อัปเดตเงินในหน้า UI
    }
  }

  // ฟังก์ชันดึงชื่อใหม่แบบแมนนวล (เราจะส่งตัวนี้ไปให้ Modal)
  const refreshUsername = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const { data } = await supabase
        .from('users')
        .select('username')
        .eq('user_id', session.user.id)
        .single()
      
      if (data) {
        setUsername(data.username) // ✅ อัปเดตชื่อในหน้า Page ทันที
        console.log("Page UI Updated with:", data.username)
      }
    }
  }

  if (windowWidth === 0) return <div className="min-h-screen bg-[#D0F4FF]" />

  return (
    <div className={`${fredokaOne.className} relative min-h-screen w-full overflow-hidden text-white`}>
      {/* ... (แอนิเมชัน Background เหมือนเดิมของบอส) ... */}
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
        <div className="flex justify-between items-start w-full relative z-50">
          <div className="flex flex-col gap-4">
            <motion.button onClick={() => setIsSettingsOpen(true)} whileHover={{ scale: 1.1 }} className="text-4xl filter drop-shadow-md">⚙️</motion.button>
            <motion.button onClick={() => setIsInventoryOpen(true)} whileHover={{ scale: 1.1 }} className="text-4xl filter drop-shadow-md">🎒</motion.button>
            <motion.button onClick={() => setIsFriendModalOpen(true)} whileHover={{ scale: 1.1 }} className="text-4xl filter drop-shadow-md">👥</motion.button>
          </div>

          {/* 🔘 ส่วนเปลี่ยนปุ่ม Login/Register เป็น Hello ! */}
          <div className="flex gap-3">
            {user ? (
              // ✅ ถ้า Login แล้ว: โชว์ 👋 Hello ! [Username]
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/90 backdrop-blur-sm px-8 py-2 rounded-full font-bold shadow-[0_5px_0_rgba(0,0,0,0.1)] border-2 border-[#35A7FF] text-[#35A7FF] text-lg flex items-center gap-2"
              >
                👋 Hello ! <span className="font-black text-[#FF5F5F]">{username || 'Player'}</span>
              </motion.div>
            ) : (
              // ❌ ถ้ายังไม่ได้ Login: โชว์ปุ่มเดิม
              <>
                <motion.button 
                  onClick={() => setIsLoginOpen(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-[#35A7FF] px-8 py-2 rounded-full font-bold shadow-[0_5px_0_#288DE0] border-2 border-white/50"
                >
                  LOGIN
                </motion.button>
                <motion.button 
                  onClick={() => setIsRegisterOpen(true)}
                  whileHover={{ scale: 1.02 }} 
                  whileTap={{ scale: 0.98 }} 
                  className="bg-[#FFD151] px-8 py-2 rounded-full font-bold shadow-[0_5px_0_#A37B00] text-white border-2 border-white/50"
                >
                  REGISTER
                </motion.button>
              </>
            )}
          </div>
        </div>

        {/* ... (ส่วนกลาง Logo และปุ่มต่างๆ เหมือนเดิมของบอส) ... */}
        <div className="flex-1 flex flex-col items-center w-full justify-center -mt-20 scale-[0.8] sm:scale-100 transition-transform">
          <motion.div
            initial={{ y: -10 }} animate={{ y: 10 }}
            transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            className="text-center"
          >
            <h1 className="text-[110px] leading-[0.85] font-black tracking-tighter drop-shadow-[0_8px_0_rgba(0,0,0,0.15)] mb-4">
              <span className="text-[#35A7FF]">GOOFY</span><br />
              <span className="text-[#FF5F5F]">BIRD</span>
            </h1>
            <div className="bg-[#C7EF00] text-black font-bold px-8 py-1 rounded-full inline-block rotate-[-5deg] shadow-lg text-2xl mb-8 uppercase">
              Release !
            </div>
          </motion.div>

          <div className="space-y-6 sm:space-y-10 w-full sm:w-[40em] px-6 items-center justify-center flex flex-col">
            <motion.button 
              onClick={() => router.push('/play')}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-[10em] bg-[#35A7FF] py-4 rounded-full text-3xl font-black shadow-[0_8px_0_#288DE0] border-4 border-white uppercase"
            >
              START GAME
            </motion.button>

            <div className="flex flex-col sm:flex-row gap-6 sm:gap-[5em] w-full items-center justify-center">
              <motion.button className="bg-[#FF5F5F] w-[15em] sm:w-[13em] py-3 rounded-full text-xl font-bold shadow-[0_6px_0_#D14848] uppercase">Multiplayer</motion.button>
              <motion.button onClick={() => setIsShopOpen(true)} className="bg-white text-[#35A7FF] w-[15em] sm:flex-1 py-3 rounded-full text-xl font-bold border-4 border-[#35A7FF] shadow-[0_6px_0_#35A7FF] uppercase">Shop</motion.button>
            </div>

            <motion.button onClick={() => setIsLeaderboardOpen(true)} className="bg-[#F1E4F3] text-[#E0A1FF] px-10 py-4 rounded-full font-bold text-2xl shadow-[0_5px_0_#E0A1FF] border-4 border-white uppercase">Leaderboard</motion.button>
          </div>
        </div>

        <div className="mt-auto pb-4 scale-90 sm:scale-100 origin-left">
          <CurrencyBar amount={points.toLocaleString()} />
        </div>
      </div>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      <RegisterModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onUpdateSuccess={refreshUsername} />
      <InventoryModal isOpen={isInventoryOpen} onClose={() => setIsInventoryOpen(false)} user={user} />
      <ShopModal isOpen={isShopOpen} onClose={() => setIsShopOpen(false)} user={user} onUpdatePoints={(newPoints) => {
          setPoints(newPoints)
        }} />
      <FriendModal isOpen={isFriendModalOpen} onClose={() => setIsFriendModalOpen(false)} currentUser={user} />
      <LeaderboardModal isOpen={isLeaderboardOpen} onClose={() => setIsLeaderboardOpen(false)} />
      <BGMPlayer />
    </div>
  )
}