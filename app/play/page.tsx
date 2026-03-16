'use client'
import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Heart, Trophy, Coins, Skull, Zap, Gauge } from 'lucide-react'
import { useSFX } from '@/hook/useSFX'

const DEFAULT_BIRD_ID = 'e114c607-b017-4ea6-a306-8e5c0808092a'
const GRAVITY = 0.5;
const JUMP_STRENGTH = -7;
const IFRAME_DURATION = 1500;

type Difficulty = 'easy' | 'normal' | 'hard';
type ObstacleType = 'pipe-top' | 'pipe-bottom' | 'cloud' | 'enemy-bird' | 'stalactite' | 'frog' | 'pendulum' | 'rocket';
interface Obstacle {
  id: number; type: ObstacleType;
  x: number; y: number;
  width: number; height: number;
  speedModX: number; speedModY: number;
  baseY?: number; 
}

export default function GamePlayPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [playerBird, setPlayerBird] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [windowWidth, setWindowWidth] = useState(0)
  const [windowHeight, setWindowHeight] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const { playHover, playClick, playBack, playHit, playJump} = useSFX()

  // 🎮 Game States
  const [gameState, setGameState] = useState<'menu' | 'ready' | 'playing' | 'gameover'>('menu')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [birdPosition, setBirdPosition] = useState(300)
  const [velocity, setVelocity] = useState(0)
  const [hearts, setHearts] = useState(3)
  const [isInvincible, setIsInvincible] = useState(false)
  const [obstacles, setObstacles] = useState<Obstacle[]>([])
  
  // 🏆 Score States
  const [score, setScore] = useState(0)
  const [highScores, setHighScores] = useState({ easy: 0, normal: 0, hard: 0 })
  const [earnedCoins, setEarnedCoins] = useState(0)

  const requestRef = useRef<number>(null);
  const invincibleRef = useRef(false);
  const spawnTimerRef = useRef(0);
  const obstacleIdCounter = useRef(0);
  const scoreRef = useRef(0);

  // ✅ Audio Refs สำหรับ BGM และ Game Over
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const gameOverSfxRef = useRef<HTMLAudioElement | null>(null);

  const diffSettings = {
    easy: { speed: 5, spawnMin: 80, spawnMax: 130, types: ['pipe-top', 'pipe-bottom', 'cloud', 'enemy-bird'] as ObstacleType[] },
    normal: { speed: 7, spawnMin: 50, spawnMax: 90, types: ['pipe-top', 'pipe-bottom', 'cloud', 'enemy-bird', 'stalactite', 'frog'] as ObstacleType[] },
    hard: { speed: 10, spawnMin: 30, spawnMax: 60, types: ['pipe-top', 'pipe-bottom', 'cloud', 'enemy-bird', 'stalactite', 'frog', 'pendulum', 'rocket'] as ObstacleType[] }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2500)
    return () => clearTimeout(timer)
  }, [])

  // ✅ ปิดเพลง BGM ทันทีถ้าผู้เล่นกดปิดหน้าเว็บหรือย้อนกลับ
  useEffect(() => {
    return () => {
      if (bgmRef.current) bgmRef.current.pause();
    }
  }, [])

  useEffect(() => {
    setWindowWidth(window.innerWidth)
    setWindowHeight(window.innerHeight)
    const initGame = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      let targetBirdId = DEFAULT_BIRD_ID
      if (session?.user) {
        setCurrentUser(session.user)
        const { data: userData } = await supabase.from('users').select('equipped_bird, high_score, high_score_normal, high_score_hard').eq('user_id', session.user.id).single()
        if (userData) {
          if (userData.equipped_bird) targetBirdId = userData.equipped_bird
          setHighScores({
            easy: userData.high_score || 0,
            normal: userData.high_score_normal || 0,
            hard: userData.high_score_hard || 0
          })
        }
      }
      const { data: birdData } = await supabase.from('characters').select('*').eq('character_id', targetBirdId).maybeSingle()
      if (birdData) setPlayerBird(birdData)

      // ✅ ดึงข้อมูล URL เสียงจาก Database
      const { data: soundData } = await supabase
        .from('sounds')
        .select('action_trigger, file_url')
        .in('action_trigger', ['bgm_default_gameplay', 'sfx_gameover'])
        .eq('is_active', true)
        .eq('is_deleted', false);

      if (soundData) {
        const bgmUrl = soundData.find(s => s.action_trigger === 'bgm_default_gameplay')?.file_url;
        const goUrl = soundData.find(s => s.action_trigger === 'sfx_gameover')?.file_url;
        
        // ✅ เตรียมดึงค่าเสียงรอไว้เลย
        const savedBgm = localStorage.getItem('goofy_bgm_volume');
        const savedSfx = localStorage.getItem('goofy_sfx_volume');
        const bgmMultiplier = savedBgm !== null ? Number(savedBgm) / 100 : 1;
        const sfxMultiplier = savedSfx !== null ? Number(savedSfx) / 100 : 1;

        if (bgmUrl) {
          bgmRef.current = new Audio(bgmUrl);
          bgmRef.current.loop = true;
          // ✅ คูณเสียง BGM เกมเพลย์
          bgmRef.current.volume = Math.min(0.4 * bgmMultiplier, 1.0); 
        }
        if (goUrl) {
          gameOverSfxRef.current = new Audio(goUrl);
          // ✅ คูณเสียงตอน Game Over
          gameOverSfxRef.current.volume = Math.min(0.8 * sfxMultiplier, 1.0);
        }
      }

      setLoading(false)
    }
    initGame()
  }, [])

  const handleGameOver = async () => {
    setGameState('gameover');
    const finalScore = scoreRef.current;
    
    // ✅ หยุดเพลง BGM และเล่นเสียง Game Over
    if (bgmRef.current) bgmRef.current.pause();
    if (gameOverSfxRef.current) {
      gameOverSfxRef.current.currentTime = 0;
      gameOverSfxRef.current.play().catch(e => console.log('SFX block:', e));
    }

    let multiplier = difficulty === 'hard' ? 2 : (difficulty === 'normal' ? 1.5 : 1);
    const coinsReward = Math.floor((finalScore / 10) * multiplier);
    setEarnedCoins(coinsReward);

    if (currentUser) {
      const { data: userData } = await supabase.from('users').select('user_point').eq('user_id', currentUser.id).single();
      const currentCoins = userData?.user_point || 0;
      const updatePayload: any = { user_point: currentCoins + coinsReward };
      
      const currentHighScore = highScores[difficulty];
      if (finalScore > currentHighScore) {
         setHighScores(prev => ({ ...prev, [difficulty]: finalScore }));
         const columnToUpdate = difficulty === 'easy' ? 'high_score' : (difficulty === 'normal' ? 'high_score_normal' : 'high_score_hard');
         updatePayload[columnToUpdate] = finalScore;
      }
      
      await supabase.from('users').update(updatePayload).eq('user_id', currentUser.id);
    }
  };

  const takeDamage = () => {
    if (invincibleRef.current) return;
    playHit();
    invincibleRef.current = true;
    setIsInvincible(true);
    setHearts((prev) => {
      const newHearts = prev - 1;
      if (newHearts <= 0) handleGameOver();
      return newHearts;
    });
    setTimeout(() => {
      invincibleRef.current = false;
      setIsInvincible(false);
    }, IFRAME_DURATION);
  };

  const startGame = (selectedDiff: Difficulty) => {
    setDifficulty(selectedDiff);
    setGameState('ready');
    setBirdPosition(windowHeight / 2);
    setHearts(3);
    setScore(0);
    scoreRef.current = 0;
    setObstacles([]);
    setVelocity(0);

    // ✅ เริ่มเล่นเพลง BGM ตอนกดเลือกระดับความยาก
    if (bgmRef.current) {
      bgmRef.current.currentTime = 0; // เผื่อเล่นรอบสอง จะได้เริ่มเพลงใหม่
      bgmRef.current.play().catch(e => console.log('Autoplay block:', e));
    }
  }

  // ✅ วาง useEffect ตัวนี้ไว้ใต้ๆ บรรทัดประกาศ bgmRef ก็ได้ครับ
  useEffect(() => {
    const updatePlayVolume = () => {
      if (bgmRef.current) {
        const savedBgm = localStorage.getItem('goofy_bgm_volume');
        const bgmMultiplier = savedBgm !== null ? Number(savedBgm) / 100 : 1;
        bgmRef.current.volume = Math.min(0.4 * bgmMultiplier, 1.0);
      }
    };
    window.addEventListener('volumeChange', updatePlayVolume);
    return () => window.removeEventListener('volumeChange', updatePlayVolume);
  }, []);

  const jump = () => {
    if (gameState === 'menu' || gameState === 'gameover') return;
    if (gameState === 'ready') setGameState('playing');
    playJump();
    setVelocity(JUMP_STRENGTH);
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.code === 'Space') jump() }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameState])

  // 🌀 Game Loop
  useEffect(() => {
    if (gameState === 'playing' && hearts > 0) {
      const config = diffSettings[difficulty];

      const update = () => {
        scoreRef.current += 1;
        setScore(scoreRef.current);

        setBirdPosition((pos) => {
          const newPos = pos + velocity
          if (newPos < 0 || newPos > windowHeight - 80) {
            takeDamage();
            return newPos < 0 ? 5 : windowHeight - 85;
          }
          return newPos
        })
        setVelocity((v) => v + GRAVITY)

        setObstacles((prevObstacles) => {
          const birdX = windowWidth * 0.2;
          const birdY = birdPosition;
          const birdSize = 35;

          const movedObstacles = prevObstacles.map(obs => {
            let newX = obs.x - (config.speed + obs.speedModX);
            let newY = obs.y + obs.speedModY;

            if (obs.type === 'frog' && obs.baseY) {
              newY = obs.baseY - Math.abs(Math.sin(newX / 60)) * 180;
            }
            if (obs.type === 'pendulum' && obs.baseY) {
              newY = obs.baseY + Math.sin(newX / 80) * 150;
            }

            return { ...obs, x: newX, y: newY };
          }).filter(obs => obs.x + obs.width > -100);

          if (!invincibleRef.current) {
            for (let obs of movedObstacles) {
              if (birdX < obs.x + obs.width && birdX + birdSize > obs.x && birdY < obs.y + obs.height && birdY + birdSize > obs.y) {
                takeDamage(); break; 
              }
            }
          }
          return movedObstacles;
        });

        spawnTimerRef.current -= 1;
        if (spawnTimerRef.current <= 0) {
          spawnObstacle(config);
          spawnTimerRef.current = Math.floor(Math.random() * (config.spawnMax - config.spawnMin)) + config.spawnMin; 
        }

        requestRef.current = requestAnimationFrame(update)
      }
      requestRef.current = requestAnimationFrame(update)
      return () => cancelAnimationFrame(requestRef.current!)
    }
  }, [gameState, velocity, hearts, birdPosition])

  const spawnObstacle = (config: any) => {
    const randomType = config.types[Math.floor(Math.random() * config.types.length)];
    let obs: Obstacle = { id: obstacleIdCounter.current++, type: randomType, x: windowWidth, y: 0, width: 80, height: 0, speedModX: 0, speedModY: 0 };

    if (randomType === 'pipe-top') {
      obs.height = Math.floor(Math.random() * (windowHeight / 2)) + 50;
      obs.y = 0;
    } else if (randomType === 'pipe-bottom') {
      obs.height = Math.floor(Math.random() * (windowHeight / 2)) + 50;
      obs.y = windowHeight - obs.height;
    } else if (randomType === 'cloud') {
      obs.width = 120; obs.height = 60;
      obs.y = Math.floor(Math.random() * (windowHeight - 200)) + 50;
      obs.speedModX = -2;
    } else if (randomType === 'enemy-bird') {
      obs.width = 60; obs.height = 50;
      obs.y = Math.floor(Math.random() * (windowHeight - 150)) + 50;
      obs.speedModX = 4;
    } else if (randomType === 'stalactite') {
      obs.width = 40; obs.height = 100;
      obs.y = -20;
      obs.speedModY = 3;
    } else if (randomType === 'frog') {
      obs.width = 50; obs.height = 50;
      obs.baseY = windowHeight - 80;
      obs.y = obs.baseY;
      obs.speedModX = -1;
    } else if (randomType === 'pendulum') {
      obs.width = 70; obs.height = 70;
      obs.baseY = windowHeight / 2;
      obs.y = obs.baseY;
      obs.speedModX = 0;
    } else if (randomType === 'rocket') {
      obs.width = 90; obs.height = 40;
      obs.y = birdPosition;
      obs.speedModX = 8;
    }
    
    setObstacles(prev => [...prev, obs]);
  }

  if (loading || windowWidth === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] w-screen h-screen overflow-hidden bg-[#D0F4FF] select-none m-0 p-0" onClick={jump}>
      
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
            <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-widest animate-pulse [text-shadow:-3px_-3px_0_#000,3px_-3px_0_#000,-3px_3px_0_#000,3px_3px_0_#000]">
              Loading Game...
            </h2>
            <p className="mt-4 text-white/80 font-bold uppercase tracking-widest text-sm md:text-base">
              Preparing your bird for flight
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 z-0 flex w-[200vw] pointer-events-none">
        <motion.div className="h-full w-[100vw] bg-cover bg-bottom bg-no-repeat" style={{ backgroundImage: "url('/background_goofy_bird.png')" }} animate={gameState === 'playing' ? { x: [0, -windowWidth] } : {}} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} />
        <motion.div className="h-full w-[100vw] bg-cover bg-bottom bg-no-repeat -ml-[1px]" style={{ backgroundImage: "url('/background_goofy_bird.png')" }} animate={gameState === 'playing' ? { x: [0, -windowWidth] } : {}} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} />
      </div>

      {obstacles.map(obs => (
        <div key={obs.id} className="absolute z-10" style={{ left: obs.x, top: obs.y, width: obs.width, height: obs.height }}>
          {obs.type === 'pipe-top' && <div className="w-full h-full bg-green-500 border-[6px] border-green-700 rounded-b-2xl"><div className="absolute bottom-0 w-[110%] -ml-[5%] h-8 bg-green-400 border-[6px] border-green-700 rounded-xl"></div></div>}
          {obs.type === 'pipe-bottom' && <div className="w-full h-full bg-green-500 border-[6px] border-green-700 rounded-t-2xl"><div className="absolute top-0 w-[110%] -ml-[5%] h-8 bg-green-400 border-[6px] border-green-700 rounded-xl"></div></div>}
          {obs.type === 'cloud' && <div className="text-7xl opacity-90">☁️</div>}
          {obs.type === 'enemy-bird' && <div className="text-5xl scale-x-[-1]">🦅</div>}
          {obs.type === 'stalactite' && <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-t-[100px] border-transparent border-t-slate-700 drop-shadow-md"></div>}
          {obs.type === 'frog' && <div className="text-5xl scale-x-[-1] drop-shadow-lg">🐸</div>}
          {obs.type === 'pendulum' && <div className="w-full h-full bg-slate-800 rounded-full border-4 border-slate-500 shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center"><div className="w-1/2 h-1/2 bg-red-500 rounded-full animate-pulse"></div></div>}
          {obs.type === 'rocket' && <div className="text-6xl scale-x-[-1] drop-shadow-xl">🚀</div>}
        </div>
      ))}

      {(gameState === 'playing' || gameState === 'gameover') && (
        <div className="absolute top-10 w-full text-center z-50 pointer-events-none flex flex-col items-center">
          <h2 className="text-6xl md:text-8xl font-black text-white drop-shadow-[0_5px_0_rgba(0,0,0,0.3)] tracking-tighter" style={{ WebkitTextStroke: '2px #35A7FF' }}>{score}</h2>
        </div>
      )}

      {(gameState === 'ready' || gameState === 'playing' || gameState === 'gameover') && (
        <div className="absolute top-8 right-8 z-50 flex gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i}>
              <Heart className={`transition-all duration-300 ${i < hearts ? 'text-red-500 fill-red-500 scale-100' : 'text-gray-300 fill-transparent scale-50 opacity-0'}`} size={35} />
            </div>
          ))}
        </div>
      )}

      {(gameState === 'ready' || gameState === 'playing' || gameState === 'gameover') && (
        <div className={`absolute z-20 ${isInvincible ? 'animate-flicker' : ''}`} style={{ left: windowWidth * 0.2, top: birdPosition }}>
          <div className="w-16 h-16 md:w-20 md:h-20 transition-transform duration-75" style={{ transform: `rotate(${velocity * 3}deg)` }}>
            <img src={playerBird?.image_url} alt="Bird" className="w-full h-full object-contain drop-shadow-2xl" />
          </div>
        </div>
      )}

      <AnimatePresence>
        {gameState === 'menu' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center z-40 inset-0 bg-black/70">
            <h1 className="text-7xl font-black text-white italic drop-shadow-2xl uppercase tracking-tighter mb-8 text-center">SELECT DIFFICULTY</h1>
            <div className="flex flex-col md:flex-row gap-4">
              <button onClick={(e) => { e.stopPropagation(); startGame('easy'); playClick(); }} onMouseEnter={playHover}
              className="bg-green-400 hover:bg-green-500 text-green-900 px-8 py-4 rounded-3xl font-black text-2xl uppercase shadow-[0_6px_0_#15803D] hover:translate-y-1 hover:shadow-[0_2px_0_#15803D] transition-all border-4 border-white flex items-center gap-2 cursor-pointer"><Zap /> EASY</button>
              <button onClick={(e) => { e.stopPropagation(); startGame('normal'); playClick(); }} onMouseEnter={playHover} className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-8 py-4 rounded-3xl font-black text-2xl uppercase shadow-[0_6px_0_#A16207] hover:translate-y-1 hover:shadow-[0_2px_0_#A16207] transition-all border-4 border-white flex items-center gap-2 cursor-pointer"><Gauge /> NORMAL</button>
              <button onClick={(e) => { e.stopPropagation(); startGame('hard'); playClick(); }} onMouseEnter={playHover} className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-3xl font-black text-2xl uppercase shadow-[0_6px_0_#991B1B] hover:translate-y-1 hover:shadow-[0_2px_0_#991B1B] transition-all border-4 border-white flex items-center gap-2 cursor-pointer"><Skull /> HARD</button>
            </div>
          </motion.div>
        )}

        {gameState === 'ready' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/10">
            <p className="text-white text-3xl font-black uppercase tracking-[0.3em] animate-pulse drop-shadow-lg bg-[#35A7FF] px-8 py-3 rounded-full border-4 border-white shadow-[0_6px_0_#288DE0]">
              TAP TO START
            </p>
          </div>
        )}

        {gameState === 'gameover' && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/70">
            <h1 className="text-7xl font-black text-white italic drop-shadow-2xl uppercase tracking-tighter mb-6 text-center text-red-500">GAME OVER</h1>
            <div className="flex gap-4 mb-8">
               <div className="bg-slate-800/80 px-8 py-6 rounded-3xl border-2 border-slate-600 text-center flex flex-col items-center shadow-xl">
                 <p className="text-slate-400 font-bold text-[12px] uppercase tracking-widest mb-1">Score</p>
                 <p className="text-6xl font-black text-white leading-none">{score}</p>
                 <div className="mt-2 text-yellow-400 font-bold text-xs"><Trophy size={12} className="inline mr-1"/> BEST: {highScores[difficulty] }</div>
               </div>
               <div className="bg-yellow-900/80 px-8 py-6 rounded-3xl border-2 border-yellow-700 text-center flex flex-col items-center shadow-xl">
                 <p className="text-yellow-400 font-bold text-[12px] uppercase tracking-widest mb-1">Coins Earned</p>
                 <p className="text-6xl font-black text-yellow-300 flex items-center gap-2 leading-none"><Coins size={36} /> +{earnedCoins}</p>
                 <div className="mt-2 text-yellow-400/50 font-bold text-[10px] uppercase">Diff Bonus: x{difficulty === 'hard' ? 2 : (difficulty === 'normal' ? 1.5 : 1)}</div>
               </div>
             </div>
             <button onClick={(e) => { e.stopPropagation(); setGameState('menu'); }} className="bg-white text-slate-800 px-8 py-3 rounded-full font-black text-xl shadow-lg border-2 border-white hover:scale-105 transition-all cursor-pointer">Retry again</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-8 left-8 z-50">
        <button onClick={(e) => { 
          e.stopPropagation(); 
          playClick(); 
          if (bgmRef.current) bgmRef.current.pause(); // ✅ กดออกปุ๊บ ปิดเพลงทันที
          router.push('/'); 
        }} 
        onMouseEnter={playHover} className="bg-white/80 px-6 py-2 rounded-full font-black text-red-500 border-2 border-red-100 uppercase text-xs tracking-widest hover:bg-white transition-colors cursor-pointer">Exit</button>
      </div>
      <style jsx>{`@keyframes flicker { 0%, 100% { opacity: 1; } 50% { opacity: 0; } } .animate-flicker { animation: flicker 0.1s infinite; }`}</style>
    </div>
  )
}