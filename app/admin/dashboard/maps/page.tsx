'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit2, Trash2, Map as MapIcon, Image as ImageIcon, Music, AlertTriangle, CheckCircle2, XCircle, ChevronDown, Package, Zap, Gauge, Skull } from 'lucide-react'

const AVAILABLE_OBSTACLES = [
  { id: 'pipe-top', label: 'Top Pipe', icon: '🚧' },
  { id: 'pipe-bottom', label: 'Bot Pipe', icon: '🚧' },
  { id: 'cloud', label: 'Cloud', icon: '☁️' },
  { id: 'enemy-bird', label: 'Enemy', icon: '🦅' },
  { id: 'stalactite', label: 'Stalactite', icon: '🔽' },
  { id: 'frog', label: 'Frog', icon: '🐸' },
  { id: 'pendulum', label: 'Pendulum', icon: '⏱️' },
  { id: 'rocket', label: 'Rocket', icon: '🚀' }
]

type Difficulty = 'easy' | 'normal' | 'hard'

export default function AdminMapsPage() {
  const [maps, setMaps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [availableSounds, setAvailableSounds] = useState<any[]>([])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [mapName, setMapName] = useState('')
  const [description, setDescription] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [bgUrl, setBgUrl] = useState('')
  const [bgmTrigger, setBgmTrigger] = useState('')
  const [hasHazard, setHasHazard] = useState(false)
  const [isActive, setIsActive] = useState(true)
  
  // ✅ เปลี่ยน State ให้เก็บเป็น Object แยก 3 ระดับ
  const [allowedObstacles, setAllowedObstacles] = useState<Record<Difficulty, string[]>>({
    easy: ['pipe-top', 'pipe-bottom'],
    normal: ['pipe-top', 'pipe-bottom'],
    hard: ['pipe-top', 'pipe-bottom']
  })
  // ✅ State สำหรับควบคุม Tab ในหน้าต่าง Edit
  const [activeDiffTab, setActiveDiffTab] = useState<Difficulty>('normal')

  useEffect(() => {
    fetchMaps()
    fetchSounds()
  }, [])

  const fetchMaps = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('maps').select('*').order('created_at', { ascending: false })
    if (data) setMaps(data)
    setLoading(false)
  }

  const fetchSounds = async () => {
    const { data } = await supabase.from('sounds').select('action_trigger').eq('is_active', true).eq('is_deleted', false).ilike('action_trigger', 'bgm_%').order('action_trigger', { ascending: true })
    if (data) setAvailableSounds(data)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, setUrlCallback: (url: string) => void) => {
    try {
      setUploading(true)
      if (!e.target.files || e.target.files.length === 0) return
      const file = e.target.files[0]
      const filePath = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${file.name.split('.').pop()}`
      const { error } = await supabase.storage.from('map-images').upload(filePath, file)
      if (error) throw error
      const { data } = supabase.storage.from('map-images').getPublicUrl(filePath)
      setUrlCallback(data.publicUrl)
    } catch (error: any) {
      alert('Error uploading: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  // ✅ ฟังก์ชันเพิ่ม/ลดอุปสรรค โดยอิงตาม Tab (Difficulty) ที่เลือกอยู่
  const toggleObstacle = (obsId: string) => {
    setAllowedObstacles(prev => {
      const currentList = prev[activeDiffTab]
      const newList = currentList.includes(obsId) ? currentList.filter(id => id !== obsId) : [...currentList, obsId]
      return { ...prev, [activeDiffTab]: newList }
    })
  }

  const openModal = (mapData?: any) => {
    if (mapData) {
      setEditingId(mapData.id)
      setMapName(mapData.map_name || '')
      setDescription(mapData.description || '')
      setPreviewUrl(mapData.preview_url || '')
      setBgUrl(mapData.bg_url || '')
      setBgmTrigger(mapData.bgm_trigger || '')
      setHasHazard(mapData.has_hazard || false)
      setIsActive(mapData.is_active ?? true)
      
      // ✅ ดักข้อมูลเก่า (เผื่อ Database เคยเก็บเป็น Array) ให้แปลงเป็นโครงสร้างใหม่
      let obsData = mapData.allowed_obstacles;
      if (Array.isArray(obsData)) {
         setAllowedObstacles({ easy: obsData, normal: obsData, hard: obsData });
      } else if (obsData && typeof obsData === 'object') {
         setAllowedObstacles({
           easy: obsData.easy || ['pipe-top', 'pipe-bottom'],
           normal: obsData.normal || ['pipe-top', 'pipe-bottom'],
           hard: obsData.hard || ['pipe-top', 'pipe-bottom']
         })
      } else {
         setAllowedObstacles({ easy: ['pipe-top'], normal: ['pipe-top'], hard: ['pipe-top'] })
      }
    } else {
      setEditingId(null)
      setMapName('')
      setDescription('')
      setPreviewUrl('')
      setBgUrl('')
      setBgmTrigger('')
      setHasHazard(false)
      setIsActive(true)
      setAllowedObstacles({ easy: ['pipe-top', 'pipe-bottom'], normal: ['pipe-top', 'pipe-bottom'], hard: ['pipe-top', 'pipe-bottom'] })
    }
    setActiveDiffTab('normal')
    setIsModalOpen(true)
  }

  const closeModal = () => setIsModalOpen(false)

  const handleSaveMap = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // ✅ เช็คว่าแต่ละระดับต้องมีอย่างน้อย 1 อุปสรรค
    if (allowedObstacles.easy.length === 0 || allowedObstacles.normal.length === 0 || allowedObstacles.hard.length === 0) {
      alert("Please select at least 1 obstacle for EACH difficulty level.");
      return;
    }

    setLoading(true)
    const payload = {
      map_name: mapName, description, preview_url: previewUrl, bg_url: bgUrl, 
      bgm_trigger: bgmTrigger, has_hazard: hasHazard, is_active: isActive,
      allowed_obstacles: allowedObstacles // ✅ ส่ง JSON เป็น Object
    }

    try {
      if (editingId) {
        await supabase.from('maps').update(payload).eq('id', editingId)
      } else {
        await supabase.from('maps').insert([payload])
      }
      closeModal(); fetchMaps()
    } catch (err: any) { alert('Error saving: ' + err.message) } 
    finally { setLoading(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return
    try { setLoading(true); await supabase.from('maps').delete().eq('id', id); fetchMaps() } 
    catch (err: any) { alert('Error: ' + err.message); setLoading(false) }
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter flex items-center gap-3">
            <MapIcon className="text-[#35A7FF]" size={36} /> Map Manager
          </h1>
          <p className="text-slate-500 font-bold mt-1 uppercase text-sm tracking-widest">Manage game stages and environments</p>
        </div>
        <button onClick={() => openModal()} className="bg-[#35A7FF] hover:bg-[#288DE0] text-white px-6 py-3 rounded-xl font-black uppercase text-sm shadow-[0_4px_0_#156CAE] active:translate-y-1 active:shadow-none transition-all flex items-center gap-2">
          <Plus size={20} /> Add New Map
        </button>
      </div>

      {loading && maps.length === 0 ? <div className="text-center py-20 text-slate-400 font-bold animate-pulse text-xl">Loading...</div> : maps.length === 0 ? <div className="text-center py-20 bg-white rounded-[2em] border-4 border-dashed border-slate-200"><p className="text-slate-400 font-bold uppercase tracking-widest text-lg">No maps found.</p></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {maps.map((map) => (
            <div key={map.id} className={`bg-white rounded-[2em] border-2 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md ${map.is_active ? 'border-slate-200' : 'border-slate-200 opacity-70 grayscale-[50%]'}`}>
              <div className="relative h-48 bg-slate-100 border-b-2 border-slate-100 overflow-hidden">
                {map.preview_url ? <img src={map.preview_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={48}/></div>}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-md ${map.is_active ? 'bg-green-500 text-white' : 'bg-slate-500 text-white'}`}>{map.is_active ? 'Active' : 'Hidden'}</span>
                  {map.has_hazard && <span className="px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-md bg-red-500 text-white flex items-center gap-1"><AlertTriangle size={12}/> Hazard</span>}
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter mb-2 truncate">{map.map_name}</h3>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-2 mb-4">
                  <Music size={16} className="text-[#35A7FF] shrink-0" />
                  <span className="text-xs font-bold text-slate-600 truncate">{map.bgm_trigger || 'Default BGM'}</span>
                </div>
                <div className="flex gap-2 pt-4 border-t-2 border-slate-50 mt-auto">
                  <button onClick={() => openModal(map)} className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 py-2 rounded-lg font-black uppercase text-xs transition-colors flex items-center justify-center gap-2"><Edit2 size={16} /> Edit</button>
                  <button onClick={() => handleDelete(map.id)} className="bg-red-50 hover:bg-red-100 text-red-500 px-4 py-2 rounded-lg font-black transition-colors flex items-center justify-center"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 ">
          <div className="bg-white w-full max-w-2xl rounded-[2em] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#35A7FF] p-6 text-white flex justify-between items-center shrink-0">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                {editingId ? <Edit2 size={24} /> : <Plus size={24} />} {editingId ? 'Edit Map' : 'Create New Map'}
              </h2>
              <button onClick={closeModal} className="text-blue-100 hover:text-white transition-colors"><XCircle size={28} /></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <form id="mapForm" onSubmit={handleSaveMap} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-2">Map Name *</label>
                    <input type="text" required value={mapName} onChange={e => setMapName(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 px-4 py-3 rounded-xl font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-2">Visibility</label>
                    <button type="button" onClick={() => setIsActive(!isActive)} className={`w-full py-3 rounded-xl font-black uppercase text-xs border-2 transition-all flex items-center justify-center gap-2 ${isActive ? 'bg-green-100 border-green-200 text-green-600' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                      {isActive ? <><CheckCircle2 size={16}/> Active</> : 'Hidden'}
                    </button>
                  </div>
                </div>

                {/* ✅ โซนเลือกอุปสรรคแบบมี Tabs แบ่งตามความยาก */}
                <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200">
                  <label className="block text-slate-800 font-black uppercase tracking-widest text-sm mb-3 flex items-center gap-2">
                    <Package size={18} className="text-[#35A7FF]"/> Obstacles Settings
                  </label>
                  
                  {/* Tabs */}
                  <div className="flex gap-2 mb-4">
                    {(['easy', 'normal', 'hard'] as Difficulty[]).map(diff => {
                       const Icon = diff === 'easy' ? Zap : diff === 'normal' ? Gauge : Skull
                       const isActiveTab = activeDiffTab === diff
                       return (
                         <button key={diff} type="button" onClick={() => setActiveDiffTab(diff)}
                           className={`flex-1 py-2 rounded-lg font-black uppercase text-xs transition-all flex items-center justify-center gap-1 border-2 
                           ${isActiveTab ? (diff==='easy' ? 'bg-green-400 text-green-900 border-green-500' : diff==='normal' ? 'bg-yellow-400 text-yellow-900 border-yellow-500' : 'bg-red-500 text-white border-red-600') : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'}`}
                         >
                           <Icon size={14}/> {diff}
                         </button>
                       )
                    })}
                  </div>

                  {/* Obstacle Selector สำหรับ Tab นั้นๆ */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {AVAILABLE_OBSTACLES.map(obs => {
                      const isSelected = allowedObstacles[activeDiffTab].includes(obs.id);
                      return (
                        <button key={obs.id} type="button" onClick={() => toggleObstacle(obs.id)}
                          className={`p-2 rounded-xl border-2 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${isSelected ? 'bg-[#35A7FF] border-[#35A7FF] text-white shadow-[0_3px_0_#156CAE] scale-105' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                        >
                          <span className="text-xl">{obs.icon}</span> 
                          <span className="text-[9px] uppercase tracking-wider">{obs.label}</span>
                        </button>
                      )
                    })}
                  </div>
                  {allowedObstacles[activeDiffTab].length === 0 && <p className="text-red-500 font-bold text-[10px] mt-2">* Select at least one obstacle for {activeDiffTab} mode.</p>}
                </div>

                <div className="bg-red-50 p-4 rounded-xl border-2 border-red-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-red-600 uppercase text-sm flex items-center gap-2"><AlertTriangle size={18}/> Environment Hazard</h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={hasHazard} onChange={e => setHasHazard(e.target.checked)} className="sr-only peer" />
                    <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-2">In-Game Background</label>
                    <div className="bg-slate-50 border-2 border-slate-200 p-2 rounded-xl">
                      {bgUrl && <img src={bgUrl} alt="Background" className="w-full h-32 object-cover rounded-lg mb-2 border border-slate-200" />}
                      <input type="text" value={bgUrl} onChange={e => setBgUrl(e.target.value)} className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-mono mb-2 text-slate-800" />
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setBgUrl)} className="w-full text-xs" disabled={uploading} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-2">BGM Trigger Key</label>
                    <div className="relative">
                      <select value={bgmTrigger} onChange={e => setBgmTrigger(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 px-4 py-3 rounded-xl font-bold text-slate-800 appearance-none cursor-pointer">
                        <option value="" disabled>Select a BGM...</option>
                        {availableSounds.map((sound, idx) => <option key={idx} value={sound.action_trigger}>{sound.action_trigger}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                    </div>
                  </div>
                </div>

              </form>
            </div>
            <div className="p-6 bg-slate-50 border-t-2 border-slate-100 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={closeModal} className="px-6 py-3 rounded-xl font-black uppercase text-sm bg-white border-2 border-slate-200 text-slate-500">Cancel</button>
              <button type="submit" form="mapForm" disabled={uploading || loading} className="px-8 py-3 rounded-xl font-black uppercase text-sm bg-[#35A7FF] text-white shadow-[0_4px_0_#156CAE]">
                {loading ? 'Saving...' : 'Save Map'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}