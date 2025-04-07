"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Activity, ActivityType, ACTIVITY_TYPE_COLORS } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  mergeIntervals,
  calculateTotalDuration,
  TimeInterval,
} from "@/lib/activity-utils";

interface ActivityTypeBreakdownChartProps {
  activities: Activity[];
}

// Format duration utility (could be shared)
const formatDuration = (totalMinutes: number): string => {
  if (totalMinutes < 1) return "< 1 min";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  let result = "";
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0 || hours === 0) result += `${minutes}m`;
  return result.trim();
};

export function ActivityTypeBreakdownChart({
  activities,
}: ActivityTypeBreakdownChartProps) {
  const data = React.useMemo(() => {
    const nonIdleActivities = activities.filter(
      (act) => act.type !== ActivityType.Idle
    );
    const idleActivities = activities.filter(
      (act) => act.type === ActivityType.Idle
    );

    // 1. Calculate true total active time (merging overlaps across non-idle types)
    const nonIdleIntervals: TimeInterval[] = nonIdleActivities
      .map((act) => {
        if (act.startTime instanceof Date && act.endTime instanceof Date) {
          return { start: act.startTime, end: act.endTime };
        }
        console.warn("Invalid date in non-idle activity:", act);
        return null;
      })
      .filter((interval): interval is TimeInterval => interval !== null);

    const mergedActiveIntervals = mergeIntervals(nonIdleIntervals);
    const totalActiveMinutes = calculateTotalDuration(mergedActiveIntervals);

    // 2. Calculate raw duration sum for each non-idle type
    const rawTypeDurations: { [key in ActivityType]?: number } = {};
    let totalRawDuration = 0;
    nonIdleActivities.forEach((act) => {
      const duration = act.durationMinutes;
      rawTypeDurations[act.type] = (rawTypeDurations[act.type] || 0) + duration;
      totalRawDuration += duration;
    });

    // 3. Allocate totalActiveMinutes proportionally
    const finalTypeSummaries: { name: ActivityType; duration: number }[] = [];
    if (totalRawDuration > 0) {
      Object.entries(rawTypeDurations).forEach(([typeName, rawDuration]) => {
        if (rawDuration && rawDuration > 0) {
          const proportion = rawDuration / totalRawDuration;
          const finalDuration = Math.round(proportion * totalActiveMinutes); // Round to nearest minute
          if (finalDuration > 0) {
            finalTypeSummaries.push({
              name: typeName as ActivityType,
              duration: finalDuration,
            });
          }
        }
      });
    } else if (totalActiveMinutes > 0) {
      // Edge case: totalActiveMinutes > 0 but no raw durations?
      // This might happen if all activities had duration < 1 min.
      // Assign the total active time to 'Other' perhaps?
      // For now, let's log a warning and result in an empty non-idle summary.
      console.warn("Total active time > 0 but raw durations sum to 0.");
    }

    // 4. Calculate true total idle time (merging overlaps within idle type)
    const idleIntervals: TimeInterval[] = idleActivities
      .map((act) => {
        if (act.startTime instanceof Date && act.endTime instanceof Date) {
          return { start: act.startTime, end: act.endTime };
        }
        console.warn("Invalid date in idle activity:", act);
        return null;
      })
      .filter((interval): interval is TimeInterval => interval !== null);

    const mergedIdleIntervals = mergeIntervals(idleIntervals);
    const totalIdleMinutes = calculateTotalDuration(mergedIdleIntervals);

    // 5. Add Idle summary if it has duration
    if (totalIdleMinutes > 0) {
      finalTypeSummaries.push({
        name: ActivityType.Idle,
        duration: totalIdleMinutes,
      });
    }

    // Return the combined summaries, filtering zero durations again just in case
    return finalTypeSummaries.filter((entry) => entry.duration > 0);
  }, [activities]);

  if (!activities || activities.length === 0 || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Type Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            No activity data for this day.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Type Breakdown (by Duration)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="duration"
              nameKey="name"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={ACTIVITY_TYPE_COLORS[entry.name] || "#cccccc"}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: ActivityType) => [
                `${name}: ${formatDuration(value)}`,
                null,
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
