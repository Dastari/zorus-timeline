"use client";

import * as React from "react";
// Remove unused icon imports
// import { ZoomIn, ZoomOut } from "lucide-react"; // Icons for potential +/- buttons if needed

import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ZoomLevel } from "@/types";
// Remove unused Button import
// import { Button } from "@/components/ui/button"; // If using separate buttons

interface ZoomControlsProps {
  zoomLevel: ZoomLevel;
  onZoomChange: (level: ZoomLevel) => void;
  className?: string;
}

// Define the available zoom levels and their labels
const zoomOptions: { level: ZoomLevel; label: string }[] = [
  { level: ZoomLevel.Hour, label: "1h" },
  { level: ZoomLevel.ThreeHours, label: "3h" },
  { level: ZoomLevel.SixHours, label: "6h" },
  { level: ZoomLevel.TwelveHours, label: "12h" },
  { level: ZoomLevel.Day, label: "24h" },
];

export function ZoomControls({
  zoomLevel,
  onZoomChange,
  className,
}: ZoomControlsProps) {
  const handleValueChange = (value: string) => {
    // ToggleGroup returns the value of the selected item, or empty string if deselected
    // Since we want it to always have a value, we only call onZoomChange if a value is present
    if (value) {
      onZoomChange(value as ZoomLevel); // Cast the string value back to ZoomLevel enum
    }
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <span className="text-sm font-medium mr-1">Zoom:</span>
      <ToggleGroup
        type="single" // Only one zoom level can be active at a time
        value={zoomLevel} // Set the current value
        onValueChange={handleValueChange} // Handle value changes
        aria-label="Timeline Zoom Level"
      >
        {zoomOptions.map((option) => (
          <ToggleGroupItem
            key={option.level}
            value={option.level}
            aria-label={option.label}
            variant="outline" // Use outline style for toggle items
            size="sm" // Use small size
          >
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {/* Remove commented out +/- buttons */}
    </div>
  );
}
