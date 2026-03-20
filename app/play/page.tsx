'use client'
import React, { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Heart, Trophy, Coins, Eye, Users, CheckCircle2, Clock } from 'lucide-react'
import { useSFX } from '@/hook/useSFX'
import LoadingScreen from '@/components/gameplay/LoadingScreen'
import ObstacleRenderer from '@/components/gameplay/ObstacleRenderer'
import ReadyModal from '@/components/gameplay/ReadyModal'
import GameOverModal from '@/components/gameplay/GameOverModal'
import { Obstacle, generateObstacle, DIFFICULTY_CONFIG } from '@/lib/obstacleManager'

const DEFAULT_BIRD_ID = 'e114c607-b017-4ea6-a306-8e5c0808092a'
const GRAVITY = 0.6;
const JUMP_STRENGTH = -8;
const IFRAME_DURATION = 1500;

type Difficulty = 'easy' | 'normal' | 'hard';

function PlayEngine() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode') || 'single'
  const mapId = searchParams.get('mapId')
  const diffParam = searchParams.get('diff') as Difficulty || 'normal'
  const roomId = searchParams.get('roomId')

  const { playHover, playClick, playHit, playJump } = useSFX()

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [playerBird, setPlayerBird] = useState<any>(null)
  const [currentMap, setCurrentMap] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const [windowWidth, setWindowWidth] = useState(0)
  const [windowHeight, setWindowHeight] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const [gameState, setGameState] = useState<'waiting_host' | 'countdown' | 'ready' | 'playing' | 'spectating' | 'gameover' | 'multi_gameover' | 'trigger_reset'>(
    mode === 'multi' ? 'waiting_host' : 'ready'
  )
  const [countdownTimer, setCountdownTimer] = useState(3) 

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
  
  const [deadPlayers, setDeadPlayers] = useState<string[]>([])
  const [multiGameOverCountdown, setMultiGameOverCountdown] = useState(10)
  const [multiRestartReady, setMultiRestartReady] = useState(false)
  const [multiPlayerDecisions, setMultiPlayerDecisions] = useState<Record<string, 'ready' | 'menu'>>({})

  const requestRef = useRef<number>(null);
  const invincibleRef = useRef(false);
  const isDeadRef = useRef(false); 
  const spawnTimerRef = useRef(0);
  const obstacleIdCounter = useRef(0);
  const scoreRef = useRef(0);
  const channelRef = useRef<any>(null);
  const myYRef = useRef(300);

  const myIdRef = useRef<string>('');
  const hostIdRef = useRef<string>('');
  const gameStateRef = useRef(gameState);

  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const gameOverSfxRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  useEffect(() => {
    const timer = setTimeout(() => { setIsLoading(false) }, 2500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const handleResize = () => { setWindowWidth(window.innerWidth); setWindowHeight(window.innerHeight); };
    handleResize(); window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const initGame = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      let targetBirdId = DEFAULT_BIRD_ID
      
      if (session?.user) {
        myIdRef.current = session.user.id; 
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
      const { data: soundData } = await supabase.from('sounds').select('action_trigger, file_url, base_volume').in('action_trigger', [bgmTrigger, 'sfx_gameover']).eq('is_active', true).eq('is_deleted', false);

      if (soundData) {
        const bgmSound = soundData.find(s => s.action_trigger === bgmTrigger);
        const goSound = soundData.find(s => s.action_trigger === 'sfx_gameover');
        const bgmMultiplier = Number(localStorage.getItem('goofy_bgm_volume') || 100) / 100;
        const sfxMultiplier = Number(localStorage.getItem('goofy_sfx_volume') || 100) / 100;

        if (bgmSound?.file_url) { bgmRef.current = new Audio(bgmSound.file_url); bgmRef.current.loop = true; bgmRef.current.volume = Math.min((bgmSound.base_volume ?? 1.0) * 0.4 * bgmMultiplier, 1.0); }
        if (goSound?.file_url) { gameOverSfxRef.current = new Audio(goSound.file_url); gameOverSfxRef.current.volume = Math.min((goSound.base_volume ?? 1.0) * 0.8 * sfxMultiplier, 1.0); }
      }

      if (mode === 'multi' && roomId && session?.user) {
        const { data: room } = await supabase.from('rooms').select('*').eq('id', roomId).single()
        if (room) {
          setDifficulty(room.difficulty as Difficulty)
          
          hostIdRef.current = room.host_id; 
          setAmIHost(room.host_id === session.user.id)
          
          const channel = supabase.channel(`game_${roomId}`)
          channelRef.current = channel

          channel.on('broadcast', { event: 'ghost_update' }, ({ payload }) => {
            if (payload.userId !== session.user.id) {
              setGhostBirds(prev => ({ ...prev, [payload.userId]: payload }))
            }
          })
          .on('broadcast', { event: 'spawn_obstacle' }, ({ payload }) => {
            if (hostIdRef.current !== session.user.id && 
                gameStateRef.current !== 'multi_gameover' && 
                gameStateRef.current !== 'gameover' && 
                gameStateRef.current !== 'countdown' && 
                gameStateRef.current !== 'trigger_reset') {
               
               setObstacles(prev => {
                 // ✅ แก้บัคคีย์ซ้ำ 100%: เช็คก่อนว่ามีอุปสรรค ID นี้บนจอหรือยัง ถ้ามีแล้ว "ข้ามไปเลย"
                 if (prev.some(obs => obs.id === payload.id)) {
                   return prev; 
                 }
                 const syncedObs = { ...payload, x: window.innerWidth + 50 };
                 return [...prev, syncedObs];
               });
            }
          })
          .on('broadcast', { event: 'player_death' }, ({ payload }) => {
            setDeadPlayers(prev => prev.includes(payload.userId) ? prev : [...prev, payload.userId])
          })
          .on('broadcast', { event: 'player_leave' }, ({ payload }) => {
            setGhostBirds(prev => { const updated = { ...prev }; delete updated[payload.userId]; return updated; })
            setDeadPlayers(prev => prev.filter(id => id !== payload.userId))
            setMultiPlayerDecisions(prev => { const updated = { ...prev }; delete updated[payload.userId]; return updated; })
          })
          .on('broadcast', { event: 'start_countdown' }, () => {
            setGameState('trigger_reset')
          })
          .on('broadcast', { event: 'player_decision' }, ({ payload }) => {
            setMultiPlayerDecisions(prev => ({ ...prev, [payload.userId]: payload.decision }))
          })
          .subscribe()

          setInterval(() => {
            if (channelRef.current && !invincibleRef.current && !isDeadRef.current) { 
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
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    }
  }, [])

  // 🔄 ระบบ Host Migration (สืบทอดหัวหน้าห้องถ้า Host กดออก)
  useEffect(() => {
    if (mode === 'multi' && myIdRef.current) {
      const currentPlayers = [myIdRef.current, ...Object.keys(ghostBirds)].sort();
      if (hostIdRef.current && !currentPlayers.includes(hostIdRef.current)) {
        const newHost = currentPlayers[0];
        hostIdRef.current = newHost;
        setAmIHost(myIdRef.current === newHost);
      }
    }
  }, [ghostBirds, mode]);

  useEffect(() => {
    if (gameState === 'trigger_reset') {
      setScore(0); scoreRef.current = 0;
      setHearts(3); 
      setObstacles([]); // ✅ ล้างกระดานให้สะอาดหมดจด
      obstacleIdCounter.current = 0;
      setBirdPosition(window.innerHeight / 2); setVelocity(0);
      setDeadPlayers([]); setMultiPlayerDecisions({});
      setMultiGameOverCountdown(10); setMultiRestartReady(false);
      isDeadRef.current = false;
      
      setCountdownTimer(3);
      setGameState('countdown');
    }
  }, [gameState])

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'countdown') {
      if (countdownTimer > 0) {
        timer = setTimeout(() => setCountdownTimer(prev => prev - 1), 1000);
      } else {
        setGameState('playing');
        setVelocity(JUMP_STRENGTH); 
        if (bgmRef.current) {
           bgmRef.current.currentTime = 0;
           bgmRef.current.play().catch(e=>console.log(e));
        }
      }
    }
    return () => clearTimeout(timer);
  }, [gameState, countdownTimer]);

  useEffect(() => {
    if (mode === 'multi' && (gameState === 'spectating' || gameState === 'playing')) {
      const totalPlayers = 1 + Object.keys(ghostBirds).length;
      if (deadPlayers.length >= totalPlayers && totalPlayers > 0) {
        setGameState('multi_gameover');
        setObstacles([]); // ✅ ล้างท่อทิ้งตอนจบเกมด้วย
        if (bgmRef.current) bgmRef.current.pause();
        if (gameOverSfxRef.current) {
          gameOverSfxRef.current.currentTime = 0;
          gameOverSfxRef.current.play().catch(e => console.log(e));
        }
      }
    }
  }, [deadPlayers, ghostBirds, mode, gameState]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'multi_gameover') {
      if (multiGameOverCountdown > 0) {
        timer = setTimeout(() => setMultiGameOverCountdown(prev => prev - 1), 1000);
      } else {
        if (!multiRestartReady) {
          handleLeaveRoom();
          router.push('/');
        } else {
          if (amIHost) {
            channelRef.current?.send({ type: 'broadcast', event: 'start_countdown' });
            setGameState('trigger_reset');
          }
        }
      }
    }
    return () => clearTimeout(timer);
  }, [gameState, multiGameOverCountdown, multiRestartReady, amIHost, router]);

  const handleLeaveRoom = async () => {
    if (!currentUser || !roomId) return;
    channelRef.current?.send({ type: 'broadcast', event: 'player_leave', payload: { userId: currentUser.id } });
    try {
      if (amIHost) {
        await supabase.from('rooms').delete().eq('id', roomId);
      } else {
        await supabase.from('room_players').delete().eq('room_id', roomId).eq('user_id', currentUser.id);
      }
    } catch(e) { console.error(e) }
  }

  const handleGameOver = async () => {
    const finalScore = scoreRef.current;
    
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

    if (mode === 'multi') {
      isDeadRef.current = true; 
      channelRef.current?.send({ type: 'broadcast', event: 'player_death', payload: { userId: currentUser?.id } })
      setDeadPlayers(prev => prev.includes(currentUser?.id) ? prev : [...prev, currentUser?.id])
      setGameState('spectating') 
      return
    }

    setGameState('gameover');
    if (bgmRef.current) bgmRef.current.pause(); 
    if (gameOverSfxRef.current) {
      gameOverSfxRef.current.currentTime = 0;
      gameOverSfxRef.current.play().catch(e => console.log(e));
    }
  };

  const takeDamage = () => {
    if (invincibleRef.current || gameState === 'spectating' || gameState === 'gameover' || gameState === 'multi_gameover' || gameState === 'countdown' || gameState === 'trigger_reset') return;
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
    if (isLoading || gameState === 'waiting_host' || gameState === 'countdown' || gameState === 'spectating' || gameState === 'gameover' || gameState === 'multi_gameover' || gameState === 'trigger_reset') return;
    
    if (gameState === 'ready') { 
      setGameState('playing'); 
      if (bgmRef.current) bgmRef.current.play().catch(e=>console.log(e)); 
    }
    
    playJump();
    setVelocity(JUMP_STRENGTH);
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.code === 'Space') jump() }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameState, isLoading])

  // 🌀 Game Engine Loop
  useEffect(() => {
    if (gameState === 'playing' || gameState === 'spectating') {
      const config = DIFFICULTY_CONFIG[difficulty];
      let lastTime = performance.now();
      const targetFPS = 60;
      const frameInterval = 1000 / targetFPS;

      const update = (currentTime: number) => {
        requestRef.current = requestAnimationFrame(update);
        const deltaTime = currentTime - lastTime;

        if (deltaTime >= frameInterval) {
          lastTime = currentTime - (deltaTime % frameInterval);

          const uiScale = windowWidth < 768 ? 0.5 : (windowWidth < 1024 ? 0.7 : (windowWidth < 1440 ? 0.9 : 1.1));
          const screenSpeedRatio = windowWidth / 1000;
          const currentSpeed = (config.speed * screenSpeedRatio) * 1.5; 

          if (gameState === 'playing') {
            scoreRef.current += 1;
            setScore(scoreRef.current);

            setBirdPosition((pos) => {
              const newPos = pos + velocity
              myYRef.current = newPos 

              const lavaZone = 120 * uiScale;
              if (currentMap?.has_hazard && newPos > windowHeight - lavaZone) { takeDamage(); return windowHeight - lavaZone }
              const bottomSafeZone = 80 * uiScale;
              if (newPos < 0 || newPos > windowHeight - bottomSafeZone) { takeDamage(); return newPos < 0 ? 5 : windowHeight - (bottomSafeZone + 5); }
              return newPos
            })
            setVelocity((v) => v + GRAVITY)
          }

          setObstacles((prevObstacles) => {
            const birdX = windowWidth * 0.2;
            const birdY = birdPosition;
            const birdSize = 40 * uiScale;

            const movedObstacles = prevObstacles.map(obs => {
              let newX = obs.x - (currentSpeed + (obs.speedModX * screenSpeedRatio));
              let newY = obs.y + (obs.speedModY * screenSpeedRatio);

              if (obs.type === 'pipe-bottom') { newY = windowHeight - obs.height; } 
              else if (obs.type === 'frog' && obs.baseY !== undefined) { obs.baseY = windowHeight - (80 * obs.scale); newY = obs.baseY - Math.abs(Math.sin(newX / 60)) * (180 * obs.scale); } 
              else if (obs.type === 'pendulum' && obs.baseY !== undefined) { newY = obs.baseY + Math.sin(newX / 150) * (150 * obs.scale); }
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
        }
      }
      
      requestRef.current = requestAnimationFrame(update)
      return () => cancelAnimationFrame(requestRef.current!)
    }
  }, [gameState, velocity, hearts, birdPosition, currentMap, windowWidth, windowHeight, difficulty, mode, amIHost])

  const spawnObstacle = (config: any, scale: number) => {
    const mapObstacles = currentMap?.allowed_obstacles;
    let safePool = ['pipe-top', 'pipe-bottom']; 
    if (mapObstacles) {
      if (Array.isArray(mapObstacles)) { safePool = mapObstacles; } 
      else if (mapObstacles[difficulty] && mapObstacles[difficulty].length > 0) { safePool = mapObstacles[difficulty]; }
    }

    const newObs = generateObstacle(obstacleIdCounter.current++, safePool, windowWidth, windowHeight, scale, myYRef.current);
    
    setObstacles(prev => [...prev, newObs]);

    if (mode === 'multi' && amIHost) {
      channelRef.current?.send({ type: 'broadcast', event: 'spawn_obstacle', payload: newObs })
    }
  }

  const handleMultiDecision = (decision: 'ready' | 'menu') => {
    playClick();
    if (decision === 'ready') setMultiRestartReady(true);
    channelRef.current?.send({ type: 'broadcast', event: 'player_decision', payload: { userId: currentUser.id, decision } });
    if (decision === 'menu') {
      handleLeaveRoom();
      router.push('/');
    }
  }

  if (loading || windowWidth === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] w-screen h-screen overflow-hidden bg-[#D0F4FF] select-none m-0 p-0" onClick={jump}>
      <LoadingScreen isLoading={isLoading} />

      <div className="absolute inset-0 z-0 flex w-[200vw] pointer-events-none">
        <motion.div className="h-full w-[100vw] bg-cover bg-bottom bg-no-repeat" style={{ backgroundImage: `url('${currentMap?.bg_url || '/background_goofy_bird.png'}')` }} animate={gameState === 'playing' || gameState === 'spectating' ? { x: [0, -windowWidth] } : {}} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} />
        <motion.div className="h-full w-[100vw] bg-cover bg-bottom bg-no-repeat -ml-[1px]" style={{ backgroundImage: `url('${currentMap?.bg_url || '/background_goofy_bird.png'}')` }} animate={gameState === 'playing' || gameState === 'spectating' ? { x: [0, -windowWidth] } : {}} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} />
      </div>

      {/* ✅ หน้าที่แสดงอุปสรรค จะไม่แสดงถ้ามี Error คีย์ซ้ำแล้ว เพราะโดนบล็อคใน useEffect */}
      {obstacles.map(obs => (
        <div key={obs.id} className="absolute z-10 flex items-center justify-center" style={{ left: obs.x, top: obs.y, width: obs.width, height: obs.height }}>
          <ObstacleRenderer obs={obs} />
        </div>
      ))}

      {currentMap?.has_hazard && (
        <div className="absolute bottom-0 w-full h-12 bg-gradient-to-t from-red-600/80 to-transparent z-30 animate-pulse pointer-events-none" />
      )}

      {(gameState === 'playing' || gameState === 'spectating' || gameState === 'gameover' || gameState === 'multi_gameover') && (
        <div className="absolute top-10 w-full text-center z-50 pointer-events-none flex flex-col items-center">
          <h2 className="text-6xl md:text-8xl font-black text-white drop-shadow-[0_5px_0_rgba(0,0,0,0.3)] tracking-tighter" style={{ WebkitTextStroke: '2px #35A7FF' }}>{score}</h2>
          {gameState === 'spectating' && (
            <div className="bg-black/50 text-white px-4 py-2 rounded-full mt-2 font-bold uppercase text-sm flex items-center gap-2">  
              <Eye size={18}/> Spectating
            </div>
          )}
        </div>
      )}

      {(gameState === 'ready' || gameState === 'playing' || gameState === 'countdown') && (
        <div className="absolute top-8 right-4 sm:right-8 z-50 flex gap-1 sm:gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i}>
              <Heart className={`transition-all duration-300 sm:w-[35px] sm:h-[35px] w-[28px] h-[28px] ${i < hearts ? 'text-red-500 fill-red-500 scale-100' : 'text-gray-300 fill-transparent scale-50 opacity-0'}`} size={30} />
            </div>
          ))}
        </div>
      )}

      {gameState !== 'gameover' && gameState !== 'multi_gameover' && (
        <div className={`absolute z-40 ${isInvincible ? 'animate-flicker' : ''} ${gameState === 'spectating' ? 'opacity-40 grayscale' : ''}`} style={{ left: windowWidth * 0.2, top: birdPosition }}>
          <div className="w-[40px] h-[40px] md:w-[50px] md:h-[50px] lg:w-[65px] lg:h-[65px] xl:w-[80px] xl:h-[80px] transition-transform duration-75" style={{ transform: `rotate(${velocity * 3}deg)` }}>
            <img src={playerBird?.image_url} alt="Bird" className="w-full h-full object-contain drop-shadow-2xl" />
            <div className={`absolute -top-6 left-1/2 -translate-x-1/2 text-white text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${gameState === 'spectating' ? 'bg-red-500' : 'bg-black/40'}`}>
              {gameState === 'spectating' ? 'DEAD 💀' : 'YOU'}
            </div>
          </div>
        </div>
      )}

      {mode === 'multi' && Object.values(ghostBirds).map((ghost: any) => {
        const isGhostDead = deadPlayers.includes(ghost.userId);
        if (isGhostDead) return null; 
        return (
          <div key={ghost.userId} className="absolute z-20 opacity-30 transition-all duration-75 pointer-events-none" style={{ left: windowWidth * 0.2, top: ghost.y }}>
            <div className="w-[40px] h-[40px] md:w-[50px] md:h-[50px] lg:w-[65px] lg:h-[65px] xl:w-[80px] xl:h-[80px]">
              <img src={ghost.birdUrl || 'https://placehold.co/100x100/png'} alt="Ghost" className="w-full h-full object-contain grayscale-[50%]" />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#35A7FF] text-white text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold whitespace-nowrap shadow-md">{ghost.username}</div>
            </div>
          </div>
        )
      })}

      <AnimatePresence>
        {gameState === 'countdown' && (
           <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.5, opacity: 0 }} className="absolute inset-0 z-[120] flex items-center justify-center pointer-events-none">
              <h1 className="text-[150px] md:text-[200px] font-black text-white drop-shadow-[0_10px_0_#35A7FF] italic">{countdownTimer}</h1>
           </motion.div>
        )}

        {gameState === 'waiting_host' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/60 px-4 backdrop-blur-sm">
            <h2 className="text-white text-3xl md:text-5xl font-black uppercase tracking-widest drop-shadow-lg mb-4 text-center">Waiting for Players</h2>
            <div className="bg-white/10 p-6 rounded-2xl border-2 border-white/20 mb-8 flex flex-col items-center min-w-[300px]">
              <p className="text-[#35A7FF] font-black text-xl mb-4 flex items-center gap-2"><Users size={24}/> Players in Room: {Object.keys(ghostBirds).length + 1}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                 <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">You: {currentUser?.username}</span>
                 {Object.values(ghostBirds).map((ghost: any) => (
                   <span key={ghost.userId} className="bg-slate-700 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">{ghost.username}</span>
                 ))}
              </div>
            </div>
            {amIHost ? (
              <button 
                onClick={(e) => { e.stopPropagation(); playClick(); setObstacles([]); channelRef.current?.send({ type: 'broadcast', event: 'start_countdown' }); setGameState('trigger_reset'); }}
                className="bg-yellow-400 text-yellow-900 px-10 py-4 rounded-full font-black text-2xl uppercase tracking-widest shadow-[0_6px_0_#A16207] hover:translate-y-1 hover:shadow-[0_2px_0_#A16207] transition-all"
              >
                Start Game
              </button>
            ) : (
              <p className="text-white text-xl font-bold animate-pulse">Waiting for Host to start...</p>
            )}
          </motion.div>
        )}

        {gameState === 'multi_gameover' && (
          <div className="absolute inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-white p-6 sm:p-8 rounded-[2em] max-w-sm w-full text-center border-4 border-[#35A7FF] shadow-2xl">
              <h2 className="text-3xl sm:text-4xl font-black text-slate-800 mb-1 uppercase italic tracking-tighter">All Dead!</h2>
              <p className="text-slate-500 font-bold mb-4 text-xs sm:text-sm uppercase tracking-widest">Match Finished</p>
              
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4 mb-6">
                <p className="text-slate-500 font-bold text-xs uppercase mb-1">You Earned</p>
                <div className="flex items-center justify-center gap-2 text-yellow-500 font-black text-3xl"><Coins size={28} /> +{earnedCoins}</div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 mb-6 space-y-2 border-2 border-slate-100 text-sm">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-slate-600">You ({currentUser?.username})</span>
                  <span className={multiRestartReady ? "text-green-500" : "text-slate-400"}>{multiRestartReady ? 'READY' : 'WAITING...'}</span>
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
                <button onClick={() => handleMultiDecision('menu')} className="flex-1 bg-slate-100 text-slate-500 py-3 sm:py-4 rounded-xl font-black uppercase text-xs sm:text-sm hover:bg-slate-200 border-2 border-slate-200 transition-all active:scale-95">Menu</button>
                <button onClick={(e) => { e.stopPropagation(); handleMultiDecision('ready'); }} disabled={multiRestartReady} className={`flex-1 py-3 sm:py-4 rounded-xl font-black uppercase text-xs sm:text-sm shadow-[0_4px_0_rgba(0,0,0,0.2)] transition-all active:translate-y-1 active:shadow-none ${multiRestartReady ? 'bg-green-500 text-white shadow-none translate-y-1' : 'bg-[#FFD151] text-white hover:bg-[#FABC05]'}`}>
                  {multiRestartReady ? 'Ready!' : 'Play Again'}
                </button>
              </div>
            </div>
          </div>
        )}

        {gameState === 'ready' && <ReadyModal mapName={currentMap?.map_name} />}
        
        {gameState === 'gameover' && mode === 'single' && (
          <GameOverModal 
            score={score}
            highScore={highScores[difficulty]}
            earnedCoins={earnedCoins}
            difficulty={difficulty}
            onHover={playHover}
            onMainMenuClick={(e) => { e.stopPropagation(); playClick(); router.push('/'); }} 
          />
        )}
      </AnimatePresence>

      <div className="absolute top-8 left-4 sm:left-8 z-50">
        <button onClick={(e) => { e.stopPropagation(); playClick(); handleLeaveRoom(); if (bgmRef.current) bgmRef.current.pause(); router.push('/'); }} onMouseEnter={playHover} className="bg-white/80 px-4 py-2 sm:px-6 rounded-full font-black text-red-500 border-2 border-red-100 uppercase text-[10px] sm:text-xs tracking-widest hover:bg-white transition-colors cursor-pointer shadow-sm">Exit</button>
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