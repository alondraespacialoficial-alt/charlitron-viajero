import React, { useEffect, useState } from 'react';
import { Edit2, Eye, EyeOff, MapPin, Plus, Save, Trash2, X } from 'lucide-react';
import { supabase } from '../supabase';
import { Story, TravelerMapCategory, TravelerMapPoint } from '../types';

const categories: TravelerMapCategory[] = ['Lugar', 'Personaje', 'Comercio', 'Barrio', 'Suceso', 'Recuerdo'];
const emptyPoint: Partial<TravelerMapPoint> = {
  name: '', slug: '', category: 'Lugar', description: '', era: '', address: '', neighborhood: '',
  latitude: 22.1565, longitude: -100.9855, image_url: '', story_id: '', external_url: '', tags: [], featured: false, published: false,
};

interface TravelerMapAdminProps { stories: Story[]; }

export const TravelerMapAdmin: React.FC<TravelerMapAdminProps> = ({ stories }) => {
  const [points, setPoints] = useState<TravelerMapPoint[]>([]);
  const [editing, setEditing] = useState<Partial<TravelerMapPoint> | null>(null);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const loadPoints = async () => {
    const { data, error } = await supabase.from('traveler_map_points').select('*').order('featured', { ascending: false }).order('name');
    if (error) setMessage(`Error: ${error.message}`);
    else setPoints((data || []) as TravelerMapPoint[]);
  };

  useEffect(() => { loadPoints(); }, []);

  const uploadImage = async (file: File) => {
    setIsUploading(true);
    try {
      const extension = file.name.split('.').pop() || 'jpg';
      const filePath = `traveler-map-${Date.now()}.${extension}`;
      const { error } = await supabase.storage.from('images').upload(filePath, file);
      if (error) throw error;
      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      setEditing(current => current ? { ...current, image_url: data.publicUrl } : current);
      setMessage('Imagen subida correctamente');
    } catch (error: any) {
      setMessage(`Error al subir imagen: ${error?.message || 'revisa el bucket público images'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const savePoint = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing?.name || !editing.slug || editing.latitude === undefined || editing.longitude === undefined) return;
    const payload = { ...editing, id: editing.id || crypto.randomUUID(), tags: Array.isArray(editing.tags) ? editing.tags : [], story_id: editing.story_id || null, external_url: editing.external_url || null };
    const { error } = await supabase.from('traveler_map_points').upsert(payload).select();
    if (error) setMessage(`Error: ${error.message}`);
    else { setMessage('Punto guardado'); setEditing(null); await loadPoints(); }
  };

  const deletePoint = async (point: TravelerMapPoint) => {
    if (!window.confirm(`¿Eliminar ${point.name}?`)) return;
    const { error } = await supabase.from('traveler_map_points').delete().eq('id', point.id);
    if (error) setMessage(`Error: ${error.message}`);
    else await loadPoints();
  };

  const visiblePoints = points.filter(point => [point.name, point.category, point.slug].join(' ').toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const inputClass = 'w-full bg-sepia-950 border border-sepia-800 rounded-xl p-3 text-sepia-100 outline-none focus:border-sepia-500';

  if (editing) {
    return <form onSubmit={savePoint} className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4"><h2 className="text-3xl font-serif text-sepia-100">{editing.id ? 'Editar punto' : 'Nuevo punto del mapa'}</h2><button type="button" onClick={() => setEditing(null)} className="text-sepia-400 hover:text-sepia-100"><X /></button></div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4 bg-sepia-950/50 border border-sepia-800 rounded-2xl p-5"><h3 className="text-sepia-400 uppercase tracking-widest text-xs font-bold">Información</h3><input required className={inputClass} placeholder="Nombre del punto" value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} /><input required className={inputClass} placeholder="Slug: plaza-fundadores" value={editing.slug || ''} onChange={e => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} /><select className={inputClass} value={editing.category || 'Lugar'} onChange={e => setEditing({ ...editing, category: e.target.value as TravelerMapCategory })}>{categories.map(item => <option key={item}>{item}</option>)}</select><input className={inputClass} placeholder="Época: Década de 1970" value={editing.era || ''} onChange={e => setEditing({ ...editing, era: e.target.value })} /><textarea className={`${inputClass} min-h-28 resize-none`} placeholder="Descripción breve" value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} /><input className={inputClass} placeholder="Etiquetas separadas por coma" value={(editing.tags || []).join(', ')} onChange={e => setEditing({ ...editing, tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean) })} /></div>
        <div className="space-y-4 bg-sepia-950/50 border border-sepia-800 rounded-2xl p-5"><h3 className="text-sepia-400 uppercase tracking-widest text-xs font-bold">Ubicación y enlace</h3><input className={inputClass} placeholder="Dirección" value={editing.address || ''} onChange={e => setEditing({ ...editing, address: e.target.value })} /><input className={inputClass} placeholder="Barrio o colonia" value={editing.neighborhood || ''} onChange={e => setEditing({ ...editing, neighborhood: e.target.value })} /><div className="grid grid-cols-2 gap-3"><label className="text-xs text-sepia-500">Latitud<input required type="number" step="any" className={`${inputClass} mt-1`} value={editing.latitude ?? ''} onChange={e => setEditing({ ...editing, latitude: Number(e.target.value) })} /></label><label className="text-xs text-sepia-500">Longitud<input required type="number" step="any" className={`${inputClass} mt-1`} value={editing.longitude ?? ''} onChange={e => setEditing({ ...editing, longitude: Number(e.target.value) })} /></label></div><div className="flex gap-2"><input type="url" className={`${inputClass} flex-1`} placeholder="URL de imagen principal" value={editing.image_url || ''} onChange={e => setEditing({ ...editing, image_url: e.target.value })} /><label className={`cursor-pointer shrink-0 flex items-center gap-2 px-3 rounded-xl border border-sepia-700 bg-sepia-800 text-sepia-200 text-xs font-bold ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:bg-sepia-700'}`}><span>{isUploading ? 'Subiendo...' : 'Subir desde PC'}</span><input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={e => { const file = e.target.files?.[0]; if (file) uploadImage(file); e.currentTarget.value = ''; }} /></label></div>{editing.image_url && <img src={editing.image_url} alt="Vista previa" className="w-full h-32 object-cover rounded-xl border border-sepia-800" />}<select className={inputClass} value={editing.story_id || ''} onChange={e => setEditing({ ...editing, story_id: e.target.value })}><option value="">Sin historia enlazada</option>{stories.map(story => <option key={story.id} value={story.id}>{story.title}</option>)}</select><input type="url" className={inputClass} placeholder="Enlace externo opcional" value={editing.external_url || ''} onChange={e => setEditing({ ...editing, external_url: e.target.value })} /><label className="flex items-center gap-3 text-sepia-300"><input type="checkbox" checked={Boolean(editing.featured)} onChange={e => setEditing({ ...editing, featured: e.target.checked })} /> Destacar punto</label><label className="flex items-center gap-3 text-sepia-300"><input type="checkbox" checked={Boolean(editing.published)} onChange={e => setEditing({ ...editing, published: e.target.checked })} /> Publicar en el mapa</label></div>
      </div>
      <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditing(null)} className="px-5 py-3 rounded-xl text-sepia-400 hover:bg-sepia-900">Cancelar</button><button type="submit" className="px-6 py-3 rounded-xl bg-sepia-500 text-sepia-950 font-bold flex items-center gap-2"><Save className="w-4 h-4" /> Guardar punto</button></div>
    </form>;
  }

  return <div className="max-w-5xl mx-auto space-y-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-3xl font-serif text-sepia-100">Mapa del Viajero</h2><p className="text-sepia-500 text-sm mt-1">Administra los puntos que aparecen en el mapa público.</p></div><button onClick={() => setEditing({ ...emptyPoint })} className="bg-sepia-500 text-sepia-950 px-5 py-3 rounded-xl font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> Agregar punto</button></div><input className={inputClass} placeholder="Buscar punto..." value={search} onChange={e => setSearch(e.target.value)} />{message && <p className="text-sepia-400 text-sm">{message}</p>}<div className="space-y-3">{visiblePoints.map(point => <div key={point.id} className="flex flex-wrap items-center gap-4 bg-sepia-950/50 border border-sepia-800 rounded-2xl p-4"><div className="w-16 h-16 rounded-xl overflow-hidden bg-sepia-900 shrink-0">{point.image_url ? <img src={point.image_url} alt="" className="w-full h-full object-cover" /> : <MapPin className="m-5 text-sepia-500" />}</div><div className="flex-1 min-w-[180px]"><h3 className="text-sepia-100 text-xl font-serif">{point.name}</h3><p className="text-sepia-500 text-xs uppercase tracking-widest">{point.category} · {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}</p></div><span className={`inline-flex items-center gap-1 text-xs uppercase tracking-widest ${point.published ? 'text-green-400' : 'text-sepia-600'}`}>{point.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}{point.published ? 'Publicado' : 'Borrador'}</span><button onClick={() => setEditing({ ...point })} className="p-2 text-sepia-400 hover:text-sepia-100" title="Editar"><Edit2 className="w-4 h-4" /></button><button onClick={() => deletePoint(point)} className="p-2 text-red-400 hover:text-red-300" title="Eliminar"><Trash2 className="w-4 h-4" /></button></div>)}{visiblePoints.length === 0 && <p className="text-center text-sepia-600 py-16">No hay puntos creados.</p>}</div></div>;
};