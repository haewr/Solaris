import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
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

const isNativePlatform = Capacitor.isNativePlatform();

class ExpoLocationService {
  async requestForegroundPermissionAsync(): Promise<LocationPermissionResponse> {
    return this.requestForegroundPermissionsAsync();
  }

  async requestForegroundPermissionsAsync(): Promise<LocationPermissionResponse> {
    // 1. Native Capacitor platform (Android / iOS APK)
    if (isNativePlatform) {
      try {
        const result = await Geolocation.requestPermissions();
        const granted =
          result.location === 'granted' || (result as any).coarseLocation === 'granted';
        return {
          status: granted ? 'granted' : 'denied',
          granted,
          canAskAgain: !granted,
          expires: 'never',
        };
      } catch (err) {
        console.warn('Capacitor Geolocation permission request failed:', err);
      }
    }

    // 2. Web fallback
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      return { status: 'denied', granted: false, canAskAgain: false, expires: 'never' };
    }

    if (navigator.permissions && navigator.permissions.query) {
      try {
        const q = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (q.state === 'granted') {
          return { status: 'granted', granted: true, canAskAgain: true, expires: 'never' };
        }
        if (q.state === 'denied') {
          return { status: 'denied', granted: false, canAskAgain: false, expires: 'never' };
        }
      } catch {
        // Permissions API unsupported for geolocation → fall through.
      }
    }

    return new Promise((resolve) => {
      let settled = false;
      const finish = (r: LocationPermissionResponse) => {
        if (!settled) { settled = true; resolve(r); }
      };
      const timeoutId = setTimeout(() => {
        finish({ status: 'granted', granted: true, canAskAgain: true, expires: 'never' });
      }, 9000);

      navigator.geolocation.getCurrentPosition(
        () => { clearTimeout(timeoutId); finish({ status: 'granted', granted: true, canAskAgain: true, expires: 'never' }); },
        (err) => {
          clearTimeout(timeoutId);
          if (err.code === 1) {
            finish({ status: 'denied', granted: false, canAskAgain: false, expires: 'never' });
          } else {
            finish({ status: 'granted', granted: true, canAskAgain: true, expires: 'never' });
          }
        },
        { timeout: 8000, maximumAge: 60000 }
      );
    });
  }

  async getForegroundPermissionAsync(): Promise<LocationPermissionResponse> {
    return this.getForegroundPermissionsAsync();
  }

  async getForegroundPermissionsAsync(): Promise<LocationPermissionResponse> {
    if (isNativePlatform) {
      try {
        const result = await Geolocation.checkPermissions();
        const granted =
          result.location === 'granted' || (result as any).coarseLocation === 'granted';
        return {
          status: granted ? 'granted' : result.location === 'denied' ? 'denied' : 'undetermined',
          granted,
          canAskAgain: result.location !== 'denied',
          expires: 'never',
        };
      } catch {
        // fall through
      }
    }

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
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
        // fall through
      }
    }
    return { status: 'undetermined', granted: false, canAskAgain: true, expires: 'never' };
  }

  async getCurrentPositionAsync(options: LocationOptions = {}): Promise<LocationObject> {
    // 1. Native Capacitor platform
    if (isNativePlatform) {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: options.timeout ?? 12000,
        maximumAge: options.maximumAge ?? 30000,
      });
      return {
        coords: {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          altitude: pos.coords.altitude ?? null,
          accuracy: pos.coords.accuracy ?? null,
          altitudeAccuracy: pos.coords.altitudeAccuracy ?? null,
          heading: pos.coords.heading ?? null,
          speed: pos.coords.speed ?? null,
        },
        timestamp: pos.timestamp ?? Date.now(),
      };
    }

    // 2. Web fallback
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
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
          if (highAccuracy && (err.code === 3 || err.code === 2)) {
            navigator.geolocation.getCurrentPosition(
              onSuccess,
              (fallbackErr) => {
                if (fallbackErr.code === 1) {
                  reject(new Error('Location permission denied. Enable Location in Android Settings for this app.'));
                } else {
                  reject(new Error(`Location error: ${fallbackErr.message || 'unavailable'}`));
                }
              },
              { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
            );
          } else if (err.code === 1) {
            reject(new Error('Location permission denied. Enable Location in Android Settings for this app.'));
          } else {
            reject(new Error(err.message || 'Failed to acquire location.'));
          }
        },
        { enableHighAccuracy: highAccuracy, timeout, maximumAge }
      );
    });
  }

  async reverseGeocodeAsync(coords: {
    latitude: number;
    longitude: number;
  }): Promise<LocationGeocodedAddress[]> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude.toFixed(6)}&lon=${coords.longitude.toFixed(6)}&zoom=18&addressdetails=1`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });

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

        const parts: string[] = [];
        if (name && name !== street) parts.push(name);
        if (street) parts.push(street);
        if (district) parts.push(district);
        if (city) parts.push(city);

        const formattedAddress =
          parts.length > 0
            ? parts.join(', ')
            : json.display_name?.split(',').slice(0, 3).join(',') ||
              `${coords.latitude.toFixed(4)}°N, ${coords.longitude.toFixed(4)}°E`;

        return [{
          city, district,
          streetNumber: addr.house_number || null,
          street, region,
          subregion: addr.county || null,
          country, postalCode, name,
          formattedAddress,
        }];
      }
    } catch {
      // ignore, fall through
    }

    return [{
      city: 'Dumaguete',
      district: null, streetNumber: null, street: null,
      region: 'Negros Oriental', subregion: null,
      country: 'Philippines', postalCode: null, name: null,
      formattedAddress: `Device Location (${coords.latitude.toFixed(4)}°N, ${coords.longitude.toFixed(4)}°E)`,
    }];
  }

  async acquireSolarisLocation(options: LocationOptions = {}): Promise<LocationCoordinates> {
    const permission = await this.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Location permission was denied. Please allow location access in your device settings.');
    }

    const pos = await this.getCurrentPositionAsync({
      accuracy: options.accuracy ?? LocationAccuracy.High,
      timeout: options.timeout ?? 12000,
    });

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const accuracy = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : 10;

    let addressName = `Device GPS Location (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E, ±${accuracy}m)`;
    try {
      const geocoded = await this.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (geocoded.length > 0 && geocoded[0].formattedAddress) {
        addressName = `${geocoded[0].formattedAddress} (±${accuracy}m)`;
      }
    } catch {
      // keep fallback
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

export const Location = {
  requestForegroundPermissionAsync: () => expoLocationService.requestForegroundPermissionAsync(),
  requestForegroundPermissionsAsync: () => expoLocationService.requestForegroundPermissionsAsync(),
  getForegroundPermissionAsync: () => expoLocationService.getForegroundPermissionAsync(),
  getForegroundPermissionsAsync: () => expoLocationService.getForegroundPermissionsAsync(),
  getCurrentPositionAsync: (options?: LocationOptions) => expoLocationService.getCurrentPositionAsync(options),
  reverseGeocodeAsync: (coords: { latitude: number; longitude: number }) => expoLocationService.reverseGeocodeAsync(coords),
  Accuracy: LocationAccuracy,
};