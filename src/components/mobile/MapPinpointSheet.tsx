import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  MapPin,
  Navigation,
  Compass,
  Check,
  Search,
  Lock,
  CloudSun,
  Layers,
  Info,
  Cloud,
  MousePointerClick,
} from 'lucide-react';
import { LocationCoordinates } from '../../types/nativeSolaris';
import { DUMAGUETE_DEFAULT_COORDS } from '../../services/nasaPowerService';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapPinpointSheetProps {
  currentLocation: LocationCoordinates | null;
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
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(
    currentLocation ? { lat: currentLocation.latitude, lng: currentLocation.longitude } : null
  );
  const [addressName, setAddressName] = useState(
    currentLocation ? currentLocation.addressName : ''
  );
  const [isGpsLocating, setIsGpsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState(15);
  const [showCloudInfo, setShowCloudInfo] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [mapLayerType, setMapLayerType] = useState<'streets' | 'satellite' | 'hybrid'>('satellite');
  const activeTileLayerRef = useRef<L.TileLayer | null>(null);

  const createPinIcon = () => {
    return L.divIcon({
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
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialCenter: [number, number] = selectedCoords
      ? [selectedCoords.lat, selectedCoords.lng]
      : [DUMAGUETE_DEFAULT_COORDS.latitude, DUMAGUETE_DEFAULT_COORDS.longitude];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: selectedCoords ? 16 : 14,
      maxZoom: 19,
      minZoom: 11,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    const satLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Esri World Imagery',
        maxZoom: 19,
        maxNativeZoom: 18,
      }
    ).addTo(map);
    activeTileLayerRef.current = satLayer;

    // Only add marker if coordinates already exist
    if (selectedCoords) {
      const marker = L.marker([selectedCoords.lat, selectedCoords.lng], {
        draggable: true,
        icon: createPinIcon(),
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setSelectedCoords({ lat: pos.lat, lng: pos.lng });
        setAddressName(`Pinpoint (${pos.lat.toFixed(4)}°N, ${pos.lng.toFixed(4)}°E)`);
      });

      markerRef.current = marker;
    }

    // Tap map to place/move pin
    map.on('click', (e) => {
      setSelectedCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      setAddressName(`Pinpoint (${e.latlng.lat.toFixed(4)}°N, ${e.latlng.lng.toFixed(4)}°E)`);

      if (markerRef.current) {
        markerRef.current.setLatLng(e.latlng);
      } else {
        const marker = L.marker([e.latlng.lat, e.latlng.lng], {
          draggable: true,
          icon: createPinIcon(),
        }).addTo(map);

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          setSelectedCoords({ lat: pos.lat, lng: pos.lng });
          setAddressName(`Pinpoint (${pos.lat.toFixed(4)}°N, ${pos.lng.toFixed(4)}°E)`);
        });

        markerRef.current = marker;
      }
    });

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    mapInstanceRef.current = map;

    // Invalidate size once container is dimensioned
    const triggerInvalidate = () => {
      if (map) {
        map.invalidateSize();
      }
    };

    requestAnimationFrame(triggerInvalidate);
    const timer1 = setTimeout(triggerInvalidate, 80);
    const timer2 = setTimeout(triggerInvalidate, 250);
    const timer3 = setTimeout(triggerInvalidate, 600);

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

  // Handle layer switch between streets, satellite, and hybrid
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
          maxNativeZoom: 18,
          attribution: 'Esri Satellite Imagery',
        }
      ).addTo(map);
      activeTileLayerRef.current = satLayer;
    } else if (mapLayerType === 'hybrid') {
      const hybridLayer = L.tileLayer(
        'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        {
          maxZoom: 19,
          attribution: 'Google Satellite Hybrid',
        }
      ).addTo(map);
      activeTileLayerRef.current = hybridLayer;
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

  // Update map center when a location or barangay is chosen
  const updateMapPosition = (lat: number, lng: number, name: string) => {
    setSelectedCoords({ lat, lng });
    setAddressName(name);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], Math.max(16, currentZoom));

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], {
          draggable: true,
          icon: createPinIcon(),
        }).addTo(mapInstanceRef.current);

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          setSelectedCoords({ lat: pos.lat, lng: pos.lng });
          setAddressName(`Pinpoint (${pos.lat.toFixed(4)}°N, ${pos.lng.toFixed(4)}°E)`);
        });

        markerRef.current = marker;
      }
    }
  };

  // Robust GPS location handler
  const handleAcquireGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser or device.');
      return;
    }

    setIsGpsLocating(true);
    setGpsError(null);

    const onPosSuccess = (pos: GeolocationPosition) => {
      setIsGpsLocating(false);
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = Math.round(pos.coords.accuracy);
      const name = `GPS Device Fix (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E, ±${accuracy}m)`;
      updateMapPosition(lat, lng, name);
    };

    navigator.geolocation.getCurrentPosition(
      onPosSuccess,
      (err) => {
        if (err.code === 3 || err.code === 2) {
          navigator.geolocation.getCurrentPosition(
            onPosSuccess,
            (fallbackErr) => {
              setIsGpsLocating(false);
              setGpsError(
                `GPS signal timeout (${fallbackErr.message}). You can select your Dumaguete barangay or tap the roof on the map.`
              );
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
          );
        } else {
          setIsGpsLocating(false);
          setGpsError(`GPS Access: ${err.message}. Please use the map or quick barangay select.`);
        }
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
    );
  };

  const handleSave = () => {
    if (!selectedCoords) return;
    onConfirmLocation({
      latitude: selectedCoords.lat,
      longitude: selectedCoords.lng,
      timestamp: Date.now(),
      source: addressName.includes('GPS') ? 'gps' : 'manual_pinpoint',
      addressName: addressName || `Pinpoint (${selectedCoords.lat.toFixed(4)}°N, ${selectedCoords.lng.toFixed(4)}°E)`,
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
              <p className="text-[11px] text-slate-500 font-medium">Dumaguete City, Negros Oriental</p>
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
              <span>{isGpsLocating ? 'Acquiring GPS / Network Fix...' : 'Acquire Device Location'}</span>
            </button>
          </div>

          {gpsError && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-medium">
              {gpsError}
            </div>
          )}

          {/* Quick Select Dumaguete Barangays */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Quick Select Dumaguete Barangay:
            </span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {DUMAGUETE_BARANGAYS.map((b) => (
                <button
                  key={b.name}
                  onClick={() => updateMapPosition(b.lat, b.lng, b.name)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all border ${
                    selectedCoords &&
                    Math.abs(selectedCoords.lat - b.lat) < 0.001 &&
                    Math.abs(selectedCoords.lng - b.lng) < 0.001
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          {/* Map Layer Switcher */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setMapLayerType('satellite')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  mapLayerType === 'satellite'
                    ? 'bg-white text-indigo-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Esri Aerial
              </button>
              <button
                onClick={() => setMapLayerType('hybrid')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  mapLayerType === 'hybrid'
                    ? 'bg-white text-indigo-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hybrid
              </button>
              <button
                onClick={() => setMapLayerType('streets')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  mapLayerType === 'streets'
                    ? 'bg-white text-indigo-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Street Map
              </button>
            </div>

            <button
              onClick={() => setShowCloudInfo(!showCloudInfo)}
              className="text-[11px] font-bold text-slate-600 flex items-center gap-1 hover:text-indigo-600"
            >
              <CloudSun className="w-3.5 h-3.5" />
              <span>Tropical Sun Align</span>
            </button>
          </div>

          {showCloudInfo && (
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl text-[11px] text-indigo-900 space-y-1">
              <span className="font-bold block">Negros Island Satellite Siting Tip</span>
              <p className="leading-snug text-slate-600">
                Mount Talinis southwest of Dumaguete causes afternoon cloud build-up. Orienting panels South (180°) or slightly Southeast (150°-170°) maximizes morning and noon clear-sky peak sun hours.
              </p>
            </div>
          )}

          {/* Leaflet Map Canvas */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner h-64 bg-slate-100">
            <div ref={mapContainerRef} className="w-full h-full cursor-crosshair z-0" />

            {!selectedCoords && (
              <div className="absolute top-2 left-2 right-12 z-10 bg-indigo-600/90 text-white backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-xs text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                <MousePointerClick className="w-4 h-4 shrink-0" />
                <span>Tap anywhere on your roof to place the pin</span>
              </div>
            )}

            {selectedCoords && (
              <div className="absolute top-2 left-2 z-10 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-xl border border-slate-200 shadow-xs text-[10px] font-mono text-slate-700">
                {selectedCoords.lat.toFixed(5)}°N, {selectedCoords.lng.toFixed(5)}°E
              </div>
            )}
          </div>

          {/* Current Address display */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">
              Site Coordinate Label
            </label>
            <div className="relative">
              <input
                type="text"
                value={addressName || (selectedCoords ? `Pinpoint (${selectedCoords.lat.toFixed(4)}°N, ${selectedCoords.lng.toFixed(4)}°E)` : 'No location selected yet')}
                readOnly
                disabled
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold cursor-not-allowed"
                placeholder="Tap map to place pin..."
              />
            </div>
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
            disabled={!selectedCoords}
            className="w-2/3 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            <span>{selectedCoords ? 'Apply Siting Location' : 'Tap Map to Drop Pin'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
