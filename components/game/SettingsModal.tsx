'use client'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }:SettingsModalProps) {
  const [activeTab, setActiveTab] = useState('Account') // เริ่มต้นที่หน้า Account ตามโจทย์

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
          />

          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative bg-gradient-to-b from-[#E0C3FC] to-[#8EC5FC] w-full max-w-[32em] rounded-[3em] border-[8px] border-white p-8 sm:p-10 shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-hide"
          >
            {/* ❌ ปุ่มปิด (ลอยมุมขวาบน) */}
            <button 
              onClick={onClose} 
              className="absolute right-4 top-4 bg-[#FF5F5F] text-white w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-lg hover:scale-110 transition-transform font-bold text-2xl z-50"
            >
              ✕
            </button>

            <h2 className="text-4xl sm:text-5xl font-black text-[#35A7FF] mb-8 uppercase tracking-tighter drop-shadow-[0_2px_0_white] text-center">
              Settings
            </h2>

            {/* 📑 Tab Navigation */}
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

            {/* 👤 Content Area: Account Settings */}
            {activeTab === 'Account' && (
              <div className="space-y-4">
                {/* User Name */}
                <div className="flex items-center justify-between bg-white/80 p-4 rounded-[2em] border-2 border-[#35A7FF]/30">
                  <span className="font-black text-[#35A7FF]">User Name</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-600">PlayerOne</span>
                    <button className="text-[#35A7FF] hover:scale-110">✏️</button>
                  </div>
                </div>

                {/* User ID */}
                <div className="flex items-center justify-between bg-white/80 p-4 rounded-[2em] border-2 border-[#35A7FF]/30 text-sm">
                  <span className="font-black text-[#35A7FF]">User ID</span>
                  <span className="font-mono text-gray-500">ID: 123 45678</span>
                </div>

                {/* Email */}
                <div className="flex items-center justify-between bg-white/80 p-4 rounded-[2em] border-2 border-[#35A7FF]/30 overflow-hidden">
                  <span className="font-black text-[#35A7FF]">Email</span>
                  <span className="font-bold text-gray-500 truncate ml-4 italic">user.email@example.com</span>
                </div>

                {/* Recovery Key / Password */}
                <div className="flex items-center justify-between bg-white/80 p-4 rounded-[2em] border-2 border-[#35A7FF]/30">
                  <span className="font-black text-[#35A7FF]">Password</span>
                  <button className="bg-[#35A7FF] text-white px-4 py-1 rounded-full text-xs font-black shadow-[0_3px_0_#288DE0]">
                    Reset Password
                  </button>
                </div>

                {/* 🔴 ปุ่ม Logout (ดีไซน์ใหม่ให้ดูอันตรายนิดๆ) */}
                <div className="pt-6 border-t-4 border-white/30">
                  <button 
                    className="w-full bg-[#FF5F5F] py-4 rounded-full text-2xl font-black text-white shadow-[0_6px_0_#D14848] border-4 border-white uppercase hover:brightness-110 active:translate-y-1 active:shadow-none transition-all"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}

            {/* ส่วน Controls และ Sound สามารถเพิ่มโค้ดที่นี่ได้ในอนาคต */}
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