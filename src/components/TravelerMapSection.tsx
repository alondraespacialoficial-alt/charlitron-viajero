import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, ExternalLink, List, Map as MapIcon, MapPin, Search, X } from 'lucide-react';
import { supabase } from '../supabase';
import { Story, TravelerMapCategory, TravelerMapPoint } from '../types';

const MAP_CENTER: L.LatLngExpression = [22.1565, -100.9855];
const CATEGORIES: Array<'Todos' | TravelerMapCategory> = ['Todos', 'Lugar', 'Personaje', 'Comercio', 'Barrio', 'Suceso', 'Recuerdo'];

const categoryIcons: Record<TravelerMapCategory, string> = {
  Lugar: '⌖', Personaje: '◉', Comercio: '▣', Barrio: '⌂', Suceso: '✦', Recuerdo: '♥',
};

const categoryColors: Record<TravelerMapCategory, string> = {
  Lugar: '#c19251', Personaje: '#8e6136', Comercio: '#557a70', Barrio: '#936b91', Suceso: '#b15d4a', Recuerdo: '#b84f63',
};

interface TravelerMapSectionProps {
  stories: Story[];
  onBack: () => void;
  onOpenStory: (story: Story) => void;
}

const makeMarkerIcon = (point: TravelerMapPoint, selected: boolean) => L.divIcon({
  className: 'traveler-map-marker-wrapper',
  html: `<span class="traveler-map-marker ${selected ? 'is-selected' : ''}" style="--marker-color: ${categoryColors[point.category] || categoryColors.Lugar}">${categoryIcons[point.category] || categoryIcons.Lugar}</span>`,
  iconSize: [38, 38], iconAnchor: [19, 19],
});

const MapView = ({ points, selectedId, onSelect }: { points: TravelerMapPoint[]; selectedId: string | null; onSelect: (point: TravelerMapPoint) => void }) => {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapElement.current || mapRef.current) return;
    const map = L.map(mapElement.current, { zoomControl: false, attributionControl: true }).setView(MAP_CENTER, 13);
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles &copy; Esri', maxZoom: 19 }).addTo(map);
    L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { attribution: 'Labels &copy; Esri', maxZoom: 19 }).addTo(map);
    markerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 0);
    return () => { map.remove(); mapRef.current = null; markerLayerRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;
    markerLayer.clearLayers();
    const markers = points.map(point => {
      const marker = L.marker([point.latitude, point.longitude], { icon: makeMarkerIcon(point, point.id === selectedId), title: point.name });
      marker.on('click', () => onSelect(point));
      marker.addTo(markerLayer);
      return marker;
    });
    if (selectedId) {
      const selected = points.find(point => point.id === selectedId);
      if (selected) map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), 16), { duration: 0.8 });
    } else if (markers.length > 1) {
      map.fitBounds(L.featureGroup(markers).getBounds().pad(0.15), { maxZoom: 14, animate: true });
    } else if (markers.length === 1) {
      map.flyTo(markers[0].getLatLng(), 15, { duration: 0.6 });
    }
  }, [points, selectedId, onSelect]);

  return <div ref={mapElement} className="h-[62vh] min-h-[420px] w-full" />;
};

export const TravelerMapSection: React.FC<TravelerMapSectionProps> = ({ stories, onBack, onOpenStory }) => {
  const [points, setPoints] = useState<TravelerMapPoint[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'Todos' | TravelerMapCategory>('Todos');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPoints = async () => {
      const { data, error: queryError } = await supabase.from('traveler_map_points').select('*').eq('published', true).order('featured', { ascending: false }).order('name', { ascending: true });
      if (queryError) setError('No se pudieron cargar los puntos del mapa. Ejecuta primero TRAVELER-MAP-SETUP.sql en Supabase.');
      else setPoints((data || []) as TravelerMapPoint[]);
      setIsLoading(false);
    };
    loadPoints();
  }, []);

  const filteredPoints = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase();
    return points.filter(point => {
      if (category !== 'Todos' && point.category !== category) return false;
      if (!normalized) return true;
      const haystack = [point.name, point.description, point.era, point.address, point.neighborhood, ...(point.tags || [])].filter(Boolean).join(' ').toLocaleLowerCase();
      return haystack.includes(normalized);
    });
  }, [category, points, search]);

  const selectedPoint = points.find(point => point.id === selectedId) || null;
  const selectedStory = selectedPoint?.story_id ? stories.find(story => story.id === selectedPoint.story_id) : undefined;

  return (
    <main className="min-h-screen bg-sepia-950 text-sepia-100 pt-24 pb-12">
      <div className="max-w-[1500px] mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between gap-4 mb-8">
          <button onClick={onBack} className="inline-flex items-center gap-2 text-sepia-400 hover:text-sepia-100 uppercase tracking-widest text-xs font-bold"><ArrowLeft className="w-4 h-4" /> Regresar</button>
          <div className="flex items-center gap-2 rounded-full bg-sepia-900 p-1"><button onClick={() => setView('map')} className={`p-2 rounded-full ${view === 'map' ? 'bg-sepia-500 text-sepia-950' : 'text-sepia-400'}`} title="Ver mapa"><MapIcon className="w-4 h-4" /></button><button onClick={() => setView('list')} className={`p-2 rounded-full ${view === 'list' ? 'bg-sepia-500 text-sepia-950' : 'text-sepia-400'}`} title="Ver lista"><List className="w-4 h-4" /></button></div>
        </div>
        <header className="mb-8"><p className="text-sepia-500 uppercase tracking-[0.3em] text-xs font-bold mb-3">Archivo geográfico de memoria</p><h1 className="text-4xl md:text-6xl font-serif mb-3">Mapa del Viajero</h1><p className="text-sepia-300 text-lg font-light">San Luis contado a través de sus lugares, historias y recuerdos.</p></header>
        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4 mb-4">
          <section className="rounded-2xl overflow-hidden border border-sepia-800 bg-sepia-900/40 shadow-2xl">
            <div className="p-3 md:p-4 border-b border-sepia-800 space-y-3"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sepia-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar lugar, personaje, barrio o recuerdo..." className="w-full bg-sepia-950 border border-sepia-800 rounded-xl py-3 pl-12 pr-10 text-sepia-100 outline-none focus:border-sepia-500" />{search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-sepia-500" title="Limpiar búsqueda"><X className="w-4 h-4" /></button>}</div><div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">{CATEGORIES.map(item => <button key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap px-3 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold ${category === item ? 'bg-sepia-500 text-sepia-950' : 'bg-sepia-950 text-sepia-400 hover:text-sepia-100'}`}>{item}</button>)}</div></div>
            {isLoading ? <div className="h-[62vh] min-h-[420px] flex items-center justify-center text-sepia-400">Cargando puntos...</div> : error ? <div className="h-[62vh] min-h-[420px] flex items-center justify-center p-8 text-center text-sepia-400">{error}</div> : view === 'map' ? <MapView points={filteredPoints} selectedId={selectedId} onSelect={setSelectedId} /> : <div className="h-[62vh] min-h-[420px] overflow-y-auto p-4 space-y-3">{filteredPoints.map(point => <button key={point.id} onClick={() => setSelectedId(point.id)} className={`w-full text-left flex gap-4 p-3 rounded-xl border ${selectedId === point.id ? 'border-sepia-500 bg-sepia-800' : 'border-sepia-800 bg-sepia-950/60 hover:border-sepia-600'}`}><div className="w-16 h-16 rounded-lg overflow-hidden bg-sepia-800 shrink-0">{point.image_url ? <img src={point.image_url} alt="" className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center"><MapPin className="text-sepia-500" /></div>}</div><div><p className="text-sepia-100 font-serif text-xl">{point.name}</p><p className="text-sepia-500 text-xs uppercase tracking-widest">{point.category}{point.era ? ` · ${point.era}` : ''}</p><p className="text-sepia-400 text-sm line-clamp-2 mt-1">{point.description}</p></div></button>)}{filteredPoints.length === 0 && <p className="text-center text-sepia-500 py-16">No encontramos puntos con esa búsqueda.</p>}</div>}
          </section>
          <aside className="rounded-2xl border border-sepia-800 bg-sepia-900/70 p-5 min-h-[260px]">{selectedPoint ? <div className="space-y-4"><div className="flex justify-between items-start gap-3"><div><p className="text-sepia-500 text-xs uppercase tracking-widest">{selectedPoint.category}</p><h2 className="text-3xl font-serif text-sepia-100">{selectedPoint.name}</h2></div><button onClick={() => setSelectedId(null)} className="text-sepia-500 hover:text-sepia-100" title="Cerrar detalle"><X className="w-5 h-5" /></button></div>{selectedPoint.image_url && <img src={selectedPoint.image_url} alt={selectedPoint.name} className="w-full aspect-[4/3] object-cover rounded-xl" />}{selectedPoint.era && <p className="text-sepia-400 italic">{selectedPoint.era}</p>}<p className="text-sepia-300 leading-relaxed">{selectedPoint.description || 'Cada punto del mapa guarda una historia.'}</p>{selectedPoint.address && <p className="text-sepia-400 text-sm"><MapPin className="inline w-4 h-4 mr-1" />{selectedPoint.address}</p>}<div className="flex flex-wrap gap-2">{selectedStory && <button onClick={() => onOpenStory(selectedStory)} className="inline-flex items-center gap-2 bg-sepia-500 text-sepia-950 px-4 py-3 rounded-xl uppercase tracking-widest text-xs font-bold hover:bg-sepia-400">Viajar a esta historia <ExternalLink className="w-4 h-4" /></button>}{selectedPoint.external_url && <a href={selectedPoint.external_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-sepia-700 text-sepia-300 px-4 py-3 rounded-xl uppercase tracking-widest text-xs font-bold hover:border-sepia-400">Enlace externo <ExternalLink className="w-4 h-4" /></a>}</div></div> : <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center"><MapPin className="w-10 h-10 text-sepia-500 mb-4" /><h2 className="text-2xl font-serif text-sepia-100">Cada punto guarda una historia</h2><p className="text-sepia-400 text-sm mt-2">Selecciona un icono para comenzar a viajar.</p></div>}</aside>
        </div>
        <p className="text-sepia-600 text-xs text-center">{filteredPoints.length} {filteredPoints.length === 1 ? 'punto publicado' : 'puntos publicados'}</p>
      </div>
    </main>
  );
};