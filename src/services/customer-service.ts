import { fetchWithError } from "./api";
import { Customer } from "@/types";

/**
 * Fetches a list of customers from the API proxy.
 * The API directly returns an array of customers.
 *
 * @param {number} [page=1] The page number to fetch (API likely 1-indexed).
 * @param {number} [pageSize=100] The number of items per page.
 * @param {string} [nameFilter] Optional filter for customer name.
 * @returns {Promise<Customer[]>} A promise that resolves with an array of customers.
 * @throws {Error} Throws an error if the fetch fails or the API returns an error.
 */
export async function getCustomers(
  page = 1, // Default to page 1 (likely 1-indexed)
  pageSize = 100, // Default to 100 page size
  nameFilter?: string
): Promise<Customer[]> {
  // Construct the request payload, including required sorting/filtering
  const payload: {
    page: number;
    pageSize: number;
    sortProperty: string;
    sortAscending: boolean;
    isEnabled: boolean;
    nameContains?: string;
  } = {
    page,
    pageSize,
    sortProperty: "Name", // Add default sort
    sortAscending: true, // Add default sort direction
    isEnabled: true, // Add filter for enabled customers
  };
  if (nameFilter) {
    payload.nameContains = nameFilter;
  }

  // Expect fetchWithError to return the array directly
  const customersArray = await fetchWithError<Customer[]>( // Expect Customer[] directly
    `/customers`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  // Validate that the response IS an array (basic check)
  if (!Array.isArray(customersArray)) {
    console.error(
      "Invalid customer response format: Expected an array, received:",
      customersArray
    );
    throw new Error("Failed to fetch customers due to invalid response format");
  }

  // Return the array of customers directly
  return customersArray;
}
