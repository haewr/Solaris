import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Navigation, History, Building, Sparkles, Loader2 } from 'lucide-react';
import { addRecentSearch, getRecentSearches } from '../services/storageService';

interface LocationSearchProps {
  onSelectLocation: (lat: number, lng: number, address: string, locality?: string) => void;
  isLoading: boolean;
}

interface PresetCity {
  name: string;
  region: string;
  lat: number;
  lng: number;
  highlight?: boolean;
}

const PHILIPPINE_PRESETS: PresetCity[] = [
  { name: 'Makati CBD', region: 'Metro Manila', lat: 14.5547, lng: 121.0244, highlight: true },
  { name: 'BGC Taguig', region: 'Metro Manila', lat: 14.5505, lng: 121.0478, highlight: true },
  { name: 'Cebu City (Lahug)', region: 'Central Visayas', lat: 10.3297, lng: 123.9063 },
  { name: 'Davao City (Matina)', region: 'Mindanao', lat: 7.0731, lng: 125.6128 },
  { name: 'Dumaguete (Silliman)', region: 'Negros Oriental', lat: 9.3068, lng: 123.3080 },
  { name: 'Quezon City (Diliman)', region: 'Metro Manila', lat: 14.6538, lng: 121.0685 },
  { name: 'Baguio City', region: 'Cordillera', lat: 16.4023, lng: 120.5960 },
  { name: 'Iloilo City (Mandurriao)', region: 'Western Visayas', lat: 10.7167, lng: 122.5480 },
];

export const LocationSearch: React.FC<LocationSearchProps> = ({ onSelectLocation, isLoading }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [recentSearches, setRecentSearches] = useState(getRecentSearches());
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        // OpenStreetMap Nominatim Free Geocoding API with countrycodes=ph priority
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&countrycodes=ph,us,au,id,my,th,vn,jp,sg&limit=5&addressdetails=1`;
        const res = await fetch(url, {
          headers: {
            'Accept-Language': 'en',
          },
        });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
        }
      } catch (err) {
        console.warn('Nominatim geocode failed, using local filter:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelectPreset = (preset: PresetCity) => {
    addRecentSearch({ label: `${preset.name}, ${preset.region}`, lat: preset.lat, lng: preset.lng });
    setRecentSearches(getRecentSearches());
    onSelectLocation(preset.lat, preset.lng, `${preset.name}, ${preset.region}, Philippines`, preset.name);
  };

  const handleSelectSuggestion = (sug: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(sug.lat);
    const lng = parseFloat(sug.lon);
    const locality = sug.display_name.split(',')[0];
    addRecentSearch({ label: sug.display_name.split(',').slice(0, 2).join(','), lat, lng });
    setRecentSearches(getRecentSearches());
    setQuery('');
    setSuggestions([]);
    onSelectLocation(lat, lng, sug.display_name, locality);
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        onSelectLocation(
          latitude,
          longitude,
          `GPS Location (${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E)`,
          'Current Location'
        );
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error, falling back to Manila CBD:', err);
        handleSelectPreset(PHILIPPINE_PRESETS[0]);
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className="w-full space-y-3.5" id="solaris-location-search-container">
      {/* Search Input Box */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            id="location-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search address, street, or city (e.g. Ayala Ave Makati, Cebu, Davao)..."
            className="w-full pl-11 pr-24 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm shadow-xs transition-all font-medium"
            disabled={isLoading}
          />
          <div className="absolute right-2.5 flex items-center gap-1.5">
            {isSearching && <Loader2 className="w-4 h-4 text-indigo-600 animate-spin mr-1" />}
            <button
              id="btn-use-gps"
              onClick={handleGeolocate}
              disabled={isLocating || isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 text-xs font-semibold transition-all shadow-2xs"
              title="Use current GPS position"
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              ) : (
                <Navigation className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span>GPS</span>
            </button>
          </div>
        </div>

        {/* Autocomplete Dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                id={`search-suggestion-${idx}`}
                onClick={() => handleSelectSuggestion(s)}
                className="w-full px-4 py-3 text-left flex items-start gap-3 hover:bg-slate-50 transition-colors text-slate-800"
              >
                <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span className="text-xs font-medium line-clamp-1">{s.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Regional Presets */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-indigo-600" />
            Quick Locations (Open Footprints Available):
          </span>
          <span className="text-[11px] text-slate-400">Philippines & Global</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PHILIPPINE_PRESETS.map((city, idx) => (
            <button
              key={idx}
              id={`preset-city-${idx}`}
              onClick={() => handleSelectPreset(city)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                city.highlight
                  ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-2xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80 shadow-2xs'
              }`}
            >
              {city.name}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs text-slate-500">
          <History className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-[11px] text-slate-400 shrink-0 font-medium">Recent:</span>
          {recentSearches.slice(0, 4).map((rec, i) => (
            <button
              key={i}
              onClick={() => onSelectLocation(rec.lat, rec.lng, rec.label)}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-medium truncate max-w-[150px] shadow-2xs"
            >
              {rec.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
