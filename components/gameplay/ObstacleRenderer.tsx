import React from 'react'

interface ObstacleProps {
  obs: {
    type: string
    scale: number
    width: number
    height: number
  }
}

export default function ObstacleRenderer({ obs }: ObstacleProps) {
  switch (obs.type) {
    case 'pipe-top':
      return (
        // ✅ เพิ่ม relative เข้าไปตรงนี้ เพื่อให้ฝาท่อยึดตำแหน่งจากตัวท่อ
        <div className="relative w-full h-full bg-green-500 border-[4px] sm:border-[6px] border-green-800 rounded-b-sm shadow-inner">
         
          <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 w-[150%] h-10 sm:h-10 bg-green-400  border-[4px] sm:border-[6px] border-green-800 rounded-sm"></div>
        </div>
      )
    case 'pipe-bottom':
      return (
        // ✅ เพิ่ม relative เข้าไปตรงนี้
        <div className="relative w-full h-full bg-green-500 border-[4px] sm:border-[6px] border-green-800 rounded-t-sm shadow-inner">
          {/* ✅ ปรับเปอร์เซ็นต์ความกว้างจาก w-[115%] เป็น w-[125%] เพื่อให้ฝาท่อดู "ล้น" ออกมาด้านละ 12.5% */}
          <div className="absolute top-[-20px] left-1/2 -translate-x-1/2 w-[150%] h-10 sm:h-10 bg-green-400 border-[4px] sm:border-[6px] border-green-800 rounded-sm"></div>
        </div>
      )
    case 'cloud':
      return <div style={{ fontSize: `${60 * obs.scale}px` }} className="opacity-90 leading-none">☁️</div>
    case 'enemy-bird':
      return (
        <div style={{ width: `${60 * obs.scale}px`, height: `${50 * obs.scale}px` }} className="scale-x-[-1]">
          <img 
            src="/redbird.gif"  
            alt="Enemy Bird" 
            className="w-full h-full object-contain drop-shadow-lg" 
          />
        </div>
      )
    case 'stalactite':
      return <div style={{ borderWidth: `${obs.height}px ${obs.width/2}px 0 ${obs.width/2}px`, borderColor: '#334155 transparent transparent transparent', borderStyle: 'solid' }} className="w-0 h-0 drop-shadow-md"></div>
    case 'frog':
      return <div style={{ fontSize: `${50 * obs.scale}px` }} className="scale-x-[-1] drop-shadow-lg leading-none">🐸</div>
    case 'pendulum':
      return (
        <div className="w-full h-full bg-slate-800 rounded-full border-2 sm:border-4 border-slate-500 shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center">
          <div className="w-1/2 h-1/2 bg-red-500 rounded-full animate-pulse"></div>
        </div>
      )
    case 'rocket':
      return <div style={{ fontSize: `${50 * obs.scale}px` }} className="scale-x-[-1] drop-shadow-xl leading-none">🚀</div>
    default:
      return <div className="w-full h-full bg-red-500 animate-pulse rounded-md"></div>
  }
}