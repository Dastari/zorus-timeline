// types/index.ts

// Activity Type Enumeration
export enum ActivityType {
  WebPage = "WebPage",
  Application = "Application",
  Idle = "Idle",
  Other = "Other",
}

// Customer/Organization Type
export interface Customer {
  uuid: string;
  name: string;
  createdDateUtc: string;
}

// User Type
export interface User {
  uuid: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  customerId: string;
}

// Activity Type
export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  details?: string;
  url?: string;
  applicationName?: string;
  category?: string;
}

// Timeline Data Type
export interface TimelineData {
  date: Date;
  activities: Activity[];
  userId: string;
  username: string;
}

// Filter State for Activity Types
export interface FilterState {
  webPages: boolean;
  applications: boolean;
  idle: boolean;
  other: boolean;
}

// Zoom Level Enumeration
export enum ZoomLevel {
  Hour = "1h",
  ThreeHours = "3h",
  SixHours = "6h",
  TwelveHours = "12h",
  Day = "24h",
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface CustomerResponse {
  // Adjusted to match the structure shown in the Zorus API contract section
  data: Customer[];
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface UserResponse {
  // Adjusted to match the structure shown in the Zorus API contract section
  data: User[];
  success: boolean;
  message?: string;
  errors?: string[];
}

// Type for the raw activity data structure coming from the API
export interface RawActivity {
  id: string;
  type: string; // Raw type is string, will be mapped
  title: string;
  startTime: string; // Raw time is string
  endTime: string; // Raw time is string
  durationMinutes: number;
  details?: string;
  url?: string;
  applicationName?: string;
  category?: string;
}

// Type for the raw timeline data structure coming from the API
export interface RawTimelineData {
  activities: RawActivity[];
  date: string; // Raw date is string
  userId: string;
  username: string;
}

export interface ActivityResponse {
  // Adjusted to match the structure shown in the Zorus API contract section
  data: RawTimelineData;
  success: boolean;
  message?: string;
  errors?: string[];
}

// --- Endpoint Types ---

// Based on EndpointListItem schema from OpenAPI spec
export interface Endpoint {
  uuid: string;
  name: string;
  customerUuid: string;
  customerName?: string | null;
  groupUuid?: string | null;
  groupName?: string | null;
  osName?: string | null;
  osVersion?: string | null;
  osArchitecture?: string | null;
  agentVersion?: string | null;
  lastCheckinTimeUtc?: string | null;
  lastLoggedOnUserUuid?: string | null; // Important for getting activities
  lastLoggedOnUsername?: string | null;
  isEnabled: boolean;
  isIsolated: boolean;
  cyberSightEnabled: boolean;
  // Add other relevant fields from EndpointListItem if needed
}

// Response type for endpoint search (assuming direct array response like customers)
// Adjust if the API wraps it differently
export type EndpointResponse = Endpoint[];

// Request body type for endpoint search (for validation/type safety)
export interface EndpointSearchRequestBody {
  page: number;
  pageSize: number;
  sortProperty?: string; // Should be SortableEndpointProperties enum value
  sortAscending?: boolean;
  isEnabled?: boolean;
  customerUuidEquals: string; // Required
  isCyberSightEnabled?: boolean;
  nameContains?: string; // For filtering in the selector
  // Add other filters from EndpointSearchAndSortingOptions if needed
}
