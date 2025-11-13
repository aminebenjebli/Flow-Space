"use client";

import { io, Socket } from "socket.io-client";
import { useNotificationsStore } from "@/store/index";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  connect(userId?: string) {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (!userId) {
      console.log("No user ID provided, skipping socket connection");
      return null;
    }

    const base = process.env.NEXT_PUBLIC_WS_URL!;
    const socketUrl = `${base}/tasks`; // URL du serveur WebSocket
    this.socket = io(socketUrl, {
      transports: ["websocket"], // Assurer que le transport est WebSocket
      query: { userId }, // Le backend attend l'ID de l'utilisateur
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
      console.log(`[SocketService] Registering listener for event: ${event}`);
      this.socket.on(event, callback);
    } else {
      console.warn(
        `[SocketService] Cannot register listener for ${event} - socket not initialized`
      );
    }
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      console.log(`[SocketService] Removing listener for event: ${event}`);
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
  const [isConnected, setIsConnected] = useState(false);
  const { data: session } = useSession();

  // ⚠️ Get store functions but DON'T use them as dependencies
  const addNotification = useNotificationsStore(
    (state) => state.addNotification
  );

  useEffect(() => {
    console.log("[useSocket] Initializing WebSocket connection");

    // Only connect if we have a session with user ID
    if (!session?.user?.id) {
      console.log("[useSocket] No session or user ID, skipping connection");
      return;
    }

    // Connecte-toi au WebSocket with user ID from session
    socketRef.current = socketService.connect(session.user.id);

    if (!socketRef.current) {
      console.log("[useSocket] No socket connection established");
      return;
    }

    console.log("[useSocket] Setting up global listeners");

    // Update connection status
    const handleConnect = () => {
      console.log("[useSocket] Connected");
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log("[useSocket] Disconnected");
      setIsConnected(false);
    };

    // ✅ ONLY global notifications here - task events handled by TaskContext
    const handleNotification = (notification: any) => {
      console.log("[useSocket] Received notification:", notification);
      addNotification(notification);
    };

    // Register listeners
    socketRef.current.on("connect", handleConnect);
    socketRef.current.on("disconnect", handleDisconnect);
    socketService.on("notification:new", handleNotification);

    // Set initial connection status
    setIsConnected(socketService.isConnected());

    // Cleanup
    return () => {
      console.log("[useSocket] Cleaning up global listeners");
      if (socketRef.current) {
        socketRef.current.off("connect", handleConnect);
        socketRef.current.off("disconnect", handleDisconnect);
      }
      socketService.off("notification:new", handleNotification);
    };
  }, [session?.user?.id]); // ✅ Reconnect when session changes

  return {
    socket: socketRef.current,
    isConnected,
    emit: socketService.emit.bind(socketService),
    joinTaskRoom: socketService.joinTaskRoom.bind(socketService),
    leaveTaskRoom: socketService.leaveTaskRoom.bind(socketService),
  };
}
