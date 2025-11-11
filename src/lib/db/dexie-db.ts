/**
 * Dexie-based Offline Database
 *
 * This provides a robust offline storage solution with:
 * - Client-side ID generation for offline-created entities
 * - Sync status tracking for all operations
 * - Conflict detection using version numbers
 * - Proper queue management with auth headers
 */

import Dexie, { Table } from "dexie";
import { v4 as uuidv4 } from "uuid";

// ==================== Entity Types ====================

export type SyncStatus =
  | "pending"
  | "syncing"
  | "synced"
  | "error"
  | "conflict";

export interface TaskEntity {
  // Server ID (set after sync)
  id?: string;

  // Client-generated ID (always present, used for local tracking)
  clientId: string;

  // Task fields
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  assignedTo?: string;
  projectId?: string;
  teamId?: string;
  dueDate?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Sync metadata
  syncStatus: SyncStatus;
  version?: number; // Server version for conflict detection
  lastSyncedAt?: string;

  // Conflict data (if conflict detected)
  conflictData?: {
    local: any;
    server: any;
    detectedAt: string;
  };
}

export interface ProjectEntity {
  id?: string;
  clientId: string;
  name: string;
  description?: string;
  visibility: "PUBLIC" | "PRIVATE";
  teamId?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
  version?: number;
  lastSyncedAt?: string;
}

export interface TeamEntity {
  id?: string;
  clientId: string;
  name: string;
  description?: string;
  members: Array<{
    id: string;
    userId: string;
    name: string;
    email: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
  }>;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
  version?: number;
  lastSyncedAt?: string;
}

// ==================== Sync Queue ====================

export interface SyncQueueItem {
  id: string;

  // Request details
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  body?: any;
  headers?: Record<string, string>;

  // Entity tracking
  entityType: "task" | "project" | "team";
  clientEntityId?: string; // Link to entity's clientId

  // Retry logic
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: string; // For exponential backoff

  // Status
  status: "pending" | "processing" | "completed" | "failed" | "conflict";
  lastError?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ==================== Metadata ====================

export interface AppMetadata {
  key: string;
  value: any;
}

// ==================== Database Class ====================

class FlowSpaceDB extends Dexie {
  // Entity tables
  tasks!: Table<TaskEntity, string>;
  projects!: Table<ProjectEntity, string>;
  teams!: Table<TeamEntity, string>;

  // Sync queue
  syncQueue!: Table<SyncQueueItem, string>;

  // Metadata
  metadata!: Table<AppMetadata, string>;

  constructor() {
    super("FlowSpaceOfflineDB");

    this.version(2).stores({
      // Tasks indexed by clientId (primary), id, and sync fields
      tasks:
        "clientId, id, syncStatus, updatedAt, projectId, teamId, status, priority",

      // Projects
      projects: "clientId, id, syncStatus, updatedAt, teamId, visibility",

      // Teams
      teams: "clientId, id, syncStatus, updatedAt",

      // Sync queue indexed by status, nextAttemptAt for efficient processing
      syncQueue:
        "id, status, nextAttemptAt, entityType, clientEntityId, createdAt",

      // Metadata for app settings
      metadata: "key",
    });
  }
}

// Singleton instance
export const db = new FlowSpaceDB();

// ==================== Helper Functions ====================

/**
 * Generate a new client ID for entities
 */
export function generateClientId(): string {
  return uuidv4();
}

/**
 * Calculate next attempt time using exponential backoff
 */
export function calculateNextAttempt(attempts: number): string {
  const delayMs = Math.min(1000 * Math.pow(2, attempts), 60000); // Max 60s
  return new Date(Date.now() + delayMs).toISOString();
}

/**
 * Check if an entity needs sync
 */
export function needsSync(
  entity: TaskEntity | ProjectEntity | TeamEntity
): boolean {
  return ["pending", "error"].includes(entity.syncStatus);
}

/**
 * Create a new task entity with offline-first defaults
 */
export function createTaskEntity(input: Partial<TaskEntity>): TaskEntity {
  const now = new Date().toISOString();
  return {
    clientId: input.clientId || generateClientId(),
    title: input.title || "",
    description: input.description,
    status: input.status || "TODO",
    priority: input.priority || "MEDIUM",
    assignedTo: input.assignedTo,
    projectId: input.projectId,
    teamId: input.teamId,
    dueDate: input.dueDate,
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
    syncStatus: input.id ? "synced" : "pending",
    version: input.version,
    id: input.id,
  };
}

/**
 * Get app metadata value
 */
export async function getMetadata<T = any>(key: string): Promise<T | null> {
  const item = await db.metadata.get(key);
  return item ? item.value : null;
}

/**
 * Set app metadata value
 */
export async function setMetadata(key: string, value: any): Promise<void> {
  await db.metadata.put({ key, value });
}

/**
 * Get last sync timestamp
 */
export async function getLastSyncTime(): Promise<number> {
  return (await getMetadata<number>("lastSyncTime")) || 0;
}

/**
 * Update last sync timestamp
 */
export async function setLastSyncTime(timestamp: number): Promise<void> {
  await setMetadata("lastSyncTime", timestamp);
}

// ==================== Export Types ====================

export type { Table } from "dexie";
