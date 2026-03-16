'use client'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, RefreshCcw, AlertTriangle, Bird, Package, Map as MapIcon, Music, X } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'

export default function TrashPage() {
  const [activeTab, setActiveTab] = useState<'characters' | 'items' | 'maps' | 'sounds'>('characters')
  const [trashData, setTrashData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // ✅ 1. เพิ่ม State สำหรับจัดการ Modal
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: 'restore' | 'delete' | null;
    id: string;
    name: string;
  }>({ isOpen: false, type: null, id: '', name: '' })
  const [isProcessing, setIsProcessing] = useState(false) // เช็คตอนกำลังกดปุ่มยืนยันใน Modal

  useEffect(() => { fetchTrashData() }, [activeTab])

  const fetchTrashData = async () => {
    setLoading(true)
    setTrashData([]) 
    
    try {
      const { data, error } = await supabaseAdmin
        .from(activeTab)
        .select('*')
        .eq('is_deleted', true) 
      
      if (error) throw error

      const formattedData = data.map(item => ({
        id: activeTab === 'sounds' ? item.id : (item.character_id || item.item_id || item.map_id),
        name: activeTab === 'sounds' ? item.sound_name : (item.character_name || item.item_name || item.map_name),
        image: activeTab === 'sounds' ? null : (item.image_url || item.icon_url), 
        description: activeTab === 'sounds' ? item.category : (item.description || ''),
        raw_data: item 
      }))

      setTrashData(formattedData)
    } catch (err: any) {
      console.error("Error fetching trash:", err.message)
    } finally {
      setLoading(false)
    }
  }

  // ✅ 2. เปลี่ยนฟังก์ชันเรียกใช้งาน ให้ไปเปิด Modal แทนการใช้ Alert
  const triggerRestore = (id: string, name: string) => {
    setModalConfig({ isOpen: true, type: 'restore', id, name })
  }

  const triggerHardDelete = (id: string, name: string) => {
    setModalConfig({ isOpen: true, type: 'delete', id, name })
  }

  // ✅ 3. ฟังก์ชันหลักที่จะทำงานเมื่อกดยืนยันใน Modal
  const executeAction = async () => {
    if (!modalConfig.type) return
    setIsProcessing(true)

    try {
      const idColumn = activeTab === 'sounds' ? 'id' : (activeTab === 'characters' ? 'character_id' : activeTab === 'items' ? 'item_id' : 'map_id')

      if (modalConfig.type === 'restore') {
        const { error } = await supabaseAdmin
          .from(activeTab)
          .update({ is_deleted: false })
          .eq(idColumn, modalConfig.id)
        if (error) throw error
      } 
      else if (modalConfig.type === 'delete') {

        if (activeTab === 'characters') {
          const characterId = modalConfig.id;
          const DEFAULT_BIRD_ID = 'e114c607-b017-4ea6-a306-8e5c0808092a'; // น้อง Gege

          // 1. ดึงข้อมูลความแรร์มาคิดเงินคืน
          const { data: charData } = await supabaseAdmin.from('characters').select('rarity').eq('character_id', characterId).single();
          const rarity = charData?.rarity || 'Common';
          
          let refundAmount = 2000;
          if (rarity === 'Mystic') refundAmount = 30000;
          else if (rarity === 'Legendary') refundAmount = 20000;
          else if (rarity === 'Epic') refundAmount = 10000;
          else if (rarity === 'Rare') refundAmount = 5000;

          // 2. หาผู้เล่นที่มีนกตัวนี้
          const { data: inventoryData } = await supabaseAdmin.from('inventory').select('user_id').eq('character_id', characterId);

          if (inventoryData && inventoryData.length > 0) {
            const userIds = inventoryData.map(inv => inv.user_id);

            for (const userId of userIds) {
              // ดึงข้อมูลผู้เล่น (ใช้ชื่อคอลัมน์ user_point และ equipped_bird ตามจริง)
              const { data: userData } = await supabaseAdmin
                .from('users')
                .select('user_point, equipped_bird')
                .eq('user_id', userId)
                .single();
              
              if (userData) {
                let nextBirdId = DEFAULT_BIRD_ID;

                // ระบบ Auto Equip ตัวที่แรร์ที่สุดถ้าตัวเดิมโดนลบ
                if (userData.equipped_bird === characterId) {
                  const { data: remainingBirds } = await supabaseAdmin
                    .from('inventory')
                    .select('character_id, characters(rarity)')
                    .eq('user_id', userId)
                    .neq('character_id', characterId);

                  if (remainingBirds && remainingBirds.length > 0) {
                    const weight: any = { Mystic: 5, Legendary: 4, Epic: 3, Rare: 2, Common: 1 };
                    const sorted = remainingBirds.sort((a: any, b: any) => 
                      (weight[b.characters?.rarity] || 0) - (weight[a.characters?.rarity] || 0)
                    );
                    nextBirdId = sorted[0].character_id;
                  }
                }

                // ✅ อัปเดตคืนเงินและเปลี่ยนนก (ใช้ชื่อคอลัมน์ที่บอสตั้งไว้)
                await supabaseAdmin.from('users').update({
                  user_point: (userData.user_point || 0) + refundAmount,
                  equipped_bird: nextBirdId
                }).eq('user_id', userId);
              }
            }

            // 3. ปลดล็อก Foreign Key โดยลบออกจาก Inventory ของทุกคน
            await supabaseAdmin.from('inventory').delete().eq('character_id', characterId);
          }
        }

        // 4. ลบออกจากตารางหลัก
        const { error } = await supabaseAdmin
          .from(activeTab)
          .delete()
          .eq(idColumn, modalConfig.id)
          
        if (error) throw error
      }

      fetchTrashData() 
      closeModal()
    } catch (err: any) {
      alert("Error: " + err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const closeModal = () => {
    setModalConfig({ isOpen: false, type: null, id: '', name: '' })
  }

  return (
    <div className="space-y-8 px-4 md:px-10 py-6 relative">
      <div className="bg-white p-6 rounded-[2.5em] shadow-sm border-2 border-slate-50 flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-red-50 text-red-500 rounded-2xl"><Trash2 size={28} /></div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 italic uppercase">Recycle Bin</h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Deleted Data Management</p>
          </div>
        </div>

        <div className="flex bg-slate-50 p-2 rounded-full w-full max-w-3xl border-2 border-slate-100 overflow-x-auto">
          <TabButton active={activeTab === 'characters'} onClick={() => setActiveTab('characters')} icon={<Bird size={16} />} label="Characters" />
          <TabButton active={activeTab === 'items'} onClick={() => setActiveTab('items')} icon={<Package size={16} />} label="Items" />
          <TabButton active={activeTab === 'maps'} onClick={() => setActiveTab('maps')} icon={<MapIcon size={16} />} label="Maps" />
          <TabButton active={activeTab === 'sounds'} onClick={() => setActiveTab('sounds')} icon={<Music size={16} />} label="Sounds" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest animate-pulse">Loading Trash Data...</div>
      ) : trashData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-50">
          <Trash2 size={64} className="text-slate-300 mb-4" />
          <h3 className="text-xl font-black text-slate-400 uppercase italic">Trash is Empty</h3>
          <p className="text-sm font-bold text-slate-400">ถังขยะว่างเปล่าครับบอส!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {trashData.map((item) => (
              <motion.div 
                layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                key={item.id} 
                className="group relative bg-white p-6 rounded-[2.5em] border-2 border-red-100 shadow-sm flex flex-col items-center transition-all opacity-80 hover:opacity-100"
              >
                <div className={`w-full aspect-square bg-slate-50 rounded-[2em] flex items-center justify-center overflow-hidden border-2 border-slate-50 shadow-inner mb-6 mt-2 grayscale opacity-70`}>
                   {activeTab === 'sounds' ? (
                     <Music size={64} className="text-slate-300" />
                   ) : item.image && item.image.startsWith('http') ? (
                     <img src={item.image} className="w-full h-full object-contain p-4" alt={item.name} />
                   ) : (
                     <AlertTriangle size={48} className="text-slate-200" />
                   )}
                </div>

                <div className="text-center space-y-1 w-full px-2 mb-6">
                  <h3 className="text-xl font-black italic uppercase tracking-tighter truncate text-slate-700" title={item.name}>
                    {item.name}
                  </h3>
                  {activeTab === 'sounds' && (
                    <span className="text-[10px] font-bold bg-slate-200 text-slate-500 px-2 py-1 rounded-md uppercase">
                      {item.description}
                    </span>
                  )}
                </div>

                <div className="flex w-full gap-3">
                  <button 
                    onClick={() => triggerRestore(item.id, item.name)}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-50 text-green-600 hover:bg-green-500 hover:text-white py-3 rounded-2xl font-black text-[10px] uppercase transition-all"
                  >
                    <RefreshCcw size={14} /> กู้คืน
                  </button>
                  <button 
                    onClick={() => triggerHardDelete(item.id, item.name)}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white py-3 rounded-2xl font-black text-[10px] uppercase transition-all"
                  >
                    <Trash2 size={14} /> ลบถาวร
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ✅ 4. โค้ดส่วนของ Modal สวยๆ */}
      <AnimatePresence>
        {modalConfig.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* พื้นหลังสีดำโปร่งแสง (ใช้แบบทึบๆ จะได้ไม่แลคแบบที่เคยเจอบน PC) */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-slate-900/60"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[2em] p-8 max-w-md w-full shadow-2xl border-4 border-slate-100 flex flex-col items-center text-center"
            >
              <button onClick={closeModal} className="absolute top-4 right-4 p-2 bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-500 rounded-full transition-colors">
                <X size={20} />
              </button>

              <div className={`p-6 rounded-full mb-6 ${modalConfig.type === 'restore' ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}`}>
                {modalConfig.type === 'restore' ? <RefreshCcw size={48} /> : <AlertTriangle size={48} />}
              </div>

              <h2 className="text-2xl font-black uppercase italic text-slate-800 mb-2">
                {modalConfig.type === 'restore' ? 'Confirm Restore?' : 'Hard Delete?'}
              </h2>
              
              <p className="text-slate-500 font-bold text-sm mb-8 leading-relaxed">
                {modalConfig.type === 'restore' 
                  ? <>Are you sure you want to restore <span className="text-green-600 font-black">"{modalConfig.name}"</span> back to the system?</>
                  : <>Warning! <span className="text-red-600 font-black">"{modalConfig.name}"</span> will be permanently deleted from the database. This action <span className="underline decoration-red-500 underline-offset-4">cannot be undone!</span></>
                }
              </p>

              <div className="flex gap-3 w-full">
                <button 
                  onClick={closeModal} disabled={isProcessing}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-2xl font-black uppercase text-sm transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeAction} disabled={isProcessing}
                  className={`flex-1 py-4 text-white rounded-2xl font-black uppercase text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 ${
                    modalConfig.type === 'restore' 
                      ? 'bg-green-500 hover:bg-green-600 shadow-[0_4px_0_#16a34a]' 
                      : 'bg-red-500 hover:bg-red-600 shadow-[0_4px_0_#dc2626]'
                  }`}
                >
                  {isProcessing ? 'Processing...' : (modalConfig.type === 'restore' ? 'Yes, Restore' : 'Yes, Delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full font-black text-xs transition-all whitespace-nowrap ${
        active ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      {icon} <span className="uppercase tracking-wider">{label}</span>
    </button>
  )
}