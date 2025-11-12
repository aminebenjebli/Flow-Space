"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { api } from "@/lib/api/axios";
import { toast } from "react-hot-toast";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
  bio?: string;
}  

interface ProfileContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  fetchProfile: (userId: string, forceRefresh?: boolean) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => void;
  clearCache: () => void;
  lastFetched: number | null;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const CACHE_KEY = "user_profile_cache";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

interface CacheData {
  profile: UserProfile;
  timestamp: number;
  userId: string;
}

export function ProfileProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  // Load from cache on mount
  useEffect(() => {
    loadFromCache();
  }, []);

  const loadFromCache = useCallback(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const cacheData: CacheData = JSON.parse(cached);
        const now = Date.now();

        // Check if cache is still valid
        if (now - cacheData.timestamp < CACHE_DURATION) {
          setProfile(cacheData.profile);
          setLastFetched(cacheData.timestamp);
          console.log("Profile loaded from cache");
          return;
        } else {
          // Cache expired, remove it
          localStorage.removeItem(CACHE_KEY);
          console.log("Profile cache expired, removed");
        }
      }
    } catch (error) {
      console.error("Error loading profile from cache:", error);
      localStorage.removeItem(CACHE_KEY);
    }
  }, []);

  const saveToCache = useCallback(
    (profileData: UserProfile, userId: string) => {
      try {
        const cacheData: CacheData = {
          profile: profileData,
          timestamp: Date.now(),
          userId,
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        setLastFetched(cacheData.timestamp);
        console.log("Profile saved to cache");
      } catch (error) {
        console.error("Error saving profile to cache:", error);
      }
    },
    []
  );

  const fetchProfile = useCallback(
    async (userId: string, forceRefresh = false) => {
      // If we have cached data and not forcing refresh, return early
      if (profile && !forceRefresh && lastFetched) {
        const now = Date.now();
        if (now - lastFetched < CACHE_DURATION) {
          console.log("Using cached profile data");
          return;
        }
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log("Fetching profile from API...");
        const response = await api.users.getProfile(userId);
        const userData = response.data || response;

        setProfile(userData);
        saveToCache(userData, userId);
        setError(null);
      } catch (error: any) {
        console.error("Failed to fetch profile:", error);
        const errorMessage =
          error.response?.data?.message || "Failed to load profile data";
        setError(errorMessage);

        // If API fails but we have cached data, keep using it
        if (!profile) {
          toast.error(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [profile, lastFetched, saveToCache]
  );

  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      if (profile) {
        const updatedProfile = { ...profile, ...updates };
        setProfile(updatedProfile);

        // Update cache with new data
        try {
          const cached = localStorage.getItem(CACHE_KEY);
          if (cached) {
            const cacheData: CacheData = JSON.parse(cached);
            cacheData.profile = updatedProfile;
            cacheData.timestamp = Date.now(); // Update timestamp for fresh data
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
            setLastFetched(cacheData.timestamp);
            console.log("Profile cache updated with new data");
          }
        } catch (error) {
          console.error("Error updating profile cache:", error);
        }
      }
    },
    [profile]
  );

  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    setProfile(null);
    setLastFetched(null);
    setError(null);
    console.log("Profile cache cleared");
  }, []);

  const value: ProfileContextType = useMemo(
    () => ({
      profile,
      isLoading,
      error,
      fetchProfile,
      updateProfile,
      clearCache,
      lastFetched,
    }),
    [
      profile,
      isLoading,
      error,
      fetchProfile,
      updateProfile,
      clearCache,
      lastFetched,
    ]
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
