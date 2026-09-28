/**
 * Expo Location Service
 * 
 * Provides an Expo-compatible Location API (matching expo-location specifications):
 * - requestForegroundPermissionsAsync()
 * - getForegroundPermissionsAsync()
 * - getCurrentPositionAsync(options)
 * - reverseGeocodeAsync({ latitude, longitude })
 * - LocationAccuracy enum
 * 
 * Seamlessly interfaces with:
 * 1. Native Expo / React Native environment (if running inside Expo Go or WebView bridge)
 * 2. Web browser / PWA environment via W3C Geolocation API & Reverse Geocoding
 */

import { LocationCoordinates } from '../types/nativeSolaris';

export enum LocationAccuracy {
  Lowest = 1,
  Low = 2,
  Balanced = 3,
  High = 4,
  Highest = 5,
  BestForNavigation = 6,
}

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface LocationPermissionResponse {
  status: PermissionStatus;
  granted: boolean;
  canAskAgain: boolean;
  expires: 'never' | number;
}

export interface LocationOptions {
  accuracy?: LocationAccuracy;
  timeout?: number;
  maximumAge?: number;
}

export interface LocationObjectCoords {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
}

export interface LocationObject {
  coords: LocationObjectCoords;
  timestamp: number;
}

export interface LocationGeocodedAddress {
  city: string | null;
  district: string | null;
  streetNumber: string | null;
  street: string | null;
  region: string | null;
  subregion: string | null;
  country: string | null;
  postalCode: string | null;
  name: string | null;
  formattedAddress?: string;
}

class ExpoLocationService {
  /**
   * Request permission for foreground location access
   * Specifically called when user taps "Acquire Device Location"
   */
  async requestForegroundPermissionAsync(): Promise<LocationPermissionResponse> {
    return this.requestForegroundPermissionsAsync();
  }

  /**
   * Request permission for foreground location access (standard Expo plural naming)
   */
  async requestForegroundPermissionsAsync(): Promise<LocationPermissionResponse> {
    // If native Expo Location bridge is available in window / React Native
    const nativeExpo = (window as any).ExpoLocation || (window as any).expo?.location || (window as any).Location;
    if (nativeExpo) {
      if (typeof nativeExpo.requestForegroundPermissionAsync === 'function') {
        return await nativeExpo.requestForegroundPermissionAsync();
      }
      if (typeof nativeExpo.requestForegroundPermissionsAsync === 'function') {
        return await nativeExpo.requestForegroundPermissionsAsync();
      }
    }

    if (!('geolocation' in navigator)) {
      return {
        status: 'denied',
        granted: false,
        canAskAgain: false,
        expires: 'never',
      };
    }

    // Try checking via navigator.permissions if supported
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const queryRes = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (queryRes.state === 'granted') {
          return { status: 'granted', granted: true, canAskAgain: true, expires: 'never' };
        }
        if (queryRes.state === 'denied') {
          return { status: 'denied', granted: false, canAskAgain: false, expires: 'never' };
        }
      } catch {
        // Fall back to prompt execution
      }
    }

    // Directly trigger browser geolocation prompt on user interaction
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          resolve({
            status: 'granted',
            granted: true,
            canAskAgain: true,
            expires: 'never',
          });
        },
        (error) => {
          if (error.code === 1) {
            // PERMISSION_DENIED
            resolve({
              status: 'denied',
              granted: false,
              canAskAgain: false,
              expires: 'never',
            });
          } else {
            // Timeout or position unavailable still implies permission was not outright denied
            resolve({
              status: 'granted',
              granted: true,
              canAskAgain: true,
              expires: 'never',
            });
          }
        },
        { timeout: 8000, maximumAge: 60000 }
      );
    });
  }

  /**
   * Check existing permission status (singular alias)
   */
  async getForegroundPermissionAsync(): Promise<LocationPermissionResponse> {
    return this.getForegroundPermissionsAsync();
  }

  /**
   * Check existing permission status
   */
  async getForegroundPermissionsAsync(): Promise<LocationPermissionResponse> {
    const nativeExpo = (window as any).ExpoLocation || (window as any).expo?.location || (window as any).Location;
    if (nativeExpo) {
      if (typeof nativeExpo.getForegroundPermissionAsync === 'function') {
        return await nativeExpo.getForegroundPermissionAsync();
      }
      if (typeof nativeExpo.getForegroundPermissionsAsync === 'function') {
        return await nativeExpo.getForegroundPermissionsAsync();
      }
    }

    if (!('geolocation' in navigator)) {
      return { status: 'denied', granted: false, canAskAgain: false, expires: 'never' };
    }

    if (navigator.permissions && navigator.permissions.query) {
      try {
        const res = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        return {
          status: res.state === 'granted' ? 'granted' : res.state === 'denied' ? 'denied' : 'undetermined',
          granted: res.state === 'granted',
          canAskAgain: res.state !== 'denied',
          expires: 'never',
        };
      } catch {
        // query not supported
      }
    }

    return { status: 'undetermined', granted: false, canAskAgain: true, expires: 'never' };
  }

  /**
   * Acquire current device position matching Expo Location specs
   */
  async getCurrentPositionAsync(options: LocationOptions = {}): Promise<LocationObject> {
    const nativeExpo = (window as any).ExpoLocation || (window as any).expo?.location;
    if (nativeExpo && typeof nativeExpo.getCurrentPositionAsync === 'function') {
      return await nativeExpo.getCurrentPositionAsync(options);
    }

    if (!('geolocation' in navigator)) {
      throw new Error('Geolocation is not supported on this device or browser.');
    }

    const highAccuracy = (options.accuracy ?? LocationAccuracy.High) >= LocationAccuracy.High;
    const timeout = options.timeout ?? (highAccuracy ? 9000 : 6000);
    const maximumAge = options.maximumAge ?? 30000;

    return new Promise((resolve, reject) => {
      const onSuccess = (pos: GeolocationPosition) => {
        resolve({
          coords: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            altitude: pos.coords.altitude,
            accuracy: pos.coords.accuracy,
            altitudeAccuracy: pos.coords.altitudeAccuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
          },
          timestamp: pos.timestamp || Date.now(),
        });
      };

      navigator.geolocation.getCurrentPosition(
        onSuccess,
        (err) => {
          // If high accuracy timed out, retry once with balanced/low accuracy
          if (highAccuracy && (err.code === 3 || err.code === 2)) {
            navigator.geolocation.getCurrentPosition(
              onSuccess,
              (fallbackErr) => {
                reject(new Error(`Location timeout: ${fallbackErr.message}`));
              },
              { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
            );
          } else {
            reject(new Error(err.message || 'Failed to acquire location.'));
          }
        },
        { enableHighAccuracy: highAccuracy, timeout, maximumAge }
      );
    });
  }

  /**
   * Reverse geocodes coordinates to a human-readable address
   */
  async reverseGeocodeAsync(coords: { latitude: number; longitude: number }): Promise<LocationGeocodedAddress[]> {
    const nativeExpo = (window as any).ExpoLocation || (window as any).expo?.location;
    if (nativeExpo && typeof nativeExpo.reverseGeocodeAsync === 'function') {
      try {
        return await nativeExpo.reverseGeocodeAsync(coords);
      } catch {
        // fallback to web reverse geocode
      }
    }

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude.toFixed(6)}&lon=${coords.longitude.toFixed(6)}&zoom=18&addressdetails=1`;
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });

      if (res.ok) {
        const json = await res.json();
        const addr = json.address || {};

        const district = addr.quarter || addr.suburb || addr.neighbourhood || addr.village || addr.hamlet || null;
        const city = addr.city || addr.town || addr.municipality || 'Dumaguete';
        const street = addr.road || addr.pedestrian || null;
        const region = addr.state || addr.region || 'Negros Oriental';
        const country = addr.country || 'Philippines';
        const postalCode = addr.postcode || null;
        const name = addr.amenity || addr.building || addr.shop || street || district || null;

        // Build clean formatted display string
        const parts: string[] = [];
        if (name && name !== street) parts.push(name);
        if (street) parts.push(street);
        if (district) parts.push(district);
        if (city) parts.push(city);

        const formattedAddress = parts.length > 0 ? parts.join(', ') : json.display_name?.split(',').slice(0, 3).join(',') || `${coords.latitude.toFixed(4)}°N, ${coords.longitude.toFixed(4)}°E`;

        return [{
          city,
          district,
          streetNumber: addr.house_number || null,
          street,
          region,
          subregion: addr.county || null,
          country,
          postalCode,
          name,
          formattedAddress,
        }];
      }
    } catch {
      // ignore network errors for reverse geocoding
    }

    return [{
      city: 'Dumaguete',
      district: null,
      streetNumber: null,
      street: null,
      region: 'Negros Oriental',
      subregion: null,
      country: 'Philippines',
      postalCode: null,
      name: null,
      formattedAddress: `Device Location (${coords.latitude.toFixed(4)}°N, ${coords.longitude.toFixed(4)}°E)`,
    }];
  }

  /**
   * High-level helper: requests permissions, acquires current coordinates via Expo Location,
   * reverse-geocodes the address, and returns a verified Solaris LocationCoordinates payload.
   */
  async acquireSolarisLocation(options: LocationOptions = {}): Promise<LocationCoordinates> {
    // 1. Ensure permissions
    const permission = await this.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Location permission was denied. Please allow location access in your device settings.');
    }

    // 2. Acquire position
    const pos = await this.getCurrentPositionAsync({
      accuracy: options.accuracy ?? LocationAccuracy.High,
      timeout: options.timeout ?? 9000,
    });

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const accuracy = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : 10;

    // 3. Reverse geocode to get a clean, human-readable address
    let addressName = `Device GPS Location (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E, ±${accuracy}m)`;
    try {
      const geocoded = await this.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (geocoded.length > 0 && geocoded[0].formattedAddress) {
        addressName = `${geocoded[0].formattedAddress} (±${accuracy}m)`;
      }
    } catch {
      // keep fallback addressName
    }

    return {
      latitude: lat,
      longitude: lng,
      accuracyMeters: accuracy,
      altitudeMeters: pos.coords.altitude ?? undefined,
      timestamp: pos.timestamp,
      source: 'gps',
      addressName,
    };
  }
}

export const expoLocationService = new ExpoLocationService();

/**
 * Standard Expo Location namespace export matching `import * as Location from 'expo-location'`
 */
export const Location = {
  requestForegroundPermissionAsync: () => expoLocationService.requestForegroundPermissionAsync(),
  requestForegroundPermissionsAsync: () => expoLocationService.requestForegroundPermissionsAsync(),
  getForegroundPermissionAsync: () => expoLocationService.getForegroundPermissionAsync(),
  getForegroundPermissionsAsync: () => expoLocationService.getForegroundPermissionsAsync(),
  getCurrentPositionAsync: (options?: LocationOptions) => expoLocationService.getCurrentPositionAsync(options),
  reverseGeocodeAsync: (coords: { latitude: number; longitude: number }) => expoLocationService.reverseGeocodeAsync(coords),
  Accuracy: LocationAccuracy,
};

if (typeof window !== 'undefined') {
  (window as any).Location = Location;
  (window as any).ExpoLocation = Location;
}
