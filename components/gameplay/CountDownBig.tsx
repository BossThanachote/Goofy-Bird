import React from 'react';
import { motion } from 'framer-motion';

interface CountdownBigProps {
  timer: number;
}

export default function CountdownBig({ timer }: CountdownBigProps) {
  return (
    <motion.div 
      initial={{ scale: 0.5, opacity: 0 }} 
      animate={{ scale: 1, opacity: 1 }} 
      exit={{ scale: 1.5, opacity: 0 }} 
      className="absolute inset-0 z-[120] flex items-center justify-center pointer-events-none"
    >
      <h1 className="text-[150px] md:text-[200px] font-black text-white drop-shadow-[0_10px_0_#35A7FF] italic">
        {timer}
      </h1>
    </motion.div>
  );
}