'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'

export default function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // 🔍 ตรวจสอบจากตาราง admin
      const { data, error: authError } = await supabase
        .from('admin')
        .select('*')
        .eq('admin_username', username)
        .eq('admin_password', password)
        .single()

      if (authError || !data) throw new Error('INVALID ADMIN CREDENTIALS')

      localStorage.setItem('isAdmin', 'true')
      router.push('/admin/dashboard')
    } catch (err: any) {
      setError(err.message.toUpperCase())
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      
      {/* 🌌 Moving Background Loop */}
      <motion.div 
        initial={{ backgroundPosition: '0px 0px' }}
        animate={{ backgroundPosition: ['0px 0px', '1200px -1200px'] }}
        transition={{ 
          duration: 30, 
          repeat: Infinity, 
          ease: "linear" 
        }}
        className="absolute inset-0 z-0 scale-110"
        style={{ 
          backgroundImage: "url('/backgroundadmingoofybird.jpg')",
          backgroundSize: '600px 600px', // ปรับขนาดลวดลายให้พอดี
          filter: 'brightness(0.9)'
        }}
      />

      {/* 🌫️ Overlay เพิ่มความอ่านง่าย */}
      <div className="absolute inset-0 bg-white/20  z-[1]" />

      {/* 📦 Login Card */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 w-full max-w-md bg-white/90 backdrop-blur-md rounded-[3em] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-[6px] border-[#35A7FF]"
      >
        <div className="text-center mb-10">
          <div className="inline-block bg-[#35A7FF] text-white px-6 py-2 rounded-full text-sm font-black mb-4 shadow-lg uppercase tracking-widest">
            Admin System
          </div>
          <h1 className="text-5xl font-black text-[#35A7FF] tracking-tighter italic uppercase">
            Goofy Bird
          </h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-white border-[4px] border-[#35A7FF]/20 rounded-full py-4 px-8 text-black font-bold focus:border-[#35A7FF] focus:outline-none transition-all placeholder:opacity-50"
              placeholder="USERNAME"
            />
          </div>

          <div className="space-y-2">
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border-[4px] border-[#35A7FF]/20 rounded-full py-4 px-8 text-black font-bold focus:border-[#35A7FF] focus:outline-none transition-all placeholder:opacity-50"
              placeholder="PASSWORD"
            />
          </div>

          {error && (
            <motion.div 
              initial={{ x: -10 }} animate={{ x: 0 }}
              className="text-red-500 text-center font-black text-xs uppercase"
            >
              ⚠️ {error}
            </motion.div>
          )}

          <button 
            disabled={loading}
            type="submit"
            className="w-full bg-[#35A7FF] hover:bg-[#288DE0] text-white font-black py-5 rounded-full text-xl shadow-[0_8px_0_#288DE0] active:translate-y-2 active:shadow-none transition-all disabled:opacity-50 uppercase"
          >
            {loading ? 'Authenticating...' : 'Enter Dashboard'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}