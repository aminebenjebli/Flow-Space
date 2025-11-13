"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/axios";
import { toast } from "react-hot-toast";

interface PointsNotification {
  id: string;
  points: number;
  message: string;
}

export default function PointsDisplay({ userId }: { userId: string }) {
  const [stats, setStats] = useState({
    points: 0,
    level: 1,
    streak: 0,
    pointsToNextLevel: 100,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<PointsNotification[]>([]);

  // Calculate level and points to next level
  const calculateLevelInfo = (points: number) => {
    const level = Math.floor(points / 100) + 1;
    const pointsToNextLevel = 100 - (points % 100);
    return { level, pointsToNextLevel };
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        // Fetch points data from API
        const response = await api.gamification.getStats(userId);

        const levelInfo = calculateLevelInfo(response.totalPoints);
        setStats({
          points: response.totalPoints,
          level: levelInfo.level,
          streak: response.currentStreak,
          pointsToNextLevel: levelInfo.pointsToNextLevel,
        });
      } catch (error: any) {
        // Only log timeout errors, don't show toast for non-critical gamification stats
        if (error.message?.includes("timeout")) {
          console.warn(
            "Stats fetch timeout - this is expected if backend is slow"
          );
        } else {
          console.error("Failed to fetch user stats:", error);
          // Only show toast for non-timeout errors
          toast.error("Failed to load user stats");
        }
        // Set default values on error
        setStats((prev) => ({
          ...prev,
          points: 0,
          level: 1,
          streak: 0,
          pointsToNextLevel: 100,
        }));
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();

    // Poll every 30 seconds to update the points stats
    const intervalId = setInterval(fetchStats, 30000); // 30 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, [userId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center p-2 bg-gray-800 rounded-lg animate-pulse ml-2">
        <div className="h-4 w-20 bg-gray-600 rounded mb-1"></div>
        <div className="h-4 w-16 bg-gray-600 rounded mb-1"></div>
        <div className="h-4 w-16 bg-gray-600 rounded"></div>
      </div>
    );
  }

  const progressPercentage = 100 - (stats.pointsToNextLevel / 100) * 100;

  return (
    <div className="ml-2">
      <div className="flex flex-col items-center p-2 bg-gray-800 rounded-lg text-white relative">
        {/* Points notifications */}
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="absolute -top-8 left-0 right-0 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg z-50"
          >
            {notification.message}
          </div>
        ))}

        <div className="flex items-center space-x-2">
          <span>🏆</span>
          <span className="text-xs font-medium">{stats.points}</span>
        </div>

        <div className="flex items-center mt-1">
          <span className="text-xs mr-1">Lvl {stats.level}</span>
          <div className="w-16 h-2 bg-gray-600 rounded-full ml-1">
            <div
              className="h-full bg-blue-400 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <span className="text-xs ml-1">{stats.pointsToNextLevel}</span>
        </div>

        <div className="text-xs mt-1">🔥 {stats.streak} day streak</div>
      </div>
    </div>
  );
}
