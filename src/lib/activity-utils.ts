import { differenceInSeconds } from "date-fns";

/**
 * Represents a time interval.
 */
export interface TimeInterval {
  start: Date;
  end: Date;
}

/**
 * Merges overlapping or adjacent time intervals.
 * Expects intervals sorted by start time.
 *
 * @param intervals - An array of time intervals, sorted by start time.
 * @returns A new array containing the merged intervals.
 */
export function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (!intervals || intervals.length === 0) {
    return [];
  }

  // Ensure input is sorted (defensive programming)
  intervals.sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: TimeInterval[] = [];
  // Use structuredClone for a deep copy of the first interval object
  let currentInterval = structuredClone(intervals[0]);

  for (let i = 1; i < intervals.length; i++) {
    const nextInterval = intervals[i];

    // Check if the next interval overlaps or is immediately adjacent
    // Use <= to merge adjacent intervals (e.g., [10:00-10:05] and [10:05-10:10])
    if (nextInterval.start <= currentInterval.end) {
      // Extend the current interval's end time if the next one ends later
      if (nextInterval.end > currentInterval.end) {
        currentInterval.end = nextInterval.end;
      }
    } else {
      // No overlap, push the current merged interval
      merged.push(currentInterval);
      // Start a new current interval (deep copy)
      currentInterval = structuredClone(nextInterval);
    }
  }

  // Push the last merged interval
  merged.push(currentInterval);

  return merged;
}

/**
 * Calculates the total duration in minutes from an array of time intervals,
 * using seconds for precision.
 *
 * @param intervals - An array of time intervals.
 * @returns The total duration in minutes (can be fractional).
 */
export function calculateTotalDuration(intervals: TimeInterval[]): number {
  let totalSeconds = 0;
  intervals.forEach((interval) => {
    // Calculate difference in seconds for precision
    const durationSeconds = Math.max(
      0,
      differenceInSeconds(interval.end, interval.start)
    );
    totalSeconds += durationSeconds;
  });

  // Convert total seconds to minutes
  const totalMinutes = totalSeconds / 60;

  return totalMinutes;
}
