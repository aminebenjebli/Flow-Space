"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = () => {
    console.log("Button clicked! Current theme:", theme);

    // Force theme change
    if (theme === "dark") {
      console.log("Switching to light");
      setTheme("light");
    } else {
      console.log("Switching to dark");
      setTheme("dark");
    }
  };

  // Show loading state until mounted
  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-md border border-border bg-background animate-pulse" />
    );
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleClick}
      className="relative border-border hover:bg-secondary/80 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
      <span className="sr-only">Toggle between light and dark theme</span>
    </Button>
  );
}
