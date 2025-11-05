"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { useProfile } from "@/contexts/profile-context";
import { useTask, TaskProvider } from "@/contexts/task-context";
import { api } from "@/lib/api/axios";
import { formatDistanceToNow } from "date-fns";
import { toast } from "react-hot-toast";
import PWAInstallButton from "@/components/pwa/install-button";
import {
  CheckCircle,
  Clock,
  TrendingUp,
  Plus,
  Bell,
  Search,
  User,
  BarChart3,
  LogOut,
  ChevronDown,
  Settings,
  Menu,
  X,
} from "lucide-react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // Still loading
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

function DashboardContent({ session }: { readonly session: any }) {
  const router = useRouter();
  const { profile, fetchProfile } = useProfile();
  const { tasks, stats: taskStats, fetchTasks, fetchStats } = useTask();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile(session.user.id);
      fetchTasks();
      fetchStats();
    }
  }, [session?.user?.id, fetchProfile, fetchTasks, fetchStats]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      // Call backend logout API to blacklist the refresh token
      if (session?.refreshToken) {
        await api.auth.logout(session.refreshToken);
      }

      // Clear local session using NextAuth
      await signOut({
        callbackUrl: "/login",
        redirect: true,
      });

      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Error during logout, but session will be cleared");

      // Even if backend logout fails, clear the local session
      await signOut({
        callbackUrl: "/login",
        redirect: true,
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Get recent tasks (last 5)
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
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 flow-gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground">FlowSpace</h1>

              {/* Enhanced Navigation */}
              <nav className="hidden md:flex items-center space-x-1 ml-8">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-all duration-200 border border-primary/20"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => router.push("/tasks")}
                  className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-200"
                >
                  Tasks
                </button>
                <button
                  onClick={() => router.push("/teams")}
                  className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-200"
                >
                  Teams
                </button>
                <button
                  onClick={() => router.push("/analytics")}
                  className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-200"
                >
                  Analytics
                </button>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  className="pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground placeholder:text-muted-foreground transition-colors"
                />
              </div>
              {/* PWA Install Button */}
              <div className="hidden sm:block">
                <PWAInstallButton />
              </div>
              <ThemeToggle />
              {/* Mobile menu button */}
              <div className="sm:hidden">
                <button
                  aria-label="Toggle menu"
                  onClick={() => setMobileMenuOpen((v) => !v)}
                  className="p-2 rounded-md"
                >
                  {mobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </button>
              </div>
              <button className="relative p-2 text-foreground hover:text-primary transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full text-xs text-destructive-foreground flex items-center justify-center">
                  3
                </span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                      {profile?.profilePicture ? (
                        <img
                          src={profile.profilePicture}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flow-gradient-secondary rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                    <span className="font-medium text-foreground">
                      {profile?.name || session.user?.firstName}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {profile?.name || session.user?.firstName}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {session.user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => router.push("/profile")}
                    className="cursor-pointer"
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/settings")}
                    className="cursor-pointer"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                    disabled={isLoggingOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        {/* Mobile menu content */}
        {mobileMenuOpen && (
          <div className="sm:hidden px-6 pb-4">
            <div className="flex flex-col gap-2">
              <button
                onClick={() => router.push("/dashboard")}
                className="text-left px-3 py-2 rounded hover:bg-primary/10"
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push("/tasks")}
                className="text-left px-3 py-2 rounded hover:bg-primary/10"
              >
                Tasks
              </button>
              <button
                onClick={() => router.push("/teams")}
                className="text-left px-3 py-2 rounded hover:bg-primary/10"
              >
                Teams
              </button>
              <button
                onClick={() => router.push("/analytics")}
                className="text-left px-3 py-2 rounded hover:bg-primary/10"
              >
                Analytics
              </button>
            </div>
          </div>
        )}
      </header>

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
              {[
                {
                  id: 1,
                  user: "Sarah Chen",
                  action: "completed",
                  task: "User authentication flow",
                  time: "2 hours ago",
                },
                {
                  id: 2,
                  user: "Mike Johnson",
                  action: "created",
                  task: "Database optimization task",
                  time: "4 hours ago",
                },
                {
                  id: 3,
                  user: "Anna Davis",
                  action: "commented on",
                  task: "API documentation",
                  time: "6 hours ago",
                },
                {
                  id: 4,
                  user: "Tom Wilson",
                  action: "assigned",
                  task: "Mobile app testing",
                  time: "1 day ago",
                },
              ].map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="w-8 h-8 flow-gradient-secondary rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {activity.user
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{activity.user}</span>{" "}
                      {activity.action}{" "}
                      <span className="font-medium">{activity.task}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.time}
                    </p>
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
