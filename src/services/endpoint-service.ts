import { fetchWithError } from "./api";
import { Endpoint, EndpointResponse, EndpointSearchRequestBody } from "@/types";

/**
 * Fetches a list of endpoints for a specific customer from the API proxy.
 * Assumes the API directly returns an array of endpoints.
 *
 * @param {string} customerId The UUID of the customer.
 * @param {number} [page=1] The page number to fetch (API likely 1-indexed, 0 might mean all).
 * @param {number} [pageSize=0] The number of items per page (0 might mean all).
 * @param {string} [nameFilter] Optional filter for endpoint name.
 * @returns {Promise<Endpoint[]>} A promise that resolves with an array of endpoints.
 * @throws {Error} Throws an error if the fetch fails, customerId is invalid, or the API returns an error.
 */
export async function getEndpoints(
  customerId: string,
  page = 1, // Using 1 as default, adjust if 0 is confirmed for 'all'
  pageSize = 0, // Using 0 as default for 'all', adjust if needed
  nameFilter?: string
): Promise<Endpoint[]> {
  if (!customerId) {
    throw new Error("Customer ID is required to fetch endpoints.");
  }

  // Construct the request payload
  const payload: EndpointSearchRequestBody = {
    page,
    pageSize,
    sortProperty: "Name",
    sortAscending: true,
    isEnabled: true,
    customerUuidEquals: customerId,
    isCyberSightEnabled: true,
  };
  if (nameFilter) {
    payload.nameContains = nameFilter;
  }

  // Endpoint defined in OpenAPI spec
  const endpointUrl = "/endpoints/search";

  const endpointsArray = await fetchWithError<EndpointResponse>(
    endpointUrl, // Use the correct relative URL for the endpoint search proxy
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!Array.isArray(endpointsArray)) {
    console.error(
      "Invalid endpoint response format: Expected an array, received:",
      endpointsArray
    );
    throw new Error("Failed to fetch endpoints due to invalid response format");
  }

  return endpointsArray;
}
