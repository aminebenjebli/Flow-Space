"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Users, UserPlus, Mail, Copy, ChevronDown, Settings } from "lucide-react";

interface MemberActionsProps {
  teamId: string;
  canManageTeam: boolean;
  memberCount: number;
}

export function MemberActions({ teamId, canManageTeam, memberCount }: MemberActionsProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  if (!canManageTeam) {
    return (
      <div className="mt-4">
        <button
          disabled
          className="w-full inline-flex items-center justify-center px-3 py-2 text-xs bg-muted text-muted-foreground border rounded-md cursor-not-allowed"
        >
          <Users className="h-3 w-3 mr-1" />
          {memberCount} Members
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-full inline-flex items-center justify-center px-3 py-2 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
      >
        <UserPlus className="h-3 w-3 mr-1" />
        Member Actions
        <ChevronDown className="h-3 w-3 ml-1" />
      </button>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-10">
          <div className="py-1">
            <Link
              href={`/teams/${teamId}?tab=members&invite=true`}
              className="flex items-center px-3 py-2 text-xs text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => setShowDropdown(false)}
            >
              <Mail className="h-3 w-3 mr-2" />
              Send Email Invitation
            </Link>
            <Link
              href={`/teams/${teamId}?tab=members`}
              className="flex items-center px-3 py-2 text-xs text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => setShowDropdown(false)}
            >
              <Users className="h-3 w-3 mr-2" />
              View All Members
            </Link>
            <Link
              href={`/teams/${teamId}?tab=members`}
              className="flex items-center px-3 py-2 text-xs text-foreground hover:bg-accent hover:text-accent-foreground transition-colors border-t border-border"
              onClick={() => setShowDropdown(false)}
            >
              <Settings className="h-3 w-3 mr-2" />
              Manage Roles
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}