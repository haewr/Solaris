import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Navigation, Compass, Check, Search } from 'lucide-react';
import { LocationCoordinates } from '../../types/nativeSolaris';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapPinpointSheetProps {
  currentLocation: LocationCoordinates;
  onConfirmLocation: (loc: LocationCoordinates) => void;
  onClose: () => void;
}

// Dumaguete City barangays with real coordinates
const DUMAGUETE_BARANGAYS = [
  { name: 'Poblacion / Silliman Campus', lat: 9.3142, lng: 123.3075 },
  { name: 'Bantayan, Dumaguete', lat: 9.3245, lng: 123.3061 },
  { name: 'Piapi Beachfront', lat: 9.3201, lng: 123.3105 },
  { name: 'Daro, Dumaguete', lat: 9.3168, lng: 123.2985 },
  { name: 'Taclobo, Dumaguete', lat: 9.3032, lng: 123.3015 },
  { name: 'Tubod Highway', lat: 9.2941, lng: 123.2952 },
  { name: 'Bagacay, Dumaguete', lat: 9.3089, lng: 123.2871 },
  { name: 'Candau-ay Heights', lat: 9.3215, lng: 123.2755 },
  { name: 'Junob, Dumaguete', lat: 9.2895, lng: 123.2812 },
  { name: 'Bajumpandan', lat: 9.2785, lng: 123.2921 },
];

export const MapPinpointSheet: React.FC<MapPinpointSheetProps> = ({
  currentLocation,
  onConfirmLocation,
  onClose,
}) => {
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({
    lat: currentLocation.latitude,
    lng: currentLocation.longitude,
  });
  const [addressName, setAddressName] = useState(currentLocation.addressName);
  const [isGpsLocating, setIsGpsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [mapLayerType, setMapLayerType] = useState<'streets' | 'satellite'>('streets');
  const activeTileLayerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Custom map pin icon using Leaflet DivIcon
    const customPin = L.divIcon({
      className: 'custom-pin-marker',
      html: `
        <div style="background-color: #4f46e5; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.45); border: 3px solid white; cursor: pointer;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });

    // Initialize Leaflet map centered on current coordinates
    const map = L.map(mapContainerRef.current, {
      center: [selectedCoords.lat, selectedCoords.lng],
      zoom: 15,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initial tile layer (Streets)
    const streetTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
    }).addTo(map);
    activeTileLayerRef.current = streetTiles;

    // Draggable marker
    const marker = L.marker([selectedCoords.lat, selectedCoords.lng], {
      draggable: true,
      icon: customPin,
    }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setSelectedCoords({ lat: pos.lat, lng: pos.lng });
      setAddressName(`Custom Pinpoint (${pos.lat.toFixed(4)}°N, ${pos.lng.toFixed(4)}°E)`);
    });

    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      setSelectedCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      setAddressName(`Map Pinpoint (${e.latlng.lat.toFixed(4)}°N, ${e.latlng.lng.toFixed(4)}°E)`);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    // Fix localhost / modal rendering: Leaflet requires invalidateSize once container is dimensioned
    const triggerInvalidate = () => {
      if (map) {
        map.invalidateSize();
      }
    };

    requestAnimationFrame(triggerInvalidate);
    const timer1 = setTimeout(triggerInvalidate, 80);
    const timer2 = setTimeout(triggerInvalidate, 250);
    const timer3 = setTimeout(triggerInvalidate, 600);

    // ResizeObserver ensures map resizes whenever sheet animation finishes or window scales
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        triggerInvalidate();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      if (resizeObserver) resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Handle layer switch between streets & satellite
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeTileLayerRef.current) {
      map.removeLayer(activeTileLayerRef.current);
    }

    if (mapLayerType === 'satellite') {
      const satLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: 'Esri Satellite Imagery',
        }
      ).addTo(map);
      activeTileLayerRef.current = satLayer;
    } else {
      const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
      }).addTo(map);
      activeTileLayerRef.current = streetLayer;
    }
    map.invalidateSize();
  }, [mapLayerType]);

  // Update map center when selectedCoords changes
  const updateMapPosition = (lat: number, lng: number, name: string) => {
    setSelectedCoords({ lat, lng });
    setAddressName(name);
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([lat, lng], 15);
      markerRef.current.setLatLng([lat, lng]);
    }
  };

  // Real native GPS location handler
  const handleAcquireGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser or device.');
      return;
    }

    setIsGpsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGpsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        const name = `GPS Locked (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E, ±${Math.round(accuracy)}m)`;
        updateMapPosition(lat, lng, name);
      },
      (err) => {
        setIsGpsLocating(false);
        setGpsError(`GPS Access Error: ${err.message}. Using Dumaguete manual pinpoint.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSave = () => {
    onConfirmLocation({
      latitude: selectedCoords.lat,
      longitude: selectedCoords.lng,
      timestamp: Date.now(),
      source: addressName.includes('GPS') ? 'gps' : 'manual_pinpoint',
      addressName,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white text-slate-900 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in slide-in-from-bottom-6">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md rounded-t-3xl z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pinpoint Solar Site</h3>
              <p className="text-[11px] text-slate-500 font-medium">Dumaguete City, Philippines</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 active:scale-95 transition-all"
            aria-label="Close pinpoint sheet"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="p-4 space-y-3.5 overflow-y-auto">
          {/* Real GPS Action Bar */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleAcquireGps}
              disabled={isGpsLocating}
              className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all disabled:opacity-60"
            >
              <Navigation className={`w-3.5 h-3.5 ${isGpsLocating ? 'animate-spin' : ''}`} />
              <span>{isGpsLocating ? 'Acquiring GPS Fix...' : 'Acquire Real GPS Fix'}</span>
            </button>
          </div>

          {gpsError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-700 font-medium">
              {gpsError}
            </div>
          )}

          {/* Quick Select Dumaguete Barangays */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Or Quick Select Dumaguete Barangay:
            </span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {DUMAGUETE_BARANGAYS.map((b) => (
                <button
                  key={b.name}
                  onClick={() => updateMapPosition(b.lat, b.lng, b.name)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all border ${
                    Math.abs(selectedCoords.lat - b.lat) < 0.001 &&
                    Math.abs(selectedCoords.lng - b.lng) < 0.001
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          {/* Leaflet Map Stage */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner h-60 sm:h-72 bg-slate-100">
            <div ref={mapContainerRef} className="w-full h-full min-h-[240px] z-0" style={{ height: '100%', width: '100%' }} />

            {/* Layer switcher pill */}
            <div className="absolute top-2 left-2 z-10 flex bg-white/90 backdrop-blur-sm rounded-xl p-0.5 border border-slate-200 shadow-xs text-[10px] font-bold">
              <button
                onClick={() => setMapLayerType('streets')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  mapLayerType === 'streets'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Streets
              </button>
              <button
                onClick={() => setMapLayerType('satellite')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  mapLayerType === 'satellite'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Satellite
              </button>
            </div>

            <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur-sm px-2.5 py-1.5 rounded-xl text-[10px] text-slate-700 font-medium border border-slate-200 shadow-xs z-10 flex items-center justify-between">
              <span>Tap or drag marker to your roof</span>
              <span className="font-mono text-indigo-600 font-bold">
                {selectedCoords.lat.toFixed(4)}°, {selectedCoords.lng.toFixed(4)}°
              </span>
            </div>
          </div>

          {/* Address Label Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">Site Location Label</label>
            <input
              type="text"
              value={addressName}
              onChange={(e) => setAddressName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              placeholder="e.g. House on Hibbard Ave, Dumaguete"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 rounded-b-3xl flex gap-2">
          <button
            onClick={onClose}
            className="w-1/3 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="w-2/3 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Apply Siting Location</span>
          </button>
        </div>
      </div>
    </div>
  );
};
