"use client";

import React from "react";
import { format, differenceInMinutes, startOfDay, min, max } from "date-fns";
import { cn } from "@/lib/utils";
import { Activity, ActivityType } from "@/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Define colors locally or import if shared
const ACTIVITY_COLORS: { [key in ActivityType]: string } = {
  [ActivityType.Application]: "#3B82F6", // blue-500
  [ActivityType.WebPage]: "#10B981", // emerald-500
  [ActivityType.Idle]: "#F59E0B", // amber-500
  [ActivityType.Other]: "#6B7280", // gray-500
};

interface HourlyTimelineBreakdownProps {
  activities: Activity[];
  className?: string;
}

/**
 * Renders a 24-hour breakdown showing activity segments within each hour.
 */
export function HourlyTimelineBreakdown({
  activities,
  className,
}: HourlyTimelineBreakdownProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i); // 0 to 23

  if (!activities || activities.length === 0) {
    return null; // Don't render if no activities
  }

  // Get the date from the first activity to set the correct day for hours
  const dayDate =
    activities.length > 0 ? startOfDay(activities[0].startTime) : new Date();

  return (
    <div className={cn("w-full border rounded-lg p-4 bg-card", className)}>
      <h3 className="text-lg font-semibold mb-4">Hourly Activity Breakdown</h3>
      <TooltipProvider delayDuration={150}>
        <div className="space-y-1.5">
          {hours.map((hour) => {
            const hourStart = new Date(dayDate);
            hourStart.setHours(hour, 0, 0, 0);
            const hourEnd = new Date(hourStart);
            hourEnd.setHours(hour + 1, 0, 0, 0);

            // Filter activities that overlap with this specific hour
            const activitiesInHour = activities.filter((act) => {
              return act.startTime < hourEnd && act.endTime > hourStart;
            });

            const hourLabel = format(hourStart, "ha").toLowerCase();

            return (
              <div key={hour} className="flex items-center gap-3">
                <span className="w-10 text-xs text-right text-muted-foreground font-mono flex-shrink-0">
                  {hourLabel}
                </span>
                <div className="flex-1 h-5 bg-muted rounded relative overflow-hidden">
                  {/* Render activity segments within the hour bar */}
                  {activitiesInHour.map((activity) => {
                    // Clamp activity start/end times to the current hour boundaries
                    const segmentStart = max([activity.startTime, hourStart]);
                    const segmentEnd = min([activity.endTime, hourEnd]);

                    const startMinutesInHour = differenceInMinutes(
                      segmentStart,
                      hourStart
                    );
                    const endMinutesInHour = differenceInMinutes(
                      segmentEnd,
                      hourStart
                    );
                    const durationMinutesInHour = Math.max(
                      0,
                      endMinutesInHour - startMinutesInHour
                    );

                    if (durationMinutesInHour <= 0) return null;

                    const leftPercent = (startMinutesInHour / 60) * 100;
                    const widthPercent = (durationMinutesInHour / 60) * 100;
                    const color =
                      ACTIVITY_COLORS[activity.type] ||
                      ACTIVITY_COLORS[ActivityType.Other];

                    return (
                      <Tooltip key={activity.id + "-" + hour}>
                        <TooltipTrigger asChild>
                          <div
                            className="absolute h-full hover:opacity-80 transition-opacity"
                            style={{
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                              backgroundColor: color,
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" align="center">
                          <p className="font-medium">{activity.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(activity.startTime, "h:mm:ss a")} -{" "}
                            {format(activity.endTime, "h:mm:ss a")}
                          </p>
                          <p className="text-xs">Type: {activity.type}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}
