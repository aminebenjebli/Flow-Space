"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/axios";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";

interface LeaderboardEntry {
  userId: string;
  username: string;
  profilePicture?: string;
  totalPoints: number;
  level: number;
  rank: number;
  tasksCompleted: number;
  currentStreak: number;
}

export default function LeaderboardPreview() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        setError(null); // Reset error on each attempt

        // Check if the user has a team
        if (!session?.user?.teamId) {
          setError("You haven't joined a team yet");
          setIsLoading(false);
          return;
        }

        // Fetch leaderboard data based on the team leaderboard endpoint
        const response = await api.gamification.getTeamLeaderboard(session?.user?.teamId || "");
        setLeaderboard(response.entries?.slice(0, 3) || []); // Limit to top 3 entries
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
        toast.error("Failed to load leaderboard data");
        setError("Failed to load leaderboard data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();

    // Poll every 30 seconds to update the leaderboard
    const intervalId = setInterval(fetchLeaderboard, 30000); // 30 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, [session?.user?.teamId]);

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 animate-pulse">
        <div className="h-6 w-32 bg-gray-600 rounded mb-4"></div>
        {[...Array(3)].map((_, index) => (
          <div key={index} className="flex justify-between p-2 mb-2">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 bg-gray-600 rounded-full"></div>
              <div className="h-4 w-24 bg-gray-600 rounded"></div>
            </div>
            <div className="h-4 w-12 bg-gray-600 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 text-white text-center">
        <h3 className="text-lg font-semibold mb-2">Leaderboard</h3>
        <p className="text-sm text-gray-400">{error}</p>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 text-white text-center">
        <h3 className="text-lg font-semibold mb-2">Leaderboard</h3>
        <p className="text-sm text-gray-400">No leaderboard data available</p>
        <p className="text-xs text-gray-500 mt-1">
          Complete tasks to appear on the leaderboard!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 text-white">
      <h3 className="text-lg font-semibold mb-4">🏆 Top Performers</h3>
      <div className="space-y-2">
        {leaderboard.map((entry, index) => (
          <div
            key={entry.userId}
            className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
                  {entry.profilePicture ? (
                    <img
                      src={entry.profilePicture}
                      alt={entry.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-white">
                      {entry.username
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()}
                    </span>
                  )}
                </div>
                {index === 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-xs">
                    👑
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium flex items-center gap-2">
                  <span className="text-gray-400">#{entry.rank}</span>
                  {entry.username}
                </p>
                <p className="text-xs text-gray-400">
                  Level {entry.level} · {entry.tasksCompleted} tasks
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-center space-x-1">
                <span className="text-sm font-bold text-purple-400">
                  {entry.totalPoints}
                </span>
                <span className="text-xs text-gray-400">pts</span>
              </div>
              {entry.currentStreak > 0 && (
                <span className="text-xs text-orange-400">
                  🔥 {entry.currentStreak} day streak
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
