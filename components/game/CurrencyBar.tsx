'use client'
import React from 'react'
import Image from 'next/image'

interface CurrencyBarProps {
  amount: string | number; // รับได้ทั้ง string และ number
}

const CurrencyBar: React.FC<CurrencyBarProps> = ({ amount }) => {
  // 💡 ฟังก์ชันจัดการตัวเลขให้มีลูกน้ำ (e.g. 12500 -> 12,500)
  const formattedAmount = typeof amount === 'number' 
    ? amount.toLocaleString() 
    : amount;

  return (
    <div className="relative inline-flex items-center group">
      {/* 💳 แถบพื้นหลังหลัก */}
      <div className="relative bg-[#D0F4FF]/90 backdrop-blur-sm border-[4px] border-[#35A7FF] rounded-full px-10 py-2 flex items-center gap-4 shadow-[0_6px_0_rgba(53,167,255,0.3)] overflow-hidden">
        
        {/* ✨ แสงเงาในแถบ (Reflection) */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 z-0" />

        {/* 🪙 ไอคอนเหรียญ 3D (coin.png) */}
        <div className="relative z-10 w-12 h-12 flex-shrink-0 -ml-6 drop-shadow-md transition-transform group-hover:scale-110">
          <Image 
            src="/coin.png" 
            alt="coin" 
            width={48} 
            height={48} 
            className="object-contain"
          />
        </div>

        {/* 💵 ตัวเลขจำนวนเงิน (ใช้ค่าที่จัดฟอร์แมตแล้ว) */}
        <span className="relative z-10 text-[#35A7FF] font-black text-4xl drop-shadow-[0_2px_0_white]">
          {formattedAmount}
        </span>
      </div>
    </div>
  )
}

export default CurrencyBar;