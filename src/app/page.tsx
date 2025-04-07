"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  startOfDay,
  format,
  addDays,
  subDays,
  isSameDay,
  isBefore,
  isAfter,
} from "date-fns";

// REMOVED Customer/Endpoint Selectors
import { FileUpload } from "@/components/controls/file-upload";
import { Input } from "@/components/ui/input";

// Timeline Components
import { DatePicker } from "@/components/timeline/date-picker";
import { Timeline } from "@/components/timeline/timeline";
import { ExportControls } from "@/components/timeline/export-controls";
import { ActivityDetails } from "@/components/activity/activity-details";

// Import Chart components
import { ActivityTypeBreakdownChart } from "@/components/charts/ActivityTypeBreakdownChart";
import { ApplicationBreakdownChart } from "@/components/charts/ApplicationBreakdownChart";
import { WebsiteBreakdownChart } from "@/components/charts/WebsiteBreakdownChart";
import { HourlyTimelineBreakdown } from "@/components/timeline/hourly-timeline-breakdown";
import { DailyUserSummary } from "@/components/timeline/daily-user-summary";

// Services & Types
import { parseActivityCsv /* REMOVED ParsedCsvData */ } from "@/lib/csv-parser";
import { TimelineData, FilterState, ZoomLevel, Activity } from "@/types";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Define type for summary state
interface CsvSummary {
  startDate: Date;
  endDate: Date;
  totalEventCount: number;
  source: string;
}

export default function DashboardPage() {
  // --- URL and Search Params ---
  const searchParams = useSearchParams();

  // --- Core State ---
  const [allParsedActivities, setAllParsedActivities] = useState<Activity[]>(
    []
  );
  const [csvUrl, setCsvUrl] = useState<string>("");
  const [csvSummary, setCsvSummary] = useState<CsvSummary | null>(null);
  const [fileDateRange, setFileDateRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  // --- UI / Timeline State ---
  const [selectedDate, setSelectedDate] = useState<Date>(
    startOfDay(new Date())
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    webPages: true,
    applications: true,
    idle: true,
    other: true,
  });
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(ZoomLevel.Day);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );

  // --- Data Processing Logic ---
  const processCsvData = useCallback(
    (csvString: string, sourceName: string) => {
      setIsLoading(true);
      setError(null);
      setAllParsedActivities([]);
      setFileDateRange(null);
      setCsvSummary(null);

      parseActivityCsv(csvString)
        .then((parsedResult) => {
          setAllParsedActivities(parsedResult.activities);
          const fileRange = {
            start: parsedResult.startDate,
            end: parsedResult.endDate,
          };
          setFileDateRange(fileRange);
          setCsvSummary({
            startDate: parsedResult.startDate,
            endDate: parsedResult.endDate,
            totalEventCount: parsedResult.totalEventCount,
            source: sourceName,
          });
          setSelectedDate(startOfDay(parsedResult.endDate));
          setError(null);
        })
        .catch((err) => {
          console.error("Error processing CSV data:", err);
          setError(
            err instanceof Error ? err.message : "Failed to parse CSV data."
          );
          setAllParsedActivities([]);
          setFileDateRange(null);
          setCsvSummary(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    []
  );

  // --- Event Handlers ---

  const handleLoadFromUrl = useCallback(
    async (urlOverride?: string) => {
      const urlToLoad = urlOverride || csvUrl;
      if (!urlToLoad) {
        setError("Please enter a URL.");
        return;
      }
      console.log(`Attempting to load CSV from URL: ${urlToLoad}`);
      setIsLoading(true);
      setError(null);
      setAllParsedActivities([]);
      setFileDateRange(null);
      setCsvSummary(null);

      try {
        const response = await fetch(urlToLoad);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch CSV: ${response.status} ${response.statusText}`
          );
        }
        const csvString = await response.text();
        console.log(`Successfully fetched ${csvString.length} characters.`);
        processCsvData(csvString, urlToLoad);
      } catch (err) {
        console.error("Failed to load from URL:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load data from URL."
        );
        setIsLoading(false);
      }
    },
    [csvUrl, processCsvData]
  );

  const handleFileLoad = useCallback(
    async (file: File) => {
      console.log(`Processing local file: ${file.name}`);
      const csvString = await file.text();
      processCsvData(csvString, file.name);
    },
    [processCsvData]
  );

  const handleUnloadCsv = useCallback(() => {
    console.log("Unloading CSV data and clearing URL parameter.");
    // Clear application state
    setAllParsedActivities([]);
    setFileDateRange(null);
    setCsvSummary(null);
    setCsvUrl("");
    setSelectedDate(startOfDay(new Date()));
    setError(null);
    setIsLoading(false); // Ensure loading state is reset if unload is clicked during load

    // Clear the URL query parameter without reloading
    if (typeof window !== "undefined") {
      // Ensure this runs only client-side
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete("url");
      window.history.pushState({}, "", currentUrl.toString());
    }
  }, []); // No dependencies needed

  // --- Effect for Initial Load from Query Parameter ---
  useEffect(() => {
    const urlParam = searchParams?.get("url");
    if (urlParam) {
      console.log(`Query Param Check: Found URL parameter: ${urlParam}`);
      if (!isLoading && csvSummary?.source !== urlParam) {
        console.log(`Query Param Load: Triggering load for ${urlParam}`);
        setCsvUrl(urlParam);
        handleLoadFromUrl(urlParam);
      } else {
        console.log(
          `Query Param Check: Skipping load for ${urlParam} (already loaded/loading/matches current?)`
        );
        if (urlParam !== csvUrl) {
          setCsvUrl(urlParam);
        }
      }
    } else {
      console.log("Query Param Check: No URL parameter found.");
    }
    // This effect should run only once when searchParams are initially available
    // or if they somehow change during the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // --- Derived State: TimelineData ---
  const currentTimelineData: TimelineData | null = useMemo(() => {
    const activitiesForSelectedDay = allParsedActivities.filter((act) =>
      isSameDay(act.startTime, selectedDate)
    );

    const sourceId = csvSummary?.source || "csv-data";

    if (allParsedActivities.length === 0) return null;

    return {
      date: selectedDate,
      activities: activitiesForSelectedDay,
      userId: sourceId,
      username: sourceId,
    };
  }, [selectedDate, allParsedActivities, csvSummary?.source]);

  // --- Derived State: Dates with Events ---
  const datesWithEvents = useMemo(() => {
    const uniqueDates = new Set<number>();
    allParsedActivities.forEach((act) => {
      uniqueDates.add(startOfDay(act.startTime).getTime());
    });
    return Array.from(uniqueDates).map((time) => new Date(time));
  }, [allParsedActivities]);

  // --- Memoized Event Handlers for Timeline/Date Nav ---
  const handleDateChange = useCallback(
    (date: Date | undefined) => {
      if (date && date.getTime() !== selectedDate.getTime()) {
        setSelectedDate(startOfDay(date));
        setSelectedActivity(null);
      }
    },
    [selectedDate]
  );

  const handleFilterChange = useCallback(
    (key: keyof FilterState, value: boolean) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleZoomChange = useCallback((level: ZoomLevel) => {
    console.log("Zoom changed to:", level);
    setZoomLevel(level);
  }, []);

  const handleActivityClick = useCallback((activity: Activity | null) => {
    setSelectedActivity(activity);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedActivity(null);
  }, []);

  const handlePreviousDay = useCallback(() => {
    const prevDay = subDays(selectedDate, 1);
    if (fileDateRange && isBefore(prevDay, fileDateRange.start)) {
      return;
    }
    setSelectedDate(prevDay);
    setSelectedActivity(null);
  }, [selectedDate, fileDateRange]);

  const handleNextDay = useCallback(() => {
    const nextDay = addDays(selectedDate, 1);
    if (fileDateRange && isAfter(nextDay, fileDateRange.end)) {
      return;
    }
    setSelectedDate(nextDay);
    setSelectedActivity(null);
  }, [selectedDate, fileDateRange]);

  // --- Derived State for Navigation Buttons ---
  const canGoPrev =
    !fileDateRange || !isSameDay(selectedDate, fileDateRange.start);
  const canGoNext =
    !fileDateRange || !isSameDay(selectedDate, fileDateRange.end);

  // --- Timeline Title ---
  const timelineTitle = csvSummary?.source
    ? `Timeline Activity (${csvSummary.source})`
    : "Load CSV Data";

  // --- Rendering Logic ---
  return (
    <div className="flex flex-col gap-6">
      {/* Top Row: Load Controls */}
      <div className="flex flex-wrap items-end gap-4 p-4 border rounded-md bg-white shadow-md">
        {/* URL Input */}
        <div className="flex-1 min-w-[300px]">
          <label
            htmlFor="csv-url-input"
            className="block text-sm font-medium mb-1"
          >
            Load CSV from URL
          </label>
          <Input
            id="csv-url-input"
            type="url"
            placeholder="https://.../data.csv"
            value={csvUrl}
            onChange={(e) => setCsvUrl(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <Button
          onClick={() => handleLoadFromUrl()}
          disabled={isLoading || !csvUrl}
        >
          Load from URL
        </Button>

        <div className="text-center text-sm text-muted-foreground mx-2 self-center">
          OR
        </div>

        {/* Local File Upload */}
        <div className="flex items-center gap-2">
          <FileUpload
            onFileSelect={handleFileLoad}
            disabled={isLoading}
            className="self-end"
          />
          {(allParsedActivities.length > 0 || csvSummary) && (
            <Button
              onClick={handleUnloadCsv}
              disabled={isLoading}
              className="self-end"
              variant="secondary"
            >
              Unload Data
            </Button>
          )}
        </div>
      </div>

      {/* Timeline Area - Conditional on data having been loaded */}
      {currentTimelineData ? (
        <div className="flex flex-col gap-6">
          {/* Row 1: Date Navigation & Export */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 rounded-md border p-1 bg-white">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePreviousDay}
                  disabled={!canGoPrev || isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <DatePicker
                  selectedDate={selectedDate}
                  onDateChange={handleDateChange}
                  disabled={isLoading}
                  fromDate={fileDateRange?.start}
                  toDate={fileDateRange?.end}
                  highlightedDays={datesWithEvents}
                  className="border-0 bg-white shadow-none"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextDay}
                  disabled={!canGoNext || isLoading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-lg font-semibold">
                {format(selectedDate, "PPP")}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 flex-grow justify-end">
              <ExportControls
                timelineData={currentTimelineData}
                disabled={!currentTimelineData || isLoading}
              />
            </div>
          </div>

          {/* Daily User Summary */}
          {currentTimelineData.activities.length > 0 && (
            <DailyUserSummary activities={currentTimelineData.activities} />
          )}

          {/* Row 2: Main Timeline Container */}
          <div className="grid grid-cols-1 gap-6">
            <div className="lg:col-span-4 border rounded-lg p-4 bg-card min-h-[150px]">
              {isLoading && (
                <div className="text-center p-4">Loading data...</div>
              )}
              {error && (
                <div className="text-destructive text-center p-4">
                  Error: {error}
                </div>
              )}
              {!isLoading &&
                !error &&
                !currentTimelineData?.activities.length && (
                  <div className="text-center p-4 text-muted-foreground">
                    No activity data found for the selected date.
                  </div>
                )}
              {!isLoading &&
                !error &&
                currentTimelineData &&
                currentTimelineData.activities.length > 0 && (
                  <>
                    <p className="mb-2 text-center font-medium text-sm text-muted-foreground">
                      {timelineTitle}
                    </p>
                    <Timeline
                      activities={currentTimelineData.activities}
                      filters={filters}
                      onFilterChange={handleFilterChange}
                      zoomLevel={zoomLevel}
                      onZoomChange={handleZoomChange}
                      onActivityClick={handleActivityClick}
                      selectedActivityId={selectedActivity?.id ?? null}
                      currentDate={selectedDate}
                    />
                  </>
                )}
            </div>
          </div>

          {/* Activity Details Dialog */}
          <ActivityDetails
            activity={selectedActivity}
            onClose={handleCloseDetails}
          />

          {/* Row 3: Charts Area */}
          {currentTimelineData && currentTimelineData.activities.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ApplicationBreakdownChart
                  activities={currentTimelineData.activities}
                />
                <WebsiteBreakdownChart
                  activities={currentTimelineData.activities}
                />
                <ActivityTypeBreakdownChart
                  activities={currentTimelineData.activities}
                />
              </div>
            </>
          )}

          {/* Hourly Breakdown Panel */}
          {currentTimelineData && currentTimelineData.activities.length > 0 && (
            <div>
              <HourlyTimelineBreakdown
                activities={currentTimelineData.activities}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="text-center p-8 text-muted-foreground">
          {isLoading
            ? "Loading data..."
            : error
            ? `Error: ${error}`
            : "Load a CSV file via URL or upload to view activity."}
        </div>
      )}
    </div>
  );
}
