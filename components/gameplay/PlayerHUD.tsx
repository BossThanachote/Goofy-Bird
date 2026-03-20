import React from 'react';
import { Heart, Eye } from 'lucide-react';

interface PlayerHUDProps {
  score: number;
  hearts: number;
  gameState: string;
}

export default function PlayerHUD({ score, hearts, gameState }: PlayerHUDProps) {
  // เช็คเงื่อนไขว่าตอนไหนควรโชว์คะแนน / ตอนไหนควรโชว์หัวใจ
  const showScore = ['playing', 'spectating', 'gameover', 'multi_gameover'].includes(gameState);
  const showHearts = ['ready', 'playing', 'countdown'].includes(gameState);

  return (
    <>
      {/* 🏆 โซนคะแนนและป้ายคนดู */}
      {showScore && (
        <div className="absolute top-10 w-full text-center z-50 pointer-events-none flex flex-col items-center">
          <h2 className="text-6xl md:text-8xl font-black text-white drop-shadow-[0_5px_0_rgba(0,0,0,0.3)] tracking-tighter" style={{ WebkitTextStroke: '2px #35A7FF' }}>
            {score}
          </h2>
          {gameState === 'spectating' && (
            <div className="bg-black/50 text-white px-4 py-2 rounded-full mt-2 font-bold uppercase text-sm flex items-center gap-2">  
              <Eye size={18}/> Spectating
            </div>
          )}
        </div>
      )}

      {/* ❤️ โซนหัวใจ 3 ดวง */}
      {showHearts && (
        <div className="absolute top-8 right-4 sm:right-8 z-50 flex gap-1 sm:gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i}>
              <Heart 
                className={`transition-all duration-300 sm:w-[35px] sm:h-[35px] w-[28px] h-[28px] ${i < hearts ? 'text-red-500 fill-red-500 scale-100' : 'text-gray-300 fill-transparent scale-50 opacity-0'}`} 
                size={30} 
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}