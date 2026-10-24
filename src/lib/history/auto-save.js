/**
 * md2pdf — Debounced Auto-Save & Multi-Tab Synchronization
 *
 * Coordinates debounced draft persistence, save-state indicators,
 * visibilitychange/pagehide flush, and cross-tab conflict detection.
 */

/**
 * Computes a simple quick hash of the content to skip redundant writes.
 *
 * @param {any} data
 * @returns {string}
 */
export function contentHash(data) {
  if (typeof data === 'string') return `${data.length}:${data.slice(0, 50)}:${data.slice(-50)}`;
  try {
    const str = JSON.stringify(data);
    return `${str.length}:${str.slice(0, 50)}:${str.slice(-50)}`;
  } catch {
    return String(data);
  }
}

export class AutoSaveController {
  /**
   * @param {{
   *   onSave: (data: any) => Promise<void>;
   *   onStatusChange?: (status: 'idle' | 'saving' | 'saved' | 'unsaved' | 'failed' | 'disabled', error?: any) => void;
   *   debounceMs?: number;
   *   intervalMs?: number;
   *   channelName?: string;
   *   enabled?: boolean;
   * }} options
   */
  constructor(options) {
    this.onSave = options.onSave;
    this.onStatusChange = options.onStatusChange || (() => {});
    this.debounceMs = options.debounceMs ?? options.intervalMs ?? 1000;
    this.channelName = options.channelName || 'md2pdf-sync';
    this.enabled = options.enabled !== false;

    /** @type {'idle' | 'saving' | 'saved' | 'unsaved' | 'failed' | 'disabled'} */
    this.status = this.enabled ? 'idle' : 'disabled';
    this.pendingData = null;
    this.lastSavedHash = null;
    this.timer = null;
    this.activePromise = null;
    this.channel = null;

    this.initBroadcastChannel();
    this.initPageLifecycle();
  }

  initBroadcastChannel() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.onmessage = (event) => {
          if (event.data?.type === 'WORKSPACE_SAVED') {
            // Another tab saved data
            if (this.onRemoteUpdate) {
              this.onRemoteUpdate(event.data);
            }
          }
        };
      } catch {
        this.channel = null;
      }
    }
  }

  initPageLifecycle() {
    if (typeof document !== 'undefined') {
      this.visibilityHandler = () => {
        if (document.visibilityState === 'hidden' && this.pendingData) {
          this.flush();
        }
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }
    if (typeof window !== 'undefined') {
      this.pageHideHandler = () => {
        if (this.pendingData) {
          this.flush();
        }
      };
      window.addEventListener('pagehide', this.pageHideHandler);
    }
  }

  /**
   * Computes a simple quick hash of the content to skip redundant writes.
   *
   * @param {any} data
   * @returns {string}
   */
  hash(data) {
    if (typeof data === 'string') return `${data.length}:${data.slice(0, 50)}:${data.slice(-50)}`;
    try {
      const str = JSON.stringify(data);
      return `${str.length}:${str.slice(0, 50)}:${str.slice(-50)}`;
    } catch {
      return String(data);
    }
  }

  /**
   * Notifies the controller that content has changed.
   *
   * @param {any} data
   */
  notifyChange(data) {
    if (!this.enabled) {
      this.setStatus('disabled');
      return;
    }

    const currentHash = this.hash(data);
    if (currentHash === this.lastSavedHash) {
      // Content has not changed from last saved state
      return;
    }

    this.pendingData = data;
    this.setStatus('unsaved');

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.flush();
    }, this.debounceMs);
  }

  /**
   * Alias for notifyChange for ergonomic usage.
   *
   * @param {any} data
   */
  recordChange(data) {
    this.notifyChange(data);
  }

  /**
   * Returns whether unpersisted changes are currently pending.
   *
   * @returns {boolean}
   */
  hasPendingChanges() {
    return Boolean(this.pendingData);
  }

  /**
   * Flushes any pending data to IndexedDB immediately.
   *
   * @returns {Promise<void>}
   */
  async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (!this.pendingData || !this.enabled) return;

    const dataToSave = this.pendingData;
    this.pendingData = null;
    const targetHash = this.hash(dataToSave);

    this.setStatus('saving');

    try {
      await this.onSave(dataToSave);
      this.lastSavedHash = targetHash;
      this.setStatus('saved');

      // Notify other tabs via BroadcastChannel
      if (this.channel) {
        try {
          this.channel.postMessage({
            type: 'WORKSPACE_SAVED',
            timestamp: new Date().toISOString(),
          });
        } catch {}
      }
    } catch (err) {
      // Re-queue pending data if failed
      this.pendingData = dataToSave;
      this.setStatus('failed', err);
    }
  }

  /**
   * Updates current status and notifies listeners.
   *
   * @param {'idle' | 'saving' | 'saved' | 'unsaved' | 'failed' | 'disabled'} status
   * @param {any} [error]
   */
  setStatus(status, error) {
    this.status = status;
    this.onStatusChange(status, error);
  }

  /**
   * Enables or disables auto-save.
   *
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
      this.setStatus('disabled');
    } else {
      this.setStatus('idle');
    }
  }

  /**
   * Sets callback for cross-tab updates.
   *
   * @param {(data: any) => void} cb
   */
  setRemoteUpdateListener(cb) {
    this.onRemoteUpdate = cb;
  }

  /**
   * Cleans up event listeners and channels.
   */
  destroy() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.channel) {
      try {
        this.channel.close();
      } catch {}
      this.channel = null;
    }
    if (typeof document !== 'undefined' && this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    if (typeof window !== 'undefined' && this.pageHideHandler) {
      window.removeEventListener('pagehide', this.pageHideHandler);
    }
  }
}
