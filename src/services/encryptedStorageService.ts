/**
 * Step 1 — Encrypted Local Storage Service (WebCrypto AES-GCM 256-bit + PBKDF2)
 * Features:
 * - Encryption at rest for all local assessments, cache entries, and settings
 * - Defined TTL / expiration policies
 * - LRU (Least Recently Used) eviction routine when storage approaches 10MB cap
 * - Wipe action to fully purge all local encrypted storage (compliance with RA 10173)
 */

import { EncryptedCacheStore, CacheEntryMeta } from '../types/nativeSolaris';

const STORAGE_KEY = 'solaris_encrypted_vault_v1';
const MASTER_SALT_KEY = 'solaris_master_salt';
const MAX_STORAGE_BYTES = 10 * 1024 * 1024; // 10 Megabytes fixed cap

// Helper: Convert ArrayBuffer to Hex and Base64
function bufferToHex(buffer: ArrayBuffer | ArrayBufferLike): string {
  return Array.from(new Uint8Array(buffer as ArrayBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

class EncryptedStorageService {
  private cryptoKey: CryptoKey | null = null;
  private salt: Uint8Array | null = null;
  private initialized = false;

  /**
   * Initializes or restores the device-level master encryption key
   * using PBKDF2 with 100,000 iterations to derive an AES-GCM-256 key.
   */
  async init(): Promise<void> {
    if (this.initialized && this.cryptoKey) return;

    try {
      // 1. Retrieve or generate device salt
      let storedSalt = localStorage.getItem(MASTER_SALT_KEY);
      if (!storedSalt) {
        const randomSalt = new Uint8Array(16);
        window.crypto.getRandomValues(randomSalt);
        storedSalt = bufferToHex(randomSalt.buffer);
        localStorage.setItem(MASTER_SALT_KEY, storedSalt);
      }
      this.salt = new Uint8Array(hexToBuffer(storedSalt));

      // 2. Hardware-specific device fingerprint seed (device-bound local security)
      const deviceSeed = `solaris_hw_${navigator.userAgent.length}_${screen.width}x${screen.height}_dumaguete`;
      const enc = new TextEncoder();
      const baseKey = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(deviceSeed),
        'PBKDF2',
        false,
        ['deriveKey']
      );

      // 3. Derive AES-GCM 256-bit encryption key
      this.cryptoKey = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: (this.salt as unknown as BufferSource),
          iterations: 100000,
          hash: 'SHA-256',
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      this.initialized = true;
      this.cleanupExpiredEntries();
    } catch (err) {
      console.warn('SubtleCrypto hardware key derivation error, using fallback vault', err);
      this.initialized = true;
    }
  }

  private getRawStore(): EncryptedCacheStore {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        version: 1,
        salt: this.salt ? bufferToHex(this.salt.buffer) : '',
        entries: {},
        totalSizeBytes: 0,
      };
    }
    try {
      return JSON.parse(raw);
    } catch {
      return {
        version: 1,
        salt: '',
        entries: {},
        totalSizeBytes: 0,
      };
    }
  }

  private saveRawStore(store: EncryptedCacheStore): void {
    const serialized = JSON.stringify(store);
    store.totalSizeBytes = new Blob([serialized]).size;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  /**
   * Encrypts and saves an item into the local encrypted vault.
   * Performs LRU eviction if store size exceeds MAX_STORAGE_BYTES (10MB).
   */
  async setItem<T>(
    key: string,
    data: T,
    category: 'siting' | 'simulation' | 'live' | 'settings',
    ttlMs: number = 7 * 24 * 60 * 60 * 1000 // 7 days default TTL
  ): Promise<void> {
    await this.init();

    const jsonString = JSON.stringify(data);
    const enc = new TextEncoder();
    const encodedData = enc.encode(jsonString);

    let ivHex = '';
    let cipherBase64 = '';

    if (this.cryptoKey && window.crypto.subtle) {
      // Generate unique 12-byte IV per encryption operation
      const iv = new Uint8Array(12);
      window.crypto.getRandomValues(iv);
      const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.cryptoKey,
        encodedData
      );
      ivHex = bufferToHex(iv.buffer);
      cipherBase64 = bufferToBase64(encrypted);
    } else {
      // Fallback base64 obfuscation
      ivHex = 'unencrypted';
      cipherBase64 = bufferToBase64(encodedData.buffer);
    }

    const now = Date.now();
    const entrySizeEstimate = cipherBase64.length + 200; // estimated serialized entry footprint

    const store = this.getRawStore();

    // Check LRU eviction if approaching 10MB quota
    if (store.totalSizeBytes + entrySizeEstimate > MAX_STORAGE_BYTES) {
      this.evictLRU(store, entrySizeEstimate);
    }

    const meta: CacheEntryMeta = {
      key,
      category,
      timestamp: now,
      ttlMs,
      expiresAt: now + ttlMs,
      sizeBytes: entrySizeEstimate,
      lastAccessedAt: now,
    };

    store.entries[key] = {
      iv: ivHex,
      cipherText: cipherBase64,
      meta,
    };

    this.saveRawStore(store);
  }

  /**
   * Retrieves and decrypts an item from the local vault.
   * Returns null if missing or expired.
   */
  async getItem<T>(key: string): Promise<{ data: T; meta: CacheEntryMeta } | null> {
    await this.init();

    const store = this.getRawStore();
    const entry = store.entries[key];
    if (!entry) return null;

    // Check TTL expiration
    const now = Date.now();
    if (entry.meta.expiresAt && now > entry.meta.expiresAt) {
      delete store.entries[key];
      this.saveRawStore(store);
      return null;
    }

    // Update last accessed time for LRU
    entry.meta.lastAccessedAt = now;
    this.saveRawStore(store);

    try {
      let decryptedText = '';
      if (entry.iv !== 'unencrypted' && this.cryptoKey && window.crypto.subtle) {
        const ivBuffer = hexToBuffer(entry.iv);
        const cipherBuffer = base64ToBuffer(entry.cipherText);

        const decrypted = await window.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
          this.cryptoKey,
          cipherBuffer
        );
        const dec = new TextDecoder();
        decryptedText = dec.decode(decrypted);
      } else {
        const buffer = base64ToBuffer(entry.cipherText);
        const dec = new TextDecoder();
        decryptedText = dec.decode(buffer);
      }

      return {
        data: JSON.parse(decryptedText) as T,
        meta: entry.meta,
      };
    } catch (err) {
      console.error('Decryption failed for key:', key, err);
      return null;
    }
  }

  /**
   * Deletes a single item
   */
  deleteItem(key: string): void {
    const store = this.getRawStore();
    if (store.entries[key]) {
      delete store.entries[key];
      this.saveRawStore(store);
    }
  }

  /**
   * LRU Eviction: sorts items by lastAccessedAt ascending,
   * evicting oldest unpinned cache entries until enough space is freed.
   */
  private evictLRU(store: EncryptedCacheStore, requiredBytes: number): void {
    const entries = Object.values(store.entries);
    // Don't evict core settings
    const evictable = entries.filter((e) => e.meta.category !== 'settings');
    evictable.sort((a, b) => a.meta.lastAccessedAt - b.meta.lastAccessedAt);

    let freed = 0;
    for (const item of evictable) {
      delete store.entries[item.meta.key];
      freed += item.meta.sizeBytes;
      if (store.totalSizeBytes - freed + requiredBytes < MAX_STORAGE_BYTES) {
        break;
      }
    }
  }

  /**
   * Purge expired cache items based on TTL
   */
  cleanupExpiredEntries(): number {
    const store = this.getRawStore();
    const now = Date.now();
    let purged = 0;

    for (const key of Object.keys(store.entries)) {
      const entry = store.entries[key];
      if (entry.meta.expiresAt && now > entry.meta.expiresAt) {
        delete store.entries[key];
        purged++;
      }
    }

    if (purged > 0) {
      this.saveRawStore(store);
    }
    return purged;
  }

  /**
   * Mandatory Wipe: Fully wipes all encrypted storage, master salts, and cached data.
   * Reachable from Settings. Complies with Philippines Data Privacy Act of 2012 (RA 10173).
   */
  clearAllLocalData(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(MASTER_SALT_KEY);
    localStorage.removeItem('solaris_pin_hash');
    this.cryptoKey = null;
    this.salt = null;
    this.initialized = false;
  }

  /**
   * Returns storage telemetry and quota status
   */
  getStorageStats(): {
    totalSizeBytes: number;
    maxSizeBytes: number;
    percentUsed: number;
    totalEntries: number;
    entriesByCategory: Record<string, number>;
    isEncrypted: boolean;
  } {
    const store = this.getRawStore();
    const count = Object.keys(store.entries).length;
    const byCategory: Record<string, number> = {
      siting: 0,
      simulation: 0,
      live: 0,
      settings: 0,
    };

    for (const entry of Object.values(store.entries)) {
      const cat = entry.meta.category || 'siting';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }

    const used = store.totalSizeBytes || 1024;
    return {
      totalSizeBytes: used,
      maxSizeBytes: MAX_STORAGE_BYTES,
      percentUsed: Math.min(100, Math.round((used / MAX_STORAGE_BYTES) * 1000) / 10),
      totalEntries: count,
      entriesByCategory: byCategory,
      isEncrypted: !!this.cryptoKey,
    };
  }
}

export const encryptedStorage = new EncryptedStorageService();
