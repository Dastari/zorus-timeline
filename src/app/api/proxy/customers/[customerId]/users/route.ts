import { NextResponse } from "next/server";
import { z } from "zod";

// Define the expected request body schema using Zod for validation
const userSearchSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().positive().optional().default(20),
  usernameContains: z.string().optional(),
});

// Define the expected URL parameters schema
const paramsSchema = z.object({
  customerId: z.string().uuid(), // Assuming customerId is a UUID
});

export async function POST(
  request: Request,
  { params }: { params: { customerId: string } } // Default Next.js params typing
) {
  let validatedParams;
  try {
    // Validate URL parameters
    validatedParams = paramsSchema.parse(params);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid URL parameters (customerId must be a UUID)",
        details: error,
      },
      { status: 400 }
    );
  }

  let body;
  try {
    // Validate request body
    body = userSearchSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body", details: error },
      { status: 400 }
    );
  }

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
    const response = await fetch(
      `${apiUrl}/api/customers/${validatedParams.customerId}/users/search`,
      {
        method: "POST",
        headers: {
          Authorization: `Impersonation ${apiKey}`,
          "Content-Type": "application/json",
          "Zorus-Api-Version": "1.0",
        },
        body: JSON.stringify({
          page: body.page,
          pageSize: body.pageSize,
          ...(body.usernameContains && {
            usernameContains: body.usernameContains,
          }),
        }),
        // cache: 'no-store' // Consider cache control
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error(
        `Zorus API error fetching users: ${response.status}`,
        errorData
      );
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching users from Zorus API:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
