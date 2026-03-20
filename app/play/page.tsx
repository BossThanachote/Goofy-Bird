'use client'
import React, { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useSFX } from '@/hook/useSFX'

import LoadingScreen from '@/components/gameplay/LoadingScreen'
import ObstacleRenderer from '@/components/gameplay/ObstacleRenderer'
import ReadyModal from '@/components/gameplay/ReadyModal'
import GameOverModal from '@/components/gameplay/GameOverModal'
import WaitingLobby from '@/components/gameplay/WaitingLobby'
import MultiGameOverModal from '@/components/gameplay/MultiGameOverModal'
import CountdownBig from '@/components/gameplay/CountDownBig'
import PlayerHUD from '@/components/gameplay/PlayerHUD'

import { useGamePhysics } from '@/hook/useGamePhysic'
import { useMultiplayerSync } from '@/hook/useMultiplayerSync'
import { Obstacle } from '@/lib/obstacleManager'

const DEFAULT_BIRD_ID = 'e114c607-b017-4ea6-a306-8e5c0808092a'
const JUMP_STRENGTH = -8;
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
  const [highScores, setHighScores] = useState({ easy: 0, normal: 0, hard: 0 })
  
  // ✅ 1. เพิ่ม State เก็บความยาก เพื่อให้ดึงค่าจากระบบห้อง Multi มาอัปเดตได้
  const [difficulty, setDifficulty] = useState<Difficulty>(diffParam)

  const [windowWidth, setWindowWidth] = useState(0)
  const [windowHeight, setWindowHeight] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const [gameState, setGameState] = useState<'waiting_host' | 'countdown' | 'ready' | 'playing' | 'spectating' | 'gameover' | 'multi_gameover' | 'trigger_reset'>(
    mode === 'multi' ? 'waiting_host' : 'ready'
  )
  const [countdownTimer, setCountdownTimer] = useState(3) 

  const [obstacles, setObstacles] = useState<Obstacle[]>([])
  const myYRef = useRef(300);
  const invincibleRef = useRef(false);
  const isDeadRef = useRef(false);

  const gameStateRef = useRef(gameState);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const gameOverSfxRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const sync = useMultiplayerSync({
    mode, roomId, currentUser, birdData: playerBird, myYRef, 
    invincibleRef, isDeadRef, gameStateRef, gameState,
    setGameState, setObstacles, bgmRef, gameOverSfxRef
  });

  const physics = useGamePhysics({
    mode, difficulty, gameState, setGameState, windowWidth, windowHeight, // ✅ เปลี่ยนไปใช้ตัวแปร State 'difficulty' แทน
    currentMap, currentUser, amIHost: sync.amIHost, channelRef: sync.channelRef, highScores, setHighScores,
    setDeadPlayers: sync.setDeadPlayers, isDeadRef, bgmRef, gameOverSfxRef, isLoading,
    obstacles, setObstacles, myYRef, invincibleRef,
    playJump, playHit 
  });

  useEffect(() => {
    const handleResize = () => { setWindowWidth(window.innerWidth); setWindowHeight(window.innerHeight); };
    handleResize(); window.addEventListener('resize', handleResize);
    const timer = setTimeout(() => { setIsLoading(false) }, 2500)
    return () => { window.removeEventListener('resize', handleResize); clearTimeout(timer); }
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
          setHighScores({ easy: userData.high_score || 0, normal: userData.high_score_normal || 0, hard: userData.high_score_hard || 0 })
          setCurrentUser((prev: any) => ({ ...prev, ...userData }))
        }
      }
      const { data: birdData } = await supabase.from('characters').select('*').eq('character_id', targetBirdId).maybeSingle()
      if (birdData) setPlayerBird(birdData)

      // ✅ 2. อัปเกรดระบบดึงข้อมูล: ถ้าเป็นห้อง Multi ให้ไปค้นหา Map ID และระดับความยากจากห้องก่อน!
      let targetMapId = mapId;
      if (mode === 'multi' && roomId) {
        const { data: roomData } = await supabase.from('rooms').select('map_id, difficulty').eq('id', roomId).single();
        if (roomData) {
          targetMapId = roomData.map_id; // ได้ Map ID ที่แท้จริงมาแล้ว!
          if (roomData.difficulty) setDifficulty(roomData.difficulty as Difficulty);
        }
      }

      // ✅ 3. โหลดแผนที่และอุปสรรคทั้งหมด (กบ, กงจักร จะมาครบก็ตรงนี้แหละ!)
      if (targetMapId) {
        const { data } = await supabase.from('maps').select('*').eq('id', targetMapId).single()
        setCurrentMap(data)
        const bgmTrigger = data?.bgm_trigger || 'bgm_default_gameplay'
        const { data: soundData } = await supabase.from('sounds').select('action_trigger, file_url, base_volume').in('action_trigger', [bgmTrigger, 'sfx_gameover']).eq('is_active', true).eq('is_deleted', false);
        if (soundData) {
          const bgmSound = soundData.find(s => s.action_trigger === bgmTrigger);
          const goSound = soundData.find(s => s.action_trigger === 'sfx_gameover');
          if (bgmSound?.file_url) { bgmRef.current = new Audio(bgmSound.file_url); bgmRef.current.loop = true; bgmRef.current.volume = 0.4; }
          if (goSound?.file_url) { gameOverSfxRef.current = new Audio(goSound.file_url); gameOverSfxRef.current.volume = 0.8; }
        }
      }
    }
    initGame()
    return () => { if (bgmRef.current) bgmRef.current.pause(); }
  }, [mapId, roomId, mode]) // ✅ สั่งให้รีโหลดใหม่ถ้าค่าเหล่านี้เปลี่ยน

  useEffect(() => {
    if (gameState === 'trigger_reset') {
      physics.resetPhysics();
      sync.setDeadPlayers([]); sync.setMultiPlayerDecisions({}); sync.setMultiRestartReady(false);
      isDeadRef.current = false;
      setGameState('countdown'); 
    }
  }, [gameState])

  useEffect(() => {
    if (gameState !== 'countdown') return;
    setCountdownTimer(3); 
    const timerId = setInterval(() => {
      setCountdownTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerId);
          setGameState('playing');
          physics.setVelocity(JUMP_STRENGTH); 
          if (bgmRef.current) { bgmRef.current.currentTime = 0; bgmRef.current.play().catch(e=>console.log(e)); }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerId);
  }, [gameState]);

  if (windowWidth === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] w-screen h-screen overflow-hidden bg-[#D0F4FF] select-none m-0 p-0" onClick={() => { physics.jump(); }}>
      <LoadingScreen isLoading={isLoading} />

      <div className="absolute inset-0 z-0 flex w-[200vw] pointer-events-none">
        <motion.div className="h-full w-[100vw] bg-cover bg-bottom bg-no-repeat" style={{ backgroundImage: `url('${currentMap?.bg_url || '/background_goofy_bird.png'}')` }} animate={gameState === 'playing' || gameState === 'spectating' ? { x: [0, -windowWidth] } : {}} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} />
        <motion.div className="h-full w-[100vw] bg-cover bg-bottom bg-no-repeat -ml-[1px]" style={{ backgroundImage: `url('${currentMap?.bg_url || '/background_goofy_bird.png'}')` }} animate={gameState === 'playing' || gameState === 'spectating' ? { x: [0, -windowWidth] } : {}} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} />
      </div>

      {obstacles.map((obs, index) => (
        <div key={`obs-${obs.id}-${index}`} className="absolute z-10 flex items-center justify-center" style={{ left: obs.x, top: obs.y, width: obs.width, height: obs.height }}>
          <ObstacleRenderer obs={obs} />
        </div>
      ))}

      {currentMap?.has_hazard && <div className="absolute bottom-0 w-full h-12 bg-gradient-to-t from-red-600/80 to-transparent z-30 animate-pulse pointer-events-none" />}

      <PlayerHUD score={physics.score} hearts={physics.hearts} gameState={gameState} />

      {gameState !== 'gameover' && gameState !== 'multi_gameover' && (
        <div className={`absolute z-40 ${invincibleRef.current ? 'animate-flicker' : ''} ${gameState === 'spectating' ? 'opacity-40 grayscale' : ''}`} style={{ left: windowWidth * 0.2, top: physics.birdPosition }}>
          <div className="w-[40px] h-[40px] md:w-[50px] md:h-[50px] lg:w-[65px] lg:h-[65px] xl:w-[80px] xl:h-[80px] transition-transform duration-75" style={{ transform: `rotate(${physics.velocity * 3}deg)` }}>
            <img src={playerBird?.image_url} alt="Bird" className="w-full h-full object-contain drop-shadow-2xl" />
            <div className={`absolute -top-6 left-1/2 -translate-x-1/2 text-white text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${gameState === 'spectating' ? 'bg-red-500' : 'bg-black/40'}`}>
              {gameState === 'spectating' ? 'DEAD 💀' : 'YOU'}
            </div>
          </div>
        </div>
      )}

      {mode === 'multi' && Object.values(sync.ghostBirds).map((ghost: any) => {
        if (sync.deadPlayers.includes(ghost.userId)) return null; 
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
        {gameState === 'countdown' && <CountdownBig timer={countdownTimer} />}
        {gameState === 'waiting_host' && <WaitingLobby ghostBirds={sync.ghostBirds} currentUser={currentUser} amIHost={sync.amIHost} onStartGame={(e) => { e.stopPropagation(); playClick(); setObstacles([]); sync.channelRef.current?.send({ type: 'broadcast', event: 'start_countdown' }); setGameState('trigger_reset'); }} />}
        {gameState === 'multi_gameover' && <MultiGameOverModal earnedCoins={physics.earnedCoins} currentUser={currentUser} ghostBirds={sync.ghostBirds} multiPlayerDecisions={sync.multiPlayerDecisions} multiRestartReady={sync.multiRestartReady} multiGameOverCountdown={sync.multiGameOverCountdown} onDecision={(decision, e) => { if (e) e.stopPropagation(); playClick(); sync.handleMultiDecision(decision); }} />}
        {gameState === 'ready' && <ReadyModal mapName={currentMap?.map_name} />}
        
        {/* ✅ ส่ง Difficulty ที่อัปเดตแล้วเข้าไปให้ GameOverModal ด้วย */}
        {gameState === 'gameover' && mode === 'single' && <GameOverModal score={physics.score} highScore={highScores[difficulty]} earnedCoins={physics.earnedCoins} difficulty={difficulty} onHover={playHover} onMainMenuClick={(e) => { e.stopPropagation(); playClick(); router.push('/'); }} />}
      </AnimatePresence>

      <div className="absolute top-8 left-4 sm:left-8 z-50">
        <button onClick={(e) => { e.stopPropagation(); playClick(); sync.handleLeaveRoom(); if (bgmRef.current) bgmRef.current.pause(); router.push('/'); }} onMouseEnter={playHover} className="bg-white/80 px-4 py-2 sm:px-6 rounded-full font-black text-red-500 border-2 border-red-100 uppercase text-[10px] sm:text-xs tracking-widest hover:bg-white transition-colors cursor-pointer shadow-sm">Exit</button>
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