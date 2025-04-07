import { NextResponse } from "next/server";
import { z } from "zod";

// Define the expected request body schema using Zod for validation
const customerSearchSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().positive().optional().default(100),
  nameContains: z.string().optional(),
  sortProperty: z.enum(["Name"]).optional().default("Name"),
  sortAscending: z.boolean().optional().default(true),
  isEnabled: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  let body;
  try {
    // Validate request body
    body = customerSearchSchema.parse(await request.json());
  } catch (error) {
    // If validation fails, return a 400 error
    return NextResponse.json(
      { error: "Invalid request body", details: error },
      { status: 400 }
    );
  }

  // Ensure API URL and Key are set
  const apiUrl = process.env.ZORUS_API_URL;
  const apiKey = process.env.ZORUS_API_KEY;

  if (!apiUrl || !apiKey) {
    console.error(
      "ZORUS_API_URL or ZORUS_API_KEY is not set in environment variables."
    );
    return NextResponse.json(
      { error: "API configuration is missing" },
      { status: 500 }
    );
  }

  try {
    // Use correct API path prefix based on OpenAPI spec
    const response = await fetch(`${apiUrl}/api/customers/search`, {
      method: "POST",
      headers: {
        Authorization: `Impersonation ${apiKey}`,
        "Content-Type": "application/json",
        "Zorus-Api-Version": "1.0", // As specified in README
      },
      body: JSON.stringify(body),
      // Consider adding cache control if appropriate for Next.js fetch
      // cache: 'no-store' // Example: uncomment if you don't want caching
    });

    // Check if the proxied request was successful
    if (!response.ok) {
      // Attempt to parse error details from Zorus API response
      const errorData = await response.json().catch(() => null);
      console.error(`Zorus API error: ${response.status}`, errorData);
      throw new Error(`API error: ${response.status}`);
    }

    // Parse the successful response
    const data = await response.json();

    // Return the data from Zorus API
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching customers from Zorus API:", error);
    // Return a generic 500 error for internal issues
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}
