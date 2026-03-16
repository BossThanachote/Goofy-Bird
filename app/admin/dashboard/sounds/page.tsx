'use client'
import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Music, UploadCloud, PlayCircle, PauseCircle, Trash2, Volume2 } from 'lucide-react'

// 🎵 คอมโพเนนต์เครื่องเล่นเสียงแบบ Custom
const CustomAudioPlayer = ({ url, activeAudio, setActiveAudio, baseVolume }: { url: string, activeAudio: string | null, setActiveAudio: (url: string | null) => void, baseVolume: number }) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (activeAudio !== url && isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
    }
  }, [activeAudio, url, isPlaying])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = baseVolume
    }
  }, [baseVolume])

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
      setActiveAudio(null)
    } else {
      audioRef.current?.play()
      setIsPlaying(true)
      setActiveAudio(url)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) setProgress(audioRef.current.currentTime)
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value)
    if (audioRef.current) audioRef.current.currentTime = time
    setProgress(time)
  }

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00"
    const m = Math.floor(time / 60)
    const s = Math.floor(time % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div className="flex items-center gap-4 w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm hover:border-blue-300 transition-all">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => { setIsPlaying(false); setActiveAudio(null); setProgress(0) }}
      />
      <button onClick={togglePlay} className="text-blue-500 hover:text-blue-600 hover:scale-110 active:scale-95 transition-all flex-shrink-0 cursor-pointer">
        {isPlaying ? <PauseCircle size={36} /> : <PlayCircle size={36} />}
      </button>
      <div className="flex flex-col w-full">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={progress}
          onChange={handleSeek}
          className="h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500 w-full"
        />
        <div className="flex justify-between text-[10px] font-black text-slate-400 mt-1.5 uppercase">
          <span>{formatTime(progress)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------- //

export default function AdminSoundsPage() {
  const [sounds, setSounds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [activeAudio, setActiveAudio] = useState<string | null>(null)

  const [soundName, setSoundName] = useState('')
  const [category, setCategory] = useState('SFX')
  const [actionTrigger, setActionTrigger] = useState('')
  const [uploadBaseVolume, setUploadBaseVolume] = useState(1.0) 
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchSounds()
  }, [])

  const fetchSounds = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sounds')
      .select('*')
      .eq('is_deleted', false) 
      .order('created_at', { ascending: false })
    
    if (!error && data) setSounds(data)
    setLoading(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !soundName || !actionTrigger) {
      alert('กรุณากรอกข้อมูลให้ครบและเลือกไฟล์เสียงด้วยครับบอส!')
      return
    }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `sounds/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('game_assets')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('game_assets')
        .getPublicUrl(filePath)

      const fileUrl = publicUrlData.publicUrl

      const { error: insertError } = await supabase
        .from('sounds')
        .insert([
          {
            sound_name: soundName,
            category: category,
            action_trigger: actionTrigger,
            file_url: fileUrl,
            base_volume: uploadBaseVolume,
            is_active: true
          }
        ])

      if (insertError) throw insertError

      alert('🎵 อัปโหลดเสียงขึ้นเซิร์ฟเวอร์เรียบร้อยครับบอส!')
      
      setSoundName('')
      setActionTrigger('')
      setUploadBaseVolume(1.0)
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      
      fetchSounds()

    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string, soundName: string) => {
    try {
      const { error } = await supabase
        .from('sounds')
        .update({ is_deleted: true }) 
        .eq('id', id);

      if (error) throw error;
      fetchSounds(); 
    } catch (error: any) {
      alert('ลบไม่สำเร็จครับบอส: ' + error.message);
    }
  }

  const handleUpdateBaseVolume = async (id: string, newVolume: number) => {
    setSounds(prev => prev.map(s => s.id === id ? { ...s, base_volume: newVolume } : s))
    try {
      await supabase.from('sounds').update({ base_volume: newVolume }).eq('id', id)
    } catch (error) {
      console.error("Failed to update base volume", error)
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 font-sans pb-10">
      
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-2xl">
            <Music size={28} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Sound Manager</h1>
            <p className="text-slate-400 font-bold text-sm">จัดการระบบเสียงและเพลงประกอบภายในเกม</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* 📤 ฝั่งซ้าย: ฟอร์มอัปโหลดเสียง */}
        <div className="xl:col-span-1 bg-white rounded-3xl p-8 shadow-sm border border-slate-100 h-fit sticky top-6">
          <h2 className="text-lg font-black text-slate-800 uppercase mb-6 flex items-center gap-2">
            <UploadCloud size={20} className="text-blue-500" /> Upload Audio
          </h2>
          
          <form onSubmit={handleUpload} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sound Name (ชื่อเรียก)</label>
              <input type="text" value={soundName} onChange={(e) => setSoundName(e.target.value)} placeholder="e.g. Main Menu Click" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm text-slate-800 placeholder-slate-300 focus:border-blue-500 focus:bg-white transition-all outline-none" required />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Category (หมวดหมู่)</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm text-slate-800 focus:border-blue-500 focus:bg-white transition-all outline-none cursor-pointer">
                <option value="SFX">SFX (เสียงเอฟเฟกต์)</option>
                <option value="MUSIC">MUSIC (เพลงพื้นหลัง)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Action Trigger (รหัสเรียกใช้)</label>
              <input type="text" value={actionTrigger} onChange={(e) => setActionTrigger(e.target.value)} placeholder="e.g. ui_click, bgm_lobby" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm text-slate-800 placeholder-slate-300 focus:border-blue-500 focus:bg-white transition-all outline-none" required />
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1"><Volume2 size={12}/> Base Volume</label>
                <span className="text-xs font-black text-blue-600 bg-white px-2 py-0.5 rounded-md shadow-sm border border-blue-100">{Math.round(uploadBaseVolume * 100)}%</span>
              </div>
              <input 
                type="range" min="0" max="1" step="0.01" 
                value={uploadBaseVolume} 
                onChange={(e) => setUploadBaseVolume(Number(e.target.value))} 
                className="w-full h-1.5 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-500" 
              />
              <p className="text-[9px] text-blue-400 mt-2 font-bold leading-tight">ตั้งค่าความดังมาตรฐานให้เสียงนี้ ก่อนส่งไปให้ผู้เล่นคูณเสียงอีกทีในหน้า Setting</p>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">MP3 File</label>
              <input type="file" accept="audio/mp3, audio/wav, audio/ogg" onChange={handleFileChange} ref={fileInputRef} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs text-slate-600 focus:border-blue-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-100 file:text-blue-600 hover:file:bg-blue-200 cursor-pointer transition-all" required />
            </div>

            <button type="submit" disabled={uploading} className="w-full bg-blue-500 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 active:scale-95 transition-all shadow-md disabled:opacity-50 mt-2 cursor-pointer">
              {uploading ? 'Uploading...' : 'Save Sound'}
            </button>
          </form>
        </div>

        {/* 🗃️ ฝั่งขวา: รายการเสียงที่มีในระบบ */}
        <div className="xl:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
          <h2 className="text-lg font-black text-slate-800 uppercase mb-6 flex items-center gap-2">
            <Music size={20} className="text-blue-500" /> Sound Library
          </h2>

          {loading ? (
            <div className="text-center text-slate-400 font-bold py-20 animate-pulse">Loading Audio Files...</div>
          ) : sounds.length === 0 ? (
            <div className="text-center text-slate-400 font-bold py-20">
              <div className="text-4xl mb-4 opacity-50">🎧</div>
              ยังไม่มีไฟล์เสียงในระบบครับบอส!
            </div>
          ) : (
            <div className="space-y-4">
              {sounds.map((sound) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  key={sound.id} 
                  className="flex flex-col xl:flex-row items-start xl:items-center justify-between bg-slate-50 border border-slate-100 p-4 rounded-2xl hover:border-blue-200 transition-all gap-4 group"
                >
                  
                  {/* 📝 1. ฝั่งซ้าย: ข้อมูลเพลง */}
                  <div className="flex flex-col overflow-hidden w-full xl:w-[25%] flex-shrink-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-black text-white uppercase tracking-wider flex-shrink-0 ${sound.category === 'MUSIC' ? 'bg-amber-400' : 'bg-rose-400'}`}>
                        {sound.category}
                      </span>
                      <span className="font-black text-slate-700 truncate text-base">{sound.sound_name}</span>
                    </div>
                    <code className="text-[10px] text-slate-500 font-bold bg-white border border-slate-200 px-2 py-0.5 rounded-md inline-block w-fit truncate max-w-full">
                      trigger: {sound.action_trigger}
                    </code>
                  </div>

                  {/* 🎵 2. ตรงกลาง: หลอดเพลง และ ที่ปรับ Base Volume */}
                  <div className="w-full xl:flex-1 flex flex-col gap-2">
                    <CustomAudioPlayer 
                      url={sound.file_url} 
                      activeAudio={activeAudio} 
                      setActiveAudio={setActiveAudio}
                      baseVolume={sound.base_volume ?? 1.0}
                    />
                    
                    {/* ✅ สไลเดอร์ปรับ Base Volume */}
                    <div className="flex items-center gap-3 px-2">
                      <Volume2 size={14} className="text-slate-400 flex-shrink-0" />
                      <input 
                        type="range" min="0" max="1" step="0.01" 
                        value={sound.base_volume ?? 1.0} 
                        onChange={(e) => handleUpdateBaseVolume(sound.id, Number(e.target.value))} 
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-400 hover:accent-blue-500 transition-all" 
                        title="ปรับ Base Volume"
                      />
                      <span className="text-[10px] font-black text-slate-500 w-[3em] text-right bg-white px-1.5 py-0.5 rounded shadow-sm border border-slate-200">
                        {Math.round((sound.base_volume ?? 1.0) * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* 📅 3. ฝั่งขวา: วันที่ สเตตัส และ ปุ่มลบ */}
                  <div className="text-right flex flex-row xl:flex-col items-center xl:items-end justify-between w-full xl:w-auto gap-3 flex-shrink-0 xl:border-l border-slate-200 xl:pl-4">
                     <div className="flex xl:flex-col items-center xl:items-end gap-2">
                       <span className="text-[10px] font-bold text-slate-400 uppercase">
                         {new Date(sound.created_at).toLocaleDateString()}
                       </span>
                       <div className={`w-2.5 h-2.5 rounded-full ${sound.is_active ? 'bg-green-400' : 'bg-slate-300'}`} title={sound.is_active ? 'Active' : 'Inactive'} />
                     </div>
                     
                     <button 
                       onClick={() => handleDelete(sound.id, sound.sound_name)}
                       className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all cursor-pointer"
                       title="ย้ายลงถังขยะ"
                     >
                       <Trash2 size={18} />
                     </button>
                  </div>
                  
                </motion.div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}