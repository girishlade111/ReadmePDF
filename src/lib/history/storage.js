/**
 * md2pdf — Browser Storage Quota & Persistence Utilities
 *
 * Wraps StorageManager APIs (estimate, persisted, persist) with
 * safety checks for environments where they are unsupported or restricted.
 */

/**
 * Checks whether IndexedDB is supported and accessible in the current browser context.
 *
 * @returns {boolean}
 */
export function isIndexedDBSupported() {
  try {
    if (typeof window === 'undefined') return false;
    if (!('indexedDB' in window) || !window.indexedDB) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Formats byte values for storage indicators.
 *
 * @param {number} [bytes]
 * @returns {string}
 */
export function formatStorageBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) return '0 B';
  if (value < 1024) return `${Math.round(value)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = value / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size >= 10 ? Math.round(size) : size.toFixed(1)} ${units[unit]}`;
}

/**
 * Retrieves the approximate browser storage quota and usage.
 *
 * @returns {Promise<{
 *   supported: boolean;
 *   usage: number;
 *   quota: number;
 *   percent: number;
 *   usageFormatted: string;
 *   quotaFormatted: string;
 * }>}
 */
export async function getStorageEstimate() {
  if (
    typeof navigator === 'undefined' ||
    !navigator.storage ||
    typeof navigator.storage.estimate !== 'function'
  ) {
    return {
      supported: false,
      usage: 0,
      quota: 0,
      percent: 0,
      usageFormatted: 'Unknown',
      quotaFormatted: 'Unknown',
    };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage ?? 0;
    const quota = estimate.quota ?? 0;
    const percent = quota > 0 ? Math.min(100, Math.round((usage / quota) * 100)) : 0;

    return {
      supported: true,
      usage,
      quota,
      percent,
      usageFormatted: formatStorageBytes(usage),
      quotaFormatted: formatStorageBytes(quota),
    };
  } catch {
    return {
      supported: false,
      usage: 0,
      quota: 0,
      percent: 0,
      usageFormatted: 'Unavailable',
      quotaFormatted: 'Unavailable',
    };
  }
}

/**
 * Checks if the current origin has persistent storage granted.
 *
 * @returns {Promise<boolean>}
 */
export async function isStoragePersisted() {
  if (
    typeof navigator === 'undefined' ||
    !navigator.storage ||
    typeof navigator.storage.persisted !== 'function'
  ) {
    return false;
  }

  try {
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}

/**
 * Requests persistent storage from the browser.
 * Must be triggered by direct user interaction.
 *
 * @returns {Promise<{
 *   requested: boolean;
 *   granted: boolean;
 *   status: 'granted' | 'denied' | 'already-granted' | 'unsupported' | 'error';
 *   message: string;
 * }>}
 */
export async function requestPersistentStorage() {
  if (
    typeof navigator === 'undefined' ||
    !navigator.storage ||
    typeof navigator.storage.persist !== 'function'
  ) {
    return {
      requested: false,
      granted: false,
      status: 'unsupported',
      message: 'Persistent storage API is not supported in this browser.',
    };
  }

  try {
    const alreadyPersisted = typeof navigator.storage.persisted === 'function'
      ? await navigator.storage.persisted()
      : false;

    if (alreadyPersisted) {
      return {
        requested: true,
        granted: true,
        status: 'already-granted',
        message: 'Storage persistence is already active for this origin.',
      };
    }

    const granted = await navigator.storage.persist();
    return {
      requested: true,
      granted: Boolean(granted),
      status: granted ? 'granted' : 'denied',
      message: granted
        ? 'Storage persistence granted by browser.'
        : 'Browser denied persistent storage. History remains saved locally, subject to browser storage limits.',
    };
  } catch (err) {
    return {
      requested: true,
      granted: false,
      status: 'error',
      message: err?.message || 'Failed to request persistent storage.',
    };
  }
}

/**
 * Checks overall local storage reliability and persistence status.
 *
 * @returns {Promise<{
 *   supported: boolean;
 *   persisted: boolean;
 *   usageFormatted: string;
 *   quotaFormatted: string;
 *   percent: number;
 * }>}
 */
export async function checkStorageReliability() {
  const persisted = await isStoragePersisted();
  const estimate = await getStorageEstimate();
  const supported = isIndexedDBSupported();

  return {
    supported,
    persisted,
    usageFormatted: estimate.usageFormatted,
    quotaFormatted: estimate.quotaFormatted,
    percent: estimate.percent,
  };
}
