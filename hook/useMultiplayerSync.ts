import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface UseMultiplayerSyncProps {
  mode: string;
  roomId: string | null;
  currentUser: any;
  birdData: any;
  myYRef: React.MutableRefObject<number>;
  invincibleRef: React.MutableRefObject<boolean>;
  isDeadRef: React.MutableRefObject<boolean>;
  gameStateRef: React.MutableRefObject<string>;
  gameState: string; 
  setGameState: (state: any) => void;
  setObstacles: React.Dispatch<React.SetStateAction<any[]>>;
  bgmRef: React.MutableRefObject<HTMLAudioElement | null>;
  gameOverSfxRef: React.MutableRefObject<HTMLAudioElement | null>;
}

export function useMultiplayerSync({
  mode, roomId, currentUser, birdData, myYRef, invincibleRef, isDeadRef, gameStateRef, gameState,
  setGameState, setObstacles, bgmRef, gameOverSfxRef
}: UseMultiplayerSyncProps) {
  
  const router = useRouter();
  const [amIHost, setAmIHost] = useState(false);
  const [ghostBirds, setGhostBirds] = useState<Record<string, any>>({});
  const [deadPlayers, setDeadPlayers] = useState<string[]>([]);
  const [multiGameOverCountdown, setMultiGameOverCountdown] = useState(10);
  const [multiRestartReady, setMultiRestartReady] = useState(false);
  const [multiPlayerDecisions, setMultiPlayerDecisions] = useState<Record<string, 'ready' | 'menu'>>({});

  const channelRef = useRef<any>(null);
  const myIdRef = useRef<string>('');
  const hostIdRef = useRef<string>('');
  const ghostLastSeen = useRef<Record<string, number>>({}); 

  const currentUserRef = useRef(currentUser);
  const birdDataRef = useRef(birdData);

  useEffect(() => { 
    currentUserRef.current = currentUser; 
    myIdRef.current = currentUser?.id || ''; 
  }, [currentUser]);
  
  useEffect(() => { birdDataRef.current = birdData; }, [birdData]);

  useEffect(() => {
    if (mode === 'multi' && roomId && currentUser?.id) {
      const initChannel = async () => {
        const { data: room } = await supabase.from('rooms').select('*').eq('id', roomId).single()
        if (room) {
          hostIdRef.current = room.host_id; 
          setAmIHost(room.host_id === currentUser.id) 
          
          const channel = supabase.channel(`game_${roomId}`)
          channelRef.current = channel

          channel.on('broadcast', { event: 'ghost_update' }, ({ payload }) => {
            if (payload.userId !== currentUser.id) {
              ghostLastSeen.current[payload.userId] = Date.now(); 
              setGhostBirds(prev => ({ ...prev, [payload.userId]: payload }));
              
              // ✅ ระบบรักษาตัวเอง (Self-Healing): ถ้าเน็ตกระตุกจนพลาดตอนเพื่อนตาย
              // ระบบจะเช็คจากชีพจร(อัปเดต)แทนว่าเพื่อนตายหรือยัง ถ้าตายจะจับยัดลงรายชื่อทันที!
              if (payload.isDead) {
                setDeadPlayers(prev => prev.includes(payload.userId) ? prev : [...prev, payload.userId]);
              }
            }
          })
          .on('broadcast', { event: 'spawn_obstacle' }, ({ payload }) => {
            if (hostIdRef.current !== currentUser.id && ['playing', 'spectating'].includes(gameStateRef.current)) {
               setObstacles(prev => {
                 if (prev.some(obs => obs.id === payload.id)) return prev; 
                 return [...prev, { ...payload, x: window.innerWidth + 50 }];
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
          .on('broadcast', { event: 'start_countdown' }, () => { setGameState('trigger_reset') })
          .on('broadcast', { event: 'player_decision' }, ({ payload }) => {
            setMultiPlayerDecisions(prev => ({ ...prev, [payload.userId]: payload.decision }))
          })
          .subscribe()

          const intervalId = setInterval(() => {
            if (channelRef.current && !invincibleRef.current) { 
               channelRef.current.send({ 
                 type: 'broadcast', event: 'ghost_update', 
                 payload: { userId: currentUser.id, y: myYRef.current, username: currentUserRef.current?.username || 'Player', birdUrl: birdDataRef.current?.image_url, isDead: isDeadRef.current } 
               })
            }
          }, 50);

          const heartbeatId = setInterval(() => {
            const now = Date.now();
            setGhostBirds(prev => {
              const updated = { ...prev };
              let changed = false;
              Object.keys(updated).forEach(userId => {
                 if (now - (ghostLastSeen.current[userId] || 0) > 3000) {
                    delete updated[userId];
                    changed = true;
                 }
              });
              if (changed) {
                setDeadPlayers(dp => dp.filter(id => updated[id] || id === currentUser.id)); 
              }
              return changed ? updated : prev;
            });
          }, 1000);

          return () => { clearInterval(intervalId); clearInterval(heartbeatId); };
        }
      }
      initChannel();
    }
    return () => { if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; } }
  }, [mode, roomId, currentUser?.id]); 

  useEffect(() => {
    if (mode === 'multi' && currentUser?.id) {
      const currentPlayers = [currentUser.id, ...Object.keys(ghostBirds)].sort();
      if (hostIdRef.current && !currentPlayers.includes(hostIdRef.current)) {
        const newHost = currentPlayers[0];
        hostIdRef.current = newHost;
        setAmIHost(currentUser.id === newHost);
      }
    }
  }, [ghostBirds, mode, currentUser?.id]);

  const ghostCount = Object.keys(ghostBirds).length;
  const deadCount = deadPlayers.length;

  useEffect(() => {
    if (mode === 'multi' && (gameState === 'spectating' || gameState === 'playing')) {
      const totalPlayers = 1 + ghostCount;
      if (deadCount >= totalPlayers && totalPlayers > 0) {
        setGameState('multi_gameover');
        setObstacles([]); 
        if (bgmRef.current) bgmRef.current.pause();
        if (gameOverSfxRef.current) { 
          gameOverSfxRef.current.currentTime = 0; 
          gameOverSfxRef.current.play().catch(e => console.log(e)); 
        }
      }
    }
  }, [deadCount, ghostCount, mode, gameState]); 

  useEffect(() => {
    if (gameState !== 'multi_gameover') {
      setMultiGameOverCountdown(10);
      return;
    }
    const interval = setInterval(() => {
      setMultiGameOverCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'multi_gameover' && multiGameOverCountdown === 0) {
      if (!multiRestartReady) {
        handleLeaveRoom();
        router.push('/');
      } else if (amIHost) {
        channelRef.current?.send({ type: 'broadcast', event: 'start_countdown' });
        setGameState('trigger_reset');
      }
    }
  }, [gameState, multiGameOverCountdown, multiRestartReady, amIHost, router]);

  const handleLeaveRoom = async () => {
    if (!currentUser?.id || !roomId) return;
    channelRef.current?.send({ type: 'broadcast', event: 'player_leave', payload: { userId: currentUser.id } });
    try {
      if (amIHost) await supabase.from('rooms').delete().eq('id', roomId);
      else await supabase.from('room_players').delete().eq('room_id', roomId).eq('user_id', currentUser.id);
    } catch(e) { console.error(e) }
  }

  const handleMultiDecision = (decision: 'ready' | 'menu') => {
    if (decision === 'ready') setMultiRestartReady(true);
    channelRef.current?.send({ type: 'broadcast', event: 'player_decision', payload: { userId: currentUser.id, decision } });
    if (decision === 'menu') { handleLeaveRoom(); router.push('/'); }
  }

  return {
    amIHost, ghostBirds, deadPlayers, multiGameOverCountdown, multiRestartReady, multiPlayerDecisions,
    channelRef, myIdRef, handleLeaveRoom, handleMultiDecision, setDeadPlayers, setMultiRestartReady, setMultiPlayerDecisions, setGhostBirds
  };
}