"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
  Plus,
  Bell,
  Search,
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

  const stats = [
    {
      title: "Total Tasks",
      value: "24",
      change: "+12%",
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    {
      title: "In Progress",
      value: "8",
      change: "+5%",
      icon: Clock,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      title: "Team Members",
      value: "12",
      change: "+2",
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
    {
      title: "Productivity",
      value: "89%",
      change: "+7%",
      icon: TrendingUp,
      color: "text-orange-600",
      bg: "bg-orange-100",
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
              <ThemeToggle />
              <button className="relative p-2 text-foreground hover:text-primary transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full text-xs text-destructive-foreground flex items-center justify-center">
                  3
                </span>
              </button>
              <button
                onClick={() => router.push("/profile")}
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <div className="w-8 h-8 flow-gradient-secondary rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {session.user?.firstName?.[0]}
                    {session.user?.lastName?.[0]}
                  </span>
                </div>
                <span className="font-medium text-foreground">
                  {session.user?.firstName} {session.user?.lastName}
                </span>
              </button>
            </div>
          </div>
        </div>
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
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.title}
                className="bg-card rounded-xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow"
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
          <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">
                Recent Tasks
              </h3>
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>
            <div className="space-y-4">
              {[
                {
                  id: 1,
                  title: "Design new landing page",
                  status: "In Progress",
                  priority: "High",
                },
                {
                  id: 2,
                  title: "Fix authentication bug",
                  status: "To Do",
                  priority: "Medium",
                },
                {
                  id: 3,
                  title: "Update documentation",
                  status: "Completed",
                  priority: "Low",
                },
                {
                  id: 4,
                  title: "Review code changes",
                  status: "In Progress",
                  priority: "High",
                },
              ].map((task) => {
                const getStatusColor = (status: string) => {
                  if (status === "Completed") return "bg-green-500";
                  if (status === "In Progress") return "bg-blue-500";
                  return "bg-gray-400";
                };

                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-secondary/50 dark:bg-secondary rounded-lg hover:bg-secondary/70 dark:hover:bg-secondary/80 transition-colors"
                  >
                    <div>
                      <h4 className="font-medium text-foreground">
                        {task.title}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {task.status} • {task.priority} Priority
                      </p>
                    </div>
                    <div
                      className={`w-3 h-3 rounded-full ${getStatusColor(
                        task.status
                      )}`}
                    ></div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Team Activity */}
          <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
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
