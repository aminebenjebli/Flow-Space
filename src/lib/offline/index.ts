/**
 * Offline Module Exports
 *
 * Central export file for all offline-related functionality.
 * Import from this file for convenience:
 *
 * import { offlineApi, useOffline, OfflineProvider } from '@/lib/offline';
 */

// Database
export {
  db,
  initializeDB,
  clearOfflineData,
  getDBStats,
  exportAllData,
  generateLocalId,
  type OfflineTask,
  type OfflineProject,
  type OfflineTeam,
  type QueuedRequest,
  type SyncMetadata,
  type SyncStatus,
} from "./db";

// API
export {
  offlineApi,
  offlineTasksApi,
  offlineProjectsApi,
  offlineTeamsApi,
  isOnline,
  waitForOnline,
  getPendingRequests,
  clearCompletedRequests,
} from "./api";

// Sync
export {
  syncPendingRequests,
  setupAutoSync,
  getSyncStatus,
  retryFailedRequests,
  onSyncEvent,
  isSyncInProgress,
  abortSync,
  type SyncEvent,
  type SyncEventType,
} from "./sync";
