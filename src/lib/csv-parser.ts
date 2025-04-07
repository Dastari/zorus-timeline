import {
  parse,
  parseISO,
  differenceInMinutes,
  isValid,
  startOfDay,
} from "date-fns";
import Papa from "papaparse";
import { Activity, ActivityType } from "@/types";

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
function mapExcelActivityType(type: string | null | undefined): ActivityType {
  if (!type) return ActivityType.Other;
  const lowerType = type.toLowerCase();
  if (lowerType.includes("webpage") || lowerType.includes("web"))
    return ActivityType.WebPage;
  if (lowerType.includes("application")) return ActivityType.Application;
  if (lowerType.includes("idle")) return ActivityType.Idle;
  if (lowerType.includes("machine lock")) return ActivityType.Idle; // Map Machine Lock to Idle
  // Add other mappings if necessary
  return ActivityType.Other;
}

/**
 * Parses a duration string like "1m 2s" or "3h 4m 5s" or just seconds "34s" into total minutes.
 */
function parseDurationToMinutes(
  durationStr: string | null | undefined
): number {
  if (!durationStr) return 0;
  let totalSeconds = 0;
  const durationRegex = /(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?/i;
  const match = durationStr.match(durationRegex);

  if (match) {
    const hours = parseInt(match[1] || "0", 10);
    const minutes = parseInt(match[2] || "0", 10);
    const seconds = parseInt(match[3] || "0", 10);
    totalSeconds = hours * 3600 + minutes * 60 + seconds;
  } else {
    // Maybe it's just a number of seconds? Try parsing directly.
    const secondsOnly = parseInt(durationStr, 10);
    if (!isNaN(secondsOnly)) {
      totalSeconds = secondsOnly;
    } else {
      console.warn(`Could not parse duration string: ${durationStr}`);
    }
  }
  return Math.round(totalSeconds / 60); // Return minutes, rounded
}

/**
 * Parses a date/time string, attempting various formats.
 * Crucial for handling different date formats that might be in CSV.
 */
function parseCsvDateTime(dateTimeStr: string | null | undefined): Date | null {
  if (!dateTimeStr) return null;
  let parsedDate: Date | null = null;
  const formatsToTry = [
    "d/MM/yyyy HH:mm",
    "M/d/yyyy H:mm",
    "MM/dd/yyyy hh:mm:ss a", // Common CSV format
    "yyyy-MM-dd HH:mm:ss",
    "yyyy-MM-dd'T'HH:mm:ss",
    "iso", // ISO 8601
  ];
  console.log(`Attempting to parse: "${dateTimeStr}"`); // Log input string
  for (const fmt of formatsToTry) {
    try {
      if (fmt === "iso") {
        parsedDate = parseISO(dateTimeStr);
      } else {
        parsedDate = parse(dateTimeStr, fmt, new Date());
      }
      console.log(
        `  Trying format "${fmt}": Result valid? ${isValid(
          parsedDate
        )}, Value: ${parsedDate}`
      ); // Log result
      if (isValid(parsedDate)) break;
      parsedDate = null;
    } catch (e) {
      console.log(
        `  Format "${fmt}" threw error: ${e instanceof Error ? e.message : e}`
      );
      parsedDate = null;
    }
  }
  if (!parsedDate) {
    console.warn(`Could not parse date string from CSV: "${dateTimeStr}"`);
  }
  return isValid(parsedDate) ? parsedDate : null;
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
            throw new Error("CSV file contains no valid data rows.");
          }

          // Dynamically find header names (case-insensitive)
          const findHeader = (possibleNames: string[]): string | undefined => {
            const lowerCaseNames = possibleNames.map((n) => n.toLowerCase());
            return results.meta.fields?.find((f) =>
              lowerCaseNames.includes(f.toLowerCase())
            );
          };

          const headerStartTime = findHeader([
            "Start Date/Time",
            "StartTime",
            "Start Date",
          ]);
          const headerEndTime = findHeader([
            "End Date/Time",
            "EndTime",
            "End Date",
          ]);
          const headerActivityType = findHeader(["Activity Type", "Type"]);
          const headerDuration = findHeader(["Duration"]);
          const headerApplication = findHeader(["Application", "App"]);
          const headerWebsite = findHeader(["Website", "URL", "Webpage"]);
          const headerCategories = findHeader(["Categories", "Category"]);
          const headerTitle = findHeader(["Title"]); // Allow explicit title

          // Validate required headers were found
          if (!headerStartTime || !headerEndTime || !headerActivityType) {
            throw new Error(
              `Missing required columns in CSV file. Need at least variants of: Start Date/Time, End Date/Time, Activity Type. Found: ${results.meta.fields?.join(
                ", "
              )}`
            );
          }

          let minDate: Date | null = null;
          let maxDate: Date | null = null;
          const activities: Activity[] = [];
          let rawEventCount = 0; // Count rows before filtering/validation

          for (let i = 0; i < results.data.length; i++) {
            rawEventCount++;
            const row: CsvActivityRow = results.data[i];

            const startTime = parseCsvDateTime(
              row[headerStartTime!] as string | undefined
            );
            const endTime = parseCsvDateTime(
              row[headerEndTime!] as string | undefined
            );
            const activityTypeStr = row[headerActivityType!] as
              | string
              | undefined;

            if (!startTime || !endTime || !activityTypeStr) {
              console.warn(
                `Skipping CSV row ${
                  i + 1
                } due to missing/invalid required data (Start/End Time, Activity Type).`
              );
              continue;
            }

            // Track min/max dates
            if (!minDate || startTime < minDate) {
              minDate = startTime;
            }
            if (!maxDate || startTime > maxDate) {
              maxDate = startTime;
            }
            // Also check endTime for max date?
            if (endTime > (maxDate ?? startTime)) {
              maxDate = endTime;
            }

            const durationStr = headerDuration
              ? (row[headerDuration] as string | undefined)
              : undefined;
            const appStr = headerApplication
              ? (row[headerApplication] as string | undefined)
              : undefined;
            const webStr = headerWebsite
              ? (row[headerWebsite] as string | undefined)
              : undefined;
            const catStr = headerCategories
              ? (row[headerCategories] as string | undefined)
              : undefined;
            const titleStr = headerTitle
              ? (row[headerTitle] as string | undefined)
              : undefined;

            const activityType = mapExcelActivityType(activityTypeStr);
            const durationMinutes =
              parseDurationToMinutes(durationStr) ||
              differenceInMinutes(endTime, startTime);

            const activity: Activity = {
              id: `file-${i}`,
              type: activityType,
              title:
                titleStr ||
                appStr ||
                webStr ||
                activityTypeStr ||
                "Unknown Activity",
              startTime: startTime,
              endTime: endTime,
              durationMinutes: durationMinutes,
              applicationName: appStr || undefined,
              url: webStr || undefined,
              category: catStr || undefined,
            };
            activities.push(activity);
          }

          if (!minDate || !maxDate) {
            throw new Error(
              "Could not determine date range from the CSV file."
            );
          }
          if (activities.length === 0) {
            throw new Error("No valid activity rows found in the CSV file.");
          }

          // Return the full list and date range
          resolve({
            activities: activities.sort(
              (a, b) => a.startTime.getTime() - b.startTime.getTime()
            ),
            startDate: startOfDay(minDate),
            endDate: startOfDay(maxDate), // Use startOfDay for range consistency
            totalEventCount: rawEventCount, // Return the raw count
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
