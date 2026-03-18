import React from 'react'
import { motion } from 'framer-motion'
import { Trophy, Coins } from 'lucide-react'

interface GameOverModalProps {
  score: number
  highScore: number
  earnedCoins: number
  difficulty: 'easy' | 'normal' | 'hard'
  onMainMenuClick: (e: React.MouseEvent) => void
  onHover: () => void
}

export default function GameOverModal({ score, highScore, earnedCoins, difficulty, onMainMenuClick, onHover }: GameOverModalProps) {
  const diffMultiplier = difficulty === 'hard' ? 2 : (difficulty === 'normal' ? 1.5 : 1)

  return (
    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/70 px-4">
      <h1 className="text-5xl sm:text-7xl font-black text-white italic drop-shadow-2xl uppercase tracking-tighter mb-4 sm:mb-6 text-center text-red-500 leading-none">GAME OVER</h1>
      
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8 w-full max-w-[300px] sm:max-w-none justify-center">
        <div className="flex-1 max-w-[200px] bg-slate-800/80 px-4 py-4 sm:px-8 sm:py-6 rounded-3xl border-2 border-slate-600 text-center flex flex-col items-center shadow-xl">
          <p className="text-slate-400 font-bold text-[10px] sm:text-[12px] uppercase tracking-widest mb-1">Score</p>
          <p className="text-5xl sm:text-6xl font-black text-white leading-none">{score}</p>
          <div className="mt-2 text-yellow-400 font-bold text-[10px] sm:text-xs">
            <Trophy size={12} className="inline mr-1"/> BEST: {highScore}
          </div>
        </div>
        
        <div className="flex-1 max-w-[200px] bg-yellow-900/80 px-4 py-4 sm:px-8 sm:py-6 rounded-3xl border-2 border-yellow-700 text-center flex flex-col items-center shadow-xl">
          <p className="text-yellow-400 font-bold text-[10px] sm:text-[12px] uppercase tracking-widest mb-1">Coins Earned</p>
          <p className="text-5xl sm:text-6xl font-black text-yellow-300 flex items-center gap-1 sm:gap-2 leading-none">
            <Coins className="w-7 h-7 sm:w-9 sm:h-9" /> +{earnedCoins}
          </p>
          <div className="mt-2 text-yellow-400/50 font-bold text-[8px] sm:text-[10px] uppercase">
            Diff Bonus: x{diffMultiplier}
          </div>
        </div>
      </div>
      
      <button 
        onClick={onMainMenuClick} 
        onMouseEnter={onHover} 
        className="bg-white text-slate-800 px-8 py-3 rounded-full font-black text-lg sm:text-xl shadow-lg border-2 border-white hover:scale-105 transition-all cursor-pointer"
      >
        Main Menu
      </button>
    </motion.div>
  )
}