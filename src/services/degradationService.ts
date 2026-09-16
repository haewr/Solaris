/**
 * Step 5 — Degradation Module Service
 * Grounded in cited PV field-study literature (NREL Jordan & Kurtz 2012 / 2016).
 * Computes solar output retention factor from real installation date.
 * Feeds computed degradation into both Simulation and Live-Generation modules.
 */

import { DegradationProfile } from '../types/nativeSolaris';
import { encryptedStorage } from './encryptedStorageService';

const DEGRADATION_STORAGE_KEY = 'solaris_degradation_profile';

export const NREL_LITERATURE_CITATION =
  'Jordan, D. C., & Kurtz, S. R. (2012 / 2016). "Compendium of Photovoltaic Degradation Rates", National Renewable Energy Laboratory (NREL) & Progress in Photovoltaics (Vol 21). Empirical median degradation of 0.50%/yr globally, elevated to 0.70%/yr in tropical maritime climates.';

export class DegradationService {
  /**
   * Retrieves the saved degradation profile from encrypted storage,
   * or returns a default profile initialized to current year.
   */
  async getProfile(): Promise<DegradationProfile> {
    const cached = await encryptedStorage.getItem<DegradationProfile>(DEGRADATION_STORAGE_KEY);
    if (cached && cached.data) {
      // Recalculate age and retention factor relative to current timestamp
      return this.calculateProfile(
        cached.data.installationDate,
        cached.data.annualDegradationRatePercent
      );
    }

    // Default: Installed today or 1 year ago, 0.70%/year tropical rate
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const dateStr = oneYearAgo.toISOString().split('T')[0];

    return this.calculateProfile(dateStr, 0.70);
  }

  /**
   * Saves user-configured installation date and degradation rate to encrypted storage.
   */
  async saveProfile(
    installationDate: string,
    annualDegradationRatePercent: number
  ): Promise<DegradationProfile> {
    const profile = this.calculateProfile(installationDate, annualDegradationRatePercent);
    await encryptedStorage.setItem(
      DEGRADATION_STORAGE_KEY,
      profile,
      'settings',
      365 * 24 * 60 * 60 * 1000 // 1 year TTL
    );
    return profile;
  }

  /**
   * Mathematical calculation of system age and retention factor:
   * Retention = (1 - (rate / 100)) ^ (age_in_years)
   */
  calculateProfile(
    installationDate: string,
    annualRatePercent: number
  ): DegradationProfile {
    const installTimestamp = new Date(installationDate).getTime();
    const now = Date.now();
    
    // System age in fractional years
    const diffMs = Math.max(0, now - installTimestamp);
    const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
    const systemAgeYears = Math.round((diffMs / msPerYear) * 100) / 100;

    // Rate sanitization (bounds between 0.1% and 2.0% per year)
    const sanitizedRate = Math.min(2.0, Math.max(0.1, annualRatePercent));
    const annualRateDecimal = sanitizedRate / 100;

    // Exponential compound degradation: R = (1 - d)^t
    const degradationRetentionFactor = Math.pow(1 - annualRateDecimal, systemAgeYears);

    return {
      installationDate,
      annualDegradationRatePercent: sanitizedRate,
      literatureCitation: NREL_LITERATURE_CITATION,
      systemAgeYears,
      degradationRetentionFactor: Math.round(degradationRetentionFactor * 10000) / 10000,
    };
  }
}

export const degradationService = new DegradationService();
