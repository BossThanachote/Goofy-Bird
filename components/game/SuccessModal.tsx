'use client'
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  secretCode: string;
}

export default function SuccessModal({ isOpen, onClose, secretCode }: SuccessModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          {/* พื้นหลังมืดๆ เบลอๆ */}
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70"
          />

          {/* ตัว Card แจ้งเตือน */}
          <motion.div 
            initial={{ scale: 0.5, opacity: 0, y: 100 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 15 }}
            className="relative bg-white w-full max-w-[24em] rounded-[3em] border-[8px] border-[#4ECB71] shadow-[0_15px_0_rgba(0,0,0,0.1)] p-10 text-center"
          >
            {/* ไอคอนติ๊กถูกพร้อมวงกลมเด้งๆ */}
            <motion.div 
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-24 h-24 bg-[#4ECB71] rounded-full mx-auto mb-6 flex items-center justify-center border-4 border-white shadow-lg"
            >
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <motion.path 
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" 
                />
              </svg>
            </motion.div>

            <h2 className="text-4xl font-black text-[#4ECB71] mb-2 uppercase italic tracking-tighter">
              Success!
            </h2>
            <p className="text-[#888888] font-bold mb-6">YOUR ACCOUNT IS READY TO GO</p>
            <button 
              onClick={onClose}
              className="w-full bg-[#4ECB71] py-4 rounded-full text-2xl font-black text-white shadow-[0_6px_0_#389452] border-4 border-white uppercase hover:brightness-105 active:translate-y-1 transition-all"
            >
              Let's Play!
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}