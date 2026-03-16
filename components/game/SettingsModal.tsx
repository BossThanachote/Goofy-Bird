'use client'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useSFX } from '@/hook/useSFX'

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
  const [hasSession, setHasSession] = useState(false)
  const { playHover, playClick, playBack } = useSFX()

  const [bgmVolume, setBgmVolume] = useState(100)
  const [sfxVolume, setSfxVolume] = useState(100)

  useEffect(() => {
    if (isOpen) {
      fetchUserProfile()
      
      const savedBgm = localStorage.getItem('goofy_bgm_volume')
      const savedSfx = localStorage.getItem('goofy_sfx_volume')
      if (savedBgm !== null) setBgmVolume(Number(savedBgm))
      if (savedSfx !== null) setSfxVolume(Number(savedSfx))
    }
  }, [isOpen])

  const handleBgmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    setBgmVolume(val)
    localStorage.setItem('goofy_bgm_volume', val.toString())
    window.dispatchEvent(new Event('volumeChange')) 
  }

  const handleSfxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    setSfxVolume(val)
    localStorage.setItem('goofy_sfx_volume', val.toString())
    if (val % 10 === 0) playClick() 
  }

  const fetchUserProfile = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setHasSession(true) 
        const { data, error } = await supabase
          .from('users')
          .select('username, email, user_id, user_tag, secret_code')
          .eq('user_id', user.id)
          .maybeSingle()

        if (error) throw error
        setProfile(data)
      } else {
        setHasSession(false)
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
            onClick={() => {
              playBack()
              handleClose()
            }}
            onMouseEnter={playHover}
            className="absolute inset-0 bg-black/70"
          />

          {/* ✅ ปรับความกว้าง, Padding และ Border ให้เล็กลงบนมือถือ */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative bg-gradient-to-b from-[#E0C3FC] to-[#8EC5FC] w-full max-w-[32em] rounded-[2.5em] sm:rounded-[3em] border-[4px] sm:border-[8px] border-white p-5 sm:p-10 shadow-2xl overflow-y-auto min-h-[60vh] sm:min-h-[70vh] md:min-h-[700px] max-h-[90vh] scrollbar-hide flex flex-col"
          >
            {/* ✅ ปรับปุ่มกากบาท */}
            <button onClick={() => {
              playBack()
              handleClose()
            }}
              onMouseEnter={playHover}
              className="absolute right-3 top-3 sm:right-4 sm:top-4 bg-[#FF5F5F] text-white w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 sm:border-4 border-white shadow-lg hover:scale-110 transition-transform font-bold text-lg sm:text-2xl z-50 cursor-pointer">✕</button>

            {/* ✅ ปรับขนาด Header */}
            <h2 className="text-3xl sm:text-5xl font-black text-[#35A7FF] mb-4 sm:mb-8 uppercase tracking-tighter drop-shadow-[0_2px_0_white] text-center leading-none mt-2 sm:mt-0">Settings</h2>

            {/* ✅ ปรับขนาดกล่อง Tabs และ Font ภายใน */}
            <div className="flex justify-between gap-1 sm:gap-2 mb-4 sm:mb-8 bg-black/10 p-1 sm:p-2 rounded-full shrink-0">
              {['Controls', 'Sound', 'Account'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    playClick()
                    setActiveTab(tab)
                  }}
                  onMouseEnter={playHover}
                  className={`flex-1 py-1.5 sm:py-2 rounded-full font-black text-[11px] sm:text-base transition-all cursor-pointer flex items-center justify-center gap-1 ${activeTab === tab ? 'bg-[#35A7FF] text-white shadow-[0_4px_0_#288DE0] scale-105' : 'text-[#35A7FF] hover:bg-white/20'}`}
                >
                  <span className="hidden sm:inline">{tab === 'Account' ? '👤' : tab === 'Sound' ? '🔊' : '🕹️'}</span> 
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 flex flex-col">
              {/* 🟢 หน้าต่าง ACCOUNT */}
              {activeTab === 'Account' && (
                <div className="space-y-3 sm:space-y-4 text-left flex-1 flex flex-col">
                  {loading ? (
                    <div className="h-full flex items-center justify-center font-black text-[#35A7FF] animate-pulse italic text-sm sm:text-base">LOADING...</div>
                  ) : (
                    <>
                      {/* ✅ ปรับกล่องข้อมูลแต่ละอันให้บางลง ตัวหนังสือเล็กลง */}
                      <div className="flex items-center justify-between bg-white/80 p-3 sm:p-4 rounded-[1.5em] sm:rounded-[2em] border-2 border-[#35A7FF]/30 min-h-[50px] sm:min-h-[72px]">
                        <span className="font-black text-[#35A7FF] text-xs sm:text-base">User Name</span>
                        {isEditing ? (
                          <div className="flex items-center gap-1 sm:gap-2">
                            <input
                              type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
                              className="bg-white border-2 border-[#35A7FF] rounded-full px-2 sm:px-4 py-1 text-gray-700 font-bold focus:outline-none w-[6em] sm:w-[10em] text-xs sm:text-base"
                              autoFocus
                            />
                            <button onClick={() => { playClick(); handleUpdateUsername(); }} className="text-green-500 font-black text-base sm:text-xl hover:scale-120 cursor-pointer">✔</button>
                            <button onClick={() => { playBack(); setIsEditing(false); }} className="text-red-400 font-black text-base sm:text-xl hover:scale-120 cursor-pointer">✖</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 sm:gap-2">
                            <span className="font-bold text-gray-600 text-xs sm:text-base truncate max-w-[100px] sm:max-w-full">
                              {profile?.username || 'Guest'}
                              <span className="text-gray-400 text-[10px] sm:text-sm ml-1">
                                #{profile?.user_tag || '0000'}
                              </span>
                            </span>

                            {profile && (
                              <button onClick={() => { playClick(); setNewUsername(profile.username); setIsEditing(true) }} className="text-[#35A7FF] hover:scale-110 transition-transform cursor-pointer text-sm sm:text-base">✏️</button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between bg-white/80 p-3 sm:p-4 rounded-[1.5em] sm:rounded-[2em] border-2 border-[#35A7FF]/30">
                        <span className="font-black text-[#35A7FF] text-xs sm:text-base">User ID</span>
                        <span className="font-mono text-gray-500 italic text-xs sm:text-sm">{profile?.user_id ? `ID: ${profile.user_id.slice(0, 8)}...` : 'N/A'}</span>
                      </div>

                      <div className="flex items-center justify-between bg-white/80 p-3 sm:p-4 rounded-[1.5em] sm:rounded-[2em] border-2 border-[#35A7FF]/30 overflow-hidden gap-2">
                        <span className="font-black text-[#35A7FF] text-xs sm:text-base flex-shrink-0">Email</span>
                        <span className="font-bold text-gray-500 truncate italic text-xs sm:text-sm text-right">{profile?.email || 'No email found'}</span>
                      </div>

                      <div className="flex items-center justify-between bg-white/80 p-3 sm:p-4 rounded-[1.5em] sm:rounded-[2em] border-2 border-[#35A7FF]/30">
                        <span className="font-black text-[#35A7FF] text-xs sm:text-base">Recovery Key</span>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <span className="font-mono font-bold text-[#4ECB71] tracking-widest bg-white px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg border border-[#4ECB71]/20 shadow-sm text-xs sm:text-base">
                            {showSecret ? (profile?.secret_code || '------') : '******'}
                          </span>
                          {profile && (
                            <button onClick={() => { playClick(); setShowSecret(!showSecret) }} className="text-[#35A7FF] text-base sm:text-lg hover:scale-110 transition-all cursor-pointer">
                              {showSecret ? '👁️‍🗨️' : '👁️'}
                            </button>
                          )}
                        </div>
                      </div>

                      {hasSession && (
                        <div className="pt-4 sm:pt-6 mt-auto"> 
                          <div className="border-t-4 border-white/30 pt-4 sm:pt-6">
                            <button onClick={() => {
                              playClick()
                              handleLogout()
                            }}
                              onMouseEnter={playHover}
                              className="w-full bg-[#FF5F5F] py-3 sm:py-4 rounded-full text-lg sm:text-2xl font-black text-white shadow-[0_4px_0_#D14848] sm:shadow-[0_6px_0_#D14848] border-2 sm:border-4 border-white uppercase hover:brightness-110 active:translate-y-1 active:shadow-none transition-all cursor-pointer">
                              Logout
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* 🟢 หน้าต่าง SOUND */}
              {activeTab === 'Sound' && (
                <div className="space-y-4 sm:space-y-6 text-left flex-1 flex flex-col justify-center">
                  
                  {/* Music Slider */}
                  <div className="bg-white/80 p-4 sm:p-6 rounded-[2em] sm:rounded-[2.5em] border-2 sm:border-4 border-[#35A7FF]/30 shadow-sm relative overflow-hidden">
                    <div className="absolute -right-2 -top-2 sm:-right-4 sm:-top-4 text-5xl sm:text-7xl opacity-10 pointer-events-none">🎵</div>
                    <div className="flex justify-between items-end mb-4 sm:mb-6 relative z-10">
                      <span className="font-black text-[#35A7FF] text-lg sm:text-2xl uppercase italic tracking-tighter">Music Volume</span>
                      <span className="font-black text-[#35A7FF] bg-white px-2 py-1 sm:px-4 sm:py-1.5 rounded-xl border-2 border-[#35A7FF]/20 shadow-inner min-w-[3em] sm:min-w-[4em] text-center text-sm sm:text-base">
                        {bgmVolume}%
                      </span>
                    </div>
                    <input 
                      type="range" min="0" max="200" 
                      value={bgmVolume} 
                      onChange={handleBgmChange} 
                      className="w-full h-3 sm:h-4 bg-slate-200 rounded-full appearance-none cursor-pointer accent-[#35A7FF] relative z-10" 
                    />
                  </div>

                  {/* SFX Slider */}
                  <div className="bg-white/80 p-4 sm:p-6 rounded-[2em] sm:rounded-[2.5em] border-2 sm:border-4 border-[#FFD151]/50 shadow-sm relative overflow-hidden mt-2 sm:mt-4">
                    <div className="absolute -right-2 -top-2 sm:-right-4 sm:-top-4 text-5xl sm:text-7xl opacity-10 pointer-events-none">🔊</div>
                    <div className="flex justify-between items-end mb-4 sm:mb-6 relative z-10">
                      <span className="font-black text-yellow-600 text-lg sm:text-2xl uppercase italic tracking-tighter">Sound Effects</span>
                      <span className="font-black text-yellow-600 bg-white px-2 py-1 sm:px-4 sm:py-1.5 rounded-xl border-2 border-yellow-200 shadow-inner min-w-[3em] sm:min-w-[4em] text-center text-sm sm:text-base">
                        {sfxVolume}%
                      </span>
                    </div>
                    <input 
                      type="range" min="0" max="200" 
                      value={sfxVolume} 
                      onChange={handleSfxChange} 
                      className="w-full h-3 sm:h-4 bg-slate-200 rounded-full appearance-none cursor-pointer accent-[#FACC15] relative z-10" 
                    />
                  </div>
                  
                </div>
              )}

              {/* 🟢 หน้าต่าง CONTROLS */}
              {activeTab === 'Controls' && (
                <div className="flex-1 flex items-center justify-center text-white font-black text-xl sm:text-3xl opacity-50 italic uppercase tracking-widest drop-shadow-md">
                  Coming Soon...
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}