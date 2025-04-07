"use client";

import React from "react";
import { format, startOfDay, min, max, differenceInSeconds } from "date-fns";
import { cn } from "@/lib/utils";
import { Activity, ActivityType, ACTIVITY_TYPE_COLORS } from "@/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HourlyTimelineBreakdownProps {
  activities: Activity[];
  className?: string;
}

// Format duration utility (copied - consider centralizing)
const formatDuration = (totalMinutes: number): string => {
  if (totalMinutes <= 0) return "< 1 sec"; // Handle zero/negative case
  // Use seconds for more precision in tooltip display
  const totalSeconds = Math.round(totalMinutes * 60);
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let result = "";
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0) result += `${minutes}m `;
  if (seconds > 0 || result === "") result += `${seconds}s`; // Show seconds if non-zero or if H/M are zero
  return result.trim();
};

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
    <div className={cn("w-full border rounded-lg p-6 bg-card", className)}>
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

                    const startSecondsInHour = differenceInSeconds(
                      segmentStart,
                      hourStart
                    );
                    const endSecondsInHour = differenceInSeconds(
                      segmentEnd,
                      hourStart
                    );
                    const durationSecondsInHour = Math.max(
                      0,
                      endSecondsInHour - startSecondsInHour
                    );

                    if (durationSecondsInHour <= 0) return null;

                    const leftPercent = (startSecondsInHour / 3600) * 100;
                    const widthPercent = (durationSecondsInHour / 3600) * 100;
                    const color =
                      ACTIVITY_TYPE_COLORS[activity.type] ||
                      ACTIVITY_TYPE_COLORS[ActivityType.Other];

                    const displayDuration = formatDuration(
                      activity.durationMinutes
                    );

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
                            aria-label={`${activity.title} (${displayDuration})`}
                          />
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          align="center"
                          className="text-xs max-w-xs break-words"
                        >
                          <p className="font-medium mb-1">{activity.title}</p>
                          <p>
                            <span className="font-semibold">Time:</span>{" "}
                            {format(activity.startTime, "HH:mm:ss")} -{" "}
                            {format(activity.endTime, "HH:mm:ss")}
                          </p>
                          <p>
                            <span className="font-semibold">Duration:</span>{" "}
                            {displayDuration}
                          </p>
                          <p>
                            <span className="font-semibold">Type:</span>{" "}
                            {activity.type}
                          </p>
                          {activity.type === ActivityType.WebPage &&
                            activity.url && (
                              <p>
                                <span className="font-semibold">URL:</span>{" "}
                                {activity.url}
                              </p>
                            )}
                          {activity.type === ActivityType.Application &&
                            activity.applicationName && (
                              <p>
                                <span className="font-semibold">App:</span>{" "}
                                {activity.applicationName}
                              </p>
                            )}
                          {activity.category && (
                            <p>
                              <span className="font-semibold">Category:</span>{" "}
                              {activity.category}
                            </p>
                          )}
                          {activity.details && (
                            <p>
                              <span className="font-semibold">Details:</span>{" "}
                              {activity.details}
                            </p>
                          )}
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
