import React from 'react';
import { Coins, Clock } from 'lucide-react';

interface MultiGameOverModalProps {
  earnedCoins: number;
  currentUser: any;
  ghostBirds: Record<string, any>;
  multiPlayerDecisions: Record<string, 'ready' | 'menu'>;
  multiRestartReady: boolean;
  multiGameOverCountdown: number;
  onDecision: (decision: 'ready' | 'menu', e?: React.MouseEvent) => void;
}

export default function MultiGameOverModal({
  earnedCoins, currentUser, ghostBirds, multiPlayerDecisions, multiRestartReady, multiGameOverCountdown, onDecision
}: MultiGameOverModalProps) {
  return (
    <div className="absolute inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 ">
      <div className="bg-white p-6 sm:p-8 rounded-[2em] max-w-sm w-full text-center border-4 border-[#35A7FF] shadow-2xl">
        <h2 className="text-3xl sm:text-4xl font-black text-slate-800 mb-1 uppercase italic tracking-tighter">All Dead!</h2>
        <p className="text-slate-500 font-bold mb-4 text-xs sm:text-sm uppercase tracking-widest">Match Finished</p>
        
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4 mb-6">
          <p className="text-slate-500 font-bold text-xs uppercase mb-1">You Earned</p>
          <div className="flex items-center justify-center gap-2 text-yellow-500 font-black text-3xl">
            <Coins size={28} /> +{earnedCoins}
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 mb-6 space-y-2 border-2 border-slate-100 text-sm">
          <div className="flex justify-between items-center font-bold">
            <span className="text-slate-600">You ({currentUser?.username})</span>
            <span className={multiRestartReady ? "text-green-500" : "text-slate-400"}>
              {multiRestartReady ? 'READY' : 'WAITING...'}
            </span>
          </div>
          {Object.values(ghostBirds).map((ghost: any) => {
            const decision = multiPlayerDecisions[ghost.userId]
            return (
              <div key={ghost.userId} className="flex justify-between items-center font-bold">
                <span className="text-slate-500">{ghost.username}</span>
                <span className={decision === 'ready' ? "text-green-500" : decision === 'menu' ? "text-red-500" : "text-slate-400"}>
                  {decision === 'ready' ? 'READY' : decision === 'menu' ? 'LEFT' : 'WAITING...'}
                </span>
              </div>
            )
          })}
        </div>
        
        <div className="flex items-center justify-center gap-2 text-[#FF5F5F] font-black text-xl mb-4">
          <Clock size={20} /> Restarting in {multiGameOverCountdown}
        </div>

        <div className="flex gap-3 sm:gap-4">
          <button 
            onClick={() => onDecision('menu')} 
            className="flex-1 bg-slate-100 text-slate-500 py-3 sm:py-4 rounded-xl font-black uppercase text-xs sm:text-sm hover:bg-slate-200 border-2 border-slate-200 transition-all active:scale-95"
          >
            Menu
          </button>
          <button 
            onClick={(e) => onDecision('ready', e)} 
            disabled={multiRestartReady} 
            className={`flex-1 py-3 sm:py-4 rounded-xl font-black uppercase text-xs sm:text-sm shadow-[0_4px_0_rgba(0,0,0,0.2)] transition-all active:translate-y-1 active:shadow-none ${multiRestartReady ? 'bg-green-500 text-white shadow-none translate-y-1' : 'bg-[#FFD151] text-white hover:bg-[#FABC05]'}`}
          >
            {multiRestartReady ? 'Ready!' : 'Play Again'}
          </button>
        </div>
      </div>
    </div>
  );
}