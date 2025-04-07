"use client";

import React from "react";
import { Activity, ActivityType } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { User, Clock, Users } from "lucide-react";
import {
  mergeIntervals,
  calculateTotalDuration,
  TimeInterval,
} from "@/lib/activity-utils";

interface DailyUserSummaryProps {
  activities: Activity[];
  className?: string;
}

// Helper function to format duration
const formatDuration = (totalMinutes: number): string => {
  if (totalMinutes < 1) return "< 1 min";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  let result = "";
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0 || hours === 0) result += `${minutes}m`;
  return result.trim();
};

/**
 * Displays a summary of total active time for each user on the selected day.
 */
export function DailyUserSummary({
  activities,
  className,
}: DailyUserSummaryProps) {
  const userSummaries = React.useMemo(() => {
    const userIntervals: {
      [username: string]: TimeInterval[];
    } = {};

    // 1. Group non-idle activities into intervals per user
    (activities ?? []).forEach((activity) => {
      if (activity.type !== ActivityType.Idle) {
        const user = activity.username || "Unknown User";
        if (!userIntervals[user]) {
          userIntervals[user] = [];
        }
        if (
          activity.startTime instanceof Date &&
          activity.endTime instanceof Date
        ) {
          userIntervals[user].push({
            start: activity.startTime,
            end: activity.endTime,
          });
        } else {
          console.warn(
            "Skipping activity due to invalid date objects:",
            activity
          );
        }
      }
    });

    // 2. For each user, merge intervals and sum durations using utils
    const summaries = Object.entries(userIntervals).map(
      ([username, intervals]) => {
        const merged = mergeIntervals(intervals);
        const totalMinutes = calculateTotalDuration(merged);
        return {
          username,
          totalActiveMinutes: totalMinutes,
        };
      }
    );

    // 3. Sort final summaries by total time (descending)
    return summaries.sort(
      (a, b) => b.totalActiveMinutes - a.totalActiveMinutes
    );
  }, [activities]);

  return (
    <Card className={cn("py-0 gap-0 bg-slate-950 text-white", className)}>
      <CardHeader className="p-4 pb-0">
        <CardTitle className="text-base font-medium flex items-center">
          <Users className="h-4 w-4 mr-2" />
          Daily User Summaries
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 text-sm">
        {userSummaries.length > 0 ? (
          userSummaries.map((summary) => (
            <div
              key={summary.username}
              className="flex items-center justify-between py-1"
            >
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2 text-white" />
                <span>{summary.username}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1 text-white" />
                <span className="font-semibold">
                  {formatDuration(summary.totalActiveMinutes)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground italic py-1">
            No user activity data for this day.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
