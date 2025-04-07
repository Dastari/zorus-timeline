import { NextResponse } from "next/server";
import { z } from "zod";

// Zod schema for endpoint search request body validation
const endpointSearchSchema = z.object({
  page: z.number().int().min(0).optional().default(1), // Allow 0, default 1
  pageSize: z.number().int().min(0).optional().default(0), // Allow 0, default 0
  sortProperty: z.enum(["Name"]).optional().default("Name"), // Only "Name" currently
  sortAscending: z.boolean().optional().default(true),
  isEnabled: z.boolean().optional().default(true),
  customerUuidEquals: z.string().uuid(), // Required UUID
  isCyberSightEnabled: z.boolean().optional().default(true),
  nameContains: z.string().optional(),
});

export async function POST(request: Request) {
  let body;
  try {
    body = endpointSearchSchema.parse(await request.json());
  } catch (error) {
    console.error("Endpoint search validation error:", error);
    return NextResponse.json(
      { error: "Invalid request body for endpoint search", details: error },
      { status: 400 }
    );
  }

  const apiUrl = process.env.ZORUS_API_URL;
  const apiKey = process.env.ZORUS_API_KEY;

  if (!apiUrl || !apiKey) {
    console.error("ZORUS_API_URL or ZORUS_API_KEY is not set.");
    return NextResponse.json(
      { error: "API configuration missing" },
      { status: 500 }
    );
  }

  try {
    // Target the actual Zorus API endpoint
    const response = await fetch(`${apiUrl}/api/endpoints/search`, {
      method: "POST",
      headers: {
        Authorization: `Impersonation ${apiKey}`,
        "Content-Type": "application/json",
        "Zorus-Api-Version": "1.0",
      },
      body: JSON.stringify(body), // Pass validated body
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error(
        `Zorus API error fetching endpoints: ${response.status}`,
        errorData
      );
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    // Assuming direct array response based on spec
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching endpoints from Zorus API:", error);
    return NextResponse.json(
      { error: "Failed to fetch endpoints" },
      { status: 500 }
    );
  }
}
