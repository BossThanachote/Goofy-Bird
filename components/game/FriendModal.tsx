'use client'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, UserPlus, UserMinus, Users, Bell, Search, Check, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSFX } from '@/hook/useSFX'

interface FriendModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser: any
}

type TabType = 'list' | 'add' | 'requests'

export default function FriendModal({ isOpen, onClose, currentUser }: FriendModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('list')
  const [loading, setLoading] = useState(false)
  const [friendsList, setFriendsList] = useState<any[]>([])
  const [requestsList, setRequestsList] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const { playHover, playClick } = useSFX()
  
  const [connections, setConnections] = useState<Record<string, { id: string, status: string, isSender: boolean }>>({})

  useEffect(() => {
    if (isOpen && currentUser) fetchFriendsAndRequests()
  }, [isOpen, currentUser])

  const fetchFriendsAndRequests = async () => {
    if (!currentUser) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('friends')
        .select(`
          id, status,
          sender:sender_id (user_id, username, user_tag, is_online),
          receiver:receiver_id (user_id, username, user_tag, is_online)
        `)
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)

      if (error) throw error

      if (data) {
        const rawData = data as any[]
        const pendingReceived: any[] = []
        const acceptedFriends: any[] = []
        const newConnections: Record<string, { id: string, status: string, isSender: boolean }> = {}

        rawData.forEach(f => {
          const isSender = f.sender?.user_id === currentUser.id
          const otherUserId = isSender ? f.receiver?.user_id : f.sender?.user_id

          newConnections[otherUserId] = {
            id: f.id,
            status: f.status,
            isSender: isSender
          }

          if (f.status === 'pending' && !isSender) {
            pendingReceived.push(f) 
          } else if (f.status === 'accepted') {
            acceptedFriends.push({ friendship_id: f.id, friend: isSender ? f.receiver : f.sender }) 
          }
        })

        setConnections(newConnections)
        setRequestsList(pendingReceived)
        setFriendsList(acceptedFriends)
      }
    } catch (err: any) {
      console.error("Error fetching friends:", err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim() || !currentUser) return
    setLoading(true)

    try {
      let query = supabase.from('users').select('user_id, username, user_tag, is_online').neq('user_id', currentUser.id).limit(10)

      if (searchQuery.includes('#')) {
        const [name, tag] = searchQuery.split('#')
        query = query.ilike('username', name).eq('user_tag', tag)
      } else {
        query = query.ilike('username', `%${searchQuery}%`)
      }

      const { data, error } = await query
      if (error) throw error
      setSearchResults(data || [])
    } catch (err: any) {
      console.error("Error searching users:", err.message)
    } finally {
      setLoading(false)
    }
  }

  const sendRequest = async (receiverId: string) => {
    try {
      const { error } = await supabase.from('friends').insert([{ sender_id: currentUser.id, receiver_id: receiverId, status: 'pending' }])
      if (error) throw error
      fetchFriendsAndRequests()
    } catch (err: any) {
      console.error("Error sending request:", err.message)
    }
  }

  const cancelRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase.from('friends').delete().eq('id', friendshipId)
      if (error) throw error
      fetchFriendsAndRequests()
    } catch (err: any) {
      console.error("Error cancelling request:", err.message)
    }
  }

  const handleRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      if (action === 'accept') {
        await supabase.from('friends').update({ status: 'accepted' }).eq('id', requestId)
      } else {
        await supabase.from('friends').delete().eq('id', requestId)
      }
      fetchFriendsAndRequests()
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message)
    }
  }

  if (!currentUser) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70"
          />

          {/* ✅ 1. ปรับขนาดกรอบ Modal ให้เหมาะกับจอมือถือ (ลด padding และ border) */}
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20, opacity: 0 }} 
          className="relative bg-[#F8FAFC] w-full max-w-2xl rounded-[2em] sm:rounded-[3em] shadow-2xl p-4 sm:p-8 border-[4px] sm:border-[6px] border-[#35A7FF] flex flex-col max-h-[85vh]">

            <button 
            onClick={() => {
              playClick()
              onClose()
            }} 
            onMouseEnter={playHover}
            className="absolute top-3 right-3 sm:top-6 sm:right-6 p-2 sm:p-3 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all shadow-sm z-10 cursor-pointer">
              <X size={20} className="sm:w-6 sm:h-6" />
            </button>

            {/* ✅ 2. ปรับขนาด Header */}
            <div className="text-center mb-4 sm:mb-6 mt-2 sm:mt-0">
              <h2 className="text-2xl sm:text-4xl font-black text-[#35A7FF] uppercase italic tracking-tighter drop-shadow-sm flex items-center justify-center gap-2 sm:gap-3">
                <Users size={28} className="sm:w-9 sm:h-9" /> Social Hub
              </h2>
            </div>

            {/* ✅ 3. ปรับขนาด Tabs ย่อคำบนมือถือให้ไม่เบียด */}
            <div className="flex justify-center gap-1 sm:gap-2 mb-4 sm:mb-6 bg-slate-100 p-1 sm:p-2 rounded-full border-2 border-slate-200 shrink-0">
              <button onClick={() => { playClick(); setActiveTab('list'); }} 
              className={`flex-1 py-2 sm:py-3 rounded-full font-black text-[9px] sm:text-xs uppercase transition-all flex items-center justify-center gap-1 sm:gap-2 ${activeTab === 'list' ? 'bg-[#35A7FF] text-white shadow-md' : 'text-slate-400 hover:bg-slate-200 cursor-pointer'}`}>
                <Users size={14} className="sm:w-4 sm:h-4" /> <span className="hidden sm:inline">My Friends</span><span className="sm:hidden">Friends</span>
              </button>
              <button onClick={() => { playClick(); setActiveTab('add'); }} 
              className={`flex-1 py-2 sm:py-3 rounded-full font-black text-[9px] sm:text-xs uppercase transition-all flex items-center justify-center gap-1 sm:gap-2 ${activeTab === 'add' ? 'bg-green-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-200 cursor-pointer'}`}>
                <UserPlus size={14} className="sm:w-4 sm:h-4" /> Add <span className="hidden sm:inline">Friend</span>
              </button>
              <button onClick={() => { playClick(); setActiveTab('requests'); }} 
              className={`relative flex-1 py-2 sm:py-3 rounded-full font-black text-[9px] sm:text-xs uppercase transition-all flex items-center justify-center gap-1 sm:gap-2 ${activeTab === 'requests' ? 'bg-yellow-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-200 cursor-pointer'}`}>
                <Bell size={14} className="sm:w-4 sm:h-4" /> Requests
                {requestsList.length > 0 && <span className="absolute top-1 right-2 sm:top-2 sm:right-4 w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full animate-pulse border border-white"></span>}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar bg-white rounded-2xl sm:rounded-3xl p-2 sm:p-4 border-2 border-slate-100 min-h-[50vh] sm:min-h-[300px]">

              {/* --- TAB: MY FRIENDS --- */}
              {activeTab === 'list' && (
                <div className="space-y-2 sm:space-y-3">
                  {friendsList.length === 0 ? (
                    <div className="text-center text-slate-400 py-10 font-bold uppercase text-xs sm:text-sm">You don't have any friends yet!</div>
                  ) : (
                    friendsList.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 sm:p-4 bg-slate-50 border-2 border-slate-100 rounded-xl sm:rounded-2xl hover:border-[#35A7FF] transition-all">
                        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#35A7FF] rounded-full flex items-center justify-center text-white font-black text-sm sm:text-base shrink-0">
                            {item.friend?.username?.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-black text-slate-700 italic text-sm sm:text-base truncate">
                            {item.friend?.username}
                            <span className="text-slate-400 font-bold text-[10px] sm:text-sm ml-1">#{item.friend?.user_tag || '0000'}</span>
                          </span>
                        </div>
                        
                        {/* ✅ 4. เปลี่ยนป้าย Friends เป็นระบบ Online / Offline */}
                        <div className="flex items-center gap-2 shrink-0">
                          {item.friend?.is_online ? (
                            <span className="flex items-center gap-1.5 text-[9px] sm:text-xs font-black bg-green-100 text-green-600 px-2 py-1 sm:px-3 sm:py-1 rounded-full border border-green-200 shadow-sm">
                              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 animate-pulse"></span>
                              Online
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-[9px] sm:text-xs font-black bg-slate-100 text-slate-500 px-2 py-1 sm:px-3 sm:py-1 rounded-full border border-slate-200">
                              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-400"></span>
                              Offline
                            </span>
                          )}
                        </div>

                      </div>
                    ))
                  )}
                </div>
              )}

              {/* --- TAB: ADD FRIEND --- */}
              {activeTab === 'add' && (
                <div>
                  <form onSubmit={handleSearch} className="flex gap-1 sm:gap-2 mb-4 sm:mb-6">
                    <input
                      type="text" placeholder="Search (e.g. Lilly#3212)"
                      value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 bg-slate-50 text-slate-800 border-2 border-slate-200 rounded-full px-4 py-2 sm:px-6 sm:py-3 font-bold text-xs sm:text-base focus:border-[#35A7FF] outline-none"
                    />
                    <button 
                    onClick={()=> playClick()} onMouseEnter={playHover}
                    type="submit" className="bg-[#35A7FF] text-white px-4 sm:px-6 rounded-full font-black shadow-md hover:scale-105 transition-all cursor-pointer">
                      <Search size={16} className="sm:w-5 sm:h-5" />
                    </button>
                  </form>

                  <div className="space-y-2 sm:space-y-3">
                    {loading ? <div className="text-center text-slate-400 font-bold animate-pulse text-xs sm:text-base">Searching...</div> :
                      searchResults.length === 0 && searchQuery ? <div className="text-center text-red-400 font-bold text-xs sm:text-base">User not found</div> :
                        searchResults.map((user) => {
                          const connection = connections[user.user_id]

                          return (
                            <div key={user.user_id} className="flex items-center justify-between p-3 sm:p-4 bg-slate-50 border-2 border-slate-100 rounded-xl sm:rounded-2xl">
                              <span className="font-black text-slate-700 italic text-sm sm:text-base truncate">
                                {user.username}
                                <span className="text-slate-400 font-bold text-[10px] sm:text-sm ml-1">#{user.user_tag || '0000'}</span>
                              </span>
                              
                              <div className="shrink-0 ml-2">
                                {!connection ? (
                                  <button onClick={() => { playClick(); sendRequest(user.user_id); }} onMouseEnter={playHover} className="bg-green-500 hover:bg-green-600 text-white p-1.5 sm:p-2 rounded-full shadow-md transition-all">
                                    <UserPlus size={16} className="sm:w-[18px] sm:h-[18px]" />
                                  </button>
                                ) : connection.status === 'accepted' ? (
                                  <button disabled className="bg-slate-300 text-white p-1.5 sm:p-2 rounded-full shadow-inner cursor-not-allowed">
                                    <Check size={16} className="sm:w-[18px] sm:h-[18px]" />
                                  </button>
                                ) : connection.isSender ? (
                                  <button onClick={() => { playClick(); cancelRequest(connection.id); }} onMouseEnter={playHover} className="bg-red-500 hover:bg-red-600 text-white p-1.5 sm:p-2 rounded-full shadow-md transition-all">
                                    <UserMinus size={16} className="sm:w-[18px] sm:h-[18px]" />
                                  </button>
                                ) : (
                                  <button onClick={() => setActiveTab('requests')} className="bg-yellow-500 hover:bg-yellow-600 text-white p-1.5 sm:p-2 rounded-full shadow-md transition-all">
                                    <Bell size={16} className="sm:w-[18px] sm:h-[18px]" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })
                    }
                  </div>
                </div>
              )}

              {/* --- TAB: REQUESTS --- */}
              {activeTab === 'requests' && (
                <div className="space-y-2 sm:space-y-3">
                  {requestsList.length === 0 ? (
                    <div className="text-center text-slate-400 py-10 font-bold uppercase text-xs sm:text-sm">No pending friend requests</div>
                  ) : (
                    requestsList.map((req) => (
                      <div key={req.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl sm:rounded-2xl gap-2">
                        <span className="font-black text-slate-700 italic text-sm sm:text-base truncate w-full">
                          <span className="text-yellow-600 mr-1 sm:mr-2 text-xs sm:text-base">Request from:</span>
                          {req.sender?.username}
                          <span className="text-yellow-600/60 font-bold text-[10px] sm:text-sm ml-1">#{req.sender?.user_tag || '0000'}</span>
                        </span>
                        <div className="flex gap-2 self-end sm:self-auto shrink-0">
                          <button onClick={() => handleRequest(req.id, 'accept')} className="bg-green-500 hover:bg-green-600 text-white p-1.5 sm:p-2 rounded-full shadow-md cursor-pointer"><Check size={16} className="sm:w-[18px] sm:h-[18px]" /></button>
                          <button onClick={() => handleRequest(req.id, 'reject')} className="bg-red-500 hover:bg-red-600 text-white p-1.5 sm:p-2 rounded-full shadow-md cursor-pointer"><Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}