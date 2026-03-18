import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface LoadingScreenProps {
  isLoading: boolean
}

export default function LoadingScreen({ isLoading }: LoadingScreenProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8 } }}
          className="absolute inset-0 z-[9999] bg-[#8EC5FC] flex flex-col items-center justify-center select-none"
        >
          <motion.div
            animate={{ y: [0, -30, 0] }}
            transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut" }}
            className="text-7xl md:text-9xl mb-6 drop-shadow-2xl"
          >
            🐦
          </motion.div>
          <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-widest animate-pulse [text-shadow:-3px_-3px_0_#000,3px_-3px_0_#000,-3px_3px_0_#000,3px_3px_0_#000] text-center px-4">
            Loading Game...
          </h2>
          <p className="mt-4 text-white/80 font-bold uppercase tracking-widest text-xs sm:text-sm md:text-base text-center">
            Preparing your bird for flight
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}