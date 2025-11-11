"use client";

import { useState, useEffect } from "react";

interface ClientDateProps {
  date: Date | string;
  format?: "date" | "datetime" | "time";
  className?: string;
}

/**
 * Client-only date formatter to prevent hydration mismatches
 * Renders nothing on server, then shows formatted date on client
 */
export function ClientDate({
  date,
  format = "date",
  className,
}: ClientDateProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder that matches the expected layout to prevent layout shift
    return <span className={className}>Loading...</span>;
  }

  const dateObj = typeof date === "string" ? new Date(date) : date;

  let formattedDate: string;
  switch (format) {
    case "datetime":
      formattedDate = dateObj.toLocaleString();
      break;
    case "time":
      formattedDate = dateObj.toLocaleTimeString();
      break;
    case "date":
    default:
      formattedDate = dateObj.toLocaleDateString();
      break;
  }

  return <span className={className}>{formattedDate}</span>;
}
