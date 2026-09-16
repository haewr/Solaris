import { Assessment, SavedRoofProfile } from '../types/solaris';

const STORAGE_KEYS = {
  SAVED_PROFILES: 'solaris_saved_profiles_v1',
  RECENT_SEARCHES: 'solaris_recent_searches_v1',
  LAST_ASSESSMENT: 'solaris_last_assessment_v1',
  USER_PREFERENCES: 'solaris_user_preferences_v1',
};

export interface UserPreferences {
  currency: 'PHP' | 'USD' | 'EUR';
  electricityRatePerKwh: number; // e.g. 12.50 PHP/kWh
  theme: 'dark' | 'light';
  unitSystem: 'metric' | 'imperial';
}

export const defaultPreferences: UserPreferences = {
  currency: 'PHP',
  electricityRatePerKwh: 12.50,
  theme: 'dark',
  unitSystem: 'metric',
};

export function getSavedProfiles(): SavedRoofProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_PROFILES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load saved profiles:', e);
    return [];
  }
}

export function saveRoofProfile(assessment: Assessment, customName?: string): SavedRoofProfile {
  const profiles = getSavedProfiles();
  const newProfile: SavedRoofProfile = {
    id: `prof_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: customName || assessment.locality || assessment.address.split(',')[0] || 'My Solar Property',
    assessmentId: assessment.id,
    lat: assessment.lat,
    lng: assessment.lng,
    address: assessment.address,
    systemCapacityKwp: assessment.system.systemCapacityKwp,
    panelCount: assessment.system.panelCount,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updated = [newProfile, ...profiles.filter(p => p.assessmentId !== assessment.id)];
  localStorage.setItem(STORAGE_KEYS.SAVED_PROFILES, JSON.stringify(updated));

  // Store entire assessment cache as well
  localStorage.setItem(`solaris_assessment_${assessment.id}`, JSON.stringify(assessment));
  return newProfile;
}

export function deleteSavedProfile(profileId: string): void {
  const profiles = getSavedProfiles();
  const updated = profiles.filter(p => p.id !== profileId);
  localStorage.setItem(STORAGE_KEYS.SAVED_PROFILES, JSON.stringify(updated));
}

export function getAssessmentById(id: string): Assessment | null {
  try {
    const raw = localStorage.getItem(`solaris_assessment_${id}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getRecentSearches(): Array<{ label: string; lat: number; lng: number; timestamp: string }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addRecentSearch(search: { label: string; lat: number; lng: number }): void {
  try {
    const existing = getRecentSearches().filter(s => s.label !== search.label);
    const updated = [{ ...search, timestamp: new Date().toISOString() }, ...existing].slice(0, 8);
    localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to add recent search:', e);
  }
}

export function getUserPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
    if (!raw) return defaultPreferences;
    return { ...defaultPreferences, ...JSON.parse(raw) };
  } catch {
    return defaultPreferences;
  }
}

export function saveUserPreferences(prefs: Partial<UserPreferences>): UserPreferences {
  const current = getUserPreferences();
  const updated = { ...current, ...prefs };
  localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(updated));
  return updated;
}
