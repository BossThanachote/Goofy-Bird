'use client'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bird, Plus, X, Upload, Edit2, Trash2, Filter, Search } from 'lucide-react' // ✅ เพิ่ม Edit2 icon
import { supabaseAdmin } from '@/lib/supabase'

const rarityConfig: any = {
  Common: { color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' },
  Rare: { color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-400' },
  Epic: { color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-400' },
  Legendary: { color: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-400' },
  Mystic: { color: 'bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-green-500 to-blue-500', bg: 'bg-slate-50', border: 'border-rainbow' }
}
// 🧮 กำหนดน้ำหนักให้ Rarity สำหรับใช้ตอน Sort (ค่าน้อย = อยู่บนสุด)
const rarityWeight: any = {
  Mystic: 1,
  Legendary: 2,
  Epic: 3,
  Rare: 4,
  Common: 5
}

export default function CharactersPage() {
  const [characters, setCharacters] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  
  // 🟢 Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingBird, setEditingBird] = useState<any>(null) // เก็บข้อมูลนกตัวที่กำลังจะแก้

  // 📝 Form States
  const [name, setName] = useState('')
  const [rarity, setRarity] = useState('Common')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')

  useEffect(() => { fetchCharacters() }, [])

  const fetchCharacters = async () => {
    const { data, error } = await supabaseAdmin
      .from('characters')
      .select('*')
      .eq('is_deleted', false) // ✅ ดึงเฉพาะตัวที่ยังไม่ถูกลบ (Soft Delete)
      // .order('character_id', { ascending: false })

    
    if (error) console.error("Error fetching:", error.message)
    if (data) setCharacters(data)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  // 🧹 ฟังก์ชันเคลียร์ค่าฟอร์ม
  const resetForm = () => {
    setName(''); setRarity('Common'); setDescription(''); setImageFile(null); setPreviewUrl('')
    setEditingBird(null)
  }

  // ➕ ฟังก์ชันเพิ่มนกใหม่ (ของเดิม)
  const handleAddCharacter = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    let finalImageUrl = ''

    try {
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `birds/${fileName}`

        const { error: uploadError } = await supabaseAdmin.storage.from('character-images').upload(filePath, imageFile)
        if (uploadError) throw uploadError

        const { data: urlData } = supabaseAdmin.storage.from('character-images').getPublicUrl(filePath)
        finalImageUrl = urlData.publicUrl
      }

      const { error: insertError } = await supabaseAdmin.from('characters').insert([
        { character_name: name, rarity: rarity, description: description, image_url: finalImageUrl }
      ])
      if (insertError) throw insertError

      setIsAddModalOpen(false)
      fetchCharacters()
      resetForm()
    } catch (err: any) {
      alert("Error: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ✏️ ฟังก์ชันอัปเดตนก (มาใหม่!)
  const handleUpdateCharacter = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    let finalImageUrl = previewUrl // ยึดรูปเดิมเป็นหลักก่อน

    try {
      // ถ้ามีการอัปโหลดรูปใหม่
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `birds/${fileName}`

        const { error: uploadError } = await supabaseAdmin.storage.from('character-images').upload(filePath, imageFile)
        if (uploadError) throw uploadError

        const { data: urlData } = supabaseAdmin.storage.from('character-images').getPublicUrl(filePath)
        finalImageUrl = urlData.publicUrl // อัปเดตเป็น URL รูปใหม่
      }

      // สั่ง Update ทับข้อมูลเดิม
      const { error: updateError } = await supabaseAdmin.from('characters')
        .update({ character_name: name, rarity: rarity, description: description, image_url: finalImageUrl })
        .eq('character_id', editingBird.character_id)

      if (updateError) throw updateError

      setIsEditModalOpen(false)
      fetchCharacters()
      resetForm()
    } catch (err: any) {
      alert("Error: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCharacter = async (id: string, name: string) => {
    const confirmDelete = window.confirm(`บอสแน่ใจนะว่าจะลบ "${name}" ทิ้งไปจริงๆ? (สามารถกู้คืนได้ทีหลัง)`)
    if (!confirmDelete) return

    setLoading(true)
    try {
      const { error } = await supabaseAdmin
        .from('characters')
        .update({ is_deleted: true }) // ✅ เปลี่ยนสถานะเป็นถูกลบ แทนที่จะลบทิ้งจริงๆ
        .eq('character_id', id)

      if (error) throw error
      
      fetchCharacters() // รีเฟรชหน้าจอ นกตัวนั้นจะหายไป
    } catch (err: any) {
      alert("Error deleting: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 🟢 ฟังก์ชันเปิดหน้าแก้ไขพร้อมดึงข้อมูลเดิมมาใส่ฟอร์ม
  const openEditModal = (bird: any) => {
    setEditingBird(bird)
    setName(bird.character_name)
    setRarity(bird.rarity)
    setDescription(bird.description)
    setPreviewUrl(bird.image_url) // เอารูปเดิมมาโชว์
    setImageFile(null)
    setIsEditModalOpen(true)
  }

  const filteredCharacters = characters.filter(c => c.character_name.toLowerCase().includes(searchTerm.toLowerCase()))

  const displayCharacters = characters
    .filter(c => c.character_name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(c => activeFilter === 'All' ? true : c.rarity === activeFilter)
    .sort((a, b) => (rarityWeight[a.rarity] || 99) - (rarityWeight[b.rarity] || 99))

  const filterOptions = ['All', 'Mystic', 'Legendary', 'Epic', 'Rare', 'Common']

  return (
    <div className="space-y-8 px-4 md:px-10 py-6">
      {/* 🔝 Top Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-6 rounded-[2.5em] shadow-sm border-2 border-slate-50">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Bird size={28} /></div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 italic uppercase">Bird Collection</h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Admin Control Mode</p>
          </div>
        </div>
        <button 
          onClick={() => { resetForm(); setIsAddModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-full font-black flex items-center gap-2 shadow-lg transition-all"
        >
          <Plus size={20} /> ADD NEW BIRD
        </button>
      </div>

      {/* แถวล่าง: ระบบ Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t-2 border-dashed border-slate-100">
          <div className="flex items-center gap-2 mr-4 text-slate-400">
            <Filter size={18} /> <span className="text-[10px] font-black uppercase tracking-widest">Category:</span>
          </div>
          
          {filterOptions.map((option) => {
            const isActive = activeFilter === option
            // ตกแต่งปุ่มแท็บให้สีตรงกับ Rarity ตอนที่ถูกเลือก
            const activeStyle = option === 'All' 
              ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
              : `${rarityConfig[option]?.bg} ${rarityConfig[option]?.border} border-2 shadow-md ${option === 'Mystic' ? 'text-slate-800' : rarityConfig[option]?.color}`

            return (
              <button
                key={option}
                onClick={() => setActiveFilter(option)}
                className={`px-5 py-2 rounded-full font-black text-xs uppercase tracking-wider transition-all border-2 ${
                  isActive ? activeStyle : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                }`}
              >
                {option} {option === 'All' && <span className="ml-1 opacity-50">({characters.length})</span>}
              </button>
            )
          })}
        </div>
      
      {/* 🦅 Characters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence>
          {displayCharacters.map((char) => (
            <motion.div 
              layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              key={char.character_id} 
              className={`group relative bg-white p-6 rounded-[2.5em] border-2 ${rarityConfig[char.rarity]?.border} shadow-lg flex flex-col items-center transition-all hover:-translate-y-1`}
            >

              {/* 🗑️ ปุ่มลบ (มุมบนขวา) */}
              <button 
                onClick={() => handleDeleteCharacter(char.character_id, char.character_name)}
                className="absolute top-4 left-14 p-2 bg-white text-slate-400 hover:text-red-500 rounded-full transition-all opacity-0 group-hover:opacity-100 shadow-md border border-slate-100 z-10"
                title="Soft Delete"
              >
                <Trash2 size={16} />
              </button>

              {/* ✏️ ปุ่มแก้ไข (มุมบนซ้าย) */}
              <button 
                onClick={() => openEditModal(char)}
                className="absolute top-4 left-4 p-2 bg-white text-slate-400 hover:text-blue-600 rounded-full transition-all opacity-0 group-hover:opacity-100 shadow-md border border-slate-100 z-10"
              >
                <Edit2 size={16} />
              </button>

              {/* 🏷️ Rarity Badge */}
              <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider ${rarityConfig[char.rarity]?.bg} ${rarityConfig[char.rarity]?.color}`}>
                {char.rarity}
              </div>

              {/* 📸 กรอบรูปทรงเหลี่ยมโค้ง (Clean UI) */}
              <div className={`w-full aspect-square bg-white rounded-[2em] flex items-center justify-center overflow-hidden mb-6 mt-4`}>
                 {char.image_url && char.image_url.startsWith('http') ? (
                   <img src={char.image_url} className="w-full h-full object-contain p-4" alt={char.character_name} />
                 ) : (
                   <Bird size={48} className="text-slate-200" />
                 )}
              </div>

              <div className="text-center space-y-1 w-full px-2">
                <h3 className={`text-2xl font-black italic uppercase tracking-tighter truncate ${rarityConfig[char.rarity]?.color}`}>
                  {char.character_name}
                </h3>
                <p className="text-slate-400 font-bold text-[11px] truncate">
                  {char.description || 'No description'}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ➕ Modal Add & Edit (รวมไว้ด้วยกัน ใช้ Component ร่วมกันได้เลย) */}
      <AnimatePresence>
        {(isAddModalOpen || isEditModalOpen) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative bg-white w-full max-w-lg rounded-[3.5em] shadow-2xl p-8 border-[10px] border-blue-600">
              
              <form onSubmit={isEditModalOpen ? handleUpdateCharacter : handleAddCharacter} className="space-y-5">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black text-slate-900 uppercase italic">
                    {isEditModalOpen ? 'Update Bird Data' : 'Release New Bird'}
                  </h2>
                  <button type="button" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="text-slate-300 hover:text-slate-900"><X /></button>
                </div>
                
                <div className="relative w-full h-36 rounded-[2em] border-4 border-dashed border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden group">
                  {previewUrl ? 
                    <img src={previewUrl} className="w-full h-full object-contain p-2" /> : 
                    <div className="text-center"><Upload className="mx-auto text-blue-200 mb-1" size={28} /><p className="text-[9px] font-black text-slate-400 uppercase">Upload Image</p></div>
                  }
                  <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <input required placeholder="Bird Name" value={name} onChange={(e) => setName(e.target.value)} className="bg-slate-50 border-2 border-slate-100 rounded-full py-3 px-6 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none" />
                  <select value={rarity} onChange={(e) => setRarity(e.target.value)} className={`bg-slate-50 border-2 border-slate-100 rounded-full py-3 px-6 text-sm font-black focus:border-blue-500 outline-none ${rarityConfig[rarity].color}`}>
                    {['Common', 'Rare', 'Epic', 'Legendary', 'Mystic'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <textarea rows={2} placeholder="Description..." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5em] py-3 px-6 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none" />

                <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-full text-xl shadow-[0_6px_0_#1D4ED8] active:translate-y-1 transition-all uppercase italic">
                  {loading ? 'PROCESSING...' : (isEditModalOpen ? 'SAVE CHANGES' : 'RELEASE THE BIRD!')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div> 
  )
}