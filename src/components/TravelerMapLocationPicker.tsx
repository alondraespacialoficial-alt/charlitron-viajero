import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search } from 'lucide-react';

interface PlaceResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface TravelerMapLocationPickerProps {
  latitude: number;
  longitude: number;
  onLocationChange: (latitude: number, longitude: number, label?: string) => void;
}

export const TravelerMapLocationPicker: React.FC<TravelerMapLocationPickerProps> = ({ latitude, longitude, onLocationChange }) => {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const onLocationChangeRef = useRef(onLocationChange);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [message, setMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  useEffect(() => {
    if (!mapElement.current || mapRef.current) return;
    const start: L.LatLngExpression = [latitude, longitude];
    const map = L.map(mapElement.current).setView(start, 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    const marker = L.circleMarker(start, {
      radius: 9,
      color: '#ffffff',
      weight: 3,
      fillColor: '#c2410c',
      fillOpacity: 1,
    }).addTo(map);
    map.on('click', event => {
      marker.setLatLng(event.latlng);
      onLocationChangeRef.current(event.latlng.lat, event.latlng.lng);
    });
    mapRef.current = map;
    markerRef.current = marker;
    const resizeTimer = window.setTimeout(() => map.invalidateSize(), 100);
    return () => {
      window.clearTimeout(resizeTimer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    const nextPosition: L.LatLngExpression = [latitude, longitude];
    markerRef.current.setLatLng(nextPosition);
    mapRef.current.panTo(nextPosition);
  }, [latitude, longitude]);

  const searchPlaces = async () => {
    if (!query.trim()) {
      setMessage('Escribe el nombre del lugar o una dirección.');
      return;
    }
    setIsSearching(true);
    setMessage('');
    setResults([]);
    try {
      const params = new URLSearchParams({
        q: `${query.trim()}, San Luis Potosí, México`,
        format: 'jsonv2',
        addressdetails: '1',
        countrycodes: 'mx',
        limit: '5',
        viewbox: '-101.5,22.8,-100.2,21.2',
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { 'Accept-Language': 'es' },
      });
      if (!response.ok) throw new Error('No se pudo consultar el buscador de lugares.');
      const places = await response.json() as PlaceResult[];
      setResults(places);
      if (places.length === 0) setMessage('No encontré resultados. Prueba con otra referencia o marca el punto en el mapa.');
    } catch (error: any) {
      setMessage(error?.message || 'No se pudo buscar el lugar. Puedes marcarlo directamente en el mapa.');
    } finally {
      setIsSearching(false);
    }
  };

  const choosePlace = (place: PlaceResult) => {
    onLocationChange(Number(place.lat), Number(place.lon), place.display_name);
    setResults([]);
    setMessage('Ubicación seleccionada.');
  };

  const likelyPositiveSlpLongitude = latitude >= 21 && latitude <= 24 && longitude >= 98 && longitude <= 103;

  return <section className="space-y-3 rounded-xl border border-sepia-800 bg-sepia-950/50 p-4">
    <div>
      <h3 className="font-bold text-sepia-100">Encontrar ubicación</h3>
      <p className="text-xs text-sepia-500">Busca el lugar o toca el mapa para colocar el punto. La longitud de San Luis Potosí va en negativo.</p>
    </div>
    <div className="flex gap-2">
      <input
        value={query}
        onChange={event => setQuery(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); searchPlaces(); } }}
        className="min-w-0 flex-1 rounded-xl border border-sepia-800 bg-sepia-950 p-3 text-sepia-100 outline-none focus:border-sepia-500"
        placeholder="Ej. Explanada Ponciano Arriaga"
        aria-label="Buscar lugar en San Luis Potosí"
      />
      <button type="button" onClick={searchPlaces} disabled={isSearching} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-sepia-500 px-3 text-sepia-950 disabled:opacity-50" title="Buscar lugar">
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">{isSearching ? 'Buscando...' : 'Buscar'}</span>
      </button>
    </div>
    {results.length > 0 && <div className="max-h-48 overflow-y-auto rounded-lg border border-sepia-800">
      {results.map((place, index) => <button key={`${place.lat}-${place.lon}-${index}`} type="button" onClick={() => choosePlace(place)} className="block w-full border-b border-sepia-800 p-3 text-left text-sm text-sepia-200 last:border-b-0 hover:bg-sepia-800">
        {place.display_name}
      </button>)}
    </div>}
    <div className="h-56 overflow-hidden rounded-xl border border-sepia-800">
      <div ref={mapElement} className="h-full w-full" />
    </div>
    <p className="text-xs text-sepia-500">{latitude.toFixed(6)}, {longitude.toFixed(6)}</p>
    {likelyPositiveSlpLongitude && <p className="text-sm font-bold text-amber-400">Esta longitud positiva ubica el punto en Asia. Busca el sitio o toca su ubicación en el mapa.</p>}
    {message && <p role="status" className="text-xs text-sepia-400">{message}</p>}
  </section>;
};