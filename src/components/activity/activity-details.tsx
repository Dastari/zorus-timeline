"use client";

import React from "react";
import { format } from "date-fns";
import { Globe, AppWindow, Clock, Info } from "lucide-react"; // Icons for details

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Activity, ActivityType } from "@/types";

interface ActivityDetailsProps {
  activity: Activity | null; // Can be null when closed
  onClose: () => void;
  // open: boolean; // Could control openness via prop instead of internal state if preferred
}

/**
 * Displays details of a selected activity in a dialog.
 */
export function ActivityDetails({
  activity,
  onClose,
}: // open
ActivityDetailsProps) {
  // Determine icon based on type
  const Icon = React.useMemo(() => {
    if (!activity) return Info;
    switch (activity.type) {
      case ActivityType.WebPage:
        return Globe;
      case ActivityType.Application:
        return AppWindow;
      case ActivityType.Idle:
        return Clock;
      default:
        return Info;
    }
  }, [activity]);

  // Render nothing if no activity is selected
  if (!activity) {
    return null;
  }

  return (
    <Dialog open={!!activity} onOpenChange={(isOpen) => !isOpen && onClose()}>
      {/* Dialog controlled by presence of 'activity' prop */}
      {/* onOpenChange calls onClose when the dialog requests to be closed */}
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Icon className="mr-2 h-5 w-5" />
            Activity Details
          </DialogTitle>
          <DialogDescription>
            Detailed information about the selected activity period.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <DetailItem label="Title" value={activity.title} />
          <DetailItem label="Type" value={activity.type} />
          <DetailItem
            label="Start Time"
            value={format(activity.startTime, "PPpp")}
          />
          <DetailItem
            label="End Time"
            value={format(activity.endTime, "PPpp")}
          />
          <DetailItem
            label="Duration"
            value={`${activity.durationMinutes} minutes`}
          />
          {/* Conditionally render fields based on type */}
          {activity.type === ActivityType.WebPage && activity.url && (
            <DetailItem label="URL" value={activity.url} isLink />
          )}
          {activity.type === ActivityType.Application &&
            activity.applicationName && (
              <DetailItem
                label="Application"
                value={activity.applicationName}
              />
            )}
          {activity.category && (
            <DetailItem label="Category" value={activity.category} />
          )}
          {activity.details && (
            <DetailItem label="Details" value={activity.details} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for consistent detail item rendering
interface DetailItemProps {
  label: string;
  value: string | number;
  isLink?: boolean;
}

function DetailItem({ label, value, isLink = false }: DetailItemProps) {
  return (
    <div className="grid grid-cols-3 items-center gap-4">
      <span className="text-right font-medium text-muted-foreground col-span-1">
        {label}:
      </span>
      <div className="col-span-2 text-sm">
        {isLink ? (
          <a
            href={value as string}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary/80 break-all"
          >
            {value}
          </a>
        ) : (
          <span className="break-words">{value}</span>
        )}
      </div>
    </div>
  );
}
