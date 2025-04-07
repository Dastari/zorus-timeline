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

interface WebsiteBreakdownChartProps {
  activities: Activity[];
}

const getDomain = (url: string | undefined): string | null => {
  if (!url) return null;
  try {
    const parsedUrl = new URL(url);
    if (!parsedUrl.hostname && parsedUrl.protocol) {
      return parsedUrl.protocol.replace(/:$/, "");
    }
    return parsedUrl.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

const formatDuration = (totalMinutes: number): string => {
  if (totalMinutes < 1) return "< 1 min";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  let result = "";
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0) result += `${minutes}m`;
  return result.trim();
};

export function WebsiteBreakdownChart({
  activities,
}: WebsiteBreakdownChartProps) {
  const data = React.useMemo(() => {
    const domainDurations: { [domain: string]: number } = {};

    activities
      .filter((act) => act.type === ActivityType.WebPage && act.url)
      .forEach((activity) => {
        const domain = getDomain(activity.url);
        if (domain) {
          domainDurations[domain] =
            (domainDurations[domain] || 0) + activity.durationMinutes;
        }
      });

    return Object.entries(domainDurations)
      .map(([name, duration]) => ({ name, duration }))
      .sort((a, b) => b.duration - a.duration);
  }, [activities]);

  const topDomains = data.slice(0, 10);

  if (!activities || activities.length === 0 || topDomains.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Website Usage Breakdown (Top 10 by Domain)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            No website activity data for this day.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Website Usage Breakdown (Top 10 by Domain)</CardTitle>
      </CardHeader>
      <CardContent className="pl-0">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={topDomains}
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
            <Bar dataKey="duration" fill="#10B981" name="Time Spent" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
