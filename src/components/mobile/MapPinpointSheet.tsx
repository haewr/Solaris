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
import { Location, expoLocationService, LocationAccuracy } from '../../services/expoLocationService';
import { LocationPermissionModal } from './LocationPermissionModal';
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
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  // Default to 'hybrid' (Google Satellite Hybrid), with 'streets' (Street Map) as the other choice
  const [mapLayerType, setMapLayerType] = useState<'hybrid' | 'streets'>('hybrid');
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

    // Initial layer: Google Satellite Hybrid
    const hybridLayer = L.tileLayer(
      'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      {
        attribution: 'Google Satellite Hybrid',
        maxZoom: 19,
      }
    ).addTo(map);
    activeTileLayerRef.current = hybridLayer;

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

  // Handle layer switch between Hybrid and Street Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeTileLayerRef.current) {
      map.removeLayer(activeTileLayerRef.current);
    }

    if (mapLayerType === 'hybrid') {
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

  // Expo Location acquisition calling Location.requestForegroundPermissionAsync() directly on user tap
  const handleAcquireGps = async () => {
    setIsGpsLocating(true);
    setGpsError(null);

    try {
      // Specifically call Location.requestForegroundPermissionAsync() when user taps
      const permission = await Location.requestForegroundPermissionAsync();

      if (!permission.granted && permission.status !== 'granted') {
        setGpsError('Location permission was denied. Please allow location access in your device settings.');
        setShowPermissionModal(false);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 9000,
      });

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : 10;

      let address = `Device GPS Fix (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E, ±${accuracy}m)`;
      try {
        const geocoded = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (geocoded.length > 0 && geocoded[0].formattedAddress) {
          address = `${geocoded[0].formattedAddress} (±${accuracy}m)`;
        }
      } catch {
        // preserve address
      }

      updateMapPosition(lat, lng, address);
      setShowPermissionModal(false);
    } catch (err: any) {
      setGpsError(err.message || 'Unable to acquire device location via Expo Location.');
      setShowPermissionModal(false);
    } finally {
      setIsGpsLocating(false);
    }
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
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
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
                type="button"
                onClick={handleAcquireGps}
                disabled={isGpsLocating}
                className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all disabled:opacity-60"
              >
                <Navigation className={`w-3.5 h-3.5 ${isGpsLocating ? 'animate-spin' : ''}`} />
                <span>{isGpsLocating ? 'Acquiring Device Location...' : 'Use Device Location (Expo)'}</span>
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

            {/* Map Layer Switcher - Hybrid & Street Map only */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setMapLayerType('hybrid')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    mapLayerType === 'hybrid'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Hybrid
                </button>
                <button
                  type="button"
                  onClick={() => setMapLayerType('streets')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    mapLayerType === 'streets'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Street Map
                </button>
              </div>

              <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                <MousePointerClick className="w-3 h-3 text-indigo-600" />
                <span>Tap roof to move pin</span>
              </div>
            </div>

            {/* Leaflet Map Canvas */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner h-64 bg-slate-100">
              <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />

              {/* Pinpoint instructions overlay */}
              {!selectedCoords && (
                <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px] flex items-center justify-center pointer-events-none z-10 p-4">
                  <div className="bg-white/95 rounded-2xl px-4 py-2 text-center shadow-lg border border-slate-200">
                    <p className="text-xs font-bold text-slate-800">Tap anywhere on the map</p>
                    <p className="text-[10px] text-slate-500">to place your rooftop pin</p>
                  </div>
                </div>
              )}
            </div>

            {/* Selected Coordinates Status Card */}
            {selectedCoords ? (
              <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">
                    Pinned Site Coordinates
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    NASA Ready
                  </span>
                </div>
                <div className="font-mono text-xs font-bold text-indigo-950">
                  {selectedCoords.lat.toFixed(5)}°N, {selectedCoords.lng.toFixed(5)}°E
                </div>
                <p className="text-[10px] text-indigo-700">
                  {addressName || 'Target Rooftop Location'}
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200 text-center">
                <p className="text-xs text-slate-600 font-medium">No site pinned yet</p>
                <p className="text-[10px] text-slate-400">
                  Use "Acquire Device Location", choose a barangay, or tap the map directly
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-3xl flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!selectedCoords}
              className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Confirm Location</span>
            </button>
          </div>
        </div>
      </div>

      {/* Permission Request Dialog */}
      <LocationPermissionModal
        isOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onConfirm={handleAcquireGps}
        isLocating={isGpsLocating}
      />
    </>
  );
};
