import { io, Socket } from "socket.io-client";
import {
  useAuthStore,
  useTasksStore,
  useNotificationsStore,
} from "@/store/index";

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    const { user } = useAuthStore.getState();
    if (!user) {
      console.log("No user found, skipping socket connection");
      return null;
    }

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || "http://127.0.0.1:8050";

    this.socket = io(socketUrl, {
      auth: {
        token: user.id, // You might want to use a proper JWT token here
      },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventListeners();
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("Connected to server");
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Disconnected from server:", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error("Max reconnection attempts reached");
        this.disconnect();
      }
    });

    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  }

  // Event emission methods
  emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn("Socket not connected, cannot emit event:", event);
    }
  }

  // Event subscription methods
  on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Task-specific methods
  joinTaskRoom(taskId: string) {
    this.emit("join-task-room", { taskId });
  }

  leaveTaskRoom(taskId: string) {
    this.emit("leave-task-room", { taskId });
  }

  // Project-specific methods
  joinProjectRoom(projectId: string) {
    this.emit("join-project-room", { projectId });
  }

  leaveProjectRoom(projectId: string) {
    this.emit("leave-project-room", { projectId });
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;

// React hook for socket management
import { useEffect, useRef } from "react";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { addTask, updateTask, deleteTask } = useTasksStore();
  const { addNotification } = useNotificationsStore();

  useEffect(() => {
    // Connect to socket
    socketRef.current = socketService.connect();

    if (socketRef.current) {
      // Set up task event listeners
      socketService.on("task:created", (task) => {
        addTask(task);
      });

      socketService.on("task:updated", (task) => {
        updateTask(task.id, task);
      });

      socketService.on("task:deleted", ({ id }) => {
        deleteTask(id);
      });

      socketService.on("notification:new", (notification) => {
        addNotification(notification);
      });
    }

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketService.off("task:created");
        socketService.off("task:updated");
        socketService.off("task:deleted");
        socketService.off("notification:new");
      }
    };
  }, [addTask, updateTask, deleteTask, addNotification]);

  return {
    socket: socketRef.current,
    isConnected: socketService.isConnected(),
    emit: socketService.emit.bind(socketService),
    joinTaskRoom: socketService.joinTaskRoom.bind(socketService),
    leaveTaskRoom: socketService.leaveTaskRoom.bind(socketService),
    joinProjectRoom: socketService.joinProjectRoom.bind(socketService),
    leaveProjectRoom: socketService.leaveProjectRoom.bind(socketService),
  };
}
