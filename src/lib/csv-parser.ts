import { Activity, ActivityType } from "@/types";
import { startOfDay, differenceInMinutes, isValid } from "date-fns";
import Papa from "papaparse";

// Interface for the expected (or possible) row structure from CSV
interface CsvActivityRow {
  [key: string]: string | number | undefined | null; // Allow any string key
  "Start Date/Time"?: string | number;
  StartTime?: string | number;
  "Start Date"?: string | number;
  "End Date/Time"?: string | number;
  EndTime?: string | number;
  "End Date"?: string | number;
  "Activity Type"?: string;
  Type?: string;
  Duration?: string;
  Application?: string;
  App?: string;
  Website?: string;
  URL?: string;
  Webpage?: string;
  Categories?: string;
  Category?: string;
  Title?: string;
}

/**
 * Maps spreadsheet activity type string to our enum.
 */
function mapExcelActivityType(typeStr: string): ActivityType {
  const lowerType = String(typeStr).toLowerCase(); // Ensure string comparison
  if (lowerType.includes("web") || lowerType.includes("http")) {
    return ActivityType.WebPage;
  } else if (
    lowerType.includes("app") ||
    lowerType.includes("program") ||
    lowerType.includes("exe")
  ) {
    return ActivityType.Application;
  } else if (
    lowerType.includes("idle") ||
    lowerType.includes("lock") ||
    lowerType.includes("away")
  ) {
    return ActivityType.Idle;
  }
  return ActivityType.Other;
}

/**
 * Function to safely parse the timestamp string - DEFINED HERE
 */
function parseTimestampToDate(
  timestampStr: string | null | undefined
): Date | null {
  if (!timestampStr) return null;
  try {
    // Ensure input is treated as string before parseFloat
    const timestampNum = parseFloat(String(timestampStr));
    if (isNaN(timestampNum)) return null;

    // Heuristic: Check if timestamp looks like seconds (e.g., 10 digits)
    // or milliseconds (e.g., 13 digits). Adjust accordingly.
    // This assumes timestamps are roughly around the current era.
    // Timestamps around 10^10 are likely seconds, around 10^13 are likely ms.
    const timestampMs =
      timestampNum > 100000000000 ? timestampNum : timestampNum * 1000; // If > 100 billion, assume ms, else assume seconds

    const date = new Date(timestampMs);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
}

// Define the return type for the parser
export interface ParsedCsvData {
  activities: Activity[];
  startDate: Date;
  endDate: Date;
  totalEventCount: number;
}

/**
 * Parses a CSV file string and transforms the data.
 *
 * @param {string} csvString The content of the CSV file.
 * @returns {Promise<ParsedCsvData>} A promise resolving with the parsed activities and date range.
 * @throws {Error} If parsing fails or data is invalid.
 */
export async function parseActivityCsv(
  csvString: string
): Promise<ParsedCsvData> {
  return new Promise((resolve, reject) => {
    Papa.parse<CsvActivityRow>(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          if (results.errors.length > 0) {
            console.error("CSV Parsing errors:", results.errors);
            // Optionally reject only on critical errors
            // reject(new Error(`CSV parsing errors occurred: ${results.errors[0]?.message}`));
            // return;
          }

          if (!results.data || results.data.length === 0) {
            throw new Error("CSV file is empty or has no data rows.");
          }
          const headers = Object.keys(results.data[0]).map((h) => h.trim());
          const findHeader = (possibleNames: string[]): string | null => {
            for (const name of possibleNames) {
              const found = headers.find(
                (h) => h.toLowerCase() === name.toLowerCase()
              );
              if (found) return found;
            }
            return null;
          };

          // Find UTC timestamp headers
          const startTimestampHeader = findHeader(["Start UTC Timestamp"]);
          const endTimestampHeader = findHeader(["End UTC Timestamp"]);

          // Find other necessary headers
          const activityTypeHeader = findHeader(["Activity Type", "Type"]);
          const appHeader = findHeader(["Application", "ApplicationName"]);
          const urlHeader = findHeader(["Website", "URL"]);
          const titleHeader = findHeader(["Window Title", "Title"]);
          const categoryHeader = findHeader(["Category", "Categories"]);
          // Find the Logged In User header
          const userHeader = findHeader(["Logged In User"]);

          // Validate required headers
          if (!(startTimestampHeader && endTimestampHeader)) {
            throw new Error(
              'Required date headers "Start UTC Timestamp" and "End UTC Timestamp" not found.'
            );
          }
          if (!activityTypeHeader)
            throw new Error('Required header "Activity Type" not found.');
          // NEW: Validate User header
          if (!userHeader) {
            throw new Error('Required header "Logged In User" not found.');
          }

          let minDate: Date | null = null;
          let maxDate: Date | null = null;
          const activities: Activity[] = [];
          let rawEventCount = 0;

          for (let i = 0; i < results.data.length; i++) {
            rawEventCount++;
            const row = results.data[i];

            // --- Use Timestamps (Convert row value to string) ---
            const startTime = parseTimestampToDate(
              String(row[startTimestampHeader!])
            );
            const endTime = parseTimestampToDate(
              String(row[endTimestampHeader!])
            );

            // Ensure Activity Type is string
            const activityTypeStr = String(row[activityTypeHeader] ?? "Other");
            const activityType = mapExcelActivityType(activityTypeStr);

            if (!startTime || !endTime) {
              console.warn(
                `Skipping row ${i + 2}: Could not parse valid UTC timestamps.`
              );
              continue; // Skip row if dates are invalid
            }

            // Recalculate durationMinutes
            let durationMinutes = differenceInMinutes(endTime, startTime);
            if (durationMinutes < 0) {
              console.warn(
                `Skipping row ${
                  i + 2
                }: Negative duration calculated (${durationMinutes} mins). Start: ${startTime}, End: ${endTime}`
              );
              continue; // Skip negative duration rows
            } else if (
              durationMinutes === 0 &&
              startTime.getTime() !== endTime.getTime()
            ) {
              // Handle cases less than a minute but not zero duration - show as 1 min?
              durationMinutes = 1;
            }

            // Date Range Tracking
            if (!minDate || startTime < minDate) minDate = startTime;
            if (!maxDate || endTime > maxDate) maxDate = endTime; // Use endTime for max range

            // Ensure other fields are strings or undefined
            const appName =
              row[appHeader ?? ""] != null
                ? String(row[appHeader ?? ""])
                : undefined;
            const url =
              row[urlHeader ?? ""] != null
                ? String(row[urlHeader ?? ""])
                : undefined;
            const title = String(row[titleHeader ?? ""] ?? "N/A");
            const category =
              row[categoryHeader ?? ""] != null
                ? String(row[categoryHeader ?? ""])
                : undefined;

            // Get the username, default to 'Unknown' if empty but present
            const username = String(row[userHeader!] ?? "Unknown User").trim();

            const activity: Activity = {
              id: `csv-${i}`,
              type: activityType,
              title: title,
              startTime: startTime,
              endTime: endTime,
              durationMinutes: durationMinutes,
              username: username || "Unknown User", // Assign username, ensure non-empty
              applicationName: appName,
              url: url,
              category: category,
            };
            activities.push(activity);
          }

          if (!minDate || !maxDate) {
            throw new Error(
              "Could not determine date range from the CSV file."
            );
          }
          if (activities.length === 0) {
            throw new Error(
              "No valid activity rows found or parsed in the CSV file."
            );
          }

          resolve({
            activities: activities.sort(
              (a, b) => a.startTime.getTime() - b.startTime.getTime()
            ),
            startDate: startOfDay(minDate),
            endDate: startOfDay(maxDate),
            totalEventCount: rawEventCount,
          });
        } catch (error) {
          console.error("Error processing parsed CSV data:", error);
          reject(
            error instanceof Error
              ? error
              : new Error("Failed to process CSV data.")
          );
        }
      },
      error: (error: Error) => {
        console.error("PapaParse error:", error);
        reject(new Error(`CSV parsing failed: ${error.message}`));
      },
    });
  });
}
