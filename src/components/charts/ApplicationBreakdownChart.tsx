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
import { Activity, ActivityType } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface ApplicationBreakdownChartProps {
  activities: Activity[];
}

export function ApplicationBreakdownChart({
  activities,
}: ApplicationBreakdownChartProps) {
  const data = React.useMemo(() => {
    // Change from count to duration sum
    const appDurations: { [appName: string]: number } = {};

    activities
      .filter(
        (act) => act.type === ActivityType.Application && act.applicationName
      )
      .forEach((activity) => {
        const appName = activity.applicationName!;
        // Sum durationMinutes instead of counting
        appDurations[appName] =
          (appDurations[appName] || 0) + activity.durationMinutes;
      });

    return (
      Object.entries(appDurations)
        // Change variable name from count to duration
        .map(([name, duration]) => ({ name, duration }))
        // Sort by duration descending
        .sort((a, b) => b.duration - a.duration)
    );
  }, [activities]);

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

  // Format duration (minutes) into hours/minutes string for tooltip/axis
  const formatDuration = (totalMinutes: number): string => {
    if (totalMinutes < 1) return "< 1 min";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    let result = "";
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m`;
    return result.trim();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Usage Breakdown (Top 10 by Duration)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={topApps}
            layout="vertical"
            margin={{
              top: 5,
              right: 30,
              left: 40,
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
              width={250}
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
            <Bar dataKey="duration" fill="#8884d8" name="Time Spent" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
