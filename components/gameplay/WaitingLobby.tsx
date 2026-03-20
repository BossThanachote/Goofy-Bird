import React from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

interface WaitingLobbyProps {
  ghostBirds: Record<string, any>;
  currentUser: any;
  amIHost: boolean;
  onStartGame: (e: React.MouseEvent) => void;
}

export default function WaitingLobby({ ghostBirds, currentUser, amIHost, onStartGame }: WaitingLobbyProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/60 px-4 ">
      <h2 className="text-white text-3xl md:text-5xl font-black uppercase tracking-widest drop-shadow-lg mb-4 text-center">
        Waiting for Players
      </h2>
      <div className="bg-white/10 p-6 rounded-2xl border-2 border-white/20 mb-8 flex flex-col items-center min-w-[300px]">
        <p className="text-[#35A7FF] font-black text-xl mb-4 flex items-center gap-2">
          <Users size={24}/> Players in Room: {Object.keys(ghostBirds).length + 1}
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
            <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
              You: {currentUser?.username}
            </span>
            {Object.values(ghostBirds).map((ghost: any) => (
              <span key={ghost.userId} className="bg-slate-700 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                {ghost.username}
              </span>
            ))}
        </div>
      </div>
      {amIHost ? (
        <button 
          onClick={onStartGame}
          className="bg-yellow-400 text-yellow-900 px-10 py-4 rounded-full font-black text-2xl uppercase tracking-widest shadow-[0_6px_0_#A16207] hover:translate-y-1 hover:shadow-[0_2px_0_#A16207] transition-all"
        >
          Start Game
        </button>
      ) : (
        <p className="text-white text-xl font-bold animate-pulse">Waiting for Host to start...</p>
      )}
    </motion.div>
  );
}