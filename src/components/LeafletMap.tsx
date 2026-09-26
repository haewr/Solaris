import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, Eye, Compass, Maximize2, MousePointerClick, Edit3, CheckCircle, RotateCcw } from 'lucide-react';
import { BuildingFootprint, GeoPoint } from '../types/solaris';

interface LeafletMapProps {
  center: GeoPoint;
  buildings: BuildingFootprint[];
  selectedBuilding: BuildingFootprint | null;
  onSelectBuilding: (building: BuildingFootprint) => void;
  onMapClick: (lat: number, lng: number) => void;
  isDrawingMode?: boolean;
  drawnPoints?: [number, number][];
  onAddDrawnPoint?: (pt: [number, number]) => void;
  onClearDrawnPoints?: () => void;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  center,
  buildings,
  selectedBuilding,
  onSelectBuilding,
  onMapClick,
  isDrawingMode = false,
  drawnPoints = [],
  onAddDrawnPoint,
  onClearDrawnPoints,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
  const drawingLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('satellite');

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [center.lat, center.lng],
        zoom: 19,
        maxZoom: 22,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Attribution
      L.control
        .attribution({ position: 'bottomleft', prefix: false })
        .addAttribution('© OpenStreetMap, OpenBuildings, Esri')
        .addTo(map);

      layersGroupRef.current = L.layerGroup().addTo(map);
      drawingLayerGroupRef.current = L.layerGroup().addTo(map);

      map.on('click', (e: L.LeafletMouseEvent) => {
        if (isDrawingMode && onAddDrawnPoint) {
          onAddDrawnPoint([e.latlng.lng, e.latlng.lat]);
        } else {
          onMapClick(e.latlng.lat, e.latlng.lng);
        }
      });

      mapInstanceRef.current = map;

      // Invalidate size once container is mounted and laid out
      const refreshSize = () => {
        if (map) map.invalidateSize();
      };
      requestAnimationFrame(refreshSize);
      setTimeout(refreshSize, 100);
      setTimeout(refreshSize, 400);

      let resizeObs: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
        resizeObs = new ResizeObserver(() => {
          refreshSize();
        });
        resizeObs.observe(mapContainerRef.current);
      }
    }

    return () => {
      // Map cleanup if component unmounts
    };
  }, []);

  // Update base tile layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing tile layers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    if (mapType === 'satellite') {
      // Esri World Imagery (High-res open aerial tiles)
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 20,
          maxNativeZoom: 18,
          attribution: 'Esri World Imagery',
        }
      ).addTo(map);
    } else {
      // OpenStreetMap Standard Carto/OSM vector tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);
    }
  }, [mapType]);

  // Pan to center when coordinate changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map) {
      map.setView([center.lat, center.lng], 19, { animate: true });
    }
  }, [center.lat, center.lng]);

  // Render Building Polygons on Map
  useEffect(() => {
    const group = layersGroupRef.current;
    if (!group) return;
    group.clearLayers();

    // Center pin marker
    const centerIcon = L.divIcon({
      className: 'custom-center-pin',
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div class="w-8 h-8 rounded-full bg-amber-500/30 animate-ping absolute"></div>
          <div class="w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow-lg flex items-center justify-center z-10">
            <div class="w-1.5 h-1.5 rounded-full bg-slate-950"></div>
          </div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    L.marker([center.lat, center.lng], { icon: centerIcon, interactive: false }).addTo(group);

    // Draw building polygons
    buildings.forEach((bld) => {
      const isSelected = selectedBuilding?.id === bld.id;

      const latLngs: L.LatLngExpression[] = bld.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);

      const polygon = L.polygon(latLngs, {
        color: isSelected ? '#f59e0b' : '#38bdf8',
        weight: isSelected ? 3.5 : 2,
        fillColor: isSelected ? '#f59e0b' : '#0284c7',
        fillOpacity: isSelected ? 0.45 : 0.2,
        dashArray: isSelected ? undefined : '4, 4',
      });

      polygon.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectBuilding(bld);
      });

      // Tooltip
      polygon.bindTooltip(
        `<strong>${bld.name || 'Building'}</strong><br/>Area: ${bld.areaM2} m² • ${bld.source.replace('_', ' ')}`,
        { direction: 'top', className: 'solaris-map-tooltip' }
      );

      polygon.addTo(group);
    });
  }, [buildings, selectedBuilding, center.lat, center.lng]);

  // Render Custom Drawn Roof Points / Polygon
  useEffect(() => {
    const group = drawingLayerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (drawnPoints.length > 0) {
      const latLngs: L.LatLngExpression[] = drawnPoints.map(([lng, lat]) => [lat, lng]);

      // Point dots
      drawnPoints.forEach(([lng, lat], idx) => {
        const dotIcon = L.divIcon({
          className: 'custom-draw-dot',
          html: `<div class="w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white shadow flex items-center justify-center text-[9px] font-bold text-slate-950">${
            idx + 1
          }</div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        L.marker([lat, lng], { icon: dotIcon }).addTo(group);
      });

      if (drawnPoints.length >= 2) {
        if (drawnPoints.length >= 3) {
          // Closed polygon
          L.polygon(latLngs, {
            color: '#10b981',
            weight: 3,
            fillColor: '#10b981',
            fillOpacity: 0.35,
          }).addTo(group);
        } else {
          // Polyline
          L.polyline(latLngs, {
            color: '#10b981',
            weight: 3,
            dashArray: '5, 5',
          }).addTo(group);
        }
      }
    }
  }, [drawnPoints]);

  return (
    <div className="relative w-full h-80 sm:h-96 md:h-[430px] rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100" id="solaris-leaflet-map-wrapper">
      {/* Map Container Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0" id="leaflet-map-canvas" />

      {/* Top Map Controls */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        {/* Layer Toggle (Satellite vs Street) */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-1 border border-slate-200 shadow-md flex items-center gap-1">
          <button
            id="btn-layer-satellite"
            onClick={() => setMapType('satellite')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all ${
              mapType === 'satellite'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Satellite</span>
          </button>
          <button
            id="btn-layer-streets"
            onClick={() => setMapType('streets')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all ${
              mapType === 'streets'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Streets</span>
          </button>
        </div>

        {/* Building Count Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 text-xs font-semibold text-slate-700 shadow-md">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
          <span>{buildings.length} Open Footprints</span>
        </div>
      </div>

      {/* Drawing Mode Banner / Hint */}
      {isDrawingMode && (
        <div className="absolute top-3 right-3 z-20 bg-emerald-600/95 backdrop-blur-md border border-emerald-500 rounded-2xl p-3 text-xs text-white shadow-xl flex items-center gap-2.5">
          <Edit3 className="w-4 h-4 text-emerald-100 shrink-0" />
          <div>
            <p className="font-bold text-white">Draw Roof Boundary</p>
            <p className="text-[11px] text-emerald-100">Tap 3 or more corners on your roof</p>
          </div>
          {drawnPoints.length > 0 && onClearDrawnPoints && (
            <button
              onClick={onClearDrawnPoints}
              className="ml-2 px-2.5 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Bottom Floating Instruction Banner */}
      {!isDrawingMode && (
        <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none">
          <div className="max-w-md mx-auto bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl px-4 py-2.5 text-center text-xs text-slate-700 shadow-xl flex items-center justify-center gap-2 pointer-events-auto font-medium">
            <MousePointerClick className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Tap any building outline to select your property, or tap anywhere to relocate.</span>
          </div>
        </div>
      )}
    </div>
  );
};
