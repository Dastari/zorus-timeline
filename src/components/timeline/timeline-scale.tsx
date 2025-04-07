import React from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TimelineScaleProps {
  startHour: number; // Typically 0
  endHour: number; // Typically 24
  interval: 15 | 30 | 60; // Interval in minutes
  className?: string;
}

/**
 * Renders the time scale markers for the timeline.
 */
export function TimelineScale({
  startHour = 0,
  endHour = 24,
  interval = 60, // Default to hourly intervals
  className,
}: TimelineScaleProps) {
  const ticks = [];
  const totalDurationMinutes = (endHour - startHour) * 60;

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      const totalMinutesElapsed = (hour - startHour) * 60 + minute;
      const percentageLeft = (totalMinutesElapsed / totalDurationMinutes) * 100;

      const isHourTick = minute === 0;
      const date = new Date(); // Use a dummy date just for formatting
      date.setHours(hour, minute, 0, 0);

      ticks.push({
        key: `tick-${hour}-${minute}`,
        label: format(date, isHourTick ? "ha" : ":mm"), // Format as '9AM' or ':15'
        style: { left: `${percentageLeft}%` },
        isHourTick: isHourTick,
      });
    }
  }

  // Add the final tick for the end hour if needed (e.g., 12 AM for a 24h scale)
  // Or adjust loop condition to include the end hour marker if required by design

  return (
    <div className={cn("relative h-8 border-b mb-8", className)}>
      {ticks.map((tick) => (
        <div
          key={tick.key}
          className={cn(
            "absolute bottom-0 text-xs",
            tick.isHourTick
              ? "h-4 border-l font-medium text-foreground"
              : "h-2 border-l text-muted-foreground",
            "transform -translate-x-1/2" // Center the tick line/label
          )}
          style={tick.style}
        >
          {/* Only show label for hour ticks, or adjust based on interval/zoom */}
          {tick.isHourTick && (
            <span className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              {tick.label}
            </span>
          )}
          {/* Maybe show minute labels for smaller intervals if needed */}
          {/* {!tick.isHourTick && interval < 60 && (
             <span className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                {tick.label}
             </span>
          )} */}
        </div>
      ))}
    </div>
  );
}
