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
import { Activity, ActivityType } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface ActivityTypeBreakdownChartProps {
  activities: Activity[];
}

// Define colors for each activity type (can be customized)
const COLORS: { [key in ActivityType]?: string } = {
  [ActivityType.Application]: "#0088FE",
  [ActivityType.WebPage]: "#00C49F",
  [ActivityType.Idle]: "#FFBB28",
  [ActivityType.Other]: "#FF8042",
};

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

export function ActivityTypeBreakdownChart({
  activities,
}: ActivityTypeBreakdownChartProps) {
  const data = React.useMemo(() => {
    // Change from counts to duration sum
    const typeDurations: { [key in ActivityType]: number } = {
      [ActivityType.Application]: 0,
      [ActivityType.WebPage]: 0,
      [ActivityType.Idle]: 0,
      [ActivityType.Other]: 0,
    };

    activities.forEach((activity) => {
      if (typeDurations[activity.type] !== undefined) {
        // Sum durationMinutes instead of counting
        typeDurations[activity.type] += activity.durationMinutes;
      }
    });

    return (
      Object.entries(typeDurations)
        // Change variable name from value to duration
        .map(([name, duration]) => ({ name: name as ActivityType, duration }))
        .filter((entry) => entry.duration > 0)
    ); // Only include types with duration > 0
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
                  fill={COLORS[entry.name] || "#cccccc"}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [
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
