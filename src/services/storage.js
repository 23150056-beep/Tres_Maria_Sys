/**
 * DATA PERSISTENCE SERVICE
 * ========================
 * Handles saving and loading data from localStorage.
 * Ensures data survives page refreshes.
 * 
 * Principles: Reliability, Consistency, Data Integrity
 */

import config from '../config';

const STORAGE_VERSION = '1.0';

class StorageService {
  constructor() {
    this.prefix = config.storage.prefix;
    this.enabled = config.storage.enabled;
    this.versionKey = `${this.prefix}version`;
    
    // Check version and migrate if needed
    this.checkVersion();
  }

  /**
   * Check storage version and clear if outdated
   */
  checkVersion() {
    if (!this.enabled) return;
    
    const storedVersion = localStorage.getItem(this.versionKey);
    if (storedVersion !== STORAGE_VERSION) {
      console.log('Storage version mismatch, clearing old data...');
      this.clearAll();
      localStorage.setItem(this.versionKey, STORAGE_VERSION);
    }
  }

  /**
   * Get the full key with prefix
   */
  getKey(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * Save data to localStorage
   */
  save(key, data) {
    if (!this.enabled) return false;
    
    try {
      const serialized = JSON.stringify({
        data,
        timestamp: Date.now(),
      });
      localStorage.setItem(this.getKey(key), serialized);
      return true;
    } catch (error) {
      console.error('Storage save error:', error);
      return false;
    }
  }

  /**
   * Load data from localStorage
   */
  load(key, defaultValue = null) {
    if (!this.enabled) return defaultValue;
    
    try {
      const item = localStorage.getItem(this.getKey(key));
      if (!item) return defaultValue;
      
      const { data, timestamp } = JSON.parse(item);
      return data;
    } catch (error) {
      console.error('Storage load error:', error);
      return defaultValue;
    }
  }

  /**
   * Remove data from localStorage
   */
  remove(key) {
    if (!this.enabled) return;
    localStorage.removeItem(this.getKey(key));
  }

  /**
   * Clear all app data from localStorage
   */
  clearAll() {
    if (!this.enabled) return;
    
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Check if data exists
   */
  exists(key) {
    if (!this.enabled) return false;
    return localStorage.getItem(this.getKey(key)) !== null;
  }

  /**
   * Get storage usage info
   */
  getUsage() {
    if (!this.enabled) return { used: 0, total: 0 };
    
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        used += localStorage.getItem(key)?.length || 0;
      }
    }
    
    return {
      used: Math.round(used / 1024), // KB
      total: 5120, // 5MB typical limit
    };
  }
}

// Export singleton instance
export const storage = new StorageService();

/**
 * MOCK STORE PERSISTENCE
 * ======================
 * Functions to save/load the mock store
 */

export const saveMockStore = (store) => {
  storage.save('mockStore', store);
};

export const loadMockStore = (defaultStore) => {
  const saved = storage.load('mockStore');
  if (saved) {
    console.log('✅ Loaded data from localStorage');
    return saved;
  }
  return defaultStore;
};

export default storage;
