import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";
import { getSession } from "next-auth/react";
import { TaskStatus } from "@/types/index";

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

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8050/api/v1",
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
    // Handle 304 Not Modified responses
    if (response.status === 304) {
      console.log("Received 304 Not Modified, using cached data");
      // For 304 responses, we should use cached data
      // But since we don't have cache here, we'll treat it as an empty response
      // and let the frontend handle it gracefully
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
        // Try to refresh token using NextAuth
        const session = await getSession();
        if (session?.refreshToken) {
          // Call refresh endpoint
          const refreshResponse = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh-token`,
            { refreshToken: session.refreshToken }
          );

          const newTokens = refreshResponse.data;

          // Update session with new tokens (you might need to handle this differently)
          // This is a simplified approach - you might want to use NextAuth's session update
          if (newTokens.accessToken) {
            originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
            return axiosInstance(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        // Redirect to login or handle logout
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

    logout: (refreshToken?: string) =>
      api.post("/auth/logout", { refreshToken }),
  },

  // Task management methods
  tasks: {
    // Get all tasks with optional filtering and pagination
    getAll: (params?: {
      status?: string;
      priority?: string;
      search?: string;
      dueFrom?: string;
      dueUntil?: string;
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

    // Get task by ID
    getById: (id: string) => api.get(`/tasks/${id}`),

    // Create new task
    create: (task: {
      title: string;
      description?: string;
      status?: string;
      priority?: string;
      dueDate?: string;
    }) => api.post("/tasks", task),

    // Update existing task
    update: (
      id: string,
      task: {
        title?: string;
        description?: string;
        status?: string;
        priority?: string;
        dueDate?: string;
      }
    ) => api.patch(`/tasks/${id}`, task),

    // Delete task
    delete: (id: string) => api.delete(`/tasks/${id}`),

    // Get task statistics
    getStats: () => api.get("/tasks/stats"),

    // Bulk update task status
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
            "Content-Type": "multipart/form-data", //or undefined
          },
        })
        .then((res) => res.data),
    removeProfileImage: (userId: string) =>
      api.delete(`/user/${userId}/profile-image`),
  },
};

export default axiosInstance;
