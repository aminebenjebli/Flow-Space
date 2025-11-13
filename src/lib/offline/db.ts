/**
 * Dexie IndexedDB Database Setup for Offline-First PWA
 *
 * This module defines the offline database schema for Tasks, Projects, Teams,
 * and queued API requests. Uses Dexie.js wrapper for IndexedDB.
 *
 * Features:
 * - Local storage for Tasks, Projects, Teams when offline
 * - Request queue for POST/PUT/DELETE operations
 * - Automatic sync when back online
 * - Optimistic UI updates with offline fallback
 */

import Dexie, { Table } from "dexie";
import { Task } from "@/types/index";
import { Team, Project } from "@/types/team";

// ==================== OFFLINE DATA MODELS ====================

/**
 * Offline Task Model - matches server Task with sync metadata
 */
export interface OfflineTask extends Task {
  _localId?: string; // Local temporary ID for offline-created tasks
  _syncStatus?: SyncStatus; // Sync status: 'synced' | 'pending' | 'failed'
  _lastModified?: number; // Timestamp of last local modification
  _conflictVersion?: number; // Version counter for conflict resolution
}

/**
 * Offline Project Model - matches server Project with sync metadata
 */
export interface OfflineProject
  extends Omit<Project, "createdAt" | "updatedAt"> {
  _localId?: string;
  _syncStatus?: SyncStatus;
  _lastModified?: number;
  _conflictVersion?: number;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Offline Team Model - matches server Team with sync metadata
 */
export interface OfflineTeam extends Omit<Team, "createdAt" | "updatedAt"> {
  _localId?: string;
  _syncStatus?: SyncStatus;
  _lastModified?: number;
  _conflictVersion?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sync Status - tracks whether local data is synced with server
 */
export type SyncStatus = "synced" | "pending" | "failed" | "conflict";

/**
 * Queued Request - stores API requests made while offline
 */
export interface QueuedRequest {
  id?: number; // Auto-incrementing ID
  url: string; // API endpoint
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: any; // Request payload
  headers?: Record<string, string>;
  timestamp: number; // When request was queued
  retryCount: number; // Number of retry attempts
  maxRetries: number; // Maximum retries before giving up
  status: "pending" | "processing" | "failed" | "completed";
  error?: string; // Last error message if failed
  resourceType: "task" | "project" | "team"; // What type of resource
  resourceId?: string; // ID of resource being modified
  localId?: string; // Local temporary ID if newly created
}

/**
 * Sync Metadata - tracks last sync times and status
 */
export interface SyncMetadata {
  key: string; // 'tasks' | 'projects' | 'teams'
  lastSyncTime: number; // Timestamp of last successful sync
  syncInProgress: boolean; // Whether sync is currently running
  lastSyncError?: string; // Last error encountered during sync
}

// ==================== DEXIE DATABASE CLASS ====================

/**
 * FlowSpaceDB - Main offline database using Dexie
 *
 * Stores:
 * - Tasks, Projects, Teams (with offline support)
 * - Queued API requests for background sync
 * - Sync metadata for tracking sync state
 */
class FlowSpaceDB extends Dexie {
  // Define tables
  tasks!: Table<OfflineTask, string>;
  projects!: Table<OfflineProject, string>;
  teams!: Table<OfflineTeam, string>;
  requestQueue!: Table<QueuedRequest, number>;
  syncMetadata!: Table<SyncMetadata, string>;

  constructor() {
    super("FlowSpaceDB");

    // Define database schema
    // Version 1: Initial schema
    this.version(1).stores({
      // Tasks table - indexed by id, status, priority, userId, projectId
      tasks:
        "id, status, priority, userId, projectId, dueDate, _syncStatus, _lastModified",

      // Projects table - indexed by id, ownerId, teamId
      projects: "id, ownerId, teamId, visibility, _syncStatus, _lastModified",

      // Teams table - indexed by id
      teams: "id, _syncStatus, _lastModified",

      // Request queue - auto-increment ID, indexed by status, timestamp
      requestQueue: "++id, status, timestamp, resourceType, resourceId",

      // Sync metadata - keyed by resource type
      syncMetadata: "key",
    });
  }
}

// ==================== DATABASE INSTANCE ====================

/**
 * Singleton database instance
 * Use this throughout the app to access offline storage
 */
export const db = new FlowSpaceDB();

// ==================== HELPER FUNCTIONS ====================

/**
 * Initialize database with default metadata
 * Call this on app startup
 */
export async function initializeDB(): Promise<void> {
  try {
    // Check if metadata already exists
    const tasksMetadata = await db.syncMetadata.get("tasks");
    if (!tasksMetadata) {
      await db.syncMetadata.add({
        key: "tasks",
        lastSyncTime: 0,
        syncInProgress: false,
      });
    }

    const projectsMetadata = await db.syncMetadata.get("projects");
    if (!projectsMetadata) {
      await db.syncMetadata.add({
        key: "projects",
        lastSyncTime: 0,
        syncInProgress: false,
      });
    }

    const teamsMetadata = await db.syncMetadata.get("teams");
    if (!teamsMetadata) {
      await db.syncMetadata.add({
        key: "teams",
        lastSyncTime: 0,
        syncInProgress: false,
      });
    }

    console.log("[OfflineDB] Database initialized successfully");
  } catch (error) {
    console.error("[OfflineDB] Failed to initialize database:", error);
    throw error;
  }
}

/**
 * Clear all offline data (useful for logout)
 */
export async function clearOfflineData(): Promise<void> {
  try {
    await db.tasks.clear();
    await db.projects.clear();
    await db.teams.clear();
    await db.requestQueue.clear();

    // Reset sync metadata
    await db.syncMetadata.put({
      key: "tasks",
      lastSyncTime: 0,
      syncInProgress: false,
    });
    await db.syncMetadata.put({
      key: "projects",
      lastSyncTime: 0,
      syncInProgress: false,
    });
    await db.syncMetadata.put({
      key: "teams",
      lastSyncTime: 0,
      syncInProgress: false,
    });

    console.log("[OfflineDB] All offline data cleared");
  } catch (error) {
    console.error("[OfflineDB] Failed to clear offline data:", error);
    throw error;
  }
}

/**
 * Get database statistics for debugging
 */
export async function getDBStats(): Promise<{
  tasks: number;
  projects: number;
  teams: number;
  queuedRequests: number;
}> {
  try {
    const [tasks, projects, teams, queuedRequests] = await Promise.all([
      db.tasks.count(),
      db.projects.count(),
      db.teams.count(),
      db.requestQueue.where("status").equals("pending").count(),
    ]);

    return { tasks, projects, teams, queuedRequests };
  } catch (error) {
    console.error("[OfflineDB] Failed to get stats:", error);
    return { tasks: 0, projects: 0, teams: 0, queuedRequests: 0 };
  }
}

/**
 * Export all data (useful for debugging/backup)
 */
export async function exportAllData() {
  try {
    const [tasks, projects, teams, queue, metadata] = await Promise.all([
      db.tasks.toArray(),
      db.projects.toArray(),
      db.teams.toArray(),
      db.requestQueue.toArray(),
      db.syncMetadata.toArray(),
    ]);

    return {
      tasks,
      projects,
      teams,
      requestQueue: queue,
      syncMetadata: metadata,
      exportedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[OfflineDB] Failed to export data:", error);
    throw error;
  }
}

/**
 * Generate a temporary local ID for offline-created resources
 */
export function generateLocalId(prefix: string = "local"): string {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 9)}`;
}
