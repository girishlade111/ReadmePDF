/**
 * md2pdf — Debounced Auto-Save & Multi-Tab Concurrency Controller
 *
 * Coordinates debounced draft persistence, transactional revision tracking,
 * optimistic concurrency conflict resolution, dynamic beforeunload guards,
 * visibilitychange flushes, and cross-tab synchronization.
 */

/**
 * Computes a robust 32-bit FNV-1a hash over the entire content string.
 * Completely avoids false collisions caused by naive slice heuristics.
 *
 * @param {any} data
 * @returns {string}
 */
export function contentHash(data) {
  const str = typeof data === 'string' ? data : (data ? JSON.stringify(data) : '');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
  }
  return `${str.length}:${h.toString(16)}`;
}

export class AutoSaveController {
  /**
   * @param {{
   *   onSave: (data: any, meta: { expectedRevision: number }) => Promise<any>;
   *   onStatusChange?: (status: 'idle' | 'saving' | 'saved' | 'unsaved' | 'failed' | 'conflict' | 'disabled', error?: any) => void;
   *   onConflict?: (data: any, conflictInfo: any) => void;
   *   onRemoteUpdate?: (data: any) => void;
   *   debounceMs?: number;
   *   intervalMs?: number;
   *   channelName?: string;
   *   workspaceId?: string;
   *   initialRevision?: number;
   *   enabled?: boolean;
   * }} options
   */
  constructor(options) {
    this.onSave = options.onSave;
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onConflict = options.onConflict || (() => {});
    this.onRemoteUpdate = options.onRemoteUpdate || (() => {});
    this.debounceMs = options.debounceMs ?? options.intervalMs ?? 1000;
    this.channelName = options.channelName || 'md2pdf-sync';
    this.workspaceId = options.workspaceId || 'converter-active';
    this.currentRevision = options.initialRevision ?? 0;
    this.enabled = options.enabled !== false;

    /** @type {'idle' | 'saving' | 'saved' | 'unsaved' | 'failed' | 'conflict' | 'disabled'} */
    this.status = this.enabled ? 'idle' : 'disabled';
    this.pendingData = null;
    this.lastSavedContent = null;
    this.lastSavedHash = null;
    this.timer = null;
    this.isSaving = false;
    this.hasQueuedSave = false;
    this.isRemoteConflicted = false;
    this.activePromise = null;
    this.channel = null;

    this.beforeUnloadHandler = (e) => {
      if (this.hasPendingChanges()) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    this.hasBeforeUnloadRegistered = false;

    this.initBroadcastChannel();
    this.initPageLifecycle();
  }

  initBroadcastChannel() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.onmessage = (event) => {
          if (event.data?.type === 'WORKSPACE_SAVED' && event.data?.workspaceId === this.workspaceId) {
            const remoteRev = event.data.revision;
            if (remoteRev !== undefined && remoteRev > this.currentRevision) {
              if (this.hasPendingChanges()) {
                // Sibling tab saved while this tab has unsaved edits: flag conflict
                this.isRemoteConflicted = true;
                this.setStatus('conflict');
                this.onConflict(this.pendingData, {
                  currentRevision: this.currentRevision,
                  remoteRevision: remoteRev,
                  workspaceId: this.workspaceId,
                });
              } else {
                // Clean: advance our base revision
                this.currentRevision = remoteRev;
                this.onRemoteUpdate(event.data);
              }
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
        if (document.visibilityState === 'hidden' && this.hasPendingChanges()) {
          this.flush();
        }
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  updateBeforeUnload() {
    if (typeof window === 'undefined') return;
    const isDirty = this.hasPendingChanges();
    if (isDirty && !this.hasBeforeUnloadRegistered) {
      window.addEventListener('beforeunload', this.beforeUnloadHandler);
      this.hasBeforeUnloadRegistered = true;
    } else if (!isDirty && this.hasBeforeUnloadRegistered) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.hasBeforeUnloadRegistered = false;
    }
  }

  /**
   * Computes a full content hash.
   *
   * @param {any} data
   * @returns {string}
   */
  hash(data) {
    return contentHash(data);
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

    // Exact equality check against last saved content
    if (
      this.lastSavedContent !== null &&
      typeof data === 'string' &&
      data === this.lastSavedContent
    ) {
      // Reverted back to saved content
      this.pendingData = null;
      this.updateBeforeUnload();
      if (!this.isSaving) {
        this.setStatus('saved');
      }
      return;
    }

    this.pendingData = data;
    this.updateBeforeUnload();
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
    return this.pendingData !== null;
  }

  /**
   * Cancels any pending auto-save write and clears pending data.
   * Crucial for preventing stale timers from resurrecting deleted/cleared workspaces.
   */
  cancelPending() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pendingData = null;
    this.updateBeforeUnload();
    if (this.enabled) {
      this.setStatus('idle');
    }
  }

  /**
   * Resets the controller baseline with freshly loaded or restored data.
   *
   * @param {any} content
   * @param {number} [revision]
   */
  reset(content = '', revision = 0) {
    this.cancelPending();
    this.lastSavedContent = content;
    this.lastSavedHash = this.hash(content);
    this.currentRevision = revision;
    this.isRemoteConflicted = false;
    this.updateBeforeUnload();
    if (this.enabled) {
      this.setStatus('idle');
    }
  }

  /**
   * Flushes any pending data to IndexedDB immediately with concurrency guards.
   *
   * @returns {Promise<void>}
   */
  async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (!this.pendingData || !this.enabled) return;

    // Mutex: if a save is in progress, queue another flush after completion
    if (this.isSaving) {
      this.hasQueuedSave = true;
      return this.activePromise;
    }

    const dataToSave = this.pendingData;
    this.pendingData = null;
    this.isSaving = true;
    this.setStatus('saving');

    const expectedRev = this.currentRevision;

    const promise = (async () => {
      try {
        const result = await this.onSave(dataToSave, {
          expectedRevision: expectedRev,
        });

        // Transaction successfully committed
        this.lastSavedContent = dataToSave;
        this.lastSavedHash = this.hash(dataToSave);
        if (result && typeof result.revision === 'number') {
          this.currentRevision = result.revision;
        } else {
          this.currentRevision = expectedRev + 1;
        }
        this.isRemoteConflicted = false;
        this.updateBeforeUnload();
        this.setStatus('saved');

        // Notify sibling tabs after confirmed commit
        if (this.channel) {
          try {
            this.channel.postMessage({
              type: 'WORKSPACE_SAVED',
              workspaceId: this.workspaceId,
              revision: this.currentRevision,
              timestamp: new Date().toISOString(),
            });
          } catch {}
        }
      } catch (err) {
        // Concurrency conflict or storage error: preserve unsaved content in memory
        this.pendingData = dataToSave;
        this.updateBeforeUnload();

        if (err && err.code === 'REVISION_CONFLICT') {
          this.isRemoteConflicted = true;
          this.setStatus('conflict', err);
          this.onConflict(dataToSave, err);
        } else {
          this.setStatus('failed', err);
        }
      } finally {
        this.isSaving = false;
        this.activePromise = null;

        // Process any queued save triggered while this save was in-flight
        if (this.hasQueuedSave && this.pendingData) {
          this.hasQueuedSave = false;
          this.flush();
        }
      }
    })();

    this.activePromise = promise;
    return promise;
  }

  /**
   * Updates current status and notifies listeners.
   *
   * @param {'idle' | 'saving' | 'saved' | 'unsaved' | 'failed' | 'conflict' | 'disabled'} status
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
      this.setStatus(this.hasPendingChanges() ? 'unsaved' : 'idle');
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
   * Sets callback for concurrency conflicts.
   *
   * @param {(data: any, conflictInfo: any) => void} cb
   */
  setConflictListener(cb) {
    this.onConflict = cb;
  }

  /**
   * Cleans up event listeners and channels.
   */
  destroy() {
    this.cancelPending();
    if (this.channel) {
      try {
        this.channel.close();
      } catch {}
      this.channel = null;
    }
    if (typeof document !== 'undefined' && this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    if (typeof window !== 'undefined' && this.hasBeforeUnloadRegistered) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.hasBeforeUnloadRegistered = false;
    }
  }
}
