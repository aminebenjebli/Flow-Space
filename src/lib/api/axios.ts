import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";
import { getSession } from "next-auth/react";
import { TaskStatus } from "@/types/index";
import { io } from "socket.io-client";

// Extend Axios types to include _retry
declare module "axios" {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

// Types
export interface ApiResponse<T = any> {
  data: T;
  message: string;
  success: boolean;
  statusCode: number;
}

// Gamification Types
export interface UserStatsResponse {
  id: string;
  userId: string;
  totalPoints: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  tasksCompleted: number;
  lastActiveDate: string;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  profilePicture?: string;
  totalPoints: number;
  level: number;
  rank: number;
  tasksCompleted: number;
  currentStreak: number;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  pointsRewarded: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  teamId: string;
  createdAt: string;
  participantCount?: number;
  userJoined?: boolean;
  userCompleted?: boolean;
}

export interface UserChallenge {
  id: string;
  userId: string;
  challengeId: string;
  challengeName: string;
  challengeDescription: string;
  pointsRewarded: number;
  startDate: string;
  endDate: string;
  joinedAt: string;
  completed: boolean;
  completedAt?: string;
  daysRemaining: number;
  isActive: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointsAwarded: number;
  criteria: string;
  targetValue: number;
  createdAt: string;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: string;
  progress: number;
  notified: boolean;
  achievement: Achievement;
}

export interface PointsHistoryEntry {
  id: string;
  userId: string;
  taskId?: string;
  points: number;
  reason: string;
  createdAt: string;
}

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8050/api/v1", // Correct base URL to include /api/v1
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  },
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const session = await getSession();
      if (session?.accessToken) {
        config.headers.Authorization = `Bearer ${session.accessToken}`;
      }
    } catch (error) {
      console.error("Error getting session:", error);
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(new Error(error.message));
  }
);

// Response interceptor for token refresh
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    if (response.status === 304) {
      console.log("Received 304 Not Modified, using cached data");
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        const session = await getSession();
        if (session?.refreshToken) {
          const refreshResponse = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh-token`,
            { refreshToken: session.refreshToken }
          );
          const newTokens = refreshResponse.data;
          if (newTokens.accessToken) {
            originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
            return axiosInstance(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(new Error(error.message || "An error occurred"));
  }
);

// API methods
export const api = {
  // Generic methods
  get: <T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> =>
    axiosInstance.get(url, config).then((res) => res.data),
  post: <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> =>
    axiosInstance.post(url, data, config).then((res) => res.data),
  put: <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> =>
    axiosInstance.put(url, data, config).then((res) => res.data),
  patch: <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> =>
    axiosInstance.patch(url, data, config).then((res) => res.data),
  delete: <T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> =>
    axiosInstance.delete(url, config).then((res) => res.data),

  // Auth specific methods
  auth: {
    login: (credentials: { email: string; password: string }) =>
      api.post("/auth/sign-in", credentials),
    signup: (userData: { email: string; password: string; name: string }) =>
      api.post("/user", userData),
    verifyOtp: (data: {
      email: string;
      otpCode: string;
      type?: "verify" | "reset";
    }) => api.post("/auth/verify-otp", data),
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      api.patch("/auth/change-password", data),
    forgotPassword: (email: string) => api.post("/auth/forgot", { email }),
    resetPassword: (token: string, password: string) =>
      api.post("/auth/reset", { token, password }),
    refresh: (refreshToken: string) =>
      api.post("/auth/refresh", { refreshToken }),
    logout: (refreshToken?: string) => api.post("/auth/logout", { refreshToken }),
  },

  // Task management methods
  tasks: {
    getAll: (params?: {
      status?: string;
      priority?: string;
      search?: string;
      dueFrom?: string;
      dueUntil?: string;
      projectId?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }
      const queryString = queryParams.toString();
      const url = queryString ? `/tasks?${queryString}` : "/tasks";
      return api.get(url);
    },
    getById: (id: string) => api.get(`/tasks/${id}`),
    create: (task: {
      title: string;
      description?: string;
      status?: string;
      priority?: string;
      dueDate?: string;
      projectId?: string;
    }) => api.post("/tasks", task),
    update: (
      id: string,
      task: {
        title?: string;
        description?: string;
        status?: string;
        priority?: string;
        dueDate?: string;
        projectId?: string;
      }
    ) => api.patch(`/tasks/${id}`, task),
    delete: (id: string) => api.delete(`/tasks/${id}`),
    getStats: () => api.get("/tasks/stats"),
    bulkUpdateStatus: (data: { taskIds: string[]; status: TaskStatus }) => {
      console.log("API: Sending bulk update request:", data);
      return api.patch("/tasks/bulk/status", data);
    },
  },

  // User methods
  users: {
    getProfile: (userId: string) => api.get(`/user/${userId}`),
    updateProfile: (
      userId: string,
      data: { name?: string; email?: string; bio?: string }
    ) => api.patch(`/user/${userId}`, data),
    changePassword: (
      userId: string,
      data: {
        currentPassword: string;
        newPassword: string;
        confirmPassword: string;
      }
    ) => api.patch(`/user/${userId}/change-password`, data),
    uploadProfileImage: (userId: string, formData: FormData) =>
      axiosInstance
        .post(`/user/${userId}/profile-image`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
        .then((res) => res.data),
    removeProfileImage: (userId: string) =>
      api.delete(`/user/${userId}/profile-image`),
  },

  // Gamification methods
  gamification: {
    // User Stats
    getStats: (userId: string): Promise<UserStatsResponse> =>
      axiosInstance
        .get(`/gamification/stats/${userId}`)
        .then((res) => res.data),

  

    getTeamLeaderboard: (
      teamId: string
    ): Promise<{
      teamId: string;
      teamName: string;
      entries: LeaderboardEntry[];
      total: number;
      lastUpdated: string;
    }> =>
      axiosInstance
        .get(`/gamification/leaderboard/team/${teamId}`)
        .then((res) => res.data),

    getUserRank: (
      userId: string
    ): Promise<{
      userId: string;
      globalRank: number;
      totalUsers: number;
      totalPoints: number;
      level: number;
      pointsToNextLevel: number;
    }> =>
      axiosInstance
        .get(`/gamification/leaderboard/rank/${userId}`)
        .then((res) => res.data),

    // Challenges
  createChallenge: (dto: {
    name: string;
    description: string;
    pointsRewarded: number;
    startDate: string;
    endDate: string;
    teamId: string;
    isActive?: boolean;
  }): Promise<Challenge> =>
    axiosInstance
      .post("/gamification/challenges", dto)
      .then((res) => res.data),

    getChallenges: (userId?: string): Promise<Challenge[]> =>
      axiosInstance
        .get("/gamification/challenges", { params: { userId } })
        .then((res) => res.data),

    getUserChallenges: (userId: string): Promise<UserChallenge[]> =>
      axiosInstance
        .get(`/gamification/challenges/user/${userId}`)
        .then((res) => res.data),


    joinChallenge: (
      userId: string,
      challengeId: string
    ): Promise<{
      success: boolean;
      message: string;
      userChallenge: UserChallenge;
    }> =>
      axiosInstance
        .post(`/gamification/challenges/${challengeId}/join/${userId}`)
        .then((res) => res.data),

    completeChallenge: (
      userId: string,
      challengeId: string
    ): Promise<UserChallenge> =>
      axiosInstance
        .post(`/gamification/challenges/${challengeId}/complete/${userId}`)
        .then((res) => res.data),

    // Achievements
    getAchievements: (userId: string): Promise<UserAchievement[]> =>
      axiosInstance
        .get(`/gamification/achievements/user/${userId}`)
        .then((res) => res.data),

    getAllAchievements: (): Promise<Achievement[]> =>
      axiosInstance.get("/gamification/achievements").then((res) => res.data),

    checkAchievements: (userId: string): Promise<UserAchievement[]> =>
      axiosInstance
        .post(`/gamification/achievements/check/${userId}`)
        .then((res) => res.data),

    getUnnotifiedAchievements: (userId: string): Promise<UserAchievement[]> =>
      axiosInstance
        .get(`/gamification/achievements/unnotified/${userId}`)
        .then((res) => res.data),

    markAchievementAsNotified: (
      userId: string,
      achievementId: string
    ): Promise<{ success: boolean }> =>
      axiosInstance
        .post(`/gamification/achievements/notify/${userId}/${achievementId}`)
        .then((res) => res.data),

    // Points
    awardPoints: (
      userId: string,
      points: number,
      reason: string,
      taskId?: string
    ): Promise<any> =>
      axiosInstance
        .post("/gamification/points/award", { userId, points, reason, taskId })
        .then((res) => res.data),

    getPointsHistory: (
      userId: string,
      limit?: number
    ): Promise<{
      history: PointsHistoryEntry[];
      totalPoints: number;
      count: number;
    }> =>
      axiosInstance
        .get(`/gamification/points/history/${userId}`, { params: { limit } })
        .then((res) => res.data),
  },
};

export default axiosInstance;
