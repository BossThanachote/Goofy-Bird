'use client'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bird, Plus, X, Upload, Image as ImageIcon } from 'lucide-react'
import { supabase, supabaseAdmin } from '@/lib/supabase'

const rarityConfig: any = {
  Common: { color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200', effect: '' },
  Rare: { color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-400', effect: 'shadow-blue-200 animate-pulse' },
  Epic: { color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-400', effect: 'shadow-purple-200 animate-pulse-slow' },
  Legendary: { color: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-400', effect: 'shadow-yellow-200 animate-sparkle-spin' },
  Mystic: { color: 'bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-green-500 to-blue-500 animate-gradient-x', bg: 'bg-gradient-to-r from-red-500/10 via-green-500/10 to-blue-500/10', border: 'border-rainbow', effect: 'shadow-rainbow animate-glowing-loop' }
}

export default function CharactersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [characters, setCharacters] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // Form States
  const [name, setName] = useState('')
  const [rarity, setRarity] = useState('Common')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')

  useEffect(() => { fetchCharacters() }, [])

 const fetchCharacters = async () => {
  console.log("Checking Admin Client:", supabaseAdmin) // 👈 ดูใน Console ว่ามีค่าไหม
  
  const { data, error } = await supabaseAdmin
    .from('characters')
    .select('*')
  
  if (error) {
    console.error("Error message:", error.message) // 👈 ถ้าติดสิทธิ์ มันจะฟ้องตรงนี้
  }
  
  console.log("Fetched Data:", data) // 👈 ดูว่าข้อมูลนก 6 ตัวมาถึงเครื่องบอสไหม
  if (data) setCharacters(data)
}
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleAddCharacter = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    let finalImageUrl = ''

    try {
      // 1. Upload Image (ใช้ supabaseAdmin ข้าม RLS Storage)
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `birds/${fileName}`

        const { error: uploadError } = await supabaseAdmin.storage
          .from('character-images')
          .upload(filePath, imageFile)

        if (uploadError) throw uploadError

        // 2. Get Public URL
        const { data: urlData } = supabaseAdmin.storage
          .from('character-images')
          .getPublicUrl(filePath)

        finalImageUrl = urlData.publicUrl
      }

      // 3. Save to Database Table (ใช้ supabaseAdmin ข้าม RLS Table)
      const { error: insertError } = await supabaseAdmin.from('characters').insert([
        { 
          character_name: name, 
          rarity: rarity, 
          description: description, 
          image_url: finalImageUrl 
        }
      ])

      if (insertError) throw insertError

      // Success Reset
      setIsModalOpen(false)
      fetchCharacters()
      setName(''); setRarity('Common'); setDescription(''); setImageFile(null); setPreviewUrl('')
      
    } catch (err: any) {
      alert("Error: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-10 px-4 md:px-10 py-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2.5em] border-2 border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Bird size={28} /></div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 italic uppercase">Bird Collection</h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Admin Control Mode</p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-full font-black flex items-center gap-2 shadow-lg transition-all"
        >
          <Plus size={20} /> ADD NEW BIRD
        </button>
      </div>

      {/* 🦅 Characters Display Grid */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {characters.map((char) => (
    <motion.div 
      key={char.character_id} 
      className={`relative bg-white p-6 rounded-[2.5em] border-2 ${rarityConfig[char.rarity]?.border} shadow-lg flex flex-col items-center transition-all`}
    >
      {/* 🏷️ Rarity Badge (มุมขวาบนแบบคลีนๆ) */}
      <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider ${rarityConfig[char.rarity]?.bg} ${rarityConfig[char.rarity]?.color}`}>
        {char.rarity}
      </div>

      {/* 📸 กรอบรูปทรงเหลี่ยมโค้ง (Rounded Square) ตามแบบบอส */}
      <div className={`w-full aspect-square bg-white rounded-[2em] flex items-center justify-center overflow-hidden  mb-6 mt-4`}>
         {char.image_url && char.image_url.startsWith('http') ? (
           <img 
             src={char.image_url} 
             className="w-full h-full object-contain p-4" // ใช้ contain + p-4 เพื่อให้นกอยู่กลางกรอบสวยๆ
             alt={char.character_name} 
           />
         ) : (
           <Bird size={48} className="text-slate-200" />
         )}
      </div>

      {/* 📝 ชื่อและคำอธิบาย */}
      <div className="text-center space-y-1">
        <h3 className={`text-2xl font-black italic uppercase italic tracking-tighter ${rarityConfig[char.rarity]?.color}`}>
          {char.character_name}
        </h3>
        <p className="text-slate-400 font-bold text-[11px] leading-relaxed">
          {char.description || 'Test description'}
        </p>
      </div>
    </motion.div>
  ))}
</div>

      {/* Modal Popup */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative bg-white w-full max-w-lg rounded-[3.5em] shadow-2xl p-8 border-[10px] border-blue-600">
              <form onSubmit={handleAddCharacter} className="space-y-5">
                <h2 className="text-2xl font-black text-slate-900 uppercase italic">Release New Bird</h2>
                
                {/* File Upload Area */}
                <div className="relative w-full h-36 rounded-[2.5em] border-4 border-dashed border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden">
                  {previewUrl ? <img src={previewUrl} className="w-full h-full object-contain" /> : <div className="text-center"><Upload className="mx-auto text-blue-300" /><p className="text-[9px] font-black text-slate-400 uppercase">Select Image</p></div>}
                  <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <input required placeholder="Bird Name" value={name} onChange={(e) => setName(e.target.value)} className="bg-slate-50 border-2 border-slate-100 rounded-full py-3 px-6 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none" />
                  <select value={rarity} onChange={(e) => setRarity(e.target.value)} className={`bg-slate-50 border-2 border-slate-100 rounded-full py-3 px-6 text-sm font-black focus:border-blue-500 outline-none ${rarityConfig[rarity].color}`}>
                    {['Common', 'Rare', 'Epic', 'Legendary', 'Mystic'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <textarea rows={2} placeholder="Description..." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5em] py-3 px-6 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none" />

                <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-full text-xl shadow-[0_6px_0_#1D4ED8] active:translate-y-1 transition-all">
                  {loading ? 'UPLOADING...' : 'RELEASE THE BIRD!'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes gradient-x { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .animate-gradient-x { background-size: 200% 200%; animation: gradient-x 3s ease infinite; }
        .animate-pulse-slow { animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes sparkle-spin { 0% { transform: scale(1) rotate(0deg); } 50% { transform: scale(1.05) rotate(180deg); } 100% { transform: scale(1) rotate(360deg); } }
        .animate-sparkle-spin { animation: sparkle-spin 4s linear infinite; }
        @keyframes glowing-loop { 0% { box-shadow: 0 0 10px rgba(255,0,0,0.3); } 50% { box-shadow: 0 0 20px rgba(0,255,0,0.4); } 100% { box-shadow: 0 0 10px rgba(255,0,0,0.3); } }
        .animate-glowing-loop { animation: glowing-loop 4s linear infinite; }
        .border-rainbow { border-image: linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet) 1; }
      `}</style>
    </div> 
  )
}