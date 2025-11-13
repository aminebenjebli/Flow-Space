"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useProfile } from "@/contexts/profile-context";
import { ProfilePicture } from "@/components/profile/profile-picture";
import { PersonalInfoForm } from "@/components/profile/personal-info-form";
import { PasswordChangeForm } from "@/components/profile/password-change-form";

// Gamification Components
import LeaderboardPreview from "@/components/gamification/LeaderboardPreview";
import PointsDisplay from "@/components/gamification/PointsDisplay";
import AchievementsTab from "@/components/gamification/AchievementsTab";
import ChallengesBanner from "@/components/gamification/ChallengesBanner";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
  bio?: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { profile, isLoading, fetchProfile, updateProfile } = useProfile();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && session?.user?.id) {
      fetchProfile(session.user.id);
    }
  }, [status, session?.user?.id, router, fetchProfile]);

  const handleUserUpdate = (updatedData: Partial<UserProfile>) => {
    updateProfile(updatedData);
  };

  const handleImageUpdate = (imageUrl: string | undefined) => {
    updateProfile({ profilePicture: imageUrl });
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-card-foreground">Failed to load profile</p>
          <p className="text-sm text-muted-foreground mt-1">
            Please try refreshing the page
          </p>
        </div>
      </div>
    );
  }

  // Ensure session and session.user are not null before accessing userId
  const userId = session?.user?.id;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-card-foreground mb-2">
              Profile Settings
            </h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>

          <div className="space-y-8">
            {/* Profile Picture Section */}
            <ProfilePicture user={profile} onImageUpdate={handleImageUpdate} />

            {/* Personal Information Section */}
            <PersonalInfoForm user={profile} onUpdate={handleUserUpdate} />

            {/* Password Section */}
            <PasswordChangeForm />

            {/* Gamification Sections */}
            {userId && (
              <>
                <PointsDisplay userId={userId} /> {/* Show points */}
                <LeaderboardPreview /> {/* Show leaderboard */}
                <AchievementsTab userId={userId} /> {/* Show achievements */}
                <ChallengesBanner userId={userId} /> {/* Show challenges banner */}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
