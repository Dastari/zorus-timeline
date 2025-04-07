"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Activity, ACTIVITY_TYPE_COLORS, ActivityType } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  mergeIntervals,
  calculateTotalDuration,
  TimeInterval,
} from "@/lib/activity-utils";

interface ApplicationBreakdownChartProps {
  activities: Activity[];
}

const formatDuration = (totalMinutes: number): string => {
  if (totalMinutes < 1) return "< 1 min";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  let result = "";
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0 || hours === 0) result += `${minutes}m`;
  return result.trim();
};

export function ApplicationBreakdownChart({
  activities,
}: ApplicationBreakdownChartProps) {
  const data = React.useMemo(() => {
    // 1. Group intervals by Application Name
    const appIntervals: { [appName: string]: TimeInterval[] } = {};

    (activities ?? [])
      .filter(
        (act) => act.type === ActivityType.Application && act.applicationName
      )
      .forEach((activity) => {
        const appName = activity.applicationName!;
        if (!appIntervals[appName]) {
          appIntervals[appName] = [];
        }
        if (
          activity.startTime instanceof Date &&
          activity.endTime instanceof Date
        ) {
          appIntervals[appName].push({
            start: activity.startTime,
            end: activity.endTime,
          });
        } else {
          console.warn("Skipping app activity due to invalid dates:", activity);
        }
      });

    // 2. Merge intervals and calculate duration *for each app individually*
    const appSummaries = Object.entries(appIntervals)
      .map(([name, intervals]) => {
        // Merge intervals only for this specific app
        const merged = mergeIntervals(intervals);
        const totalMinutes = calculateTotalDuration(merged);
        return {
          name,
          duration: totalMinutes,
        };
      })
      .filter((entry) => entry.duration > 0) // Filter out zero-duration apps
      .sort((a, b) => b.duration - a.duration); // Sort descending by duration

    return appSummaries;
  }, [activities]);

  // Get top 10 based on individually merged durations
  const topApps = data.slice(0, 10);

  if (!activities || activities.length === 0 || topApps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Application Usage Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            No application activity data for this day.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Usage Breakdown (Top 10 by Duration)</CardTitle>
      </CardHeader>
      <CardContent className="pl-0">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={topApps}
            layout="vertical"
            margin={{
              top: 5,
              right: 30,
              left: 0,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="duration"
              tickFormatter={formatDuration}
              name="Time Spent"
            />
            <YAxis
              dataKey="name"
              type="category"
              width={200}
              interval={0}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(value: number, name: string, props) => [
                `${props.payload.name}: ${formatDuration(value)}`,
                null,
              ]}
              cursor={{ fill: "transparent" }}
            />
            <Legend formatter={() => "Time Spent"} />
            <Bar
              dataKey="duration"
              fill={ACTIVITY_TYPE_COLORS[ActivityType.Application]}
              name="Time Spent"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
