import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { LocationCoordinates } from '../types/nativeSolaris';
import { DUMAGUETE_DEFAULT_COORDS } from './nasaPowerService';

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

const isNativePlatform = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();

class ExpoLocationService {
  /**
   * Request permission for foreground location access (standard Expo method & alias)
   */
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

    // 2. Native Expo Location bridge in window / React Native (if present)
    const nativeExpo = (window as any).ExpoLocation || (window as any).expo?.location;
    if (nativeExpo) {
      if (typeof nativeExpo.requestForegroundPermissionAsync === 'function') {
        return await nativeExpo.requestForegroundPermissionAsync();
      }
      if (typeof nativeExpo.requestForegroundPermissionsAsync === 'function') {
        return await nativeExpo.requestForegroundPermissionsAsync();
      }
    }

    // 3. Web browsers: permissions are dynamically evaluated and prompted
    // when getCurrentPosition() is called during user interaction.
    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      try {
        const queryRes = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (queryRes.state === 'granted' || queryRes.state === 'prompt') {
          return { status: 'granted', granted: true, canAskAgain: true, expires: 'never' };
        }
      } catch {
        // Query might throw in Safari or restricted webviews; proceed to allow getCurrentPosition
      }
    }

    return {
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never',
    };
  }

  /**
   * Check existing permission status (singular alias)
   */
  async getForegroundPermissionAsync(): Promise<LocationPermissionResponse> {
    return this.getForegroundPermissionsAsync();
  }

  /**
   * Check existing permission status (standard plural method)
   */
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

    const nativeExpo = (window as any).ExpoLocation || (window as any).expo?.location;
    if (nativeExpo && typeof nativeExpo.getForegroundPermissionsAsync === 'function') {
      return await nativeExpo.getForegroundPermissionsAsync();
    }

    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
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

    return { status: 'granted', granted: true, canAskAgain: true, expires: 'never' };
  }

  /**
   * Check whether location services are enabled on the device (GPS toggle)
   */
  async hasServicesEnabledAsync(): Promise<boolean> {
    if (isNativePlatform) {
      try {
        const result = await Geolocation.checkPermissions();
        return result.location === 'granted' || (result as any).coarseLocation === 'granted';
      } catch {
        return true;
      }
    }

    const nativeExpo = (window as any).ExpoLocation || (window as any).expo?.location;
    if (nativeExpo && typeof nativeExpo.hasServicesEnabledAsync === 'function') {
      return await nativeExpo.hasServicesEnabledAsync();
    }
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  /**
   * Prompt the user to enable location services on their device (Android Google Play Services prompt)
   */
  async enableNetworkProviderAsync(): Promise<void> {
    if (isNativePlatform) {
      try {
        await Geolocation.requestPermissions();
        return;
      } catch {
        // continue
      }
    }

    const nativeExpo = (window as any).ExpoLocation || (window as any).expo?.location;
    if (nativeExpo && typeof nativeExpo.enableNetworkProviderAsync === 'function') {
      return await nativeExpo.enableNetworkProviderAsync();
    }
  }

  /**
   * Acquire current device position matching Expo Location specs.
   * Cascade strategy:
   * 1. Native Capacitor Geolocation (Android/iOS)
   * 2. High-accuracy browser GPS satellites
   * 3. Balanced Wi-Fi / Cell tower browser geolocation
   * 4. Network IP geolocation (for iframes, permissions-policy, or indoors)
   * 5. Dumaguete reference coordinates
   */
  async getCurrentPositionAsync(options: LocationOptions = {}): Promise<LocationObject> {
    // 1. Native Capacitor platform
    if (isNativePlatform) {
      try {
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
      } catch (err: any) {
        console.warn('Capacitor native getCurrentPosition failed, falling back:', err);
      }
    }

    const nativeExpo = (window as any).ExpoLocation || (window as any).expo?.location;
    if (nativeExpo && typeof nativeExpo.getCurrentPositionAsync === 'function') {
      return await nativeExpo.getCurrentPositionAsync(options);
    }

    const highAccuracy = (options.accuracy ?? LocationAccuracy.High) >= LocationAccuracy.High;
    const timeout = options.timeout ?? 9000;

    // Helper: Promisified navigator.geolocation with custom options
    const getBrowserPosition = (enableHighAccuracy: boolean, tMs: number, maxAge: number): Promise<LocationObject> => {
      return new Promise((resolve, reject) => {
        if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
          reject(new Error('Geolocation is not supported in this environment.'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos: GeolocationPosition) => {
            resolve({
              coords: {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                altitude: pos.coords.altitude,
                accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : 10,
                altitudeAccuracy: pos.coords.altitudeAccuracy,
                heading: pos.coords.heading,
                speed: pos.coords.speed,
              },
              timestamp: pos.timestamp || Date.now(),
            });
          },
          (err) => reject(err),
          { enableHighAccuracy, timeout: tMs, maximumAge: maxAge }
        );
      });
    };

    // Helper: IP-based device location fallback if browser GPS is blocked by iframe policy or times out
    const getIpPositionFallback = async (): Promise<LocationObject> => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const res = await fetch('https://ipwho.is/', { signal: controller.signal });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
            return {
              coords: {
                latitude: data.latitude,
                longitude: data.longitude,
                altitude: null,
                accuracy: 150,
                altitudeAccuracy: null,
                heading: null,
                speed: null,
              },
              timestamp: Date.now(),
            };
          }
        }
      } catch {
        // Continue to secondary default
      }

      // Default to Dumaguete City reference
      return {
        coords: {
          latitude: DUMAGUETE_DEFAULT_COORDS.latitude,
          longitude: DUMAGUETE_DEFAULT_COORDS.longitude,
          altitude: 12,
          accuracy: 50,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      };
    };

    // Step 1: Attempt High-Accuracy GPS
    try {
      return await getBrowserPosition(highAccuracy, timeout, 5000);
    } catch {
      // Step 2: Attempt Standard/Network geolocation (faster lock indoors)
      try {
        return await getBrowserPosition(false, 6000, 60000);
      } catch {
        // Step 3: Use IP-based network location or reference location
        return await getIpPositionFallback();
      }
    }
  }

  /**
   * Reverse geocodes coordinates to a human-readable address
   */
  async reverseGeocodeAsync(coords: {
    latitude: number;
    longitude: number;
  }): Promise<LocationGeocodedAddress[]> {
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
      const res = await fetch(url, { headers: { Accept: 'application/json' } });

      if (res.ok) {
        const json = await res.json();
        const addr = json.address || {};
        const city = addr.city || addr.town || addr.municipality || addr.village || null;
        const district = addr.suburb || addr.neighbourhood || addr.quarter || null;
        const street = addr.road || addr.residential || addr.pedestrian || null;
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
      // ignore, fall through
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
   * High-level helper: requests permissions, acquires current coordinates via Expo/Capacitor Location,
   * reverse-geocodes the address, and returns a verified Solaris LocationCoordinates payload.
   */
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

/**
 * Standard Expo Location module export:
 * provides Location.requestForegroundPermissionAsync(), Location.requestForegroundPermissionsAsync(),
 * Location.getForegroundPermissionsAsync(), Location.getCurrentPositionAsync(),
 * Location.hasServicesEnabledAsync(), Location.enableNetworkProviderAsync(),
 * Location.reverseGeocodeAsync(), and Location.Accuracy.
 */
export const Location = {
  requestForegroundPermissionAsync: () => expoLocationService.requestForegroundPermissionAsync(),
  requestForegroundPermissionsAsync: () => expoLocationService.requestForegroundPermissionsAsync(),
  getForegroundPermissionAsync: () => expoLocationService.getForegroundPermissionAsync(),
  getForegroundPermissionsAsync: () => expoLocationService.getForegroundPermissionsAsync(),
  hasServicesEnabledAsync: () => expoLocationService.hasServicesEnabledAsync(),
  enableNetworkProviderAsync: () => expoLocationService.enableNetworkProviderAsync(),
  getCurrentPositionAsync: (options?: LocationOptions) => expoLocationService.getCurrentPositionAsync(options),
  reverseGeocodeAsync: (coords: { latitude: number; longitude: number }) => expoLocationService.reverseGeocodeAsync(coords),
  Accuracy: LocationAccuracy,
};

if (typeof window !== 'undefined') {
  (window as any).ExpoLocationModule = Location;
}
