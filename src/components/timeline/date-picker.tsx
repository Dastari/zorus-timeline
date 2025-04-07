"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Matcher } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  className?: string;
  disabled?: boolean;
  fromDate?: Date;
  toDate?: Date;
  highlightedDays?: Date[];
}

// Define modifier styles (can be moved to globals.css if preferred)
const modifiersStyles = {
  hasEvents: { fontWeight: "bold" },
};

export function DatePicker({
  selectedDate,
  onDateChange,
  className,
  disabled = false,
  fromDate,
  toDate,
  highlightedDays = [],
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect = (date: Date | undefined) => {
    if (!disabled) {
      onDateChange(date);
      setIsOpen(false);
    }
  };

  // Define modifiers for react-day-picker
  const modifiers = {
    hasEvents: highlightedDays,
  };

  // Build the disabled matchers array
  const disabledMatchers: Matcher[] = [];
  if (disabled) {
    // Disable all days if the component itself is disabled
    disabledMatchers.push(() => true);
  } else {
    // Only apply date range disabling if the component is not generally disabled
    if (fromDate) {
      disabledMatchers.push({ before: fromDate });
    }
    if (toDate) {
      disabledMatchers.push({ after: toDate });
    }
  }

  return (
    <Popover
      open={isOpen}
      onOpenChange={(openState) => !disabled && setIsOpen(openState)}
    >
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className,
            disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? (
            format(selectedDate, "PPP")
          ) : (
            <span>Pick a date</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          initialFocus
          disabled={disabledMatchers.length > 0 ? disabledMatchers : undefined}
          fromDate={fromDate}
          toDate={toDate}
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
        />
      </PopoverContent>
    </Popover>
  );
}
