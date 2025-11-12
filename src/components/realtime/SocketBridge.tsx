"use client";

import { useSocket } from "@/lib/socket/socket";
import React from "react";

export default function SocketBridge() {
  // Monte la connexion et enregistre les listeners globaux
  const { isConnected } = useSocket();

  // Optionnel: petit indicateur debug (tu peux le retirer)
  return (
    <div style={{ position: "fixed", bottom: 8, right: 8, fontSize: 12, opacity: 0.6, pointerEvents: "none" }}>
      WS: {isConnected ? "connected" : "disconnected"}
    </div>
  );
}
