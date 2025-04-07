"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label"; // Assuming Label component exists or using native label
import { FilterState, ActivityType } from "@/types";
import { cn } from "@/lib/utils";

interface ActivityFiltersProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: boolean) => void;
  className?: string;
}

// Helper to map FilterState keys to labels and colors
const filterOptions: {
  key: keyof FilterState;
  label: string;
  colorClass: string;
  type: ActivityType;
}[] = [
  {
    key: "webPages",
    label: "Web",
    colorClass: "bg-activity-web",
    type: ActivityType.WebPage,
  }, // Use Tailwind colors defined in config
  {
    key: "applications",
    label: "Apps",
    colorClass: "bg-activity-app",
    type: ActivityType.Application,
  },
  {
    key: "idle",
    label: "Idle",
    colorClass: "bg-activity-idle",
    type: ActivityType.Idle,
  },
  {
    key: "other",
    label: "Other",
    colorClass: "bg-activity-other",
    type: ActivityType.Other,
  },
];

export function ActivityFilters({
  filters,
  onFilterChange,
  className,
}: ActivityFiltersProps) {
  // Check if the Label component was added by shadcn, otherwise use native label
  const LabelComponent = Label || "label";

  return (
    <div className={cn("flex items-center space-x-4", className)}>
      <span className="text-sm font-medium mr-2">Show:</span>
      {filterOptions.map((option) => (
        <div key={option.key} className="flex items-center space-x-2">
          {/* Use a colored square matching the activity type color */}
          <div className={cn("w-3 h-3 rounded-sm", option.colorClass)}></div>
          <Checkbox
            id={`filter-${option.key}`}
            checked={filters[option.key]}
            onCheckedChange={(checked) => onFilterChange(option.key, !!checked)} // Pass boolean value
            aria-label={`Filter ${option.label}`}
          />
          <LabelComponent
            htmlFor={`filter-${option.key}`}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            {option.label}
          </LabelComponent>
        </div>
      ))}
    </div>
  );
}
