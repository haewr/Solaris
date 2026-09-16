import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Maximize2, MapPin, Layers } from 'lucide-react';

interface SitingMiniMapProps {
  latitude: number;
  longitude: number;
  addressName: string;
  onOpenPinpoint: () => void;
}

export const SitingMiniMap: React.FC<SitingMiniMapProps> = ({
  latitude,
  longitude,
  addressName,
  onOpenPinpoint,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [tileMode, setTileMode] = useState<'streets' | 'satellite'>('streets');
  const activeTileRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Custom DivIcon marker
    const pinIcon = L.divIcon({
      className: 'siting-pin-marker',
      html: `
        <div style="background-color: #4f46e5; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.45); border: 2.5px solid white;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    // Initialize Map with zoom controls disabled for mini preview
    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
    }).addTo(map);
    activeTileRef.current = streetLayer;

    const marker = L.marker([latitude, longitude], { icon: pinIcon }).addTo(map);
    marker.on('click', onOpenPinpoint);

    mapRef.current = map;
    markerRef.current = marker;

    // Fix localhost / iframe layout: trigger invalidateSize immediately & on frame
    const refreshSize = () => {
      if (map) map.invalidateSize();
    };

    requestAnimationFrame(refreshSize);
    const t1 = setTimeout(refreshSize, 100);
    const t2 = setTimeout(refreshSize, 300);
    const t3 = setTimeout(refreshSize, 800);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        refreshSize();
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (resizeObserver) resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Update map coordinates when props change
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      mapRef.current.setView([latitude, longitude], 16, { animate: true });
      markerRef.current.setLatLng([latitude, longitude]);
      mapRef.current.invalidateSize();
    }
  }, [latitude, longitude]);

  // Handle tile switch
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (activeTileRef.current) {
      map.removeLayer(activeTileRef.current);
    }

    if (tileMode === 'satellite') {
      const satLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      ).addTo(map);
      activeTileRef.current = satLayer;
    } else {
      const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
      }).addTo(map);
      activeTileRef.current = streetLayer;
    }
    map.invalidateSize();
  }, [tileMode]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200/90 shadow-xs h-48 bg-slate-100 group">
      {/* Map canvas */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-pointer z-0"
        style={{ height: '100%', width: '100%', minHeight: '190px' }}
        onClick={onOpenPinpoint}
        title="Click to open interactive pinpoint map"
      />

      {/* Satellite / Street toggle */}
      <div className="absolute top-2 left-2 z-10 flex bg-white/95 backdrop-blur-sm rounded-xl p-0.5 border border-slate-200 shadow-xs text-[10px] font-bold">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setTileMode('streets');
          }}
          className={`px-2 py-0.5 rounded-lg transition-all ${
            tileMode === 'streets'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Street
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setTileMode('satellite');
          }}
          className={`px-2 py-0.5 rounded-lg transition-all ${
            tileMode === 'satellite'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Satellite
        </button>
      </div>

      {/* Expand / Adjust pin button */}
      <button
        type="button"
        onClick={onOpenPinpoint}
        className="absolute top-2 right-2 z-10 px-2.5 py-1 rounded-xl bg-white/95 hover:bg-white text-slate-700 text-[10px] font-bold border border-slate-200 shadow-xs flex items-center gap-1 active:scale-95 transition-all"
      >
        <Maximize2 className="w-3 h-3 text-indigo-600" />
        <span>Adjust Pin</span>
      </button>

      {/* Coordinate bar */}
      <div
        onClick={onOpenPinpoint}
        className="absolute bottom-2 left-2 right-2 z-10 bg-white/95 backdrop-blur-sm px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-xs text-[10px] flex items-center justify-between cursor-pointer hover:bg-white transition-colors"
      >
        <div className="flex items-center gap-1.5 truncate mr-2">
          <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="font-semibold text-slate-800 truncate">{addressName}</span>
        </div>
        <span className="font-mono text-slate-500 shrink-0 font-medium">
          {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
        </span>
      </div>
    </div>
  );
};
