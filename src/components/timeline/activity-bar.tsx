import React from "react";
import { differenceInMinutes, format } from "date-fns";
import { cn } from "@/lib/utils";
import { Activity } from "@/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Use Tooltip for hover details

interface ActivityBarProps {
  activity: Activity;
  startHour: number; // Start hour of the visible timeline range (e.g., 0)
  endHour: number; // End hour of the visible timeline range (e.g., 24)
  onClick?: (activity: Activity) => void;
  isSelected?: boolean;
  color: string; // Add color prop
}

/**
 * Renders a single activity bar on the timeline.
 */
export function ActivityBar({
  activity,
  startHour,
  endHour,
  onClick,
  isSelected = false,
  color, // Destructure color prop
}: ActivityBarProps) {
  const totalTimelineMinutes = (endHour - startHour) * 60;

  // Calculate minutes from the start of the visible timeline range
  const startMinutesOffset = differenceInMinutes(
    activity.startTime,
    new Date(activity.startTime).setHours(startHour, 0, 0, 0)
  );

  // Ensure start time doesn't go before the visible range start
  const clampedStartMinutes = Math.max(0, startMinutesOffset);

  // Calculate duration, clamping it within the visible range
  const endMinutesOffset = differenceInMinutes(
    activity.endTime,
    new Date(activity.startTime).setHours(startHour, 0, 0, 0)
  );
  const clampedEndMinutes = Math.min(totalTimelineMinutes, endMinutesOffset);

  // Calculate duration within the visible range
  const durationMinutes = Math.max(0, clampedEndMinutes - clampedStartMinutes);

  // If duration is zero or negative (or activity is entirely outside range), don't render
  if (durationMinutes <= 0) {
    return null;
  }

  const percentageLeft = (clampedStartMinutes / totalTimelineMinutes) * 100;
  const percentageWidth = (durationMinutes / totalTimelineMinutes) * 100;

  const handleClick = () => {
    if (onClick) {
      onClick(activity);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "absolute h-full rounded cursor-pointer transition-all duration-150 ease-in-out",
              "hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              isSelected
                ? "ring-2 ring-primary ring-offset-2 z-10 opacity-100"
                : "opacity-90"
            )}
            style={{
              left: `${percentageLeft}%`,
              width: `${percentageWidth}%`,
              backgroundColor: color, // Apply color via inline style
            }}
            onClick={handleClick}
            onKeyDown={(e) => e.key === "Enter" && handleClick()} // Accessibility
            tabIndex={0} // Make it focusable
            aria-label={`Activity: ${activity.title}`}
          >
            {/* Optional: Add content inside the bar if width allows */}
            {/* {percentageWidth > 5 && <span className="text-xs text-white p-1 truncate">{activity.title}</span>} */}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{activity.title}</p>
          <p className="text-sm text-muted-foreground">
            {format(activity.startTime, "h:mm a")} -{" "}
            {format(activity.endTime, "h:mm a")}
          </p>
          <p className="text-xs">Duration: {activity.durationMinutes} min</p>
          <p className="text-xs">Type: {activity.type}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
