"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/axios";
import { toast } from "react-hot-toast";
import { Button } from "../ui/button";

interface Challenge {
  id: string;
  name: string;
  description: string;
  pointsRewarded: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  participantCount?: number;
  userJoined?: boolean;
  userCompleted?: boolean;
}

interface ChallengeWithStatus extends Challenge {
  daysRemaining?: number;
}

export default function ChallengesBanner({ userId }: { userId: string }) {
  const [challenges, setChallenges] = useState<ChallengeWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        setIsLoading(true);

        const allChallenges = await api.gamification.getChallenges();
        const now = new Date();
        const challengesWithStatus: ChallengeWithStatus[] = allChallenges.map((challenge) => {
          const endDate = new Date(challenge.endDate);
          const daysRemaining = Math.max(0, Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

          return {
            ...challenge,
            daysRemaining: challenge.isActive ? daysRemaining : undefined,
          };
        });

        setChallenges(challengesWithStatus);
      } catch (error) {
        console.error("Failed to fetch challenges:", error);
        toast.error("Failed to load challenges");
      } finally {
        setIsLoading(false);
      }
    };

    fetchChallenges();

    // Poll every 30 seconds to update the challenges list
    const intervalId = setInterval(fetchChallenges, 30000); // 30 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, [userId]);

  const joinChallenge = async (challengeId: string) => {
    try {
      const response = await api.gamification.joinChallenge(userId, challengeId);
      
      if (response.success) {
        toast.success("Successfully joined the challenge!");

        setChallenges((prev) =>
          prev.map((challenge) =>
            challenge.id === challengeId ? { ...challenge, userJoined: true } : challenge
          )
        );
      } else {
        toast.error(response.message || "Failed to join challenge");
      }
    } catch (error: any) {
      console.error("Failed to join challenge:", error);
      const message = error.response?.data?.message || "Failed to join the challenge";
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 animate-pulse">
        <div className="h-6 w-32 bg-gray-600 rounded mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, index) => (
            <div key={index} className="h-20 bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const activeChallenges = challenges.filter((challenge) => challenge.isActive);

  if (activeChallenges.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-4 text-white mb-8">
      <h3 className="text-lg font-semibold mb-4">Active Challenges</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeChallenges.map((challenge) => (
          <div key={challenge.id} className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium">🎯 {challenge.name}</p>
              {challenge.daysRemaining !== undefined && (
                <span className="text-sm bg-blue-900/50 px-2 py-0.5 rounded">
                  {challenge.daysRemaining} days left
                </span>
              )}
            </div>
            <p className="text-sm text-gray-300 mb-3">{challenge.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-sm">Reward: {challenge.pointsRewarded} pts</span>
              {challenge.userJoined ? (
                <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled>
                  Joined ✓
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="bg-white text-blue-600 hover:bg-gray-200"
                  onClick={() => joinChallenge(challenge.id)}
                >
                  Join Challenge
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
