/**
 * TypeScript Declaration File for Offline Module
 * Helps TypeScript understand Dexie types and offline interfaces
 */

declare module "@/lib/offline/db" {
  import { Task } from "@/types";
  import { Team, Project } from "@/types/team";

  export type SyncStatus = "synced" | "pending" | "failed" | "conflict";

  export interface OfflineTask extends Task {
    _localId?: string;
    _syncStatus?: SyncStatus;
    _lastModified?: number;
    _conflictVersion?: number;
  }

  export interface OfflineProject
    extends Omit<Project, "createdAt" | "updatedAt"> {
    _localId?: string;
    _syncStatus?: SyncStatus;
    _lastModified?: number;
    _conflictVersion?: number;
    createdAt: string;
    updatedAt?: string;
  }

  export interface OfflineTeam extends Omit<Team, "createdAt" | "updatedAt"> {
    _localId?: string;
    _syncStatus?: SyncStatus;
    _lastModified?: number;
    _conflictVersion?: number;
    createdAt: string;
    updatedAt: string;
  }

  export interface QueuedRequest {
    id?: number;
    url: string;
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: any;
    headers?: Record<string, string>;
    timestamp: number;
    retryCount: number;
    maxRetries: number;
    status: "pending" | "processing" | "failed" | "completed";
    error?: string;
    resourceType: "task" | "project" | "team";
    resourceId?: string;
    localId?: string;
  }

  export interface SyncMetadata {
    key: string;
    lastSyncTime: number;
    syncInProgress: boolean;
    lastSyncError?: string;
  }

  export const db: any;
  export function initializeDB(): Promise<void>;
  export function clearOfflineData(): Promise<void>;
  export function getDBStats(): Promise<{
    tasks: number;
    projects: number;
    teams: number;
    queuedRequests: number;
  }>;
  export function exportAllData(): Promise<any>;
  export function generateLocalId(prefix?: string): string;
}
