'use client'
import React, { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Heart, Trophy, Coins, Skull, Zap, Gauge, Eye } from 'lucide-react'
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
  scale: number; // ✅ เก็บค่า Scale ของอุปสรรคแต่ละตัวไว้
}

function PlayEngine() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode') || 'single'
  const mapId = searchParams.get('mapId')
  const diffParam = searchParams.get('diff') as Difficulty || 'normal'
  const roomId = searchParams.get('roomId')

  const { playHover, playClick, playBack, playHit, playJump } = useSFX()

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [playerBird, setPlayerBird] = useState<any>(null)
  const [currentMap, setCurrentMap] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // ✅ ใช้ Window State แบบ Real-time
  const [windowWidth, setWindowWidth] = useState(0)
  const [windowHeight, setWindowHeight] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const [gameState, setGameState] = useState<'ready' | 'playing' | 'spectating' | 'gameover'>('ready')
  const [difficulty, setDifficulty] = useState<Difficulty>(diffParam)
  const [birdPosition, setBirdPosition] = useState(300)
  const [velocity, setVelocity] = useState(0)
  const [hearts, setHearts] = useState(3)
  const [isInvincible, setIsInvincible] = useState(false)
  const [obstacles, setObstacles] = useState<Obstacle[]>([])
  
  const [score, setScore] = useState(0)
  const [highScores, setHighScores] = useState({ easy: 0, normal: 0, hard: 0 })
  const [earnedCoins, setEarnedCoins] = useState(0)

  const [amIHost, setAmIHost] = useState(false)
  const [ghostBirds, setGhostBirds] = useState<Record<string, any>>({}) 
  const [playersStatus, setPlayersStatus] = useState<any[]>([])

  const requestRef = useRef<number>(null);
  const invincibleRef = useRef(false);
  const spawnTimerRef = useRef(0);
  const obstacleIdCounter = useRef(0);
  const scoreRef = useRef(0);
  const channelRef = useRef<any>(null);
  const myYRef = useRef(300);

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

  // ✅ ระบบตรวจจับขนาดหน้าจอแบบ Real-time
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    handleResize(); // เรียกครั้งแรกตอนโหลด
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const initGame = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      let targetBirdId = DEFAULT_BIRD_ID
      
      if (session?.user) {
        setCurrentUser(session.user)
        const { data: userData } = await supabase.from('users').select('username, equipped_bird, high_score, high_score_normal, high_score_hard').eq('user_id', session.user.id).single()
        if (userData) {
          if (userData.equipped_bird) targetBirdId = userData.equipped_bird
          setHighScores({
            easy: userData.high_score || 0,
            normal: userData.high_score_normal || 0,
            hard: userData.high_score_hard || 0
          })
          setCurrentUser((prev: any) => ({ ...prev, ...userData }))
        }
      }
      const { data: birdData } = await supabase.from('characters').select('*').eq('character_id', targetBirdId).maybeSingle()
      if (birdData) setPlayerBird(birdData)

      let mapData = null
      if (mapId) {
        const { data } = await supabase.from('maps').select('*').eq('id', mapId).single()
        mapData = data
        setCurrentMap(data)
      }

      const bgmTrigger = mapData?.bgm_trigger || 'bgm_default_gameplay'
      const { data: soundData } = await supabase
        .from('sounds')
        .select('action_trigger, file_url, base_volume')
        .in('action_trigger', [bgmTrigger, 'sfx_gameover'])
        .eq('is_active', true)
        .eq('is_deleted', false);

      if (soundData) {
        const bgmSound = soundData.find(s => s.action_trigger === bgmTrigger);
        const goSound = soundData.find(s => s.action_trigger === 'sfx_gameover');
        
        const savedBgm = localStorage.getItem('goofy_bgm_volume');
        const savedSfx = localStorage.getItem('goofy_sfx_volume');
        const bgmMultiplier = savedBgm !== null ? Number(savedBgm) / 100 : 1;
        const sfxMultiplier = savedSfx !== null ? Number(savedSfx) / 100 : 1;

        if (bgmSound?.file_url) {
          bgmRef.current = new Audio(bgmSound.file_url);
          bgmRef.current.loop = true;
          bgmRef.current.volume = Math.min((bgmSound.base_volume ?? 1.0) * 0.4 * bgmMultiplier, 1.0); 
        }
        if (goSound?.file_url) {
          gameOverSfxRef.current = new Audio(goSound.file_url);
          gameOverSfxRef.current.volume = Math.min((goSound.base_volume ?? 1.0) * 0.8 * sfxMultiplier, 1.0);
        }
      }

      if (mode === 'multi' && roomId && session?.user) {
        const { data: room } = await supabase.from('rooms').select('*').eq('id', roomId).single()
        if (room) {
          setDifficulty(room.difficulty as Difficulty)
          setAmIHost(room.host_id === session.user.id)
          
          const channel = supabase.channel(`game_${roomId}`)
          channelRef.current = channel

          channel.on('broadcast', { event: 'ghost_update' }, ({ payload }) => {
            if (payload.userId !== session.user.id) {
              setGhostBirds(prev => ({ ...prev, [payload.userId]: payload }))
            }
          })
          .on('broadcast', { event: 'spawn_obstacle' }, ({ payload }) => {
            if (room.host_id !== session.user.id) {
               setObstacles(prev => [...prev, payload])
            }
          })
          .on('broadcast', { event: 'player_death' }, ({ payload }) => {
            setPlayersStatus(prev => [...prev, payload.userId])
          })
          .subscribe()

          setInterval(() => {
            if (channelRef.current && !invincibleRef.current) { 
               channelRef.current.send({
                 type: 'broadcast', event: 'ghost_update',
                 payload: { userId: session.user.id, y: myYRef.current, username: currentUser?.username || 'Player', birdUrl: birdData?.image_url }
               })
            }
          }, 50) 
        }
      }

      setBirdPosition(window.innerHeight / 2);
      setLoading(false)
    }
    initGame()

    return () => {
      if (bgmRef.current) bgmRef.current.pause();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    }
  }, [])

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

  const handleGameOver = async () => {
    if (mode === 'multi') {
      channelRef.current?.send({ type: 'broadcast', event: 'player_death', payload: { userId: currentUser?.id } })
      setGameState('spectating') 
      return
    }

    setGameState('gameover');
    const finalScore = scoreRef.current;
    
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
    if (invincibleRef.current || gameState === 'spectating' || gameState === 'gameover') return;
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

  const jump = () => {
    // ✅ บัค #1: บล็อคไม่ให้ขยับถ้ากำลัง Loading หน้าจออยู่
    if (isLoading || gameState === 'spectating' || gameState === 'gameover') return;
    
    if (gameState === 'ready') {
      setGameState('playing');
      if (bgmRef.current) bgmRef.current.play().catch(e => console.log('Autoplay block:', e));
    }
    
    playJump();
    setVelocity(JUMP_STRENGTH);
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.code === 'Space') jump() }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameState, isLoading]) // 👈 เพิ่ม isLoading ใน dependency

  // 🌀 Game Engine Loop
  useEffect(() => {
    if ((gameState === 'playing' || gameState === 'spectating') && hearts > 0) {
      const config = diffSettings[difficulty];

      const update = () => {
        if (gameState === 'playing') {
          scoreRef.current += 1;
          setScore(scoreRef.current);
        }

        // ✅ คำนวณ Scale หลักของเกม (จอเล็กย่อ จอใหญ่ขยาย)
        const uiScale = windowWidth < 768 ? 0.6 : (windowWidth < 1024 ? 0.8 : 1);
        
        // ✅ ปรับความเร็วเกมให้สัมพันธ์กับหน้าจอ (จอกว้างใช้เวลาวิ่งเท่ากับจอแคบ)
        const screenSpeedRatio = windowWidth / 1000;
        const currentSpeed = config.speed * screenSpeedRatio;

        if (gameState === 'playing') {
          setBirdPosition((pos) => {
            const newPos = pos + velocity
            myYRef.current = newPos 

            // 🌋 ระบบ Hazard พื้นลาวา (ปรับ Hitbox ตาม Scale)
            const lavaZone = 120 * uiScale;
            if (currentMap?.has_hazard && newPos > windowHeight - lavaZone) {
               takeDamage()
               return windowHeight - lavaZone
            }

            // ชนพื้นปกติ
            const bottomSafeZone = 80 * uiScale;
            if (newPos < 0 || newPos > windowHeight - bottomSafeZone) {
              takeDamage();
              return newPos < 0 ? 5 : windowHeight - (bottomSafeZone + 5);
            }
            return newPos
          })
          setVelocity((v) => v + GRAVITY)
        }

        setObstacles((prevObstacles) => {
          const birdX = windowWidth * 0.2;
          const birdY = birdPosition;
          
          // ✅ ปรับ Hitbox ของนกให้สมมาตรตามหน้าจอ
          const birdSize = windowWidth < 768 ? 40 : 55;

          const movedObstacles = prevObstacles.map(obs => {
            // ✅ ใช้ความเร็วแบบ Dynamic
            let newX = obs.x - (currentSpeed + (obs.speedModX * screenSpeedRatio));
            let newY = obs.y + (obs.speedModY * screenSpeedRatio);

            // ✅ บัค #2: คำนวณแกน Y ใหม่เสมอ เผื่อผู้เล่นขยายหน้าจอตอนกำลังเล่น (ป้องกันท่อลอยฟ้า)
            if (obs.type === 'pipe-bottom') {
              newY = windowHeight - obs.height;
            } else if (obs.type === 'frog' && obs.baseY !== undefined) {
              obs.baseY = windowHeight - (80 * obs.scale);
              newY = obs.baseY - Math.abs(Math.sin(newX / 60)) * (180 * obs.scale);
            } else if (obs.type === 'pendulum' && obs.baseY !== undefined) {
              obs.baseY = windowHeight / 2;
              newY = obs.baseY + Math.sin(newX / 80) * (150 * obs.scale);
            }

            return { ...obs, x: newX, y: newY };
          }).filter(obs => obs.x + obs.width > -100);

          if (gameState === 'playing' && !invincibleRef.current) {
            for (let obs of movedObstacles) {
              if (birdX < obs.x + obs.width && birdX + birdSize > obs.x && birdY < obs.y + obs.height && birdY + birdSize > obs.y) {
                takeDamage(); break; 
              }
            }
          }
          return movedObstacles;
        });

        if (mode === 'single' || amIHost) {
          spawnTimerRef.current -= 1;
          if (spawnTimerRef.current <= 0) {
            spawnObstacle(config, uiScale);
            spawnTimerRef.current = Math.floor(Math.random() * (config.spawnMax - config.spawnMin)) + config.spawnMin; 
          }
        }

        requestRef.current = requestAnimationFrame(update)
      }
      requestRef.current = requestAnimationFrame(update)
      return () => cancelAnimationFrame(requestRef.current!)
    }
  }, [gameState, velocity, hearts, birdPosition, currentMap, windowWidth, windowHeight])

  const spawnObstacle = (config: any, scale: number) => {
    const randomType = config.types[Math.floor(Math.random() * config.types.length)];
    
    // ✅ บัค #3: นำค่า Scale มาคูณกับขนาด Width และ Height ตอนสร้างอุปสรรค
    let obs: Obstacle = { 
      id: obstacleIdCounter.current++, type: randomType, 
      x: windowWidth, y: 0, 
      width: 80 * scale, height: 0, 
      speedModX: 0, speedModY: 0, scale: scale 
    };

    if (randomType === 'pipe-top') {
      obs.height = Math.floor(Math.random() * (windowHeight / 2)) + (50 * scale);
      obs.y = 0;
    } else if (randomType === 'pipe-bottom') {
      obs.height = Math.floor(Math.random() * (windowHeight / 2)) + (50 * scale);
      obs.y = windowHeight - obs.height;
    } else if (randomType === 'cloud') {
      obs.width = 120 * scale; obs.height = 60 * scale;
      obs.y = Math.floor(Math.random() * (windowHeight - (200 * scale))) + (50 * scale);
      obs.speedModX = -2;
    } else if (randomType === 'enemy-bird') {
      obs.width = 60 * scale; obs.height = 50 * scale;
      obs.y = Math.floor(Math.random() * (windowHeight - (150 * scale))) + (50 * scale);
      obs.speedModX = 4;
    } else if (randomType === 'stalactite') {
      obs.width = 40 * scale; obs.height = 100 * scale;
      obs.y = -20;
      obs.speedModY = 3;
    } else if (randomType === 'frog') {
      obs.width = 50 * scale; obs.height = 50 * scale;
      obs.baseY = windowHeight - (80 * scale);
      obs.y = obs.baseY;
      obs.speedModX = -1;
    } else if (randomType === 'pendulum') {
      obs.width = 70 * scale; obs.height = 70 * scale;
      obs.baseY = windowHeight / 2;
      obs.y = obs.baseY;
      obs.speedModX = 0;
    } else if (randomType === 'rocket') {
      obs.width = 90 * scale; obs.height = 40 * scale;
      obs.y = myYRef.current;
      obs.speedModX = 8;
    }
    
    setObstacles(prev => [...prev, obs]);

    if (mode === 'multi' && amIHost) {
      channelRef.current?.send({ type: 'broadcast', event: 'spawn_obstacle', payload: obs })
    }
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
            <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-widest animate-pulse [text-shadow:-3px_-3px_0_#000,3px_-3px_0_#000,-3px_3px_0_#000,3px_3px_0_#000] text-center px-4">
              Loading Game...
            </h2>
            <p className="mt-4 text-white/80 font-bold uppercase tracking-widest text-xs sm:text-sm md:text-base text-center">
              Preparing your bird for flight
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 z-0 flex w-[200vw] pointer-events-none">
        <motion.div className="h-full w-[100vw] bg-cover bg-bottom bg-no-repeat" style={{ backgroundImage: `url('${currentMap?.bg_url || '/background_goofy_bird.png'}')` }} animate={gameState === 'playing' || gameState === 'spectating' ? { x: [0, -windowWidth] } : {}} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} />
        <motion.div className="h-full w-[100vw] bg-cover bg-bottom bg-no-repeat -ml-[1px]" style={{ backgroundImage: `url('${currentMap?.bg_url || '/background_goofy_bird.png'}')` }} animate={gameState === 'playing' || gameState === 'spectating' ? { x: [0, -windowWidth] } : {}} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} />
      </div>

      {/* 🚧 วาดอุปสรรค (แก้ไขการสเกลให้สมบูรณ์) */}
      {obstacles.map(obs => (
        <div key={obs.id} className="absolute z-10 flex items-center justify-center" style={{ left: obs.x, top: obs.y, width: obs.width, height: obs.height }}>
          {obs.type === 'pipe-top' && <div className="w-full h-full bg-green-500 border-[4px] sm:border-[6px] border-green-700 rounded-b-xl sm:rounded-b-2xl"><div className="absolute bottom-0 w-[110%] -ml-[5%] h-6 sm:h-8 bg-green-400 border-[4px] sm:border-[6px] border-green-700 rounded-lg sm:rounded-xl"></div></div>}
          {obs.type === 'pipe-bottom' && <div className="w-full h-full bg-green-500 border-[4px] sm:border-[6px] border-green-700 rounded-t-xl sm:rounded-t-2xl"><div className="absolute top-0 w-[110%] -ml-[5%] h-6 sm:h-8 bg-green-400 border-[4px] sm:border-[6px] border-green-700 rounded-lg sm:rounded-xl"></div></div>}
          
          {/* ✅ อุปสรรคอื่นๆ แปลงเป็น Inline Font Size ให้ขยายตาม Scale */}
          {obs.type === 'cloud' && <div style={{ fontSize: `${60 * obs.scale}px` }} className="opacity-90 leading-none">☁️</div>}
          {obs.type === 'enemy-bird' && <div style={{ fontSize: `${50 * obs.scale}px` }} className="scale-x-[-1] leading-none">🦅</div>}
          {obs.type === 'stalactite' && <div style={{ borderWidth: `${obs.height}px ${obs.width/2}px 0 ${obs.width/2}px`, borderColor: '#334155 transparent transparent transparent', borderStyle: 'solid' }} className="w-0 h-0 drop-shadow-md"></div>}
          {obs.type === 'frog' && <div style={{ fontSize: `${50 * obs.scale}px` }} className="scale-x-[-1] drop-shadow-lg leading-none">🐸</div>}
          {obs.type === 'pendulum' && <div className="w-full h-full bg-slate-800 rounded-full border-2 sm:border-4 border-slate-500 shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center"><div className="w-1/2 h-1/2 bg-red-500 rounded-full animate-pulse"></div></div>}
          {obs.type === 'rocket' && <div style={{ fontSize: `${50 * obs.scale}px` }} className="scale-x-[-1] drop-shadow-xl leading-none">🚀</div>}
        </div>
      ))}

      {currentMap?.has_hazard && (
        <div className="absolute bottom-0 w-full h-12 bg-gradient-to-t from-red-600/80 to-transparent z-30 animate-pulse pointer-events-none" />
      )}

      {(gameState === 'playing' || gameState === 'spectating' || gameState === 'gameover') && (
        <div className="absolute top-10 w-full text-center z-50 pointer-events-none flex flex-col items-center">
          <h2 className="text-6xl md:text-8xl font-black text-white drop-shadow-[0_5px_0_rgba(0,0,0,0.3)] tracking-tighter" style={{ WebkitTextStroke: '2px #35A7FF' }}>{score}</h2>
          {gameState === 'spectating' && (
            <div className="bg-black/50 text-white px-4 py-2 rounded-full mt-2 font-bold uppercase text-sm flex items-center gap-2">  
              <Eye size={18}/> Spectating
            </div>
          )}
        </div>
      )}

      {(gameState === 'ready' || gameState === 'playing') && (
        <div className="absolute top-8 right-4 sm:right-8 z-50 flex gap-1 sm:gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i}>
              <Heart className={`transition-all duration-300 sm:w-[35px] sm:h-[35px] w-[28px] h-[28px] ${i < hearts ? 'text-red-500 fill-red-500 scale-100' : 'text-gray-300 fill-transparent scale-50 opacity-0'}`} size={30} />
            </div>
          ))}
        </div>
      )}

      {/* 🦅 นกผู้เล่น */}
      {gameState !== 'gameover' && gameState !== 'spectating' && (
        <div className={`absolute z-40 ${isInvincible ? 'animate-flicker' : ''}`} style={{ left: windowWidth * 0.2, top: birdPosition }}>
          <div className="w-16 h-16 md:w-20 md:h-20 transition-transform duration-75" style={{ transform: `rotate(${velocity * 3}deg)` }}>
            <img src={playerBird?.image_url} alt="Bird" className="w-full h-full object-contain drop-shadow-2xl" />
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/40 text-white text-[10px] px-2 rounded-full font-bold">YOU</div>
          </div>
        </div>
      )}

      {mode === 'multi' && Object.values(ghostBirds).map((ghost: any) => (
        <div key={ghost.userId} className="absolute z-20 opacity-40 transition-all duration-75 pointer-events-none" style={{ left: windowWidth * 0.2, top: ghost.y }}>
          <div className="w-16 h-16 md:w-20 md:h-20">
            <img src={ghost.birdUrl || 'https://placehold.co/100x100/png'} alt="Ghost" className="w-full h-full object-contain grayscale-[30%]" />
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#35A7FF]/80 text-white text-[10px] px-2 rounded-full font-bold whitespace-nowrap">{ghost.username}</div>
          </div>
        </div>
      ))}

      <AnimatePresence>
        {gameState === 'ready' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/10 px-4">
            <h2 className="text-white text-3xl sm:text-5xl font-black uppercase tracking-widest drop-shadow-lg mb-8 italic">{currentMap?.map_name || 'GOOFY BIRD'}</h2>
            <p className="text-white text-xl sm:text-3xl font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] animate-pulse drop-shadow-lg bg-[#35A7FF] px-6 sm:px-8 py-3 rounded-full border-4 border-white shadow-[0_4px_0_#288DE0] text-center w-[90%] sm:w-auto">
              TAP TO START
            </p>
          </div>
        )}

        {gameState === 'gameover' && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/70 px-4">
            <h1 className="text-5xl sm:text-7xl font-black text-white italic drop-shadow-2xl uppercase tracking-tighter mb-4 sm:mb-6 text-center text-red-500 leading-none">GAME OVER</h1>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8 w-full max-w-[300px] sm:max-w-none justify-center">
               <div className="flex-1 max-w-[200px] bg-slate-800/80 px-4 py-4 sm:px-8 sm:py-6 rounded-3xl border-2 border-slate-600 text-center flex flex-col items-center shadow-xl">
                 <p className="text-slate-400 font-bold text-[10px] sm:text-[12px] uppercase tracking-widest mb-1">Score</p>
                 <p className="text-5xl sm:text-6xl font-black text-white leading-none">{score}</p>
                 <div className="mt-2 text-yellow-400 font-bold text-[10px] sm:text-xs"><Trophy size={12} className="inline mr-1"/> BEST: {highScores[difficulty]}</div>
               </div>
               <div className="flex-1 max-w-[200px] bg-yellow-900/80 px-4 py-4 sm:px-8 sm:py-6 rounded-3xl border-2 border-yellow-700 text-center flex flex-col items-center shadow-xl">
                 <p className="text-yellow-400 font-bold text-[10px] sm:text-[12px] uppercase tracking-widest mb-1">Coins Earned</p>
                 <p className="text-5xl sm:text-6xl font-black text-yellow-300 flex items-center gap-1 sm:gap-2 leading-none"><Coins className="w-7 h-7 sm:w-9 sm:h-9" /> +{earnedCoins}</p>
                 <div className="mt-2 text-yellow-400/50 font-bold text-[8px] sm:text-[10px] uppercase">Diff Bonus: x{difficulty === 'hard' ? 2 : (difficulty === 'normal' ? 1.5 : 1)}</div>
               </div>
             </div>
             <button onClick={(e) => { e.stopPropagation(); playClick(); router.push('/'); }} onMouseEnter={playHover} className="bg-white text-slate-800 px-8 py-3 rounded-full font-black text-lg sm:text-xl shadow-lg border-2 border-white hover:scale-105 transition-all cursor-pointer">Main Menu</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-8 left-4 sm:left-8 z-50">
        <button onClick={(e) => { 
          e.stopPropagation(); 
          playClick(); 
          if (bgmRef.current) bgmRef.current.pause(); 
          router.push('/'); 
        }} 
        onMouseEnter={playHover} className="bg-white/80 px-4 py-2 sm:px-6 rounded-full font-black text-red-500 border-2 border-red-100 uppercase text-[10px] sm:text-xs tracking-widest hover:bg-white transition-colors cursor-pointer shadow-sm">Exit</button>
      </div>
      <style jsx>{`@keyframes flicker { 0%, 100% { opacity: 1; } 50% { opacity: 0; } } .animate-flicker { animation: flicker 0.1s infinite; }`}</style>
    </div>
  )
}

export default function GamePlayPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#8EC5FC] text-white font-black text-3xl uppercase animate-pulse">Initializing...</div>}>
      <PlayEngine />
    </Suspense>
  )
}