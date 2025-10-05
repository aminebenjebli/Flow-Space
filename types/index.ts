import { User as NextAuthUser } from "next-auth";

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role?: string;
      emailVerified?: boolean;
    } & NextAuthUser;
  }

  interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role?: string;
    emailVerified?: boolean;
    accessToken?: string;
    refreshToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role?: string;
      emailVerified?: boolean;
    };
  }
}

// App-specific types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
  emailVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
  assigneeId?: string;
  assignee?: User;
  creatorId: string;
  creator: User;
  dueDate?: string;
  tags?: string[];
  projectId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  owner: User;
  members: User[];
  tasks: Task[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority: Task["priority"];
  assigneeId?: string;
  dueDate?: string;
  tags?: string[];
  projectId?: string;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  status?: Task["status"];
}

// API Response types
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

// Socket.io events
export interface SocketEvents {
  // Task events
  "task:created": Task;
  "task:updated": Task;
  "task:deleted": { id: string };
  "task:assigned": { taskId: string; assigneeId: string };

  // User events
  "user:online": { userId: string };
  "user:offline": { userId: string };

  // Notification events
  "notification:new": Notification;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormState {
  isLoading: boolean;
  errors: ValidationError[];
  success: boolean;
}
