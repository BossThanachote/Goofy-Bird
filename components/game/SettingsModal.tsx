'use client'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase' //

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateSuccess?: () => void;
}

export default function SettingsModal({ isOpen, onClose, onUpdateSuccess }:SettingsModalProps) {
  const [activeTab, setActiveTab] = useState('Account')
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false) // ✅ เพิ่ม State เพื่อเช็คว่ากำลังแก้อยู่ไหม
  const [newUsername, setNewUsername] = useState('') // ✅ เก็บชื่อใหม่ที่จะพิมพ์

  // 🔄 ดึงข้อมูล User เมื่อเปิด Modal
  useEffect(() => {
    if (isOpen) {
      fetchUserProfile()
    }
  }, [isOpen])

  const fetchUserProfile = async () => {
    setLoading(true)
    try {
      // ดึง User ID จาก Session ปัจจุบัน
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // ดึงข้อมูลจากตาราง 'users' โดยใช้ user_id
        const { data, error } = await supabase
          .from('users')
          .select('username, email, user_id, secret_code') //
          .eq('user_id', user.id)
          .single()

        if (error) throw error
        setProfile(data)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  // ฟังก์ชัน Logout
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      alert('LOGGED OUT SUCCESS!')
      window.location.reload() // รีโหลดเพื่อล้าง State ทั้งหมด
    }
  }

  const handleClose = () => {
    setProfile(null)
    onClose()
  }

  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) return
    setLoading(true)

    try {
      const { error } = await supabase
        .from('users')
        .update({ username: newUsername }) // อัปเดตคอลัมน์ username
        .eq('user_id', profile.user_id)

      if (error) throw error

      setProfile({ ...profile, username: newUsername }) // อัปเดต State ในหน้า Settings
      setIsEditing(false) // ปิดโหมดแก้ไข

      if (onUpdateSuccess) {
        onUpdateSuccess() 
      }
      alert('USERNAME UPDATED!')
      
      // บอสอาจจะใช้วิธี window.location.reload() เพื่อให้หน้า page.tsx เปลี่ยนชื่อตาม
      // หรือจะใช้ระบบ Global State/Context ก็ได้ครับ
    } catch (err: any) {
      alert(err.message.toUpperCase())
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
          />

          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative bg-gradient-to-b from-[#E0C3FC] to-[#8EC5FC] w-full max-w-[32em] rounded-[3em] border-[8px] border-white p-8 sm:p-10 shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-hide"
          >
            <button 
              onClick={handleClose} 
              className="absolute right-4 top-4 bg-[#FF5F5F] text-white w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-lg hover:scale-110 transition-transform font-bold text-2xl z-50"
            >
              ✕
            </button>

            <h2 className="text-4xl sm:text-5xl font-black text-[#35A7FF] mb-8 uppercase tracking-tighter drop-shadow-[0_2px_0_white] text-center">
              Settings
            </h2>

            <div className="flex justify-between gap-2 mb-8 bg-black/10 p-2 rounded-full">
              {['Controls', 'Sound', 'Account'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 rounded-full font-black text-sm sm:text-base transition-all ${
                    activeTab === tab 
                    ? 'bg-[#35A7FF] text-white shadow-[0_4px_0_#288DE0] scale-105' 
                    : 'text-[#35A7FF] hover:bg-white/20'
                  }`}
                >
                  {tab === 'Controls' && '🕹️ '}
                  {tab === 'Sound' && '🔊 '}
                  {tab === 'Account' && '👤 '}
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'Account' && (
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-10 font-black text-[#35A7FF] animate-pulse">LOADING PROFILE...</div>
                ) : (
                  <>
                    {/* User Name */}
                    <div className="flex items-center justify-between bg-white/80 p-4 rounded-[2em] border-2 border-[#35A7FF]/30">
                      <span className="font-black text-[#35A7FF]">User Name</span>

                        {isEditing ? (
                  /* ✅ แสดงช่อง Input เมื่อกดปุ่มดินสอ */
                  <div className="flex items-center gap-2">
                    <input 
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="bg-white border-2 border-[#35A7FF] rounded-full px-4 py-1 text-gray-700 font-bold focus:outline-none w-[8em] sm:w-[10em]"
                      placeholder="New Name"
                      autoFocus
                    />
                    <button 
                      onClick={handleUpdateUsername}
                      className="text-green-500 font-black text-xl hover:scale-120"
                    >
                      ✔
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="text-red-400 font-black text-xl hover:scale-120"
                    >
                      ✖
                    </button>
                  </div>
                ) : (
                  /* ❌ แสดงชื่อปกติเมื่อไม่ได้แก้ไข */
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-600">
                      {profile?.username || 'Loading...'}
                    </span>
                    <button 
                      onClick={() => {
                        setNewUsername(profile?.username || '')
                        setIsEditing(true)
                      }}
                      className="text-[#35A7FF] hover:scale-110 transition-transform"
                    >
                      ✏️
                    </button>
                  </div>
                    )}

                     
                    </div>

                    {/* User ID */}
                    <div className="flex items-center justify-between bg-white/80 p-4 rounded-[2em] border-2 border-[#35A7FF]/30 text-sm">
                      <span className="font-black text-[#35A7FF]">User ID</span>
                      <span className="font-mono text-gray-500 truncate ml-4 italic">
                        {profile?.user_id ? `ID: ${profile.user_id.slice(0, 8)}...` : 'N/A'}
                      </span>
                    </div>

                    {/* Email */}
                    <div className="flex items-center justify-between bg-white/80 p-4 rounded-[2em] border-2 border-[#35A7FF]/30 overflow-hidden">
                      <span className="font-black text-[#35A7FF]">Email</span>
                      <span className="font-bold text-gray-500 truncate ml-4 italic">
                        {profile?.email || 'No email found'}
                      </span>
                    </div>

                    {/* Recovery Key (เปลี่ยนจาก Reset Password เป็นช่องโชว์ Secret Code) */}
                    <div className="flex items-center justify-between bg-white/80 p-4 rounded-[2em] border-2 border-[#35A7FF]/30">
                      <span className="font-black text-[#35A7FF]">Recovery Key</span>
                      <div className="flex items-center gap-2">
                         <span className="font-mono font-bold text-[#4ECB71] tracking-widest bg-white px-3 py-1 rounded-lg border border-[#4ECB71]/20 shadow-sm">
                            {profile?.secret_code || '------'}
                         </span>
                         <button className="text-[#35A7FF] text-lg">👁️</button>
                      </div>
                    </div>

                    <div className="pt-6 border-t-4 border-white/30">
                      <button 
                        onClick={handleLogout}
                        className="w-full bg-[#FF5F5F] py-4 rounded-full text-2xl font-black text-white shadow-[0_6px_0_#D14848] border-4 border-white uppercase hover:brightness-110 active:translate-y-1 active:shadow-none transition-all"
                      >
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab !== 'Account' && (
              <div className="py-20 text-center text-white font-black text-2xl opacity-50 italic">
                Coming Soon...
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}