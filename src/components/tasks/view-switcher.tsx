"use client";

import { LayoutGrid, Kanban } from "lucide-react";
import { Button } from "@/components/ui/button";

type ViewType = "grid" | "kanban";

interface ViewSwitcherProps {
  readonly currentView: ViewType;
  readonly onViewChange: (view: ViewType) => void;
}

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
      <Button
        variant={currentView === "grid" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("grid")}
        className={`flex items-center gap-2 ${
          currentView === "grid" ? "" : "text-muted-foreground"
        }`}
      >
        <LayoutGrid className="h-4 w-4" />
        Grid
      </Button>
      <Button
        variant={currentView === "kanban" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("kanban")}
        className={`flex items-center gap-2 ${
          currentView === "kanban" ? "" : "text-muted-foreground"
        }`}
      >
        <Kanban className="h-4 w-4" />
        Kanban
      </Button>
    </div>
  );
}
