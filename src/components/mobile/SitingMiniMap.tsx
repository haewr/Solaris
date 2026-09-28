import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Maximize2, MapPin, Layers, MousePointerClick } from 'lucide-react';
import { DUMAGUETE_DEFAULT_COORDS } from '../../services/nasaPowerService';

interface SitingMiniMapProps {
  latitude?: number;
  longitude?: number;
  addressName?: string;
  hasPin: boolean;
  onOpenPinpoint: () => void;
  onPinAtCoordinates?: (lat: number, lng: number) => void;
}

export const SitingMiniMap: React.FC<SitingMiniMapProps> = ({
  latitude = DUMAGUETE_DEFAULT_COORDS.latitude,
  longitude = DUMAGUETE_DEFAULT_COORDS.longitude,
  addressName = 'No location pinned yet',
  hasPin,
  onOpenPinpoint,
  onPinAtCoordinates,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [tileMode, setTileMode] = useState<'streets' | 'satellite'>('streets');
  const activeTileRef = useRef<L.TileLayer | null>(null);

  const createPinIcon = () => {
    return L.divIcon({
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
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const initialCenter: [number, number] = hasPin
      ? [latitude, longitude]
      : [DUMAGUETE_DEFAULT_COORDS.latitude, DUMAGUETE_DEFAULT_COORDS.longitude];

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: hasPin ? 16 : 13,
      zoomControl: false,
      attributionControl: false,
    });

    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
    }).addTo(map);
    activeTileRef.current = streetLayer;

    // Only create marker if a pin has been set by user
    if (hasPin) {
      const marker = L.marker([latitude, longitude], { icon: createPinIcon() }).addTo(map);
      marker.on('click', onOpenPinpoint);
      markerRef.current = marker;
    }

    map.on('click', (e) => {
      if (onPinAtCoordinates) {
        onPinAtCoordinates(e.latlng.lat, e.latlng.lng);
      } else {
        onOpenPinpoint();
      }
    });

    mapRef.current = map;

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

  // Update map coordinates & marker state when props change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (hasPin) {
      map.setView([latitude, longitude], 16, { animate: true });
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      } else {
        const marker = L.marker([latitude, longitude], { icon: createPinIcon() }).addTo(map);
        marker.on('click', onOpenPinpoint);
        markerRef.current = marker;
      }
    } else {
      // Remove marker if unpinned
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    }
    map.invalidateSize();
  }, [hasPin, latitude, longitude]);

  // Handle tile switch
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (activeTileRef.current) {
      map.removeLayer(activeTileRef.current);
    }

    if (tileMode === 'satellite') {
      const hybridLayer = L.tileLayer(
        'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        { maxZoom: 19, attribution: 'Google Satellite Hybrid' }
      ).addTo(map);
      activeTileRef.current = hybridLayer;
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
        className="w-full h-full cursor-crosshair z-0"
        style={{ height: '100%', width: '100%', minHeight: '190px' }}
        title={hasPin ? 'Click to adjust pin' : 'Click to drop pin on your location'}
      />

      {/* Satellite / Street toggle */}
      <div className="absolute top-2 left-2 z-10 flex bg-white/95 backdrop-blur-sm rounded-xl p-0.5 border border-slate-200 shadow-xs text-[10px] font-bold">
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
          Hybrid
        </button>
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
          Street Map
        </button>
      </div>

      {/* Expand / Adjust pin button */}
      <button
        type="button"
        onClick={onOpenPinpoint}
        className="absolute top-2 right-2 z-10 px-2.5 py-1 rounded-xl bg-white/95 hover:bg-white text-slate-700 text-[10px] font-bold border border-slate-200 shadow-xs flex items-center gap-1 active:scale-95 transition-all"
      >
        {hasPin ? (
          <>
            <Maximize2 className="w-3 h-3 text-indigo-600" />
            <span>Adjust Pin</span>
          </>
        ) : (
          <>
            <MousePointerClick className="w-3 h-3 text-indigo-600" />
            <span>Drop Pin</span>
          </>
        )}
      </button>

      {/* Coordinate bar */}
      <div
        onClick={onOpenPinpoint}
        className={`absolute bottom-2 left-2 right-2 z-10 backdrop-blur-sm px-2.5 py-1.5 rounded-xl border shadow-xs text-[10px] flex items-center justify-between cursor-pointer transition-colors ${
          hasPin
            ? 'bg-white/95 border-slate-200 text-slate-800 hover:bg-white'
            : 'bg-indigo-600/90 text-white border-indigo-400 hover:bg-indigo-600'
        }`}
      >
        <div className="flex items-center gap-1.5 truncate mr-2">
          <MapPin className={`w-3.5 h-3.5 shrink-0 ${hasPin ? 'text-indigo-600' : 'text-white animate-bounce'}`} />
          <span className="font-semibold truncate">
            {hasPin ? addressName : 'Tap map or use button to pinpoint your rooftop'}
          </span>
        </div>
        {hasPin && (
          <span className="font-mono text-slate-500 shrink-0 font-medium">
            {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
          </span>
        )}
      </div>
    </div>
  );
};
