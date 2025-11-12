"use client";

import { io, Socket } from "socket.io-client";
import {
  useAuthStore,
  useTasksStore,
  useNotificationsStore,
} from "@/store/index";
import { useEffect, useRef } from "react";
import { BulkUpdateStatusDto, Task, TaskStatus } from "@/types/index";
import { count } from "console";
import { set } from "zod";

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

    const base = process.env.NEXT_PUBLIC_WS_URL!;
    const socketUrl = `${base}/tasks`; // URL du serveur WebSocket
    this.socket = io(socketUrl, {
      transports: ["websocket"], // Assurer que le transport est WebSocket
      query: { userId: user.id }, // Le backend attend l'ID de l'utilisateur
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
      console.log("Connected to server", this.socket?.id);
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

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

// Crée une instance singleton du service Socket
const socketService = new SocketService();

export default socketService;

// React hook pour gérer la connexion et l'écoute des événements WebSocket
export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { addTask, updateTaskInStore, deleteTask, setTasks } = useTasksStore();
  const { addNotification } = useNotificationsStore();

  useEffect(() => {
    // Connecte-toi au WebSocket
    socketRef.current = socketService.connect();

    if (socketRef.current) {
      // Configure les écouteurs d'événements
      socketService.on("taskAdded", (task) => {
        addTask(task); // Ajouter une tâche au store quand elle est créée
      });

      socketService.on("taskUpdated", (updatedTask) => {
        console.log("Received task update:", updatedTask);
        updateTaskInStore(updatedTask.id, updatedTask); // Mettre à jour la tâche dans le store
      });

      socketService.on("taskDeleted", (deletedTask: Task) => {
        //console.log("Received task deletion:", deletedTask);
        // Ensure the deleted task has a valid id
        if (deletedTask?.id) {
          deleteTask(deletedTask.id); // Remove the task from the store
        }
      });

      socketService.on("notification:new", (notification) => {
        addNotification(notification); // Ajouter une notification au store
      });
      // socket.ts (Frontend)
      socketService.on(
        "bulkUpdateStatus",
        (payload: { count: number; taskIds: string[]; status: TaskStatus }) => {
          console.log("Received bulk update status:", payload);
        }
      );
    }

    // Cleanup à la déconnexion
    return () => {
      if (socketRef.current) {
        socketService.off("taskAdded");
        socketService.off("taskUpdated");
        socketService.off("taskDeleted");
        socketService.off("notification:new");
        socketService.off("bulkUpdateStatus");
      }
    };
  }, [addTask, updateTaskInStore, deleteTask, addNotification, setTasks]);

  return {
    socket: socketRef.current,
    isConnected: socketService.isConnected(),
    emit: socketService.emit.bind(socketService),
    joinTaskRoom: socketService.joinTaskRoom.bind(socketService),
    leaveTaskRoom: socketService.leaveTaskRoom.bind(socketService),
  };
}
