import React from 'react'
import { motion } from 'framer-motion'

interface ReadyModalProps {
  mapName?: string
}

export default function ReadyModal({ mapName }: ReadyModalProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/10 px-4">
      <h2 className="text-white text-3xl sm:text-5xl font-black uppercase tracking-widest drop-shadow-lg mb-8 italic">
        {mapName || 'GOOFY BIRD'}
      </h2>
      <p className="text-white text-xl sm:text-3xl font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] animate-pulse drop-shadow-lg bg-[#35A7FF] px-6 sm:px-8 py-3 rounded-full border-4 border-white shadow-[0_4px_0_#288DE0] text-center w-[90%] sm:w-auto">
        TAP TO START
      </p>
    </div>
  )
}