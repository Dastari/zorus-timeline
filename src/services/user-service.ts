import { fetchWithError } from "./api";
import { User, UserResponse } from "@/types";

/**
 * Fetches a list of users for a specific customer from the API proxy.
 *
 * @param {string} customerId The UUID of the customer.
 * @param {number} [page=1] The page number to fetch.
 * @param {number} [pageSize=20] The number of items per page.
 * @param {string} [nameFilter] Optional filter for username.
 * @returns {Promise<User[]>} A promise that resolves with an array of users.
 * @throws {Error} Throws an error if the fetch fails, customerId is invalid, or the API returns an error.
 */
export async function getUsers(
  customerId: string,
  page = 1,
  pageSize = 20,
  nameFilter?: string
): Promise<User[]> {
  // Basic validation for customerId (more specific UUID validation happens in the API route)
  if (!customerId) {
    throw new Error("Customer ID is required to fetch users.");
  }

  // Construct the request payload
  const payload: { page: number; pageSize: number; usernameContains?: string } =
    {
      page,
      pageSize,
    };
  if (nameFilter) {
    payload.usernameContains = nameFilter;
  }

  // Use the fetchWithError utility to call the proxy endpoint
  const response = await fetchWithError<UserResponse>(
    `/customers/${customerId}/users`, // Relative URL to the proxy endpoint
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  // Validate the structure of the response
  if (!response || !response.success || !Array.isArray(response.data)) {
    console.error("Invalid user response format:", response);
    throw new Error(
      response?.message || "Failed to fetch users due to invalid format"
    );
  }

  // Return the array of users
  return response.data;
}
