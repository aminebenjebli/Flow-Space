"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/axios";
import { toast } from "react-hot-toast";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  unlocked?: boolean;
}

export default function AchievementsTab({ userId }: { userId: string }) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        setIsLoading(true);
        const userAchievements = await api.gamification.getAchievements(userId);

        const mappedAchievements: Achievement[] = userAchievements.map(
          (achievement) => ({
            id: achievement.id,
            name: achievement.achievement.name,
            description: achievement.achievement.description,
            icon: achievement.achievement.icon,
            progress: achievement.progress,
            target: achievement.achievement.targetValue,
            unlocked:
              achievement.progress >= achievement.achievement.targetValue,
          })
        );

        setAchievements(mappedAchievements);
      } catch (error: any) {
        // Only log timeout errors silently, don't show toast for non-critical achievements
        if (error.message?.includes("timeout")) {
          console.warn(
            "Achievements fetch timeout - this is expected if backend is slow"
          );
        } else {
          console.error("Failed to fetch achievements:", error);
          // Only show toast for non-timeout errors
          toast.error("Failed to load achievements");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAchievements();

    // Set up polling every 30 seconds to update the achievements progress
    const intervalId = setInterval(fetchAchievements, 30000); // 30 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, [userId]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4 p-4 animate-pulse">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="p-4 bg-gray-800 rounded-lg">
            <div className="h-4 w-24 bg-gray-600 rounded mb-2"></div>
            <div className="h-3 w-full bg-gray-600 rounded mb-2"></div>
            <div className="h-3 w-20 bg-gray-600 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <div className="p-4 text-gray-400 text-center">
        <p className="mb-2">No achievements yet</p>
        <p className="text-sm">
          Complete tasks to earn achievements and level up!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {achievements.map((achievement) => (
        <div
          key={achievement.id}
          className={`p-4 rounded-lg text-white ${
            achievement.unlocked
              ? "bg-gradient-to-r from-purple-600 to-blue-500"
              : "bg-gray-800"
          }`}
        >
          <div className="flex items-center mb-2">
            <span className="mr-2 text-2xl">{achievement.icon}</span>
            <p className="font-medium">{achievement.name}</p>
            {achievement.unlocked && (
              <span className="ml-auto bg-yellow-500 text-xs px-2 py-0.5 rounded-full">
                Unlocked!
              </span>
            )}
          </div>
          <p className="text-sm text-gray-300 mb-3">
            {achievement.description}
          </p>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                achievement.unlocked ? "bg-green-500" : "bg-blue-500"
              }`}
              style={{
                width: `${Math.min(
                  (achievement.progress / achievement.target) * 100,
                  100
                )}%`,
              }}
            ></div>
          </div>
          <p className="text-xs text-gray-400">
            {achievement.progress}/{achievement.target}
          </p>
        </div>
      ))}
    </div>
  );
}
