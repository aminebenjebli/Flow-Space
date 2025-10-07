import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";
import { getSession } from "next-auth/react";

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

    forgotPassword: (email: string) => api.post("/auth/forgot", { email }),

    resetPassword: (token: string, password: string) =>
      api.post("/auth/reset", { token, password }),

    refresh: (refreshToken: string) =>
      api.post("/auth/refresh", { refreshToken }),
  },

  // Future task methods
  tasks: {
    getAll: () => api.get("/tasks"),
    getById: (id: string) => api.get(`/tasks/${id}`),
    create: (task: any) => api.post("/tasks", task),
    update: (id: string, task: any) => api.put(`/tasks/${id}`, task),
    delete: (id: string) => api.delete(`/tasks/${id}`),
  },

  // Future user methods
  users: {
    getProfile: () => api.get("/user/profile"),
    updateProfile: (data: any) => api.put("/user/profile", data),
  },
};

export default axiosInstance;
