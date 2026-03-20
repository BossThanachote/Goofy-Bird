'use client'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, Lock, Unlock, Play, CheckCircle2, ArrowLeft, Search, LogIn, Swords, Globe, MapIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSFX } from '@/hook/useSFX'
import { useRouter } from 'next/navigation'

interface MultiplayerModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser: any
}

type ViewState = 'menu' | 'create' | 'join' | 'lobby'

export default function MultiplayerModal({ isOpen, onClose, currentUser }: MultiplayerModalProps) {
  const router = useRouter()
  const { playHover, playClick, playBack } = useSFX()
  const [view, setView] = useState<ViewState>('menu')
  const [loading, setLoading] = useState(false)

  // 🟢 Create Room States
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [isPrivate, setIsPrivate] = useState(false)
  const [difficulty, setDifficulty] = useState('normal')
  
  // ✅ เปลี่ยนมาใช้ State แบบ Index (เพื่อทำปุ่ม ซ้าย-ขวา)
  const [maps, setMaps] = useState<any[]>([])
  const [currentMapIndex, setCurrentMapIndex] = useState(0)

  // 🔵 Join Room States
  const [availableRooms, setAvailableRooms] = useState<any[]>([])
  const [joinCode, setJoinCode] = useState('')
  
  // 🔐 Password Modal States
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [privateRoomTarget, setPrivateRoomTarget] = useState<{id: string, code: string} | null>(null)
  const [privateCodeInput, setPrivateCodeInput] = useState('')

  // 🟡 Lobby States
  const [currentRoom, setCurrentRoom] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [isReady, setIsReady] = useState(false)

  // ดึงรายชื่อด่าน
  useEffect(() => {
    if (view === 'create') {
      const fetchMaps = async () => {
        const { data } = await supabase.from('maps').select('id, map_name, preview_url, description, has_hazard').eq('is_active', true).order('created_at', { ascending: false })
        if (data && data.length > 0) {
          setMaps(data)
          setCurrentMapIndex(0)
        }
      }
      fetchMaps()
    }
  }, [view])

  useEffect(() => {
    if (isOpen) {
      setView('menu')
      setCurrentRoom(null)
      setPlayers([])
      setIsReady(false)
      setShowPasswordModal(false)
    } else {
      if (currentRoom) handleLeaveRoom() 
    }
  }, [isOpen])

  useEffect(() => {
    if (view === 'lobby' && currentRoom) {
      fetchRoomPlayers()

      const channel = supabase.channel(`room_${currentRoom.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${currentRoom.id}` }, 
          () => fetchRoomPlayers()
        )
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${currentRoom.id}` }, 
          (payload) => {
            if (payload.new.status === 'playing') {
              const finalMapId = payload.new.map_id || currentRoom.map_id;
              router.push(`/play?mode=multi&roomId=${currentRoom.id}&mapId=${finalMapId}`)
            }
          }
        )
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'rooms', filter: `id=eq.${currentRoom.id}` }, 
          () => {
            alert("Host closed the room.")
            setView('menu')
            setCurrentRoom(null)
          }
        )
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
  }, [view, currentRoom])

  const fetchRoomPlayers = async () => {
    if (!currentRoom) return
    const { data } = await supabase
      .from('room_players')
      .select('id, is_ready, user_id, users(username, user_tag)')
      .eq('room_id', currentRoom.id)
      .order('joined_at', { ascending: true })
    
    if (data) setPlayers(data)
  }

  // ✅ ฟังก์ชันเลื่อนด่าน ซ้าย-ขวา
  const handlePrevMap = () => {
    playHover()
    setCurrentMapIndex((prev) => (prev === 0 ? maps.length - 1 : prev - 1))
  }

  const handleNextMap = () => {
    playHover()
    setCurrentMapIndex((prev) => (prev === maps.length - 1 ? 0 : prev + 1))
  }

  const handleCreateRoom = async () => {
    if (!currentUser) return
    setLoading(true)
    try {
      await supabase.from('rooms').delete().eq('host_id', currentUser.id)

      const code = Math.floor(100000 + Math.random() * 900000).toString() 
      const selectedMapId = maps.length > 0 ? maps[currentMapIndex].id : null;

      const { data: room, error: roomErr } = await supabase.from('rooms').insert([
        { room_code: code, host_id: currentUser.id, max_players: maxPlayers, is_private: isPrivate, difficulty, map_id: selectedMapId }
      ]).select().single()
      if (roomErr) throw roomErr

      const { error: playerErr } = await supabase.from('room_players').insert([
        { room_id: room.id, user_id: currentUser.id, is_ready: true } 
      ])
      if (playerErr) throw playerErr

      setCurrentRoom(room)
      setIsReady(true)
      setView('lobby')
    } catch (err: any) {
      alert("Error creating room: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableRooms = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('rooms')
      .select('id, room_code, max_players, difficulty, is_private, host_id, map_id, users!rooms_host_id_fkey(username)')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
    
    if (error) console.error("Error fetching rooms:", error.message)
    if (data) setAvailableRooms(data)
    setLoading(false)
  }

  const handleJoinRoom = async (roomIdToJoin?: string, isPrivate?: boolean, correctCode?: string, bypassPassword = false) => {
    if (!currentUser) return

    if (roomIdToJoin && isPrivate && !bypassPassword) {
      setPrivateRoomTarget({ id: roomIdToJoin, code: correctCode || '' })
      setPrivateCodeInput('')
      setShowPasswordModal(true)
      return
    }

    setLoading(true)
    try {
      let targetRoom = null

      if (roomIdToJoin) {
        const { data } = await supabase.from('rooms').select('*').eq('id', roomIdToJoin).single()
        targetRoom = data
      } else if (joinCode) {
        const { data } = await supabase.from('rooms').select('*').eq('room_code', joinCode).eq('status', 'waiting').single()
        if (!data) throw new Error("Room not found or game already started")
        targetRoom = data
      }

      if (!targetRoom) throw new Error("Invalid room")

      const { count } = await supabase.from('room_players').select('*', { count: 'exact', head: true }).eq('room_id', targetRoom.id)
      if (count && count >= targetRoom.max_players) throw new Error("Room is full")

      const { error } = await supabase.from('room_players').insert([{ room_id: targetRoom.id, user_id: currentUser.id }])
      if (error && error.code !== '23505') throw error 

      setCurrentRoom(targetRoom)
      setIsReady(false)
      setView('lobby')
      setShowPasswordModal(false)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const submitPrivateRoom = () => {
    if (!privateRoomTarget) return
    if (privateCodeInput !== privateRoomTarget.code) {
      alert("❌ Incorrect room code!")
      return
    }
    handleJoinRoom(privateRoomTarget.id, true, privateRoomTarget.code, true)
  }

  const handleLeaveRoom = async () => {
    if (!currentUser || !currentRoom) return
    
    const roomIdToLeave = currentRoom.id
    const isHost = currentRoom.host_id === currentUser.id

    setCurrentRoom(null)
    setPlayers([])
    setView('menu')

    try {
      if (isHost) {
        await supabase.from('rooms').delete().eq('id', roomIdToLeave)
      } else {
        await supabase.from('room_players').delete().eq('room_id', roomIdToLeave).eq('user_id', currentUser.id)
      }
    } catch(e) { console.error(e) }
  }

  const toggleReady = async () => {
    if (!currentUser || !currentRoom) return
    const newState = !isReady
    setIsReady(newState)
    await supabase.from('room_players').update({ is_ready: newState }).eq('room_id', currentRoom.id).eq('user_id', currentUser.id)
  }

  const handleStartGame = async () => {
    if (!currentRoom) return
    await supabase.from('rooms').update({ status: 'playing' }).eq('id', currentRoom.id)
  }

  if (!currentUser) {
    return (
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80" />
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-3xl p-8 text-center border-4 border-red-500 z-10">
              <h2 className="text-2xl font-black text-red-500 mb-4 uppercase tracking-wider">Login Required</h2>
              <p className="text-slate-500 font-bold mb-6">Please log in or register to play Multiplayer mode.</p>
              <button onClick={onClose} className="bg-red-500 text-white px-8 py-3 rounded-full font-black uppercase tracking-widest shadow-md">Close</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    )
  }

  const currentMap = maps[currentMapIndex];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { if(view !== 'lobby') { playBack(); onClose(); } }} className="absolute inset-0 bg-black/80" />

          {/* ✅ จำกัดความสูง max-h ไว้ที่ 90vh ป้องกันการล้นจอ */}
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20, opacity: 0 }} 
          className="relative bg-[#F8FAFC] w-full max-w-3xl rounded-[2.5em] sm:rounded-[3em] shadow-2xl p-4 sm:p-6 border-[6px] border-white flex flex-col max-h-[90vh] overflow-hidden">
            
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#FF5F5F]/5 rounded-full pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#35A7FF]/5 rounded-full pointer-events-none" />

            {view !== 'lobby' && (
              <button onClick={() => { playBack(); onClose() }} onMouseEnter={playHover} className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 sm:p-3 bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full shadow-sm z-50 transition-all cursor-pointer shrink-0">
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            )}

            {/* --- VIEW: MENU --- */}
            {view === 'menu' && (
              <div className="flex flex-col items-center justify-center h-full flex-1 gap-4 sm:gap-8 z-10 overflow-y-auto">
                <div className="text-center mt-6 sm:mt-0 shrink-0">
                  <h2 className="text-4xl sm:text-6xl font-black text-[#FF5F5F] uppercase italic tracking-tighter drop-shadow-[0_4px_0_rgba(255,95,95,0.2)] mb-2 flex items-center justify-center gap-2 sm:gap-4">
                    <Swords size={32} className="sm:w-14 sm:h-14 text-[#FF5F5F]" /> MULTIPLAYER
                  </h2>
                  <p className="text-slate-400 font-bold text-[10px] sm:text-sm uppercase tracking-widest bg-white px-4 py-1 rounded-full inline-block border-2 border-slate-100">
                    Play with friends or challenge the world
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full px-2 sm:px-8 mt-2 sm:mt-4 shrink-0">
                  <button onClick={() => { playClick(); setView('create') }} onMouseEnter={playHover} className="relative flex-1 bg-gradient-to-b from-[#4DB8FF] to-[#1E8FE1] text-white p-6 sm:p-10 rounded-[2em] shadow-[0_8px_0_#156CAE] hover:translate-y-1 hover:shadow-[0_4px_0_#156CAE] active:scale-95 transition-all flex flex-col items-center justify-center gap-2 border-4 border-white group overflow-hidden cursor-pointer">
                    <div className="absolute -right-6 -top-6 text-white opacity-20 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500"><Users size={120} /></div>
                    <div className="bg-white/30 p-3 sm:p-4 rounded-full mb-2 z-10 border-2 border-white/40 shadow-inner"><Users size={32} className="sm:w-10 sm:h-10" /></div>
                    <span className="font-black text-xl sm:text-3xl uppercase tracking-tighter z-10 drop-shadow-md">Create Room</span>
                    <span className="text-blue-100 font-bold text-[9px] sm:text-xs uppercase tracking-widest z-10">Host a match</span>
                  </button>

                  <button onClick={() => { playClick(); setView('join'); fetchAvailableRooms(); }} onMouseEnter={playHover} className="relative flex-1 bg-gradient-to-b from-[#FFDA66] to-[#F3BA16] text-white p-6 sm:p-10 rounded-[2em] shadow-[0_8px_0_#C59500] hover:translate-y-1 hover:shadow-[0_4px_0_#C59500] active:scale-95 transition-all flex flex-col items-center justify-center gap-2 border-4 border-white group overflow-hidden cursor-pointer">
                    <div className="absolute -left-6 -bottom-6 text-white opacity-20 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500"><Globe size={120} /></div>
                    <div className="bg-white/40 p-3 sm:p-4 rounded-full mb-2 z-10 border-2 border-white/40 shadow-inner"><Search size={32} className="sm:w-10 sm:h-10" /></div>
                    <span className="font-black text-xl sm:text-3xl uppercase tracking-tighter z-10 drop-shadow-md">Find Room</span>
                    <span className="text-yellow-50 font-bold text-[9px] sm:text-xs uppercase tracking-widest z-10">Join a match</span>
                  </button>
                </div>
              </div>
            )}

            {/* --- VIEW: CREATE ROOM --- */}
            {view === 'create' && (
              <div className="flex flex-col h-full w-full z-10 overflow-hidden">
                <button onClick={() => { playBack(); setView('menu') }} onMouseEnter={playHover} className="flex items-center gap-2 text-slate-400 hover:text-[#FF5F5F] font-bold mb-3 sm:mb-4 w-fit cursor-pointer bg-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-sm border-2 border-slate-100 text-xs sm:text-sm shrink-0"><ArrowLeft size={16}/> Back</button>
                
                <h2 className="text-2xl sm:text-4xl font-black text-[#35A7FF] uppercase italic tracking-tighter mb-3 sm:mb-4 text-center shrink-0">Room Settings</h2>
                
                {/* ✅ โซนตั้งค่า ที่สามารถเลื่อน (Scroll) ได้ถ้ายาวเกินจอ */}
                <div className="flex-1 space-y-3 sm:space-y-4 bg-white p-3 sm:p-6 rounded-2xl sm:rounded-[2em] border-2 border-slate-100 shadow-sm overflow-y-auto custom-scrollbar pr-2 min-h-0">
                  
                  {/* 🗺️ ระบบเลือกด่านแบบลูกศร ซ้าย-ขวา */}
                  <div className="bg-slate-50 p-3 rounded-xl sm:rounded-2xl border-2 border-slate-100">
                    <label className="block text-slate-400 font-bold uppercase tracking-widest text-[9px] sm:text-xs mb-2 text-center">Map Environment</label>
                    
                    {maps.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between mb-2 w-full">
                          <button onClick={handlePrevMap} className="p-1.5 sm:p-2 bg-white border-2 border-slate-200 hover:bg-[#35A7FF] text-slate-500 hover:text-white hover:border-[#35A7FF] rounded-full transition-all cursor-pointer active:scale-95 shrink-0">
                            <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
                          </button>
                          
                          <div className="flex-1 mx-2 sm:mx-4 relative rounded-lg sm:rounded-xl overflow-hidden border-2 sm:border-4 border-white aspect-[21/9] sm:aspect-[16/7] max-h-[100px] sm:max-h-[160px] shadow-sm bg-slate-200">
                            <img 
                              src={currentMap?.preview_url || 'https://placehold.co/600x400/8EC5FC/FFFFFF/png?text=No+Preview'} 
                              alt={currentMap?.map_name} 
                              className="w-full h-full object-cover"
                            />
                            {currentMap?.has_hazard && (
                              <div className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-red-500 text-white text-[8px] sm:text-[10px] font-black px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md uppercase tracking-wider shadow-md animate-pulse">
                                ⚠️ Hazard
                              </div>
                            )}
                          </div>

                          <button onClick={handleNextMap} className="p-1.5 sm:p-2 bg-white border-2 border-slate-200 hover:bg-[#35A7FF] text-slate-500 hover:text-white hover:border-[#35A7FF] rounded-full transition-all cursor-pointer active:scale-95 shrink-0">
                            <ChevronRight size={18} className="sm:w-5 sm:h-5" />
                          </button>
                        </div>
                        <div className="text-center overflow-hidden w-full">
                          <h3 className="text-sm sm:text-lg font-black text-slate-800 uppercase italic tracking-tight truncate">{currentMap?.map_name}</h3>
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-xs font-bold text-slate-400 py-4">Loading maps...</div>
                    )}
                  </div>

                  {/* 🎚️ โซนตั้งค่าอื่นๆ (ปรับให้เล็กลง กระชับขึ้น) */}
                  <div>
                    <label className="block text-slate-400 font-bold uppercase tracking-widest text-[9px] sm:text-xs mb-1.5 sm:mb-2">Difficulty</label>
                    <div className="flex gap-2">
                      {['easy', 'normal', 'hard'].map(diff => (
                        <button key={diff} onClick={() => { playClick(); setDifficulty(diff)}} onMouseEnter={playHover} 
                        className={`flex-1 py-2 sm:py-3 rounded-xl font-black uppercase text-[10px] sm:text-xs border-2 transition-all cursor-pointer ${difficulty === diff ? (diff==='easy'?'bg-green-500 text-white border-green-500 shadow-md':diff==='normal'?'bg-yellow-500 text-white border-yellow-500 shadow-md':'bg-red-500 text-white border-red-500 shadow-md') : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}>
                          {diff}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold uppercase tracking-widest text-[9px] sm:text-xs mb-1.5 sm:mb-2 flex justify-between">
                      <span>Max Players</span>
                      <span className="text-[#35A7FF] bg-blue-50 px-2 py-0.5 rounded-md">{maxPlayers} Players</span>
                    </label>
                    <input type="range" min="1" max="4" value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))} className="w-full h-2 sm:h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#35A7FF]" />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold uppercase tracking-widest text-[9px] sm:text-xs mb-1.5 sm:mb-2">Privacy</label>
                    <div className="flex gap-2">
                      <button onClick={() => { playClick(); setIsPrivate(false)}} onMouseEnter={playHover} className={`flex-1 flex items-center justify-center gap-1.5 py-2 sm:py-3 rounded-xl font-black uppercase text-[10px] sm:text-xs border-2 transition-all cursor-pointer ${!isPrivate ? 'bg-[#35A7FF] text-white border-[#35A7FF] shadow-md' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}>
                        <Unlock size={14}/> Public
                      </button>
                      <button onClick={() => { playClick(); setIsPrivate(true)}} onMouseEnter={playHover} className={`flex-1 flex items-center justify-center gap-1.5 py-2 sm:py-3 rounded-xl font-black uppercase text-[10px] sm:text-xs border-2 transition-all cursor-pointer ${isPrivate ? 'bg-slate-700 text-white border-slate-700 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}>
                        <Lock size={14}/> Private
                      </button>
                    </div>
                  </div>
                </div>

                {/* ✅ ปุ่ม Create Room ถูกย้ายออกมานอก Scroll โซน ทำให้มันลอยอยู่ด้านล่างเสมอ ไม่มีวันตกขอบ */}
                <div className="shrink-0 mt-3 sm:mt-4">
                  <button onClick={() => { playClick(); handleCreateRoom()}} onMouseEnter={playHover} disabled={loading || maps.length === 0} className="w-full bg-[#FF5F5F] hover:bg-[#ff4d4d] text-white py-3 sm:py-4 rounded-full font-black text-sm sm:text-lg uppercase tracking-widest shadow-[0_4px_0_#D14848] active:translate-y-1 active:shadow-none disabled:opacity-50 transition-all cursor-pointer">
                    {loading ? 'Creating...' : 'Create Room'}
                  </button>
                </div>
              </div>
            )}

            {/* --- VIEW: JOIN ROOM --- */}
            {view === 'join' && (
              <div className="flex flex-col h-full flex-1 z-10 overflow-hidden">
                <button onClick={() => { playBack(); setView('menu') }} onMouseEnter={playHover} className="flex items-center gap-2 text-slate-400 hover:text-[#FF5F5F] font-bold mb-3 sm:mb-4 w-fit cursor-pointer bg-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-sm border-2 border-slate-100 text-xs sm:text-sm shrink-0"><ArrowLeft size={16}/> Back</button>
                
                <div className="bg-slate-100 p-2 sm:p-2.5 rounded-2xl sm:rounded-full mb-4 sm:mb-6 flex gap-2 border-2 border-slate-200 shadow-inner shrink-0">
                  <input type="text" placeholder="Enter 6-digit Code" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={6} className="flex-1 bg-white px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-full font-black text-center text-xs sm:text-base uppercase outline-none border-2 border-slate-300 focus:border-[#FFD151] text-slate-800 placeholder-slate-400 transition-all" />
                  <button onClick={() => { playClick(); handleJoinRoom()}} onMouseEnter={playHover} disabled={joinCode.length !== 6 || loading} className="bg-[#FFD151] text-white px-5 sm:px-8 rounded-xl sm:rounded-full font-black text-xs sm:text-sm shadow-[0_4px_0_#C59500] active:translate-y-1 active:shadow-none disabled:opacity-50 hover:bg-[#FABC05] cursor-pointer transition-all">JOIN</button>
                </div>

                <div className="flex items-center justify-between mb-2 shrink-0">
                  <h3 className="text-slate-400 font-bold uppercase tracking-widest text-[10px] sm:text-xs">Available Rooms</h3>
                  <button onClick={fetchAvailableRooms} className="text-[#35A7FF] text-[10px] sm:text-xs font-bold hover:underline cursor-pointer">Refresh</button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 sm:space-y-3 custom-scrollbar pr-1 sm:pr-2 min-h-0 bg-white p-2 sm:p-4 rounded-[1.5em] sm:rounded-[2em] border-2 border-slate-100 shadow-sm">
                  {loading ? <div className="text-center text-slate-400 animate-pulse mt-8 font-bold text-xs sm:text-sm">Searching for rooms...</div> : 
                    availableRooms.length === 0 ? <div className="text-center text-slate-400 mt-8 font-bold uppercase text-[10px] sm:text-xs">No rooms available</div> :
                    availableRooms.map(room => (
                      <div key={room.id} className="bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-slate-100 hover:border-[#35A7FF] flex items-center justify-between transition-all group">
                        <div className="overflow-hidden">
                          <p className="font-black text-slate-700 italic text-xs sm:text-sm flex items-center gap-1.5 truncate">
                            Host: {room.users?.username}
                            {room.is_private ? <span title="Private Room" className="flex items-center shrink-0"><Lock size={12} className="text-red-500 sm:w-3.5 sm:h-3.5" /></span> : <span title="Public Room" className="flex items-center shrink-0"><Unlock size={12} className="text-green-500 sm:w-3.5 sm:h-3.5" /></span>}
                          </p>
                          <div className="flex gap-1.5 mt-1 sm:mt-1.5">
                            <span className={`text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase text-white ${room.difficulty==='easy'?'bg-green-500':room.difficulty==='normal'?'bg-yellow-500':'bg-red-500'}`}>{room.difficulty}</span>
                            <span className="text-[8px] sm:text-[9px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md uppercase flex items-center"><Users size={8} className="inline mr-1"/> {room.max_players} Max</span>
                          </div>
                        </div>
                        <button onClick={() => { playClick(); handleJoinRoom(room.id, room.is_private, room.room_code)}} onMouseEnter={playHover} 
                        className={`text-white px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-black text-[10px] sm:text-xs uppercase shadow-[0_3px_0_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none group-hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${room.is_private ? 'bg-red-500' : 'bg-[#35A7FF]'}`}>
                          {room.is_private ? <Lock size={12} className="hidden sm:block"/> : <LogIn size={12} className="hidden sm:block"/>} JOIN
                        </button>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {/* --- VIEW: LOBBY --- (ลบ padding ยืดเยื้อออก) */}
            {view === 'lobby' && currentRoom && (
              <div className="flex flex-col h-full flex-1 z-10 overflow-hidden">
                <div className="flex justify-between items-center mb-3 sm:mb-4 shrink-0">
                  <button onClick={() => { playBack(); handleLeaveRoom() }} onMouseEnter={playHover} className="bg-white border-2 border-red-200 text-red-500 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full font-bold text-[9px] sm:text-xs uppercase hover:bg-red-50 shadow-sm cursor-pointer">Leave Room</button>
                  <div className="text-right flex items-center gap-1.5 sm:gap-3 bg-white p-1 sm:p-1.5 rounded-full border-2 border-slate-100 shadow-sm">
                    <span className="text-slate-400 font-bold text-[7px] sm:text-[9px] uppercase tracking-widest pl-1.5">Code</span>
                    <span className="font-black text-xs sm:text-base text-[#35A7FF] tracking-widest bg-blue-50 px-2.5 sm:px-4 py-0.5 sm:py-1 rounded-full select-all">{currentRoom.room_code}</span>
                  </div>
                </div>

                <div className="flex justify-between bg-white border-2 border-slate-100 shadow-sm p-2.5 sm:p-4 rounded-[1.5em] sm:rounded-[2em] mb-3 sm:mb-4 shrink-0">
                  <div className="text-center flex-1 border-r-2 border-slate-100"><p className="text-slate-400 font-bold text-[7px] sm:text-[9px] uppercase mb-0.5">Difficulty</p><p className={`font-black text-[10px] sm:text-sm uppercase leading-none ${currentRoom.difficulty==='easy'?'text-green-500':currentRoom.difficulty==='normal'?'text-yellow-500':'text-red-500'}`}>{currentRoom.difficulty}</p></div>
                  <div className="text-center flex-1 border-r-2 border-slate-100"><p className="text-slate-400 font-bold text-[7px] sm:text-[9px] uppercase mb-0.5">Players</p><p className="font-black text-slate-700 text-[10px] sm:text-sm leading-none">{players.length} / {currentRoom.max_players}</p></div>
                  <div className="text-center flex-1"><p className="text-slate-400 font-bold text-[7px] sm:text-[9px] uppercase mb-0.5">Privacy</p><p className={`font-black text-[10px] sm:text-sm uppercase leading-none ${currentRoom.is_private ? 'text-red-500' : 'text-green-500'}`}>{currentRoom.is_private ? 'Private' : 'Public'}</p></div>
                </div>

                <div className="flex-1 space-y-2 sm:space-y-3 overflow-y-auto pr-1 custom-scrollbar min-h-0">
                  {[...Array(currentRoom.max_players)].map((_, i) => {
                    const p = players[i]
                    return (
                      <div key={i} className={`flex items-center justify-between p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all ${p ? (p.is_ready ? 'bg-green-50 border-green-300 shadow-sm' : 'bg-white border-slate-200') : 'bg-slate-50 border-dashed border-slate-200 opacity-60'}`}>
                        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                          <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-white text-[10px] sm:text-sm shrink-0 shadow-inner ${p ? 'bg-[#35A7FF]' : 'bg-slate-300'}`}>
                            {p ? p.users?.username?.charAt(0).toUpperCase() : '?'}
                          </div>
                          <span className={`font-black italic text-xs sm:text-base truncate ${p ? 'text-slate-700' : 'text-slate-400'}`}>
                            {p ? p.users?.username : 'Waiting...'}
                            {p && p.user_id === currentRoom.host_id && <span className="ml-1.5 sm:ml-2 text-[7px] sm:text-[9px] bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded-sm not-italic align-middle">HOST</span>}
                            {p && p.user_id === currentUser.id && <span className="ml-1.5 sm:ml-2 text-[7px] sm:text-[9px] bg-[#35A7FF] text-white px-1.5 py-0.5 rounded-sm not-italic align-middle">YOU</span>}
                          </span>
                        </div>
                        {p && (
                          <div className={`flex items-center gap-1 font-black text-[8px] sm:text-[10px] uppercase px-2 sm:px-2.5 py-1 rounded-full shrink-0 ${p.is_ready ? 'text-green-600 bg-green-100 border border-green-200' : 'text-slate-500 bg-slate-100 border border-slate-200'}`}>
                            {p.is_ready ? <><CheckCircle2 size={10} className="sm:w-3 sm:h-3"/> READY</> : 'NOT READY'}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t-2 border-slate-200 flex gap-2 sm:gap-4 shrink-0">
                  <button onClick={() => { playClick(); toggleReady() }} onMouseEnter={playHover} className={`flex-1 py-2.5 sm:py-3.5 rounded-full font-black text-xs sm:text-sm uppercase tracking-widest shadow-[0_4px_0_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none transition-all cursor-pointer ${isReady ? 'bg-orange-400 text-white' : 'bg-green-500 text-white'}`}>
                    {isReady ? 'Cancel Ready' : 'Ready!'}
                  </button>

                  {currentUser.id === currentRoom.host_id && (
                    <button 
                      onClick={() => { playClick(); handleStartGame() }} 
                      onMouseEnter={playHover}
                      disabled={players.some(p => !p.is_ready) || players.length === 0} 
                      className="flex-1 bg-[#35A7FF] text-white py-2.5 sm:py-3.5 rounded-full font-black text-xs sm:text-sm uppercase tracking-widest shadow-[0_4px_0_#288DE0] disabled:opacity-50 disabled:shadow-none disabled:translate-y-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-1 sm:gap-2 cursor-pointer"
                    >
                      <Play fill="white" className="w-3.5 h-3.5 sm:w-5 sm:h-5" /> Start
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 🔐 Password Modal */}
            <AnimatePresence>
              {showPasswordModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 rounded-[2.5em] sm:rounded-[3em]">
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="bg-white p-6 rounded-[2em] w-full max-w-sm border-4 border-red-500 text-center shadow-2xl">
                    <div className="bg-red-100 w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 text-red-500">
                      <Lock size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 mb-1 uppercase tracking-tighter italic">Private Room</h3>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-6">Enter 6-digit code to join</p>
                    
                    <input 
                      type="text" maxLength={6} placeholder="------"
                      value={privateCodeInput} onChange={(e)=>setPrivateCodeInput(e.target.value.toUpperCase())} 
                      className="w-full bg-slate-50 border-2 border-slate-200 text-slate-800 font-black text-center text-3xl py-4 rounded-2xl mb-6 focus:border-red-500 focus:bg-white outline-none transition-all tracking-[0.3em]" 
                      autoFocus 
                    />
                    
                    <div className="flex gap-2">
                      <button onClick={() => { setShowPasswordModal(false); setPrivateCodeInput(''); setPrivateRoomTarget(null); playBack(); }} className="flex-1 bg-slate-100 text-slate-500 border-2 border-slate-200 py-3 rounded-xl font-black uppercase hover:bg-slate-200 active:scale-95 transition-all cursor-pointer">Cancel</button>
                      <button onClick={() => { playClick(); submitPrivateRoom(); }} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-black uppercase shadow-[0_4px_0_#991b1b] hover:translate-y-1 hover:shadow-none active:scale-95 transition-all cursor-pointer">Join</button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}