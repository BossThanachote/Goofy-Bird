'use client'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateSuccess?: () => void;
}

export default function SettingsModal({ isOpen, onClose, onUpdateSuccess }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState('Account')
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [showSecret, setShowSecret] = useState(false) 

  useEffect(() => {
    if (isOpen) {
      fetchUserProfile()
    }
  }, [isOpen])

  const fetchUserProfile = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // ✅ ดึง user_tag มาด้วย (บอสเขียนไว้ถูกแล้วครับ!)
        const { data, error } = await supabase
          .from('users')
          .select('username, email, user_id, user_tag, secret_code')
          .eq('user_id', user.id)
          .single()

        if (error) throw error
        setProfile(data)
      } else {
        setProfile(null) 
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUsername = async () => {
    if (!newUsername.trim() || !profile) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ username: newUsername })
        .eq('user_id', profile.user_id)

      if (error) throw error

      setProfile({ ...profile, username: newUsername })
      setIsEditing(false)
      if (onUpdateSuccess) onUpdateSuccess()
    } catch (err: any) {
      alert(err.message.toUpperCase())
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      window.location.reload()
    }
  }

  const handleClose = () => {
    setIsEditing(false)
    setShowSecret(false)
    onClose()
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
            <button onClick={handleClose} className="absolute right-4 top-4 bg-[#FF5F5F] text-white w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-lg hover:scale-110 transition-transform font-bold text-2xl z-50">✕</button>

            <h2 className="text-4xl sm:text-5xl font-black text-[#35A7FF] mb-8 uppercase tracking-tighter drop-shadow-[0_2px_0_white] text-center">Settings</h2>

            <div className="flex justify-between gap-2 mb-8 bg-black/10 p-2 rounded-full">
              {['Controls', 'Sound', 'Account'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 rounded-full font-black text-sm sm:text-base transition-all ${activeTab === tab ? 'bg-[#35A7FF] text-white shadow-[0_4px_0_#288DE0] scale-105' : 'text-[#35A7FF] hover:bg-white/20'}`}
                >
                  {tab === 'Account' ? '👤 ' : tab === 'Sound' ? '🔊 ' : '🕹️ '}{tab}
                </button>
              ))}
            </div>

            {activeTab === 'Account' && (
              <div className="space-y-4 text-left">
                {loading ? (
                  <div className="text-center py-10 font-black text-[#35A7FF] animate-pulse italic">LOADING...</div>
                ) : (
                  <>
                    <div className="flex items-center justify-between bg-white/80 p-4 rounded-[2em] border-2 border-[#35A7FF]/30 min-h-[72px]">
                      <span className="font-black text-[#35A7FF]">User Name</span>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
                            className="bg-white border-2 border-[#35A7FF] rounded-full px-4 py-1 text-gray-700 font-bold focus:outline-none w-[8em] sm:w-[10em]"
                            autoFocus
                          />
                          <button onClick={handleUpdateUsername} className="text-green-500 font-black text-xl hover:scale-120">✔</button>
                          <button onClick={() => setIsEditing(false)} className="text-red-400 font-black text-xl hover:scale-120">✖</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {/* ✅ โชว์ชื่อ พร้อม Tag สีเทาๆ ห้อยท้าย */}
                          <span className="font-bold text-gray-600">
                            {profile?.username || 'Guest'}
                            <span className="text-gray-400 text-sm ml-1">
                              #{profile?.user_tag || '0000'}
                            </span>
                          </span>
                          
                          {profile && (
                            <button onClick={() => {setNewUsername(profile.username); setIsEditing(true)}} className="text-[#35A7FF] hover:scale-110 transition-transform">✏️</button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between bg-white/80 p-4 rounded-[2em] border-2 border-[#35A7FF]/30 text-sm">
                      <span className="font-black text-[#35A7FF]">User ID</span>
                      <span className="font-mono text-gray-500 italic">{profile?.user_id ? `ID: ${profile.user_id.slice(0, 8)}...` : 'N/A'}</span>
                    </div>

                    <div className="flex items-center justify-between bg-white/80 p-4 rounded-[2em] border-2 border-[#35A7FF]/30 overflow-hidden">
                      <span className="font-black text-[#35A7FF]">Email</span>
                      <span className="font-bold text-gray-500 truncate ml-4 italic">{profile?.email || 'No email found'}</span>
                    </div>

                    <div className="flex items-center justify-between bg-white/80 p-4 rounded-[2em] border-2 border-[#35A7FF]/30">
                      <span className="font-black text-[#35A7FF]">Recovery Key</span>
                      <div className="flex items-center gap-2">
                         <span className="font-mono font-bold text-[#4ECB71] tracking-widest bg-white px-3 py-1 rounded-lg border border-[#4ECB71]/20 shadow-sm">
                            {showSecret ? (profile?.secret_code || '------') : '******'}
                         </span>
                         {profile && (
                            <button onClick={() => setShowSecret(!showSecret)} className="text-[#35A7FF] text-lg hover:scale-110 transition-all">
                              {showSecret ? '👁️‍🗨️' : '👁️'}
                            </button>
                         )}
                      </div>
                    </div>

                    {profile && (
                      <div className="pt-6 border-t-4 border-white/30">
                        <button onClick={handleLogout} className="w-full bg-[#FF5F5F] py-4 rounded-full text-2xl font-black text-white shadow-[0_6px_0_#D14848] border-4 border-white uppercase hover:brightness-110 active:translate-y-1 active:shadow-none transition-all">
                          Logout
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab !== 'Account' && (
              <div className="py-20 text-center text-white font-black text-2xl opacity-50 italic">Coming Soon...</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}