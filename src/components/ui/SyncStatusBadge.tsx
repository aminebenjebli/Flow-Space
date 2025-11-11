/**
 * Sync Status Badge Component
 *
 * Displays the current sync status of an entity with appropriate
 * icons and colors
 */

import React from "react";
import type { SyncStatus } from "@/lib/db/dexie-db";

interface SyncStatusBadgeProps {
  status: SyncStatus;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export function SyncStatusBadge({
  status,
  showText = true,
  size = "sm",
}: Readonly<SyncStatusBadgeProps>) {
  const config = {
    pending: {
      icon: "⏳",
      text: "Pending",
      className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    },
    syncing: {
      icon: "🔄",
      text: "Syncing",
      className: "bg-blue-100 text-blue-800 border-blue-200",
    },
    synced: {
      icon: "✅",
      text: "Synced",
      className: "bg-green-100 text-green-800 border-green-200",
    },
    error: {
      icon: "❌",
      text: "Error",
      className: "bg-red-100 text-red-800 border-red-200",
    },
    conflict: {
      icon: "⚠️",
      text: "Conflict",
      className: "bg-orange-100 text-orange-800 border-orange-200",
    },
  };

  const { icon, text, className } = config[status] || config.synced;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${className} ${sizeClasses[size]}`}
      title={text}
    >
      <span className="leading-none">{icon}</span>
      {showText && <span>{text}</span>}
    </span>
  );
}

/**
 * Inline sync indicator (minimal version)
 */
export function SyncIndicator({ status }: Readonly<{ status: SyncStatus }>) {
  if (status === "synced") return null; // Don't show anything for synced items

  const config: Record<
    Exclude<SyncStatus, "synced">,
    { icon: string; title: string }
  > = {
    pending: { icon: "⏳", title: "Waiting to sync" },
    syncing: { icon: "🔄", title: "Syncing now" },
    error: { icon: "❌", title: "Sync failed" },
    conflict: { icon: "⚠️", title: "Conflict detected" },
  };

  const { icon, title } = config[status] || { icon: "", title: "" };

  return (
    <span
      className="ml-2 text-lg leading-none"
      title={title}
      aria-label={title}
    >
      {icon}
    </span>
  );
}
