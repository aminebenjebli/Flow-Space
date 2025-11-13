"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/contexts/profile-context";
import { useTask, TaskProvider } from "@/contexts/task-context";
import { api, Challenge } from "@/lib/api/axios";
import { formatDistanceToNow } from "date-fns";
import { toast } from "react-hot-toast";
import {
  CheckCircle,
  Clock,
  TrendingUp,
  Plus,
  BarChart3,
  Trophy,
  Calendar,
} from "lucide-react";

// Import Gamification Components
import LeaderboardPreview from "@/components/gamification/LeaderboardPreview";
import PointsDisplay from "@/components/gamification/PointsDisplay";
import AchievementsTab from "@/components/gamification/AchievementsTab";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.push("/login");
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  if (!session) {
    return null;
  }
  return (
    <TaskProvider>
      <DashboardContent session={session} />
    </TaskProvider>
  );
}

function ChallengesBanner({ userId }: { userId: string }) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userTeams, setUserTeams] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch user's teams
        const teamsResponse = await api.get("/teams/mine");
        setUserTeams(teamsResponse.data || []);

        // Fetch challenges for the user
        const challengesResponse = await api.gamification.getChallenges(userId);
        setChallenges(challengesResponse || []);
      } catch (err) {
        console.error("Error fetching challenges:", err);
        setError("Failed to load challenges");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const handleJoinChallenge = async (challengeId: string) => {
    try {
      const response = await api.gamification.joinChallenge(
        userId,
        challengeId
      );
      toast.success(response.message);
      // Refresh challenges
      const updatedChallenges = await api.gamification.getChallenges(userId);
      setChallenges(updatedChallenges || []);
    } catch (err) {
      console.error("Error joining challenge:", err);
      toast.error("Failed to join challenge");
    }
  };

  const isUserOwnerOfChallenge = (challenge: Challenge) => {
    const team = userTeams.find((t) => t.id === challenge.teamId);
    return team?.members?.some(
      (member: any) => member.userId === userId && member.role === "OWNER"
    );
  };

  if (loading) {
    return (
      <div className="flow-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Active Challenges
        </h3>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flow-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Active Challenges
        </h3>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="flow-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Active Challenges
        </h3>
        <div className="text-center py-8 text-muted-foreground">
          <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No active challenges</p>
          <p className="text-xs mt-1">Check back later for new challenges!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flow-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Active Challenges
      </h3>
      <div className="space-y-4">
        {challenges.map((challenge) => {
          const isOwner = isUserOwnerOfChallenge(challenge);
          const daysRemaining = Math.ceil(
            (new Date(challenge.endDate).getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24)
          );

          return (
            <div
              key={challenge.id}
              className="p-4 border border-border rounded-lg bg-muted/30"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-card-foreground">
                    {challenge.name}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {challenge.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-md text-xs">
                    <Trophy className="h-3 w-3" />
                    <span>{challenge.pointsRewarded} pts</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {new Date(challenge.startDate).toLocaleDateString()} to{" "}
                    {new Date(challenge.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span>
                    {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left
                  </span>
                </div>
              </div>
              {!isOwner && !challenge.userJoined && (
                <Button
                  size="sm"
                  className="mt-3 w-full bg-primary hover:bg-primary/90"
                  onClick={() => handleJoinChallenge(challenge.id)}
                >
                  Join Challenge
                </Button>
              )}
              {challenge.userJoined && (
                <div className="mt-3 text-center text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                  Joined ✓
                </div>
              )}
              {isOwner && (
                <div className="mt-3 text-center text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                  You created this challenge
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DashboardContent({ session }: { readonly session: any }) {
  const router = useRouter();
  const { fetchProfile } = useProfile();
  const { tasks, stats: taskStats, fetchTasks, fetchStats } = useTask();

  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile(session.user.id);
      fetchTasks();
      fetchStats();
    }
  }, [session?.user?.id, fetchProfile, fetchTasks, fetchStats]);

  const recentTasks = tasks.slice(0, 5);

  const statsData = [
    {
      title: "Total Tasks",
      value: taskStats?.total?.toString() || "0",
      change: "+12%",
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-100 dark:bg-green-900/20",
    },
    {
      title: "In Progress",
      value: taskStats?.inProgress?.toString() || "0",
      change: "+5%",
      icon: Clock,
      color: "text-blue-600",
      bg: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      title: "Completed",
      value: taskStats?.done?.toString() || "0",
      change: "+2",
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-100 dark:bg-purple-900/20",
    },
    {
      title: "Productivity",
      value: taskStats?.total
        ? `${Math.round((taskStats.done / taskStats.total) * 100)}%`
        : "0%",
      change: "+7%",
      icon: BarChart3,
      color: "text-orange-600",
      bg: "bg-orange-100 dark:bg-orange-900/20",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {session.user?.firstName}! 👋
          </h2>
          <p className="text-muted-foreground">
            Here's what's happening with your projects today.
          </p>
        </div>
        {/* Gamification Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Points Display */}
          <PointsDisplay userId={session.user.id} />
          {/* Leaderboard Preview */}
          <LeaderboardPreview />
          {/* Achievements Tab */}
          <AchievementsTab userId={session.user.id} />
          {/* Challenges Banner */}
          <ChallengesBanner userId={session.user.id} />
        </div>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsData.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.title}
                className="flow-card p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center`}
                  >
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-muted-foreground text-sm font-medium mb-1">
                  {stat.title}
                </h3>
                <p className="text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>
        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Tasks */}
          <div className="flow-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">
                Recent Tasks
              </h3>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={() => router.push("/tasks")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>
            <div className="space-y-4">
              {recentTasks.length > 0 ? (
                recentTasks.map((task) => {
                  const getStatusColor = (status: string) => {
                    if (status === "DONE") return "bg-green-500";
                    if (status === "IN_PROGRESS") return "bg-blue-500";
                    if (status === "TODO") return "bg-gray-400";
                    return "bg-red-500";
                  };
                  const getStatusText = (status: string) => {
                    if (status === "DONE") return "Completed";
                    if (status === "IN_PROGRESS") return "In Progress";
                    if (status === "TODO") return "To Do";
                    return "Cancelled";
                  };
                  const getPriorityText = (priority: string) => {
                    return priority.charAt(0) + priority.slice(1).toLowerCase();
                  };
                  return (
                    <button
                      key={task.id}
                      className="w-full flex items-center justify-between p-3 bg-secondary/50 dark:bg-secondary/20 rounded-lg hover:bg-secondary/70 dark:hover:bg-secondary/30 transition-colors text-left"
                      onClick={() => router.push("/tasks")}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground line-clamp-1">
                          {task.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {getStatusText(task.status)} •{" "}
                          {getPriorityText(task.priority)} Priority
                          {task.dueDate && (
                            <span className="ml-1">
                              • Due{" "}
                              {formatDistanceToNow(new Date(task.dueDate), {
                                addSuffix: true,
                              })}
                            </span>
                          )}
                        </p>
                      </div>
                      <div
                        className={`w-3 h-3 rounded-full ${getStatusColor(
                          task.status
                        )}`}
                      ></div>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No tasks yet</p>
                  <p className="text-xs mt-1">
                    Create your first task to get started
                  </p>
                </div>
              )}
            </div>
          </div>
          {/* Team Activity */}
          <div className="flow-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">
              Team Activity
            </h3>
            <div className="space-y-4">
              {[...Array(4)].map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-8 h-8 flow-gradient-secondary rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">S</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">User</span> completed task
                    </p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Coming Soon Section */}
        <div className="mt-8 flow-gradient-primary rounded-xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-4">
            More Features Coming Soon!
          </h3>
          <p className="text-white/90 mb-6">
            We're working on drag-and-drop task boards, real-time collaboration,
            AI-powered insights, and much more.
          </p>
          <Button
            variant="secondary"
            className="bg-white text-primary hover:bg-white/90 border-0"
          >
            Stay Updated
          </Button>
        </div>
      </main>
    </div>
  );
}
