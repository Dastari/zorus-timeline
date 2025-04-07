"use client"; // This page now needs client-side interactivity

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  startOfDay,
  format,
  addDays,
  subDays,
  isSameDay,
  isBefore,
  isAfter,
} from "date-fns";

// Selectors
import { CustomerSelector } from "@/components/selectors/customer-selector";
import { EndpointSelector } from "@/components/selectors/endpoint-selector";
import { FileUpload } from "@/components/controls/file-upload";

// Timeline Components
import { DatePicker } from "@/components/timeline/date-picker";
import { ActivityFilters } from "@/components/timeline/activity-filters";
import { ZoomControls } from "@/components/timeline/zoom-controls";
import { Timeline } from "@/components/timeline/timeline";
import { ExportControls } from "@/components/timeline/export-controls";
import { ActivityDetails } from "@/components/activity/activity-details";

// Import Chart components
import { ActivityTypeBreakdownChart } from "@/components/charts/ActivityTypeBreakdownChart";
import { ApplicationBreakdownChart } from "@/components/charts/ApplicationBreakdownChart";
import { WebsiteBreakdownChart } from "@/components/charts/WebsiteBreakdownChart";

// Services & Types
import { getActivities } from "@/services/activity-service";
import { parseActivityCsv, ParsedCsvData } from "@/lib/csv-parser";
import {
  Customer,
  Endpoint,
  TimelineData,
  FilterState,
  ZoomLevel,
  Activity,
} from "@/types";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Define type for summary state
interface CsvSummary {
  startDate: Date;
  endDate: Date;
  totalEventCount: number;
  loadedFileName: string;
}

/**
 * Main single-page dashboard application.
 */
export default function DashboardPage() {
  // --- Selection State ---
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(
    null
  );

  // --- Timeline State ---
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

  // --- File Data State ---
  const [isFileData, setIsFileData] = useState(false);
  const [allParsedActivities, setAllParsedActivities] = useState<Activity[]>(
    []
  );
  const [fileDateRange, setFileDateRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [csvSummary, setCsvSummary] = useState<CsvSummary | null>(null);

  // --- Data Fetching ---
  const fetchActivitiesFromApi = useCallback(async () => {
    if (
      isFileData ||
      !selectedEndpoint ||
      !selectedEndpoint.lastLoggedOnUserUuid
    ) {
      if (!isFileData) {
        setError(
          selectedEndpoint
            ? "Selected endpoint has no associated user ID."
            : null
        );
      }
      setIsLoading(false);
      setFileDateRange(null);
      setCsvSummary(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setFileDateRange(null);
    setCsvSummary(null);
    try {
      const data = await getActivities(
        selectedEndpoint.lastLoggedOnUserUuid,
        selectedDate
      );
      setAllParsedActivities(data.activities || []);
      setFileDateRange({
        start: startOfDay(selectedDate),
        end: startOfDay(selectedDate),
      });
      setCsvSummary({
        startDate: startOfDay(selectedDate),
        endDate: startOfDay(selectedDate),
        totalEventCount: data.activities?.length || 0,
        loadedFileName: data.username,
      });
    } catch (err) {
      console.error("Failed to fetch activities:", err);
      setError(err instanceof Error ? err.message : "API fetch error");
      setAllParsedActivities([]);
      setFileDateRange(null);
      setCsvSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedEndpoint, selectedDate, isFileData]);

  useEffect(() => {
    if (!isFileData) {
      fetchActivitiesFromApi();
    }
  }, [fetchActivitiesFromApi, isFileData]);

  // --- File Loading Handler ---
  const handleFileLoad = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setAllParsedActivities([]);
    setFileDateRange(null);
    setCsvSummary(null);

    try {
      const csvString = await file.text();
      const parsedResult: ParsedCsvData = await parseActivityCsv(csvString);

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
        loadedFileName: file.name,
      });

      const today = startOfDay(new Date());
      setSelectedDate(
        today >= parsedResult.startDate && today <= parsedResult.endDate
          ? today
          : parsedResult.startDate
      );
      setIsFileData(true);
    } catch (err) {
      console.error("Error processing file:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load data from file."
      );
      setIsFileData(false);
      setAllParsedActivities([]);
      setFileDateRange(null);
      setCsvSummary(null);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Derived State: Filter activities for the selected day ---
  const activitiesForSelectedDay = useMemo(() => {
    return allParsedActivities.filter((act) =>
      isSameDay(act.startTime, selectedDate)
    );
  }, [allParsedActivities, selectedDate]);

  // --- Derived State: TimelineData object for components ---
  const currentTimelineData: TimelineData | null = useMemo(() => {
    const userId = isFileData
      ? "file-user"
      : selectedEndpoint?.lastLoggedOnUserUuid ?? "";
    const username = isFileData
      ? csvSummary?.loadedFileName ?? "File Data"
      : selectedEndpoint?.name ?? "Endpoint";

    if (!userId) return null;

    return {
      date: selectedDate,
      activities: activitiesForSelectedDay,
      userId: userId,
      username: username,
    };
  }, [
    selectedDate,
    activitiesForSelectedDay,
    isFileData,
    selectedEndpoint,
    csvSummary,
  ]);

  // NEW: Derive dates with events for calendar highlighting
  const datesWithEvents = useMemo(() => {
    const uniqueDates = new Set<number>(); // Store time values for uniqueness
    allParsedActivities.forEach((act) => {
      uniqueDates.add(startOfDay(act.startTime).getTime());
    });
    return Array.from(uniqueDates).map((time) => new Date(time));
  }, [allParsedActivities]);

  // --- Event Handlers ---
  const handleCustomerSelect = (customer: Customer | null) => {
    if (customer?.uuid !== selectedCustomer?.uuid) {
      setSelectedCustomer(customer);
      setSelectedEndpoint(null);
      setAllParsedActivities([]);
      setFileDateRange(null);
    }
  };

  const handleEndpointSelect = (endpoint: Endpoint | null) => {
    if (endpoint?.uuid !== selectedEndpoint?.uuid) {
      setSelectedEndpoint(endpoint);
      setAllParsedActivities([]);
      setFileDateRange(null);
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date && date.getTime() !== selectedDate.getTime()) {
      setSelectedDate(startOfDay(date));
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: boolean) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleZoomChange = (level: ZoomLevel) => {
    console.log("Zoom changed to:", level);
    setZoomLevel(level);
  };

  const handleActivityClick = (activity: Activity | null) => {
    setSelectedActivity(activity);
  };
  const handleCloseDetails = () => setSelectedActivity(null);

  // Date Navigation
  const handlePreviousDay = () => {
    const prevDay = subDays(selectedDate, 1);
    if (isFileData && fileDateRange && isBefore(prevDay, fileDateRange.start)) {
      return;
    }
    setSelectedDate(prevDay);
  };
  const handleNextDay = () => {
    const nextDay = addDays(selectedDate, 1);
    if (isFileData && fileDateRange && isAfter(nextDay, fileDateRange.end)) {
      return;
    }
    setSelectedDate(nextDay);
  };

  // Determine disabled state for date navigation
  const canGoPrev =
    !isFileData ||
    !fileDateRange ||
    !isSameDay(selectedDate, fileDateRange.start);
  const canGoNext =
    !isFileData ||
    !fileDateRange ||
    !isSameDay(selectedDate, fileDateRange.end);
  // && !isSameDay(selectedDate, startOfDay(new Date())); // Optional: Prevent going to future
  // Determine title based on data source
  const timelineTitle = isFileData
    ? `File: ${csvSummary?.loadedFileName ?? "Loading..."}`
    : selectedEndpoint
    ? `Activity for ${currentTimelineData?.username ?? "user"} on endpoint ${
        selectedEndpoint.name
      }`
    : "Select Customer/Endpoint or Load File";

  // --- Rendering Logic ---
  return (
    <div className="flex flex-col gap-6">
      {/* Top Row: Selectors & File Upload */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="text-sm font-medium mb-1 block">Customer</label>
          <CustomerSelector
            onSelectCustomer={handleCustomerSelect}
            selectedCustomerId={selectedCustomer?.uuid}
            disabled={isFileData || isLoading}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Endpoint</label>
          <EndpointSelector
            customerId={selectedCustomer?.uuid ?? ""}
            onSelectEndpoint={handleEndpointSelect}
            selectedEndpointId={selectedEndpoint?.uuid}
            disabled={!selectedCustomer || isFileData || isLoading}
          />
        </div>
        <div className="flex items-center justify-center md:justify-start border-t md:border-none pt-4 md:pt-0">
          <span className="text-sm text-muted-foreground mr-2 md:hidden lg:inline">
            OR
          </span>
          <FileUpload onFileSelect={handleFileLoad} disabled={isLoading} />
        </div>
      </div>

      <hr className="my-2 border-border" />

      {/* NEW: CSV Summary Display Area */}
      {isFileData && csvSummary && (
        <div className="p-4 border rounded-lg bg-card text-sm mb-4">
          <h3 className="font-semibold mb-2">CSV File Summary</h3>
          <p>
            <span className="font-medium">File Name:</span>{" "}
            {csvSummary.loadedFileName}
          </p>
          <p>
            <span className="font-medium">Date Range:</span>{" "}
            {format(csvSummary.startDate, "PPP")} to{" "}
            {format(csvSummary.endDate, "PPP")}
          </p>
          <p>
            <span className="font-medium">Total Events Found:</span>{" "}
            {csvSummary.totalEventCount}
          </p>
          {/* Add lines for unique users/machines here if data becomes available */}
        </div>
      )}

      {/* Timeline Area (Show if file data OR endpoint is selected) */}
      {isFileData || (selectedCustomer && selectedEndpoint) ? (
        <div className="flex flex-col gap-6">
          {/* Row 1: Controls (Disable DatePicker if file data?) */}
          <div className="flex flex-wrap items-center gap-4 border-b pb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 rounded-md border p-1">
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
                  fromDate={isFileData ? fileDateRange?.start : undefined}
                  toDate={isFileData ? fileDateRange?.end : undefined}
                  highlightedDays={datesWithEvents}
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
              <ActivityFilters
                filters={filters}
                onFilterChange={handleFilterChange}
              />
              <ZoomControls
                zoomLevel={zoomLevel}
                onZoomChange={handleZoomChange}
              />
              <ExportControls
                timelineData={currentTimelineData}
                disabled={!currentTimelineData || isLoading}
              />
            </div>
          </div>

          {/* Row 2: Main Timeline & Minimap */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
                    {isFileData
                      ? "No activity data found in file for the selected date."
                      : selectedEndpoint
                      ? `No activity data found for endpoint ${
                          selectedEndpoint.name
                        } on ${format(selectedDate, "PPP")}.`
                      : "No data to display."}
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
                      zoomLevel={zoomLevel}
                      onActivityClick={handleActivityClick}
                      selectedActivityId={selectedActivity?.id ?? null}
                      onZoomChange={handleZoomChange}
                      currentDate={selectedDate}
                    />
                  </>
                )}
            </div>
          </div>
          <ActivityDetails
            activity={selectedActivity}
            onClose={handleCloseDetails}
          />

          {/* Row 3: Charts Area */}
          {currentTimelineData && currentTimelineData.activities.length > 0 && (
            <>
              {/* Row 3a: App & Website Breakdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <ApplicationBreakdownChart
                  activities={currentTimelineData.activities}
                />
                <WebsiteBreakdownChart
                  activities={currentTimelineData.activities}
                />
              </div>
              {/* Row 3b: Activity Type Breakdown */}
              <div className="mt-6">
                {/* Can optionally center it or limit width */}
                <div className="max-w-md mx-auto">
                  <ActivityTypeBreakdownChart
                    activities={currentTimelineData.activities}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground">
            {isLoading
              ? "Loading..."
              : selectedCustomer
              ? "Please select an endpoint."
              : "Please select a customer or load a file."}
          </p>
        </div>
      )}
    </div>
  );
}
