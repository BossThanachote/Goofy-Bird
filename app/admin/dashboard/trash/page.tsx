'use client'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, RefreshCcw, AlertTriangle, Bird, Package, Map as MapIcon } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'

export default function TrashPage() {
  const [activeTab, setActiveTab] = useState<'characters' | 'items' | 'maps'>('characters')
  const [trashData, setTrashData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // ดึงข้อมูลทุกครั้งที่กดเปลี่ยน Tab
  useEffect(() => { fetchTrashData() }, [activeTab])

  const fetchTrashData = async () => {
    setLoading(true)
    setTrashData([]) // เคลียร์ของเก่าก่อนโหลด
    
    try {
      // 💡 ข้อควรระวัง: ตาราง items และ maps ต้องมีคอลัมน์ is_deleted ด้วยนะครับบอส
      const { data, error } = await supabaseAdmin
        .from(activeTab)
        .select('*')
        .eq('is_deleted', true) // ✅ ดึงมาเฉพาะตัวที่โดน Soft Delete
      
      if (error) throw error

      // แปลงข้อมูลให้เป็นรูปแบบเดียวกัน (เพราะแต่ละตารางชื่อคอลัมน์ไม่เหมือนกัน)
      const formattedData = data.map(item => ({
        id: item.character_id || item.item_id || item.map_id,
        name: item.character_name || item.item_name || item.map_name,
        image: item.image_url || item.icon_url, // ปรับให้ตรงกับชื่อคอลัมน์รูปของบอส
        description: item.description || '',
        raw_data: item // เก็บข้อมูลดิบไว้เผื่อใช้
      }))

      setTrashData(formattedData)
    } catch (err: any) {
      console.error("Error fetching trash:", err.message)
    } finally {
      setLoading(false)
    }
  }

  // 🔄 กู้คืนข้อมูล (Restore)
  const handleRestore = async (id: string, name: string) => {
    const confirm = window.confirm(`บอสต้องการกู้คืน "${name}" กลับไปใช้งานใช่ไหมครับ?`)
    if (!confirm) return

    try {
      // อ้างอิงชื่อคอลัมน์ ID ตาม Tab ที่เลือก
      const idColumn = activeTab === 'characters' ? 'character_id' : activeTab === 'items' ? 'item_id' : 'map_id'

      const { error } = await supabaseAdmin
        .from(activeTab)
        .update({ is_deleted: false }) // ✅ คืนชีพ!
        .eq(idColumn, id)

      if (error) throw error
      fetchTrashData() // รีเฟรชหน้าจอ
    } catch (err: any) {
      alert("Restore Error: " + err.message)
    }
  }

  // ❌ ลบถาวร (Hard Delete)
  const handleHardDelete = async (id: string, name: string) => {
    const confirm = window.confirm(`⚠️ คำเตือน: นก "${name}" จะถูกลบหายไปจาก Database อย่างถาวร! ดำเนินการต่อไหมครับบอส?`)
    if (!confirm) return

    try {
      const idColumn = activeTab === 'characters' ? 'character_id' : activeTab === 'items' ? 'item_id' : 'map_id'

      const { error } = await supabaseAdmin
        .from(activeTab)
        .delete() // 💥 ลบจริงทิ้งจาก Database
        .eq(idColumn, id)

      if (error) throw error
      fetchTrashData()
    } catch (err: any) {
      alert("Hard Delete Error: " + err.message)
    }
  }

  return (
    <div className="space-y-8 px-4 md:px-10 py-6">
      {/* 🔝 Top Bar & Tabs */}
      <div className="bg-white p-6 rounded-[2.5em] shadow-sm border-2 border-slate-50 flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-red-50 text-red-500 rounded-2xl"><Trash2 size={28} /></div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 italic uppercase">Recycle Bin</h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Deleted Data Management</p>
          </div>
        </div>

        {/* 🔘 ระบบ Tabs กดสลับ */}
        <div className="flex bg-slate-50 p-2 rounded-full w-full max-w-xl border-2 border-slate-100">
          <TabButton active={activeTab === 'characters'} onClick={() => setActiveTab('characters')} icon={<Bird size={16} />} label="Characters" />
          <TabButton active={activeTab === 'items'} onClick={() => setActiveTab('items')} icon={<Package size={16} />} label="Items" />
          <TabButton active={activeTab === 'maps'} onClick={() => setActiveTab('maps')} icon={<MapIcon size={16} />} label="Maps" />
        </div>
      </div>

      {/* 📦 Trash Display Grid */}
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
                {/* 📸 กรอบรูปทรงเหลี่ยมโค้ง (ขาวดำให้รู้ว่าโดนลบ) */}
                <div className={`w-full aspect-square bg-slate-50 rounded-[2em] flex items-center justify-center overflow-hidden border-2 border-slate-50 shadow-inner mb-6 mt-2 grayscale opacity-70`}>
                   {item.image && item.image.startsWith('http') ? (
                     <img src={item.image} className="w-full h-full object-contain p-4" alt={item.name} />
                   ) : (
                     <AlertTriangle size={48} className="text-slate-200" />
                   )}
                </div>

                <div className="text-center space-y-1 w-full px-2 mb-6">
                  <h3 className="text-xl font-black italic uppercase tracking-tighter truncate text-slate-700">
                    {item.name}
                  </h3>
                </div>

                {/* 🔘 ปุ่ม Action กู้คืน / ลบถาวร */}
                <div className="flex w-full gap-3">
                  <button 
                    onClick={() => handleRestore(item.id, item.name)}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-50 text-green-600 hover:bg-green-500 hover:text-white py-3 rounded-2xl font-black text-[10px] uppercase transition-all"
                  >
                    <RefreshCcw size={14} /> กู้คืน
                  </button>
                  <button 
                    onClick={() => handleHardDelete(item.id, item.name)}
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
    </div>
  )
}

// คอมโพเนนต์ปุ่ม Tab เพื่อความคลีนของโค้ด
function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-black text-xs transition-all ${
        active ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      {icon} <span className="uppercase tracking-wider">{label}</span>
    </button>
  )
}