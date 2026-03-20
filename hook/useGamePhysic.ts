import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Obstacle, generateObstacle, DIFFICULTY_CONFIG } from '@/lib/obstacleManager';

const GRAVITY = 0.6;
const JUMP_STRENGTH = -8;
const IFRAME_DURATION = 1500;

interface UseGamePhysicsProps {
  mode: string;
  difficulty: 'easy' | 'normal' | 'hard';
  gameState: string;
  setGameState: (state: any) => void;
  windowWidth: number;
  windowHeight: number;
  currentMap: any;
  currentUser: any;
  amIHost: boolean;
  channelRef: React.MutableRefObject<any>;
  highScores: any;
  setHighScores: (scores: any) => void;
  setDeadPlayers: React.Dispatch<React.SetStateAction<string[]>>;
  isDeadRef: React.MutableRefObject<boolean>;
  bgmRef: React.MutableRefObject<HTMLAudioElement | null>;
  gameOverSfxRef: React.MutableRefObject<HTMLAudioElement | null>;
  isLoading: boolean;
  obstacles: Obstacle[];
  setObstacles: React.Dispatch<React.SetStateAction<Obstacle[]>>;
  myYRef: React.MutableRefObject<number>;
  invincibleRef: React.MutableRefObject<boolean>;
  playJump: () => void; // ✅ เพิ่มสายไฟเสียงกระโดด
  playHit: () => void;  // ✅ เพิ่มสายไฟเสียงโดนดาเมจ
}

export function useGamePhysics({
  mode, difficulty, gameState, setGameState, windowWidth, windowHeight,
  currentMap, currentUser, amIHost, channelRef, highScores, setHighScores,
  setDeadPlayers, isDeadRef, bgmRef, gameOverSfxRef, isLoading,
  obstacles, setObstacles, myYRef, invincibleRef, playJump, playHit // ✅ รับค่าเสียงเข้ามา
}: UseGamePhysicsProps) {

  const [birdPosition, setBirdPosition] = useState(300);
  const [velocity, setVelocity] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [isInvincible, setIsInvincible] = useState(false);
  const [score, setScore] = useState(0);
  const [earnedCoins, setEarnedCoins] = useState(0);

  const requestRef = useRef<number>(null);
  const spawnTimerRef = useRef(0);
  const obstacleIdCounter = useRef(0);
  const scoreRef = useRef(0);
  const gameStateRef = useRef(gameState);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const resetPhysics = () => {
    setScore(0); scoreRef.current = 0;
    setHearts(3); 
    setObstacles([]); obstacleIdCounter.current = 0;
    setBirdPosition(windowHeight / 2); setVelocity(0);
  };

  const handleGameOver = () => {
    if (mode === 'multi') {
      setGameState('spectating');
      setDeadPlayers(prev => prev.includes(currentUser?.id) ? prev : [...prev, currentUser?.id]);
      channelRef.current?.send({ type: 'broadcast', event: 'player_death', payload: { userId: currentUser?.id } });
    } else {
      setGameState('gameover');
      if (bgmRef.current) bgmRef.current.pause(); 
      if (gameOverSfxRef.current) {
        gameOverSfxRef.current.currentTime = 0;
        gameOverSfxRef.current.play().catch(e => console.log(e));
      }
    }

    const finalScore = scoreRef.current;
    let multiplier = difficulty === 'hard' ? 2 : (difficulty === 'normal' ? 1.5 : 1);
    const coinsReward = Math.floor((finalScore / 10) * multiplier);
    setEarnedCoins(coinsReward);

    if (currentUser) {
      (async () => {
        try {
          const { data: userData } = await supabase.from('users').select('user_point').eq('user_id', currentUser.id).single();
          const currentCoins = userData?.user_point || 0;
          const updatePayload: any = { user_point: currentCoins + coinsReward };
          
          const currentHighScore = highScores[difficulty];
          if (finalScore > currentHighScore) {
             setHighScores((prev: any) => ({ ...prev, [difficulty]: finalScore }));
             const columnToUpdate = difficulty === 'easy' ? 'high_score' : (difficulty === 'normal' ? 'high_score_normal' : 'high_score_hard');
             updatePayload[columnToUpdate] = finalScore;
          }
          await supabase.from('users').update(updatePayload).eq('user_id', currentUser.id);
        } catch (e) {
          console.error("DB Update Failed:", e);
        }
      })();
    }
  };

  const takeDamage = () => {
    if (invincibleRef.current || ['spectating', 'gameover', 'multi_gameover', 'countdown', 'trigger_reset'].includes(gameStateRef.current)) return;
    
    playHit(); // 💥 สั่งเล่นเสียงตอนโดนดาเมจตรงนี้เลย!

    invincibleRef.current = true; 
    setIsInvincible(true);
    setHearts((prev) => { 
      const newHearts = prev - 1; 
      if (newHearts <= 0 && !isDeadRef.current) {
         isDeadRef.current = true;
         setTimeout(() => handleGameOver(), 0);
      }
      return newHearts; 
    });

    setTimeout(() => { invincibleRef.current = false; setIsInvincible(false); }, IFRAME_DURATION);
  };

  const jump = () => {
    if (isLoading || ['waiting_host', 'countdown', 'spectating', 'gameover', 'multi_gameover', 'trigger_reset'].includes(gameStateRef.current)) return;
    if (gameState === 'ready') { setGameState('playing'); if (bgmRef.current) bgmRef.current.play().catch(e=>console.log(e)); }
    
    playJump(); // 🦘 สั่งเล่นเสียงตอนกดกระโดดตรงนี้เลย!
    setVelocity(JUMP_STRENGTH);
  };

  const spawnObstacle = (config: any, scale: number) => {
    const mapObstacles = currentMap?.allowed_obstacles;
    let safePool = ['pipe-top', 'pipe-bottom']; 
    if (mapObstacles) {
      if (Array.isArray(mapObstacles)) safePool = mapObstacles;
      else if (mapObstacles[difficulty] && mapObstacles[difficulty].length > 0) safePool = mapObstacles[difficulty];
    }
    const uniqueId = obstacleIdCounter.current++ + Math.floor(Math.random() * 1000000);
    const gapY = isDeadRef.current ? windowHeight / 2 : myYRef.current;
    
    const newObs = generateObstacle(uniqueId, safePool, windowWidth, windowHeight, scale, gapY);
    setObstacles(prev => [...prev, newObs]);
    if (mode === 'multi' && amIHost) channelRef.current?.send({ type: 'broadcast', event: 'spawn_obstacle', payload: newObs });
  };

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

          setBirdPosition((pos) => {
            const newPos = pos + velocity; myYRef.current = newPos; 
            const lavaZone = 120 * uiScale;
            if (currentMap?.has_hazard && newPos > windowHeight - lavaZone) { 
              if (gameState === 'playing') takeDamage(); 
              return windowHeight - lavaZone; 
            }
            const bottomSafeZone = 80 * uiScale;
            if (newPos < 0 || newPos > windowHeight - bottomSafeZone) { 
              if (gameState === 'playing') takeDamage(); 
              return newPos < 0 ? 5 : windowHeight - (bottomSafeZone + 5); 
            }
            return newPos;
          });
          setVelocity((v) => v + GRAVITY);

          if (gameState === 'playing') {
            scoreRef.current += 1; setScore(scoreRef.current);
          }

          setObstacles((prevObstacles) => {
            const birdX = windowWidth * 0.2; const birdY = birdPosition; const birdSize = 40 * uiScale;
            const movedObstacles = prevObstacles.map(obs => {
              let newX = obs.x - (currentSpeed + (obs.speedModX * screenSpeedRatio));
              let newY = obs.y + (obs.speedModY * screenSpeedRatio);
              if (obs.type === 'pipe-bottom') newY = windowHeight - obs.height;
              else if (obs.type === 'frog' && obs.baseY !== undefined) { obs.baseY = windowHeight - (80 * obs.scale); newY = obs.baseY - Math.abs(Math.sin(newX / 60)) * (180 * obs.scale); } 
              else if (obs.type === 'pendulum' && obs.baseY !== undefined) newY = obs.baseY + Math.sin(newX / 150) * (150 * obs.scale);
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
      };
      
      requestRef.current = requestAnimationFrame(update);
      return () => cancelAnimationFrame(requestRef.current!);
    }
  }, [gameState, velocity, birdPosition, currentMap, windowWidth, windowHeight, difficulty, mode, amIHost]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.code === 'Space') jump(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isLoading]);

  return {
    birdPosition, velocity, hearts, isInvincible, score, earnedCoins,
    setVelocity, jump, resetPhysics
  };
}