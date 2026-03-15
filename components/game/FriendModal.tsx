'use client'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, UserPlus, Users, Bell, Search, Check, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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

  useEffect(() => {
    if (isOpen && currentUser) fetchFriendsAndRequests()
  }, [isOpen, currentUser])

  // 🔄 ดึงข้อมูลเพื่อน (อัปเดต: ให้ดึง user_tag มาด้วย)
  const fetchFriendsAndRequests = async () => {
    if (!currentUser) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('friends')
        .select(`
          id, status,
          sender:sender_id (user_id, username, user_tag),
          receiver:receiver_id (user_id, username, user_tag)
        `)
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)

      if (error) throw error

      if (data) {
        const rawData = data as any[]
        const pending = rawData.filter(f => f.status === 'pending' && f.receiver?.user_id === currentUser.id)
        setRequestsList(pending)

        const accepted = rawData.filter(f => f.status === 'accepted').map(f => {
          const isSender = f.sender?.user_id === currentUser.id
          return { friendship_id: f.id, friend: isSender ? f.receiver : f.sender }
        })
        setFriendsList(accepted)
      }
    } catch (err: any) {
      console.error("Error fetching friends:", err.message)
    } finally {
      setLoading(false)
    }
  }

  // 🔍 ค้นหาผู้เล่นอื่น (อัปเดต: รองรับการค้นหาแบบใส่ #Tag)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim() || !currentUser) return
    setLoading(true)

    try {
      // ดึง user_tag มาด้วย
      let query = supabase.from('users').select('user_id, username, user_tag').neq('user_id', currentUser.id).limit(10)

      // เช็คว่าผู้เล่นพิมพ์ # มาด้วยไหม (เช่น Lilly#3212)
      if (searchQuery.includes('#')) {
        const [name, tag] = searchQuery.split('#')
        // ค้นหาแบบเป๊ะๆ ทั้งชื่อและ Tag
        query = query.ilike('username', name).eq('user_tag', tag)
      } else {
        // ค้นหาแค่ชื่อ (เจอทุกคนที่ชื่อนี้)
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
      const { data: existing } = await supabase
        .from('friends')
        .select('id')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUser.id})`)
        .single()

      if (existing) {
        alert("You already have a pending request or are already friends with this user!")
        return
      }

      const { error } = await supabase.from('friends').insert([{ sender_id: currentUser.id, receiver_id: receiverId, status: 'pending' }])
      if (error) throw error
      alert("ส่งคำขอเป็นเพื่อนเรียบร้อย!")
      fetchFriendsAndRequests()
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message)
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20, opacity: 0 }} className="relative bg-[#F8FAFC] w-full max-w-2xl rounded-[3em] shadow-2xl p-6 md:p-8 border-[6px] border-[#35A7FF] flex flex-col max-h-[85vh]">
            
            <button onClick={onClose} className="absolute top-6 right-6 p-3 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all shadow-sm z-10"><X size={24} /></button>

            <div className="text-center mb-6">
              <h2 className="text-4xl font-black text-[#35A7FF] uppercase italic tracking-tighter drop-shadow-sm flex items-center justify-center gap-3">
                <Users size={36} /> Social Hub
              </h2>
            </div>

            <div className="flex justify-center gap-2 mb-6 bg-slate-100 p-2 rounded-full border-2 border-slate-200">
              <button onClick={() => setActiveTab('list')} className={`flex-1 py-3 rounded-full font-black text-xs uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'list' ? 'bg-[#35A7FF] text-white shadow-md' : 'text-slate-400 hover:bg-slate-200'}`}><Users size={16}/> My Friends</button>
              <button onClick={() => setActiveTab('add')} className={`flex-1 py-3 rounded-full font-black text-xs uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'add' ? 'bg-green-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-200'}`}><UserPlus size={16}/> Add Friend</button>
              <button onClick={() => setActiveTab('requests')} className={`relative flex-1 py-3 rounded-full font-black text-xs uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'requests' ? 'bg-yellow-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-200'}`}>
                <Bell size={16}/> Requests
                {requestsList.length > 0 && <span className="absolute top-2 right-4 w-3 h-3 bg-red-500 rounded-full animate-pulse border border-white"></span>}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar bg-white rounded-3xl p-4 border-2 border-slate-100 min-h-[300px]">
              
              {/* --- TAB: MY FRIENDS --- */}
              {activeTab === 'list' && (
                <div className="space-y-3">
                  {friendsList.length === 0 ? (
                     <div className="text-center text-slate-400 py-10 font-bold uppercase text-sm">You don't have any friends yet!</div>
                  ) : (
                    friendsList.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl hover:border-[#35A7FF] transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#35A7FF] rounded-full flex items-center justify-center text-white font-black">{item.friend?.username?.charAt(0).toUpperCase()}</div>
                          <span className="font-black text-slate-700 italic">
                            {item.friend?.username}
                            {/* โชว์ #TAG สีเทาๆ */}
                            <span className="text-slate-400 font-bold text-sm ml-1">#{item.friend?.user_tag || '0000'}</span>
                          </span>
                        </div>
                        <span className="text-xs font-black bg-green-100 text-green-600 px-3 py-1 rounded-full">Friends</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* --- TAB: ADD FRIEND --- */}
              {activeTab === 'add' && (
                <div>
                  <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                    <input 
                      type="text" placeholder="Search username (e.g. Lilly or Lilly#3212)" 
                      value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      // ✅ เพิ่ม text-slate-800 ตรงบรรทัดนี้ครับ บอสจะได้เห็นตัวหนังสือสีเข้มๆ
                      className="flex-1 bg-slate-50 text-slate-800 border-2 border-slate-200 rounded-full px-6 py-3 font-bold focus:border-[#35A7FF] outline-none"
                    />
                    <button type="submit" className="bg-[#35A7FF] text-white px-6 rounded-full font-black shadow-md hover:scale-105 transition-all"><Search size={20}/></button>
                  </form>

                  <div className="space-y-3">
                    {loading ? <div className="text-center text-slate-400 font-bold animate-pulse">Searching...</div> : 
                     searchResults.length === 0 && searchQuery ? <div className="text-center text-red-400 font-bold">User not found</div> :
                     searchResults.map((user) => (
                       <div key={user.user_id} className="flex items-center justify-between p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl">
                         <span className="font-black text-slate-700 italic">
                            {user.username}
                            <span className="text-slate-400 font-bold text-sm ml-1">#{user.user_tag || '0000'}</span>
                         </span>
                         <button onClick={() => sendRequest(user.user_id)} className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-full shadow-md"><UserPlus size={18}/></button>
                       </div>
                     ))
                    }
                  </div>
                </div>
              )}

              {/* --- TAB: REQUESTS --- */}
              {activeTab === 'requests' && (
                <div className="space-y-3">
                  {requestsList.length === 0 ? (
                     <div className="text-center text-slate-400 py-10 font-bold uppercase text-sm">No pending friend requests</div>
                  ) : (
                    requestsList.map((req) => (
                      <div key={req.id} className="flex items-center justify-between p-4 bg-yellow-50 border-2 border-yellow-200 rounded-2xl">
                        <span className="font-black text-slate-700 italic">
                          <span className="text-yellow-600 mr-2">New Request from:</span> 
                          {req.sender?.username}
                          <span className="text-yellow-600/60 font-bold text-sm ml-1">#{req.sender?.user_tag || '0000'}</span>
                        </span>
                        <div className="flex gap-2">
                          <button onClick={() => handleRequest(req.id, 'accept')} className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-full shadow-md"><Check size={18}/></button>
                          <button onClick={() => handleRequest(req.id, 'reject')} className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-md"><Trash2 size={18}/></button>
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