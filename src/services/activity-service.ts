import { format, parseISO } from "date-fns"; // Import parseISO
import { fetchWithError } from "./api";
import {
  TimelineData,
  ActivityResponse,
  Activity,
  ActivityType,
  RawActivity,
  RawTimelineData,
} from "@/types";

/**
 * Maps a raw activity type string from the API to the ActivityType enum.
 *
 * @param {string} type The raw activity type string.
 * @returns {ActivityType} The corresponding ActivityType enum value.
 */
function mapActivityType(type: string | null | undefined): ActivityType {
  if (!type) return ActivityType.Other;
  switch (type.toLowerCase()) {
    case "webpage":
    case "web":
    case "browser":
      return ActivityType.WebPage;
    case "application":
    case "app":
      return ActivityType.Application;
    case "idle":
      return ActivityType.Idle;
    default:
      return ActivityType.Other;
  }
}

/**
 * Transforms raw activity data from the API into the frontend Activity format.
 *
 * @param {RawActivity} rawActivity The raw activity object from the API.
 * @returns {Activity} The transformed activity object with Date objects and mapped types.
 */
function transformActivity(rawActivity: RawActivity): Activity {
  return {
    ...rawActivity,
    // Parse ISO date strings into Date objects
    startTime: parseISO(rawActivity.startTime),
    endTime: parseISO(rawActivity.endTime),
    // Map the raw type string to the ActivityType enum
    type: mapActivityType(rawActivity.type),
    // Ensure optional fields are handled correctly (they are already optional in RawActivity)
  };
}

/**
 * Fetches user activities for a specific date from the API proxy and transforms the data.
 *
 * @param {string} userId The UUID of the user.
 * @param {Date} date The date for which to fetch activities.
 * @returns {Promise<TimelineData>} A promise that resolves with the transformed timeline data.
 * @throws {Error} Throws an error if the fetch fails, parameters are invalid, or the API returns an error.
 */
export async function getActivities(
  userId: string,
  date: Date
): Promise<TimelineData> {
  // Basic validation for userId
  if (!userId) {
    throw new Error("User ID is required to fetch activities.");
  }
  // Validate date object
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error("Invalid date provided to getActivities.");
  }

  const formattedDate = format(date, "yyyy-MM-dd");

  // Use fetchWithError to call the proxy endpoint
  const response = await fetchWithError<ActivityResponse>(
    `/users/${userId}/activities?date=${formattedDate}` // Relative URL
  );

  // Validate the overall structure of the response
  if (!response || !response.success || !response.data) {
    console.error("Invalid activity response format:", response);
    throw new Error(
      response?.message || "Failed to fetch activities due to invalid format"
    );
  }

  const rawData: RawTimelineData = response.data;

  // Further validate the structure of the data object
  if (
    !rawData ||
    !Array.isArray(rawData.activities) ||
    !rawData.date ||
    !rawData.userId ||
    !rawData.username
  ) {
    console.error("Incomplete activity data received:", rawData);
    throw new Error("Incomplete activity data received from API");
  }

  // Transform the raw API response to the TimelineData format used by the frontend
  const transformedData: TimelineData = {
    date: parseISO(rawData.date), // Parse the date string
    userId: rawData.userId,
    username: rawData.username,
    // Map over raw activities and transform each one
    activities: rawData.activities.map(transformActivity),
  };

  return transformedData;
}

/**
 * Placeholder for generating a PDF Blob from TimelineData.
 *
 * @param {TimelineData} timelineData The data to export.
 * @returns {Promise<Blob>} A promise resolving with the PDF Blob.
 */
export async function exportActivityToPdf(
  timelineData: TimelineData
): Promise<Blob> {
  console.warn("PDF Export functionality is not yet fully implemented.");
  // Placeholder implementation
  return new Blob(
    [
      `PDF Report Placeholder
User: ${timelineData.username}
Date: ${format(timelineData.date, "yyyy-MM-dd")}
Activities: ${timelineData.activities.length}`,
    ],
    { type: "application/pdf" }
  );
}
