# md2pdf IndexedDB History, Auto-Save, and Workspace Restoration Architecture

> **Authoritative Technical Specification & User Manual**  
> **Product:** md2pdf (by LadeStack — Founder & Creator: Girish Lade)  
> **Production Origin:** `https://md2pdf.ladestack.in`  
> **Target Framework:** Astro 7.4.2 Static Site Generation (`output: 'static'`)  
> **Storage Layer:** W3C IndexedDB API (`md2pdf-history-db`, version 1)  

---

## 1. Architecture Overview (Client-Side Browser-Local Model)

md2pdf is an entirely client-side, browser-first Markdown-to-PDF platform. In strict accordance with the core privacy architecture of LadeStack:

- **Zero Cloud Persistence:** No document content, repository context, or export metadata is ever transmitted to a remote database, serverless function, or third-party cloud storage (such as Firebase, Supabase, AWS S3, or Google Cloud Storage).
- **Client-Side Storage Engine:** All persistence occurs locally within the user's browser sandbox using the W3C IndexedDB API.
- **Graceful Degradation:** In environments where IndexedDB is disabled, blocked by restrictive corporate security policies, running inside private browsing containers without persistent storage, or throwing `SecurityError`, the application gracefully falls back to an in-memory session store. The user interface displays a neutral `"Storage unavailable"` badge without throwing unhandled exceptions or disrupting document conversion.
- **Architectural Separation:** Storage concerns are strictly isolated from UI rendering and Markdown conversion. The history architecture consists of dedicated functional modules located in `src/lib/history/`:
  - `schema.js`: Constants, store declarations, index definitions, database upgrade migrations, and structural record validation.
  - `db.js`: Low-level database lifecycle handling (`openDatabase`, `closeDatabase`, `deleteDatabase`, `runTransaction`).
  - `storage.js`: Storage availability probing, byte formatting, quota estimation (`navigator.storage.estimate`), and persistence request (`navigator.storage.persist`).
  - `repository.js`: High-level domain CRUD operations with content deduplication, automatic pruning (LRU style), and query sorting.
  - `serialization.js`: Hardened JSON backup export and import with strict structural validation, prototype pollution guards, and transaction isolation.
  - `auto-save.js`: Reactive `AutoSaveController` with debounced persistence, dirty tracking, SHA-256 content hashing, lifecycle flushing (`beforeunload`, `visibilitychange`), and cross-tab synchronisation (`BroadcastChannel`).
  - `index.js`: Unified public export surface for UI controllers and tests.

```
+-------------------------------------------------------------------------------+
|                             md2pdf User Interface                             |
|  [Markdown Editor]   [GitHub Explorer]   [Book Builder]   [History Drawer]    |
+------------------------------------+-----------------------------+------------+
                                     |                             |
                                     v                             v
                   +----------------------------------+   +-------------------+
                   |        AutoSaveController        |   | History UI Driver |
                   |  - 1000ms trailing debounce      |   | - Filter & Search |
                   |  - Dirty state tracking          |   | - Card Actions    |
                   |  - Lifecycle flush (visibility)  |   | - Backup Export   |
                   |  - BroadcastChannel multi-tab    |   | - Import & Prune  |
                   +-----------------+----------------+   +---------+---------+
                                     |                              |
                                     +--------------+---------------+
                                                    |
                                                    v
                                  +------------------------------------+
                                  |     History Repository Service     |
                                  |  - saveActiveWorkspace / getDraft  |
                                  |  - addHistoryEntry / listEntries   |
                                  |  - addExportRecord / listExports   |
                                  |  - savePreference / getPreference  |
                                  +-----------------+------------------+
                                                    |
                                                    v
                                  +------------------------------------+
                                  |     Database Engine (db.js)        |
                                  |  - openDatabase / runTransaction   |
                                  |  - Upgrade Migrations (schema.js)  |
                                  +-----------------+------------------+
                                                    |
                                                    v
                                  +------------------------------------+
                                  |   W3C IndexedDB: md2pdf-history-db |
                                  |   Stores: workspaces, history,     |
                                  |           exports, preferences     |
                                  +------------------------------------+
```

---

## 2. Database Schema Specification

The IndexedDB database is named `md2pdf-history-db` and operates at version `1`. It exposes four distinct object stores:

### 2.1 Store: `workspaces`
Maintains the active working drafts across browser sessions, keyed by workspace identity.
- **Key Path:** `workspaceId` (String)
- **Primary Keys:** `'converter-active'` (Single Markdown Editor draft), `'book-active'` (Documentation Book draft).
- **Indexes:**
  - `by_updatedAt`: Index on `updatedAt` for recency ordering.
- **Record Schema:**
  ```typescript
  interface WorkspaceRecord {
    id: string;               // Normalized identifier (matches workspaceId)
    workspaceId: string;      // Primary Key Path: 'converter-active' | 'book-active'
    title: string;            // Workspace title or filename
    content: string;          // Full Markdown document body
    markdown: string;         // Alias for backward compatibility
    metadata: {
      repoCtx?: { owner: string; repo: string; branch?: string; path?: string };
      sourceType?: 'manual' | 'upload' | 'github' | 'book';
      theme?: string;
      showToc?: boolean;
      autoPageBreak?: boolean;
    };
    updatedAt: string;        // ISO 8601 Timestamp
    revision: number;         // Incremental change counter
  }
  ```

### 2.2 Store: `historyEntries`
Maintains versioned snapshots of user work (manual snapshots, local file uploads, GitHub fetches, and Book Builder snapshots).
- **Key Path:** `id` (String, format: `hist_<timestamp>_<random>`)
- **Indexes:**
  - `by_updatedAt`: Index on `updatedAt` for chronological sorting.
  - `by_sourceType`: Index on `sourceType` for category filtering (`'manual'`, `'upload'`, `'github'`, `'book'`).
  - `by_isPinned`: Index on `isPinned` (`0` or `1`) for pinned entry precedence.
- **Record Schema:**
  ```typescript
  interface HistoryEntryRecord {
    id: string;               // Unique primary key
    title: string;            // Display title
    sourceType: 'manual' | 'upload' | 'github' | 'book';
    recordType: string;       // Default 'manual'
    content: string;          // Full Markdown text
    markdown: string;         // Content alias
    contentSize: number;      // Size in UTF-8 bytes
    chapters?: Array<any>;    // Optional chapter tree for Book Builder snapshots
    metadata: {
      url?: string;
      fileName?: string;
      repoCtx?: object;
      theme?: string;
      [key: string]: any;
    };
    isPinned: number;         // 0 for false, 1 for true (IndexedDB indexed integer)
    createdAt: string;        // ISO 8601 Timestamp
    updatedAt: string;        // ISO 8601 Timestamp
  }
  ```

### 2.3 Store: `exportRecords`
Logs generation history and export parameters for single PDFs, combined book prints, and individual PDF ZIP archives.
- **Key Path:** `id` (String, format: `exp_<timestamp>_<random>`)
- **Indexes:**
  - `by_timestamp`: Index on `timestamp` for activity log ordering.
  - `by_exportType`: Index on `exportType` (`'single-pdf'`, `'combined-book-print'`, `'individual-pdf-zip'`).
- **Record Schema:**
  ```typescript
  interface ExportRecord {
    id: string;
    exportType: 'single-pdf' | 'combined-book-print' | 'individual-pdf-zip';
    title: string;
    pageCount?: number;
    fileCount?: number;
    byteSize?: number;
    success: boolean;
    errorMessage?: string;
    metadata?: object;
    timestamp: string;        // ISO 8601 Timestamp
  }
  ```

### 2.4 Store: `preferences`
Persists user configuration and drawer UI settings.
- **Key Path:** `key` (String)
- **Record Schema:**
  ```typescript
  interface PreferenceRecord {
    key: string;              // e.g., 'autosave_enabled', 'history_sort', 'history_filter'
    value: any;
    updatedAt: string;        // ISO 8601 Timestamp
  }
  ```

---

## 3. Auto-Save Design & Debounce Pipeline

The auto-save system is orchestrated by the `AutoSaveController` class in `src/lib/history/auto-save.js`.

### 3.1 Debounce Pipeline & Scheduling
- **Debounce Delay:** Defaults to 1,000 milliseconds (`debounceMs: 1000`).
- **Heartbeat Flush Interval:** An upper-bound periodic timer (`intervalMs: 10000`) guarantees that continuously typed text is flushed to IndexedDB at least every 10 seconds, even if keystrokes never pause for the full debounce duration.
- **Dirty State Tracking:** Keystrokes invoke `notifyChange()` or `recordChange()`. The controller compares the cryptographic SHA-256 hash (or fast DJB2 fallback) of the current buffer against the last persisted content hash. If identical, the write operation is skipped to avoid redundant I/O cycles.

### 3.2 Visual State Machine
The editor interface displays an accessible auto-save indicator badge (`#autosave-indicator`) containing a colored status dot (`#autosave-dot`) and localized status text (`#autosave-status`):

| State | Status Text (English) | Dot Color & Animation | Description |
| :--- | :--- | :--- | :--- |
| **Idle** | `""` (Hidden/Muted) | Transparent / Slate | No pending changes; quiescent state. |
| **Pending** | `"Unsaved changes"` | Amber / `#e6a700` | User modified text; debounce timer active. |
| **Saving** | `"Saving..."` | Blue / `#0284c7` (Pulsing) | Transaction active in IndexedDB. |
| **Saved** | `"Saved locally"` | Green / `#16a34a` | Data successfully committed to disk. |
| **Disabled** | `"Auto-save off"` | Gray / `#9ca3af` | User toggled off auto-save in preferences. |
| **Error** | `"Save failed"` | Red / `#dc2626` | Quota exceeded or database locked. |
| **Unavailable** | `"Storage unavailable"` | Amber / `#f59e0b` | IndexedDB unavailable in browser context. |

### 3.3 Lifecycle Flushing & Unload Safety
To eliminate data loss when a user closes a browser tab, navigates away, or switches background apps:
- The controller registers listeners on `window.addEventListener('beforeunload', ...)` and `document.addEventListener('visibilitychange', ...)`.
- When the tab becomes hidden (`document.visibilityState === 'hidden'`), the controller immediately triggers synchronous or microtask-flushed writes of any pending changes.
- The `hasPendingChanges()` method can be queried before destructive actions to display warning prompts.

---

## 4. Session & Draft Restoration Workflows

When a user visits md2pdf or refreshes their browser tab, the application automatically restores their in-flight draft without requiring manual intervention:

1. **Initialization:** On page load, `initConverter()` queries `getActiveWorkspace('converter-active')`.
2. **Draft Detection:** If a saved draft exists with non-empty Markdown content:
   - The editor textarea (`#md-input`) is pre-filled with the saved text.
   - Any associated GitHub repository metadata (`repoCtx`) is restored to `#url-input`.
   - The live preview is rendered with the appropriate theme and table-of-contents settings.
   - The status indicator transitions to `"Saved locally"`.
3. **Draft Restoration vs. New Workflows:** Loading a sample or entering a GitHub URL prompts the user if they have active unsaved work, preventing accidental overwrites.

---

## 5. Snapshot Creation Triggers

Historical snapshots are permanently preserved in `historyEntries`. They are automatically or manually captured across four distinct workflows:

1. **Manual Snapshot:** The user clicks the **Save Version** (`#save-version-btn`) button in the editor toolbar. A modal prompts for an optional snapshot title (e.g., `"Release v1.2 Draft"`), saving the current document and configuration.
2. **Local File Upload:** When a user uploads a `.md`, `.markdown`, or `.txt` file, a snapshot is immediately recorded with `sourceType: 'upload'`, recording the file name and byte size.
3. **GitHub README Import:** When a user fetches a README via a GitHub repository URL, a snapshot is recorded with `sourceType: 'github'`, recording the repository owner, repo, branch, path, and source URL.
4. **Book Builder Snapshot:** In the Documentation Book section, clicking **Save Snapshot** (`#book-save-snapshot-btn`) records a snapshot with `sourceType: 'book'`, preserving the complete list of selected chapter paths, custom titles, subtitles, and ordering.
5. **Deduplication Safeguard:** When a snapshot is triggered whose content hash matches an existing snapshot recorded within the last 60 seconds, the repository updates the existing record's timestamp rather than polluting the database with identical entries.

---

## 6. History Drawer UI/UX Specification & Accessibility

The History Drawer (`src/components/HistoryDrawer.astro`) is an accessible, slide-over panel adhering to W3C WAI-ARIA 1.2 modal dialog design patterns.

### 6.1 DOM Structure & Triggering
- **Triggers:** Opened via the header history button (`#header-history-btn`), the editor history button (`#open-history-btn`), or the Book Builder history button (`#book-history-btn`).
- **Container:** `<aside id="history-drawer" class="history-drawer" role="dialog" aria-modal="true" aria-labelledby="history-drawer-title" aria-describedby="history-drawer-desc" hidden>`
- **Backdrop:** A semi-transparent overlay (`#history-drawer-overlay`) covers the page viewport. Clicking the backdrop closes the drawer.
- **Close Button:** An accessible close button (`#history-drawer-close`) with `aria-label` closes the panel.
- **Escape Key:** Pressing the `Escape` key closes the drawer and restores focus to the invoking trigger element.
- **Focus Trap:** When opened, focus is immediately routed to the search input (`#history-search-input`). Tabbing is strictly trapped within the drawer until dismissed.

### 6.2 Storage Quota Display
At the top of the drawer, a storage indicator displays the estimated storage usage and available browser quota via `navigator.storage.estimate()`:
- Text: e.g., `"Storage: 1.4 MB of 2.1 GB used (0.1%)"`
- Progress Bar: A semantic `<div class="storage-meter">` with `<div class="storage-meter-fill">` providing real-time visual capacity feedback.

---

## 7. Search, Filtering, and Sorting Specifications

The drawer provides interactive, real-time client-side querying over local records:

### 7.1 Filter Tabs
Five filter buttons (`.history-filter-btn`) allow the user to isolate records:
1. **All (`all`):** Shows both snapshots and export logs.
2. **Markdown (`manual` / `upload`):** Shows manually authored and uploaded documents.
3. **GitHub (`github`):** Shows documents imported from GitHub repositories.
4. **Books (`book`):** Shows multi-chapter Book Builder snapshots.
5. **Exports (`exports`):** Shows logged PDF and ZIP download records.

### 7.2 Full-Text Search
The search input (`#history-search-input`) debounces user typing and performs case-insensitive substring matching across:
- Snapshot titles (`entry.title`)
- Document body content (`entry.content` / `entry.markdown`)
- Repository names and owners (`metadata.repoCtx.owner`, `metadata.repoCtx.repo`)
- Original file names (`metadata.fileName`)

### 7.3 Sorting Controls
A select control (`#history-sort-select`) offers four sorting strategies:
1. `newest`: Decreasing timestamp order (`updatedAt` descending).
2. `oldest`: Increasing timestamp order (`updatedAt` ascending).
3. `recent`: Most recently accessed or opened.
4. `pinned`: Pinned records (`isPinned === 1`) anchored to the top, followed by unpinned records sorted by `updatedAt` descending.

---

## 8. Card Actions

Each history card rendered in the list (`.history-card`) exposes a suite of actions:

```
+-----------------------------------------------------------------------+
| [PIN]  API Reference Documentation (v2.1)             [MANUAL] [3.2 KB] |
| 14:32 - 24 Oct 2026                                                   |
| Path: docs/api-reference.md                                           |
+-----------------------------------------------------------------------+
| [ Restore Draft ]  [ Rename ]  [ View Source ]  [ Delete ]            |
+-----------------------------------------------------------------------+
```

1. **Restore / Open (`.history-act-restore`):**
   - Restores the snapshot into the active Markdown editor or Book Builder.
   - **Protection Confirmation:** If the active editor contains unsaved modifications that differ from the snapshot, an accessible confirmation modal (`#history-confirm-modal`) prompts the user before overwriting.
2. **Rename (`.history-act-rename`):**
   - Prompts the user for a new descriptive title and updates the IndexedDB record in place.
3. **Pin / Unpin (`.history-card-pin`):**
   - Toggles `isPinned` between `0` and `1`. Pinned cards display a gold bookmark badge and are immune to automatic LRU pruning.
4. **View Source (`.history-act-view`):**
   - Opens a preview dialog showing the raw Markdown content with a one-click **Copy to Clipboard** button.
5. **Delete (`.history-act-delete`):**
   - Permanently deletes the individual record from IndexedDB and removes the card with a smooth fade animation.

---

## 9. Local Data Management

The footer of the History Drawer provides local administrative controls:

### 9.1 Clear All Data (`#history-clear-all-btn`)
- Prompts the user with an explicit, high-friction confirmation dialog (`#history-confirm-modal`).
- Upon confirmation, deletes all history entries, export logs, and active workspace drafts from `md2pdf-history-db`.
- Preserves the user's interface preferences (such as auto-save toggle state).

### 9.2 Auto-Save Toggle (`#history-autosave-toggle`)
- An accessible checkbox switch allowing users to enable or disable automatic background persistence.
- State is persisted in the `preferences` store under the key `'autosave_enabled'`.

---

## 10. Backup Export Specification

Users can export their complete local history archive as a portable JSON file by clicking **Backup** (`#history-export-backup-btn`).

### 10.1 Backup JSON Format (`md2pdf-history-backup`)
The output file is named `md2pdf-history-backup-YYYY-MM-DD.json` and conforms to the following schema:
```json
{
  "$schema": "https://md2pdf.ladestack.in/schemas/history-backup-v1.json",
  "app": "md2pdf",
  "version": 1,
  "schemaVersion": 1,
  "exportedAt": "2026-10-24T12:00:00.000Z",
  "data": {
    "workspaces": [ ... ],
    "historyEntries": [ ... ],
    "exportRecords": [ ... ],
    "preferences": [ ... ]
  }
}
```

---

## 11. Backup Import Specification

Users can restore or migrate their archives by clicking **Restore Backup** (`#history-import-backup-btn`), which triggers a file picker for JSON backups.

### 11.1 Security & Prototype Pollution Protection
The import engine (`src/lib/history/serialization.js`) enforces rigorous defense-in-depth security:
- **File Size Cap:** Backups exceeding 25 megabytes (`MAX_BACKUP_SIZE = 25 * 1024 * 1024`) are rejected immediately before JSON parsing.
- **Prototype Pollution Guard:** The recursive `isSafeStructure()` validator traverses every object key and rejects payloads containing dangerous keys such as `__proto__`, `constructor`, or `prototype`.
- **Structural Integrity:** Verifies that the JSON contains valid `app: "md2pdf"` and supported `version: 1` headers. Records failing schema validation are safely dropped.

### 11.2 Conflict Resolution: Merge vs. Replace
The user can select between two restoration strategies:
- **Merge Mode (Default):** Existing records are preserved. Imported entries with conflicting IDs are updated only if their `updatedAt` timestamp is newer, while unique entries are appended.
- **Replace Mode:** All existing object stores are cleared and atomically populated with the contents of the backup archive.

---

## 12. Multi-Tab Synchronization via `BroadcastChannel`

To ensure a seamless user experience when working across multiple browser tabs simultaneously:
- The application initializes a dedicated communication channel: `new BroadcastChannel('md2pdf-sync')`.
- When an auto-save flush, manual snapshot, deletion, or backup import occurs in Tab A, a lightweight sync message is broadcast:
  ```javascript
  channel.postMessage({
    type: 'WORKSPACE_SAVED', // or 'HISTORY_CHANGED', 'PREFERENCE_CHANGED'
    workspaceId: 'converter-active',
    timestamp: Date.now()
  });
  ```
- Tab B receives the broadcast and updates its internal state:
  - If Tab B's editor is quiescent, it reloads the latest draft.
  - If Tab B has uncommitted edits, it displays a conflict notification badge to prevent silently overwriting concurrent work.
  - The History Drawer automatically refreshes its card list without requiring a manual page reload.

---

## 13. Storage Quota Management

IndexedDB operates under browser-enforced storage quotas:
- **Quota Querying:** `getStorageEstimate()` calls `navigator.storage.estimate()` to obtain the current `usage` and `quota` values in bytes, formatting them into human-readable strings (e.g., `MB`, `GB`).
- **Persistent Storage Request:** When available, `requestPersistentStorage()` calls `navigator.storage.persist()` to transition the origin from "best-effort" to "persistent" storage, protecting cached documents from aggressive browser cache eviction under low-disk conditions.
- **Automatic Pruning (LRU):** The repository enforces a soft ceiling of 150 history entries (`MAX_HISTORY_ENTRIES = 150`). When the limit is reached, older unpinned records are pruned in least-recently-updated order. Pinned records (`isPinned === 1`) are strictly exempt from pruning.

---

## 14. Privacy, Security, and Zero-Server Retention Guarantee

md2pdf adheres to a strict, uncompromising privacy architecture:
1. **Local-Only Processing:** No document text, code snippet, Markdown table, or author metadata is ever sent to LadeStack servers or external APIs.
2. **Third-Party Immunity:** No analytics trackers, behavioral logging scripts, or telemetry SDKs have access to the IndexedDB storage layer.
3. **Network Boundary:** The only outbound network requests permitted are unauthenticated calls to `api.github.com` and `raw.githubusercontent.com` to fetch public repositories explicitly requested by the user.
4. **Input Sanitization:** All Markdown rendered into HTML is sanitized via DOMPurify with strict tag and attribute whitelists, stripping any potential XSS vectors before insertion into the DOM or preview panels.

---

## 15. Internationalization & 9-Language Parity

Every user-facing label, button, modal prompt, error alert, and accessibility descriptor in the History system is fully localized across all nine supported languages:

- English (`en`)
- Spanish (`es`)
- Japanese (`ja`)
- Korean (`ko`)
- Simplified Chinese (`zh`)
- Russian (`ru`)
- Turkish (`tr`)
- French (`fr`)
- Brazilian Portuguese (`pt`)

### 15.1 Dictionary Key Parity
Exactly 51 dedicated keys under the `history.*` namespace were added to each language dictionary in `src/i18n/dictionaries/`, maintaining 100% parity across all locales (417 total keys per dictionary file):
- Core labels: `history.title`, `history.desc`, `history.empty`, `history.close`
- Filter tabs: `history.filter.all`, `history.filter.manual`, `history.filter.github`, `history.filter.book`, `history.filter.exports`
- Card actions: `history.card.restore`, `history.card.rename`, `history.card.pin`, `history.card.unpin`, `history.card.delete`, `history.card.viewSource`
- Auto-save statuses: `history.status.saving`, `history.status.saved`, `history.status.unsaved`, `history.status.off`, `history.status.failed`, `history.status.unavailable`
- Modals & confirms: `history.confirm.clearAllTitle`, `history.confirm.clearAllMsg`, `history.confirm.overwriteTitle`, `history.confirm.overwriteMsg`

---

## 16. Error Handling, Quota Exhaustion, and Corrupted Database Recovery

The storage subsystem incorporates comprehensive fault recovery:
- **Quota Exceeded (`QuotaExceededError`):** When the browser storage limit is reached, write transactions catch the exception, set the auto-save indicator to `"Save failed"`, and surface a notification advising the user to export a backup and prune old records.
- **Corrupted Database Recovery:** If `indexedDB.open()` fails with `VersionError` or `CorruptError`, the subsystem logs a diagnostic error, cleanly closes the connection, and offers an automatic database recreation fallback.
- **Transaction Rollback:** All multi-store updates (such as backup imports) are executed inside atomic readwrite transactions. A failure on any individual record automatically rolls back all preceding writes within that transaction.

---

## 17. Offline Capability and PWA Readiness

md2pdf is fully functional without an active Internet connection:
- All core application logic, styling, fonts (DejaVu Sans/Mono, Noto Sans CJK SC), and icons are bundled locally with zero CDN runtime dependencies.
- With the IndexedDB History system, users can compose documents, restore past drafts, organize chapters, and export PDFs entirely offline.
- Internet connectivity is only required when fetching new public repositories from GitHub.

---

## 18. Performance Benchmarks & Limits

The History system was engineered for minimal memory overhead and zero UI stutter:
- **Debounce Latency:** 1,000ms ensures typing remains fluid at 60+ FPS even in documents exceeding 50,000 words.
- **Transaction Execution Time:** IndexedDB key-value put operations complete in under 4ms on standard hardware.
- **File Upload & Snapshot Cap:** Supports individual documents up to 2MB in the editor, and backup archive files up to 25MB.
- **Retention Cap:** Automatically manages up to 150 historical records, preventing unbounded database growth.

---

## 19. Test Architecture & Coverage

The History subsystem is backed by a dedicated, 40-test automated test suite in `test/history.test.js`, running on the built-in Node.js test runner (`node:test`).

### 19.1 High-Fidelity W3C IndexedDB Mock
Testing in headless Node.js environments is enabled by a lightweight, in-memory W3C IndexedDB mock (`test/helpers/mock-idb.js`) supporting:
- `MockIDBFactory`, `MockIDBDatabase`, `MockIDBTransaction`, `MockIDBObjectStore`, `MockIDBIndex`, `MockIDBRequest`, `MockIDBKeyRange`.
- Full event lifecycle: `onupgradeneeded`, `onsuccess`, `onerror`, `oncomplete`.
- Compound indexes and multi-store transactions.

### 19.2 Automated Test Matrix (40/40 Passing)
| Test Range | Test Area | Coverage | Result |
| :--- | :--- | :--- | :---: |
| **01 – 05** | Database Schema & Initialization | DB name, version 1, store existence, key paths, upgrade migrations | **PASS** |
| **06 – 10** | Workspace Draft CRUD | Saving active workspace, retrieving drafts, updating revision, delete | **PASS** |
| **11 – 15** | History Entries CRUD | Creating snapshots, timestamps, byte size calculation, sorting | **PASS** |
| **16 – 20** | Deduplication & Pruning | 60s duplicate suppression, LRU pruning to 150 cap, pin protection | **PASS** |
| **21 – 25** | Pinning & Renaming | Pin toggles, index querying, custom title updates, metadata integrity | **PASS** |
| **26 – 30** | Search & Filtering | Full-text substring search, category filters, multi-criteria match | **PASS** |
| **31 – 35** | Export Logging | Single PDF logs, ZIP export logs, error capture, type aliases | **PASS** |
| **36 – 38** | Backup Serialization & Security | JSON export format, prototype pollution rejection, 25MB cap | **PASS** |
| **39** | Auto-Save Controller | Debounce timing, dirty state, content hash, lifecycle flush | **PASS** |
| **40** | Multilingual Parity | Exact 51-key parity across all 9 language dictionaries | **PASS** |

---

## 20. Real-Browser Verification Across Chrome & Edge

Real-browser automated end-to-end verification was performed using Chrome DevTools Protocol (CDP) across both **Google Chrome** and **Microsoft Edge** in headless environments.

### 20.1 Test Matrix (Scenarios A through I)
| Scenario | Feature Under Test | Google Chrome (Port 9224) | Microsoft Edge (Port 9225) |
| :--- | :--- | :---: | :---: |
| **Scenario A** | Type Markdown & verify auto-save indicator transitions (Saving -> Saved) | **PASS** | **PASS** |
| **Scenario B** | Refresh browser tab and verify active draft restores cleanly into editor | **PASS** | **PASS** |
| **Scenario C** | Open History Drawer, verify card rendering, and restore past snapshot | **PASS** | **PASS** |
| **Scenario D** | Toggle card Pin state and verify pin badge persistence in IndexedDB | **PASS** | **PASS** |
| **Scenario E** | Filter drawer records by category (Markdown vs GitHub vs Books) | **PASS** | **PASS** |
| **Scenario F** | Full-text search filtering cards by title and body content | **PASS** | **PASS** |
| **Scenario G** | Export JSON backup archive and verify structural validity | **PASS** | **PASS** |
| **Scenario H** | Toggle Auto-Save setting off and verify preference persistence | **PASS** | **PASS** |
| **Scenario I** | Clear All data with confirmation modal and verify database reset | **PASS** | **PASS** |

---

## 21. Production Release Gate Integration

The history system is fully compliant with the md2pdf production release gate:
- **Build Command:**
  ```powershell
  $env:PUBLIC_SITE_URL = "https://md2pdf.ladestack.in"
  node scripts/build-release.mjs
  ```
- **Validation Checklist:**
  - Origin policy verification: Accepts `https://md2pdf.ladestack.in` (rejects HTTP, local, or placeholder origins).
  - 216 static production HTML routes generated cleanly.
  - 216 sitemap `<loc>` entries with 2,160 reciprocal `xhtml:link` hreflang alternates (including `x-default`).
  - 216 JSON-LD schema blocks validated without cross-origin leaks.
  - Release gate exits with code `0`.

---

## 22. User Guide & Troubleshooting FAQ

### How do I manually save a snapshot?
Click the **Save Version** button located right above the Markdown editor (or in the Book Builder controls). A dialog will ask for an optional title. Once saved, your snapshot will appear in the History Drawer.

### Where is my data saved?
Your documents and export logs are stored exclusively inside your web browser's IndexedDB database on your physical device. Nothing is ever sent to our servers.

### Can I transfer my work to another computer?
Yes! Open the History Drawer, click **Backup**, and save the `.json` file to your computer or USB drive. On your other computer, open md2pdf, click **Restore Backup**, and select your file.

### What happens if I clear my browser cookies and site data?
Clearing browser website data will remove your local IndexedDB database. We strongly recommend exporting a JSON backup before clearing your browser history or cache.

### Why does the indicator say "Storage unavailable"?
This occurs if you are using private browsing/incognito mode in certain browsers with strict privacy settings that block IndexedDB access, or if your browser security settings disable local storage. You can still paste, preview, and print documents normally during your session.
