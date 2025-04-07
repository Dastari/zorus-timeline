"use client";

import React, { useRef, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Activity,
  FilterState,
  ZoomLevel,
  ActivityType,
  ACTIVITY_TYPE_COLORS,
} from "@/types";
import { format, startOfDay, differenceInMinutes, addMinutes } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TimelineProps {
  activities: Activity[];
  filters: FilterState;
  zoomLevel: ZoomLevel;
  selectedActivityId: string | null;
  onZoomChange: (level: ZoomLevel) => void;
  className?: string;
  currentDate: Date;
  onActivityClick: (activity: Activity | null) => void;
}

// Helper to map filter state keys to activity types
const filterTypeMap: Record<keyof FilterState, ActivityType> = {
  webPages: ActivityType.WebPage,
  applications: ActivityType.Application,
  idle: ActivityType.Idle,
  other: ActivityType.Other,
};

// Constants for drawing
const SCALE_HEIGHT = 30; // Height for the hour labels/ticks
const BAR_HEIGHT = 50; // Height of the activity bars area
const TOTAL_TIMELINE_HEIGHT = SCALE_HEIGHT + BAR_HEIGHT;
const TICK_COLOR = "#E5E7EB"; // gray-200
const LABEL_COLOR = "#6B7280"; // gray-500

// Map ZoomLevel to visible duration in minutes
const zoomLevelToDuration: Record<ZoomLevel, number> = {
  [ZoomLevel.Hour]: 60,
  [ZoomLevel.ThreeHours]: 180,
  [ZoomLevel.SixHours]: 360,
  [ZoomLevel.TwelveHours]: 720,
  [ZoomLevel.Day]: 1440,
};

// Reinstate MIN_DURATION_MINUTES
const MIN_DURATION_MINUTES = 15;
const MAX_DURATION_MINUTES = 1440; // 24 hours

// NEW: Helper function to draw a rounded rectangle path and fill it
function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  // Ensure radius is not too large for the dimensions
  radius = Math.min(radius, width / 2, height / 2);
  // Prevent drawing if width/height is too small for the radius
  if (width < 2 * radius || height < 2 * radius) {
    // Fallback to sharp corners if too small
    ctx.fillRect(x, y, width, height);
    return;
  }

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
  ctx.fill();
}

// NEW: Helper function to draw a rounded rectangle stroke (for selection)
function strokeRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  radius = Math.min(radius, width / 2, height / 2);
  if (width < 2 * radius || height < 2 * radius) {
    ctx.strokeRect(x, y, width, height);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
  ctx.stroke();
}

export function Timeline({
  activities,
  filters,
  zoomLevel,
  selectedActivityId,
  className,
  currentDate,
  onActivityClick,
}: TimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); // Ref for the container div to get width
  const [canvasWidth, setCanvasWidth] = useState(0);

  // State for the visible time window
  const [viewStartMinutes, setViewStartMinutes] = useState(0);
  const [viewDurationMinutes, setViewDurationMinutes] = useState(
    () => zoomLevelToDuration[zoomLevel] || 1440 // Initialize from prop
  );

  // NEW: State for hover/tooltip
  const [hoveredActivity, setHoveredActivity] = useState<Activity | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [showPanButtons, setShowPanButtons] = useState(false); // State for button visibility

  // Filter activities based on the current filter state
  const filteredActivities = useMemo(() => {
    const activeFilterTypes = Object.entries(filters)
      .filter((entry) => entry[1] === true)
      .map(([key]) => filterTypeMap[key as keyof FilterState]);
    return activities.filter((activity) =>
      activeFilterTypes.includes(activity.type)
    );
  }, [activities, filters]);

  // Effect to update internal duration when button-driven zoomLevel prop changes
  useEffect(() => {
    const newDuration = zoomLevelToDuration[zoomLevel] || 1440;
    setViewDurationMinutes(newDuration);
    setViewStartMinutes((prev) => clampViewStart(prev, newDuration));
    // Add clampViewStart to dependency array if it's not stable (it should be)
  }, [zoomLevel]); // Keep dependency on zoomLevel prop

  // Function to draw the timeline scale - MODIFIED
  const drawScale = (
    ctx: CanvasRenderingContext2D,
    width: number,
    startMin: number, // viewStartMinutes
    durationMin: number // visibleDurationMinutes
  ) => {
    ctx.clearRect(0, 0, width, SCALE_HEIGHT);
    ctx.fillStyle = LABEL_COLOR;
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";

    const pixelsPerMinute = width / durationMin;
    const dayStart = startOfDay(currentDate);

    // Determine appropriate interval based on duration
    let intervalMinutes = 60;
    if (durationMin <= 60) intervalMinutes = 5; // Finer ticks when zoomed in
    else if (durationMin <= 180) intervalMinutes = 15;
    else if (durationMin <= 360) intervalMinutes = 30;

    const endMin = startMin + durationMin;

    // Find the first tick position >= startMin
    const firstTickMinute =
      Math.ceil(startMin / intervalMinutes) * intervalMinutes;

    for (let min = firstTickMinute; min <= endMin; min += intervalMinutes) {
      const x = (min - startMin) * pixelsPerMinute;
      let tickHeight = 5;
      let showLabel = false;
      let labelFormat = "h:mma";

      // Determine tick height and label visibility based on interval
      if (min % 60 === 0) {
        // Hour marks
        tickHeight = 10;
        showLabel = durationMin >= 360; // Show hour labels on wider views
        labelFormat = "ha";
      } else if (min % 30 === 0) {
        tickHeight = 7;
        showLabel = durationMin < 360 && durationMin >= 180; // Show 30min labels
      } else if (min % 15 === 0) {
        tickHeight = 5;
        showLabel = durationMin < 180 && durationMin >= 60; // Show 15min labels
      } else if (min % 5 === 0) {
        // 5 min ticks only visible when very zoomed in
        tickHeight = 3;
        showLabel = durationMin < 60;
      }

      ctx.strokeStyle = TICK_COLOR;
      ctx.beginPath();
      ctx.moveTo(x, SCALE_HEIGHT - tickHeight);
      ctx.lineTo(x, SCALE_HEIGHT);
      ctx.stroke();

      if (showLabel) {
        const labelDate = addMinutes(dayStart, min);
        const label = format(labelDate, labelFormat).toLowerCase();
        // Basic check to avoid drawing labels too close to each other or off-screen
        if (x > 20 && x < width - 20) {
          // TODO: Add smarter label collision detection if needed
          ctx.fillText(label, x, SCALE_HEIGHT - tickHeight - 4);
        }
      }
    }
  };

  // Function to draw the activity bars - MODIFIED
  const drawBars = (
    ctx: CanvasRenderingContext2D,
    width: number,
    startMin: number, // viewStartMinutes
    durationMin: number // visibleDurationMinutes
  ) => {
    ctx.clearRect(0, SCALE_HEIGHT, width, BAR_HEIGHT);

    const dayStart = startOfDay(currentDate);
    const pixelsPerMinute = width / durationMin;
    const viewEndMinutes = startMin + durationMin;
    const cornerRadius = 3; // Define corner radius

    filteredActivities.forEach((activity) => {
      if (
        !(activity.startTime instanceof Date) ||
        !(activity.endTime instanceof Date)
      ) {
        return;
      }

      const activityStartMinutes = differenceInMinutes(
        activity.startTime,
        dayStart
      );
      const activityEndMinutes = differenceInMinutes(
        activity.endTime,
        dayStart
      );

      // Check if activity overlaps with the current view
      if (
        activityEndMinutes <= startMin ||
        activityStartMinutes >= viewEndMinutes
      ) {
        return; // Skip activities entirely outside the view
      }

      // Clamp activity times to the VIEW boundaries for calculating width/position
      const clampedStartView = Math.max(startMin, activityStartMinutes);
      const clampedEndView = Math.min(viewEndMinutes, activityEndMinutes);

      const durationInView = clampedEndView - clampedStartView;
      if (durationInView <= 0) return;

      // Calculate position RELATIVE to the start of the view
      const x = (clampedStartView - startMin) * pixelsPerMinute;
      const barWidth = durationInView * pixelsPerMinute;

      ctx.fillStyle =
        ACTIVITY_TYPE_COLORS[activity.type] ||
        ACTIVITY_TYPE_COLORS[ActivityType.Other];

      // Use the helper function to draw the filled rounded rectangle
      fillRoundedRect(ctx, x, SCALE_HEIGHT, barWidth, BAR_HEIGHT, cornerRadius);

      // Update selection highlight to use rounded stroke
      if (activity.id === selectedActivityId) {
        ctx.save();
        ctx.strokeStyle = "#000000"; // Keep black border
        ctx.lineWidth = 1.5;
        // Adjust position/size slightly for stroke to appear nicely outside the fill
        strokeRoundedRect(
          ctx,
          x + ctx.lineWidth / 2,
          SCALE_HEIGHT + ctx.lineWidth / 2,
          barWidth - ctx.lineWidth,
          BAR_HEIGHT - ctx.lineWidth,
          cornerRadius // Use same radius, or slightly smaller? Use same for now.
        );
        ctx.restore();
      }
    });
  };

  // Main drawing effect - MODIFIED
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width } = container.getBoundingClientRect();

    // ... DPR setup ...
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(TOTAL_TIMELINE_HEIGHT * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${TOTAL_TIMELINE_HEIGHT}px`;
    ctx.scale(dpr, dpr);

    // Pass view parameters to drawing functions
    drawScale(ctx, width, viewStartMinutes, viewDurationMinutes);
    drawBars(ctx, width, viewStartMinutes, viewDurationMinutes);
  }, [
    filteredActivities,
    currentDate,
    selectedActivityId,
    canvasWidth,
    viewStartMinutes,
    viewDurationMinutes,
  ]);

  // Handle container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width } = entries[0].contentRect;
        // Update state to trigger redraw
        setCanvasWidth(width);
      }
    });

    resizeObserver.observe(container);
    // Initial width set
    setCanvasWidth(container.getBoundingClientRect().width);

    return () => resizeObserver.disconnect();
  }, []);

  // Helper to clamp viewStartMinutes
  const clampViewStart = (newStart: number, duration: number): number => {
    const maxStart = Math.max(0, 1440 - duration);
    return Math.max(0, Math.min(newStart, maxStart));
  };

  // --- Event Handlers ---
  const handleWheelZoom = (event: React.WheelEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasWidth) return;

    const isPan = event.shiftKey; // Check if Shift key is held

    if (isPan) {
      // Prevent page scroll ONLY when zooming the timeline
      event.preventDefault();

      // --- Zooming Logic (Activated by Shift + Wheel) ---
      const scrollAmount = event.deltaY;
      const currentDuration = viewDurationMinutes;
      const zoomFactor = 1.15;
      let nextDuration =
        scrollAmount > 0
          ? currentDuration * zoomFactor // Zoom out
          : currentDuration / zoomFactor; // Zoom in

      // Clamp duration
      nextDuration = Math.max(
        MIN_DURATION_MINUTES,
        Math.min(MAX_DURATION_MINUTES, nextDuration)
      );

      if (Math.abs(nextDuration - currentDuration) > 1) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const pixelsPerMinute = canvasWidth / currentDuration;
        const timeAtMousePointer = viewStartMinutes + mouseX / pixelsPerMinute;

        const nextPixelsPerMinute = canvasWidth / nextDuration;
        let newViewStart = timeAtMousePointer - mouseX / nextPixelsPerMinute;
        newViewStart = clampViewStart(newViewStart, nextDuration);

        setViewStartMinutes(newViewStart);
        setViewDurationMinutes(nextDuration); // Update duration state directly
      }

      // Clear tooltip when zooming
      setHoveredActivity(null);
      setTooltipPosition(null);
    }
    // else: If Shift is not held, do nothing and allow default browser scroll
  };

  // --- Panning Button Handlers ---
  const handlePan = (direction: "left" | "right") => {
    const panAmount = viewDurationMinutes * 0.1; // Pan 10% of the current view
    const change = direction === "left" ? -panAmount : panAmount;
    setViewStartMinutes((prev) =>
      clampViewStart(prev + change, viewDurationMinutes)
    );
  };

  // --- Hit Detection Logic ---
  const getActivityAtPosition = (
    mouseX: number,
    mouseY: number
  ): Activity | null => {
    if (
      !canvasRef.current ||
      mouseY < SCALE_HEIGHT ||
      mouseY > TOTAL_TIMELINE_HEIGHT ||
      !canvasWidth
    ) {
      return null;
    }
    const pixelsPerMinute = canvasWidth / viewDurationMinutes;
    if (pixelsPerMinute <= 0) return null; // Avoid division by zero
    const timeAtMouse = viewStartMinutes + mouseX / pixelsPerMinute;
    const dayStart = startOfDay(currentDate);
    for (let i = filteredActivities.length - 1; i >= 0; i--) {
      const activity = filteredActivities[i];
      if (
        !(activity.startTime instanceof Date) ||
        !(activity.endTime instanceof Date)
      )
        continue;
      const activityStartMinutes = differenceInMinutes(
        activity.startTime,
        dayStart
      );
      const activityEndMinutes = differenceInMinutes(
        activity.endTime,
        dayStart
      );
      if (
        timeAtMouse >= activityStartMinutes &&
        timeAtMouse < activityEndMinutes
      ) {
        // More precise check using calculated bar position:
        const viewStartOfBar = Math.max(viewStartMinutes, activityStartMinutes);
        const barX = (viewStartOfBar - viewStartMinutes) * pixelsPerMinute;
        const viewEndOfBar = Math.min(
          viewStartMinutes + viewDurationMinutes,
          activityEndMinutes
        );
        const barW = (viewEndOfBar - viewStartOfBar) * pixelsPerMinute;
        if (mouseX >= barX && mouseX < barX + barW) {
          return activity;
        }
      }
    }
    return null;
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    // Remove unused DPR calculation for click coords
    // const dpr = window.devicePixelRatio || 1;
    // const mouseX = (event.clientX - rect.left) * dpr;
    // const mouseY = (event.clientY - rect.top) * dpr;

    // Pass the unscaled coordinates relative to canvas display rect
    const clickedActivity = getActivityAtPosition(
      event.clientX - rect.left,
      event.clientY - rect.top
    );
    if (onActivityClick) {
      onActivityClick(clickedActivity);
    }
  };

  const handleCanvasMouseMove = (
    event: React.MouseEvent<HTMLCanvasElement>
  ) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const activity = getActivityAtPosition(mouseX, mouseY);
    setHoveredActivity(activity);

    if (activity) {
      // Change Y offset to negative 100px to position above cursor
      setTooltipPosition({ x: event.clientX + 15, y: event.clientY });
    } else {
      setTooltipPosition(null);
    }
  };

  const handleCanvasMouseLeave = () => {
    setHoveredActivity(null);
    setTooltipPosition(null);
  };

  // Calculate start/end times for display
  const viewStartTime = useMemo(
    () => addMinutes(startOfDay(currentDate), viewStartMinutes),
    [currentDate, viewStartMinutes]
  );
  const viewEndTime = useMemo(
    () => addMinutes(viewStartTime, viewDurationMinutes),
    [viewStartTime, viewDurationMinutes]
  );

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="mb-2 px-1">
        <h3 className="text-lg font-semibold">
          {format(viewStartTime, "MMMM do, yyyy")} (
          {format(viewStartTime, "h:mm a")} - {format(viewEndTime, "h:mm a")})
        </h3>
        <p className="text-xs text-muted-foreground">
          Hold Shift + Scroll Wheel to pan horizontally. Use zoom buttons above
          for preset views.
        </p>
      </div>

      <TooltipProvider delayDuration={100}>
        <div
          ref={containerRef}
          className={cn("w-full relative overflow-hidden")}
          style={{
            height: `${TOTAL_TIMELINE_HEIGHT}px`,
            overscrollBehavior: "contain",
          }}
          onWheel={handleWheelZoom}
          onMouseEnter={() => setShowPanButtons(true)}
          onMouseLeave={() => setShowPanButtons(false)}
        >
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              cursor: hoveredActivity ? "pointer" : "default",
            }}
          />

          {showPanButtons && viewDurationMinutes < MAX_DURATION_MINUTES && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-1 top-14 -translate-y-1/2 z-10 h-8 w-8 opacity-70 hover:opacity-100"
                onClick={() => handlePan("left")}
                disabled={viewStartMinutes <= 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-1 top-14 -translate-y-1/2 z-10 h-8 w-8 opacity-70 hover:opacity-100"
                onClick={() => handlePan("right")}
                disabled={viewStartMinutes >= 1440 - viewDurationMinutes}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {hoveredActivity && tooltipPosition && (
            <Tooltip open={true}>
              <TooltipTrigger
                style={{
                  position: "fixed",
                  left: `${tooltipPosition.x}px`,
                  top: `${tooltipPosition.y}px`,
                  width: 0,
                  height: 0,
                  pointerEvents: "none",
                }}
              />
              <TooltipContent side="top" align="start">
                <p className="font-medium">{hoveredActivity.title}</p>
                <p className="text-sm text-muted-foreground">
                  {format(hoveredActivity.startTime, "h:mm:ss a")} -{" "}
                  {format(hoveredActivity.endTime, "h:mm:ss a")}
                </p>
                <p className="text-xs">
                  Duration: {hoveredActivity.durationMinutes} min
                </p>
                <p className="text-xs">Type: {hoveredActivity.type}</p>
                {hoveredActivity.applicationName && (
                  <p className="text-xs">
                    App: {hoveredActivity.applicationName}
                  </p>
                )}
                {hoveredActivity.url && (
                  <p className="text-xs">URL: {hoveredActivity.url}</p>
                )}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}
