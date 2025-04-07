export const API_BASE_URL = "/api/proxy";

/**
 * Fetches data from the specified URL and throws an error if the response is not ok.
 * Automatically parses the JSON response.
 *
 * @template T The expected type of the JSON response data.
 * @param {string} url The URL to fetch from (relative to API_BASE_URL or absolute).
 * @param {RequestInit} [options] Optional fetch options (method, headers, body, etc.).
 * @returns {Promise<T>} A promise that resolves with the parsed JSON data.
 * @throws {Error} Throws an error if the fetch fails or the response status is not ok.
 */
export async function fetchWithError<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

  try {
    const response = await fetch(fullUrl, options);

    if (!response.ok) {
      let errorPayload: any = { message: `API error: ${response.status}` };
      try {
        // Attempt to parse specific error message from the API response body
        const errorJson = await response.json();
        errorPayload = errorJson;
        // Use the specific error message if available
        if (errorJson.message) {
          errorPayload.message = errorJson.message;
        } else if (errorJson.error) {
          // Handle cases where error is in an 'error' field
          errorPayload.message = errorJson.error;
        }
      } catch (e) {
        // Ignore if parsing error body fails, use the status code message
        console.warn("Could not parse error response body");
      }
      // Log the detailed error for debugging
      console.error("API Fetch Error:", response.status, errorPayload);
      // Throw an error that includes the status and potentially a message from the API
      throw new Error(errorPayload.message || `API error: ${response.status}`);
    }

    // Check if the response body is expected to be empty (e.g., 204 No Content)
    if (response.status === 204) {
      return null as T; // Return null or appropriate value for empty responses
    }

    // Parse the successful JSON response
    return (await response.json()) as T;
  } catch (error) {
    // Log and re-throw the error for upstream handling
    console.error("Fetch operation failed:", error);
    // Ensure we're throwing an actual Error object
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error("An unknown fetch error occurred");
    }
  }
}
