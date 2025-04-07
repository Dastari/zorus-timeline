import { NextResponse } from "next/server";
import { z } from "zod";
import { format } from "date-fns";

// Define the expected URL parameters schema
const paramsSchema = z.object({
  userId: z.string().uuid(), // Assuming userId is a UUID
});

// Define the expected search parameters schema
const searchParamsSchema = z.object({
  // Validate date is in yyyy-MM-dd format, default to today if not provided
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
});

export async function GET(
  request: Request,
  { params }: { params: { userId: string } } // Default Next.js params typing
) {
  let validatedParams;
  try {
    // Validate URL parameters (userId)
    validatedParams = paramsSchema.parse(params);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid URL parameters (userId must be a UUID)",
        details: error,
      },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  let validatedSearchParams;
  try {
    // Validate search parameters (date)
    // Convert URLSearchParams to an object for Zod parsing
    const searchParamsObj = Object.fromEntries(searchParams.entries());
    validatedSearchParams = searchParamsSchema.parse(searchParamsObj);
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid search parameters", details: error },
      { status: 400 }
    );
  }

  // Use validated date or default to today's date
  const date = validatedSearchParams.date || format(new Date(), "yyyy-MM-dd");

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
    const fetchUrl = `${apiUrl}/api/users/${validatedParams.userId}/activities?date=${date}`;

    const response = await fetch(fetchUrl, {
      method: "GET", // GET request for activities
      headers: {
        Authorization: `Impersonation ${apiKey}`,
        "Content-Type": "application/json",
        "Zorus-Api-Version": "1.0",
      },
      // cache: 'no-store' // Consider cache control
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error(
        `Zorus API error fetching activities: ${response.status}`,
        errorData
      );
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching activities from Zorus API:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}
