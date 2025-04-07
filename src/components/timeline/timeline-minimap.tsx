"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Activity } from "@/types";
import { ActivityBar } from "./activity-bar"; // Reuse ActivityBar

interface TimelineMinimapProps {
  activities: Activity[];
  className?: string;
  // Optional props for highlighting visible range if main timeline is scrollable/zoomable
  // visibleStartHour?: number;
  // visibleEndHour?: number;
  // onRangeChange?: (startHour: number, endHour: number) => void; // For clicking/dragging on minimap
}

/**
 * Renders a minimap overview of the day's activities.
 */
export function TimelineMinimap({
  activities,
  className,
}: // visibleStartHour = 0, // Default to full day visible
// visibleEndHour = 24,
TimelineMinimapProps) {
  // For the minimap, we always show the full 24-hour range
  const startHour = 0;
  const endHour = 24;

  // Filter out idle activities for a potentially cleaner minimap view? (Optional)
  // const filteredActivities = useMemo(() =>
  //   activities.filter(act => act.type !== ActivityType.Idle)
  // , [activities]);
  // For now, show all activities:
  const filteredActivities = activities;

  return (
    <div
      className={cn(
        "w-full h-16 relative bg-muted/30 rounded overflow-hidden",
        className
      )}
    >
      {/* Background for the minimap lane */}
      <div className="absolute inset-0">
        {filteredActivities.map((activity) => (
          <ActivityBar
            key={`mini-${activity.id}`} // Use a different key prefix
            activity={activity}
            startHour={startHour} // Always use 0-24 range
            endHour={endHour}
            // Minimap bars are usually not clickable or selectable
            // onClick={undefined}
            // isSelected={false}
          />
        ))}
      </div>

      {/* Optional: Overlay to show the visible portion */}
      {/* 
      const visibleWidth = ((visibleEndHour - visibleStartHour) / (endHour - startHour)) * 100;
      const visibleLeft = ((visibleStartHour - startHour) / (endHour - startHour)) * 100;
      <div 
        className="absolute inset-0 border-2 border-primary rounded opacity-50 pointer-events-none"
        style={{
          left: `${visibleLeft}%`,
          width: `${visibleWidth}%`
        }}
      /> 
      */}
    </div>
  );
}
