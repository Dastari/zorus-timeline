# 🕒 Zorus Activity Timeline Viewer - Technical Specification

A comprehensive Next.js-based visual timeline viewer for Zorus user activity logs with organization and user selection capabilities. This application visualizes daily activity across websites, applications, idle periods, and more.

## 📑 Table of Contents
- [Project Overview](#project-overview)
- [Technical Architecture](#technical-architecture)
- [App Router Structure](#app-router-structure)
- [API Endpoints](#api-endpoints)
- [Data Models](#data-models)
- [UI Components](#ui-components)
- [Feature Implementation](#feature-implementation)
- [Styling & Theming](#styling--theming)
- [Installation & Setup](#installation--setup)

## 🔍 Project Overview

The Zorus Activity Timeline is a web application that allows viewing and analysis of user activity data from the Zorus API. The application enables:

- Organization selection from available customers
- User selection within the chosen organization
- Date selection to view activities
- Timeline visualization of user activities with color coding
- Filtering activities by type (web, app, idle, other)
- Adjustable zoom levels for timeline granularity
- Minimap overview of daily activities
- Detailed view of individual activities
- PDF export of activity reports
- Print-optimized layout

## 🏗️ Technical Architecture

This project must be built using:

- **Next.js 15** - Using the App Router for server components and API routes
- **TypeScript** - For type safety and better developer experience
- **Tailwind CSS v4** - For styling (latest version with all new features)
- **shadcn/ui** - For UI components built on Radix UI primitives
- **date-fns** - For date handling and formatting
- **html2canvas/jsPDF** - For PDF export functionality
- **Zod** - For runtime validation

### Core Dependencies:
```json
{
  "dependencies": {
    "@radix-ui/react-checkbox": "^1.0.4",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-popover": "^1.0.7",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-tabs": "^1.0.4",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "date-fns": "^3.3.1",
    "html2canvas": "^1.4.1",
    "jspdf": "^2.5.1",
    "lucide-react": "^0.309.0",
    "next": "15.0.0",
    "react": "^18.3.0",
    "react-day-picker": "^8.10.0",
    "react-dom": "^18.3.0",
    "tailwind-merge": "^2.2.0",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.11.5",
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "autoprefixer": "^10.4.17",
    "eslint": "^8.56.0",
    "eslint-config-next": "15.0.0",
    "postcss": "^8.4.33",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.3.3"
  }
}
```

## 📁 App Router Structure

The application uses Next.js 15 App Router with the following structure:

```
/app
  /api
    /proxy
      /customers/route.ts
      /customers/[customerId]/users/route.ts
      /users/[userId]/activities/route.ts
  /(dashboard)
    /layout.tsx
    /page.tsx
    /[organizationId]/page.tsx
    /[organizationId]/[userId]/page.tsx
  /components
    /ui            # shadcn components
      /button.tsx
      /card.tsx
      /calendar.tsx
      /checkbox.tsx
      /dialog.tsx
      /dropdown-menu.tsx
      /select.tsx
      /tabs.tsx
    /activity      # activity-specific components
      /activity-details.tsx
    /selectors     # organization/user selection components
      /organization-selector.tsx
      /user-selector.tsx
    /timeline      # timeline visualization components
      /activity-bar.tsx
      /activity-filters.tsx
      /date-picker.tsx
      /export-controls.tsx
      /timeline.tsx
      /timeline-minimap.tsx
      /timeline-scale.tsx
      /zoom-controls.tsx
  /lib
    /utils.ts
    /constants.ts
  /services
    /api.ts
    /activity-service.ts
    /organization-service.ts
    /user-service.ts
  /types
    /index.ts
```

## 🔌 API Endpoints

### Next.js API Routes (Proxy Implementation)

To solve CORS issues, the application uses Next.js API routes to proxy requests to the Zorus API:

#### 1. Organization/Customer Endpoint

```typescript
// app/api/proxy/customers/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  
  try {
    const response = await fetch(`${process.env.ZORUS_API_URL}/customers/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ZORUS_API_KEY}`,
        'Content-Type': 'application/json',
        'Zorus-Api-Version': '1.0'
      },
      body: JSON.stringify({
        page: body.page || 1,
        pageSize: body.pageSize || 20,
        nameContains: body.nameContains
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}
```

#### 2. Users Endpoint

```typescript
// app/api/proxy/customers/[customerId]/users/route.ts
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { customerId: string } }
) {
  const body = await request.json();
  
  try {
    const response = await fetch(
      `${process.env.ZORUS_API_URL}/customers/${params.customerId}/users/search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.ZORUS_API_KEY}`,
          'Content-Type': 'application/json',
          'Zorus-Api-Version': '1.0'
        },
        body: JSON.stringify({
          page: body.page || 1,
          pageSize: body.pageSize || 20,
          usernameContains: body.usernameContains
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
```

#### 3. User Activities Endpoint

```typescript
// app/api/proxy/users/[userId]/activities/route.ts
import { NextResponse } from 'next/server';
import { format } from 'date-fns';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
  
  try {
    const response = await fetch(
      `${process.env.ZORUS_API_URL}/users/${params.userId}/activities?date=${date}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.ZORUS_API_KEY}`,
          'Content-Type': 'application/json',
          'Zorus-Api-Version': '1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}
```

### Zorus API Contracts

The Zorus API expects and returns the following data structures:

#### Customer Search
- **Endpoint**: `POST /customers/search`
- **Request**:
  ```json
  {
    "page": 1,
    "pageSize": 20,
    "nameContains": "string"
  }
  ```
- **Response**:
  ```json
  {
    "data": [
      {
        "uuid": "string",
        "name": "string",
        "createdDateUtc": "string"
      }
    ],
    "success": true,
    "message": "string",
    "errors": []
  }
  ```

#### User Search
- **Endpoint**: `POST /customers/{customerId}/users/search`
- **Request**:
  ```json
  {
    "page": 1,
    "pageSize": 20,
    "usernameContains": "string"
  }
  ```
- **Response**:
  ```json
  {
    "data": [
      {
        "uuid": "string",
        "username": "string",
        "email": "string",
        "firstName": "string",
        "lastName": "string",
        "customerId": "string"
      }
    ],
    "success": true,
    "message": "string",
    "errors": []
  }
  ```

#### User Activities
- **Endpoint**: `GET /users/{userId}/activities?date=2023-04-01`
- **Response**:
  ```json
  {
    "data": {
      "activities": [
        {
          "id": "string",
          "type": "string",
          "title": "string",
          "startTime": "string",
          "endTime": "string",
          "durationMinutes": 30,
          "details": "string",
          "url": "string",
          "applicationName": "string",
          "category": "string"
        }
      ],
      "date": "2023-04-01",
      "userId": "string",
      "username": "string"
    },
    "success": true,
    "message": "string",
    "errors": []
  }
  ```

## 📊 Data Models

```typescript
// types/index.ts

// Activity Type Enumeration
export enum ActivityType {
  WebPage = 'WebPage',
  Application = 'Application',
  Idle = 'Idle',
  Other = 'Other',
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
  Hour = '1h',
  ThreeHours = '3h',
  SixHours = '6h',
  TwelveHours = '12h',
  Day = '24h',
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface CustomerResponse {
  data: Customer[];
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface UserResponse {
  data: User[];
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface ActivityResponse {
  data: TimelineData;
  success: boolean;
  message?: string;
  errors?: string[];
}
```

## 🧩 UI Components

### Main Page Components:

#### 1. Organization Selector
```typescript
// components/selectors/organization-selector.tsx
// Key props:
// - onSelectOrganization: (customer: Customer) => void
// - selectedOrganizationId?: string
```

#### 2. User Selector
```typescript
// components/selectors/user-selector.tsx
// Key props:
// - organizationId: string
// - onSelectUser: (user: User) => void
// - selectedUserId?: string
```

#### 3. Timeline Component
```typescript
// components/timeline/timeline.tsx
// Key props:
// - activities: Activity[]
// - filters: FilterState
// - zoomLevel: ZoomLevel
// - className?: string
```

### Core Timeline Components:

#### 1. TimelineScale
```typescript
// components/timeline/timeline-scale.tsx
// Key props:
// - startHour: number
// - endHour: number
// - interval: 15 | 30 | 60
// - className?: string
```

#### 2. ActivityBar
```typescript
// components/timeline/activity-bar.tsx
// Key props:
// - activity: Activity
// - startHour: number
// - endHour: number
// - onClick?: (activity: Activity) => void
// - isSelected?: boolean
```

#### 3. TimelineMinimap
```typescript
// components/timeline/timeline-minimap.tsx
// Key props:
// - activities: Activity[]
// - startHour?: number
// - endHour?: number
// - visibleStartHour: number
// - visibleEndHour: number
// - onRangeChange?: (startHour: number, endHour: number) => void
// - className?: string
```

#### 4. ActivityFilters
```typescript
// components/timeline/activity-filters.tsx
// Key props:
// - filters: FilterState
// - onFilterChange: (key: keyof FilterState, value: boolean) => void
// - className?: string
```

#### 5. ZoomControls
```typescript
// components/timeline/zoom-controls.tsx
// Key props:
// - zoomLevel: ZoomLevel
// - onZoomChange: (level: ZoomLevel) => void
// - className?: string
```

#### 6. DatePicker
```typescript
// components/timeline/date-picker.tsx
// Key props:
// - selectedDate: Date
// - onDateChange: (date: Date) => void
// - className?: string
```

#### 7. ExportControls
```typescript
// components/timeline/export-controls.tsx
// Key props:
// - timelineData: TimelineData
// - className?: string
```

## 🔧 Feature Implementation

### 1. API Services

```typescript
// services/api.ts - Base API service
export const API_BASE_URL = '/api/proxy';

export async function fetchWithError<T>(
  url: string, 
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.message || `API error: ${response.status}`
    );
  }
  
  return await response.json() as T;
}
```

```typescript
// services/organization-service.ts
import { fetchWithError, API_BASE_URL } from './api';
import { Customer, CustomerResponse } from '@/types';

export async function getOrganizations(
  page = 1,
  pageSize = 20,
  nameFilter?: string
): Promise<Customer[]> {
  const response = await fetchWithError<CustomerResponse>(
    `${API_BASE_URL}/customers`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page,
        pageSize,
        nameContains: nameFilter
      }),
    }
  );
  
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Failed to fetch organizations');
  }
  
  return response.data;
}
```

```typescript
// services/user-service.ts
import { fetchWithError, API_BASE_URL } from './api';
import { User, UserResponse } from '@/types';

export async function getUsers(
  organizationId: string,
  page = 1,
  pageSize = 20,
  nameFilter?: string
): Promise<User[]> {
  const response = await fetchWithError<UserResponse>(
    `${API_BASE_URL}/customers/${organizationId}/users`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page,
        pageSize,
        usernameContains: nameFilter
      }),
    }
  );
  
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Failed to fetch users');
  }
  
  return response.data;
}
```

```typescript
// services/activity-service.ts
import { format } from 'date-fns';
import { fetchWithError, API_BASE_URL } from './api';
import { TimelineData, ActivityResponse, Activity, ActivityType } from '@/types';

export async function getActivities(
  userId: string,
  date: Date
): Promise<TimelineData> {
  const formattedDate = format(date, 'yyyy-MM-dd');
  
  const response = await fetchWithError<ActivityResponse>(
    `${API_BASE_URL}/users/${userId}/activities?date=${formattedDate}`
  );
  
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Failed to fetch activities');
  }
  
  // Transform API response to our TimelineData format
  return {
    ...response.data,
    date: new Date(response.data.date),
    activities: response.data.activities.map(activity => ({
      ...activity,
      startTime: new Date(activity.startTime),
      endTime: new Date(activity.endTime),
      type: mapActivityType(activity.type)
    }))
  };
}

function mapActivityType(type: string): ActivityType {
  switch (type.toLowerCase()) {
    case 'webpage':
    case 'web':
    case 'browser':
      return ActivityType.WebPage;
    case 'application':
    case 'app':
      return ActivityType.Application;
    case 'idle':
      return ActivityType.Idle;
    default:
      return ActivityType.Other;
  }
}

export async function exportActivityToPdf(timelineData: TimelineData): Promise<Blob> {
  // Implementation with html2canvas and jsPDF
  // Example implementation placeholder
  return new Blob(['PDF placeholder'], { type: 'application/pdf' });
}
```

### 2. PDF Export Implementation

```typescript
// services/export-service.ts
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { TimelineData, Activity } from '@/types';
import { format } from 'date-fns';

export async function generateActivityPdf(
  timelineData: TimelineData,
  timelineElement: HTMLElement
): Promise<Blob> {
  // Create a new PDF document
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
  });
  
  // Add header
  pdf.setFontSize(22);
  pdf.text('Activity Timeline Report', 14, 22);
  
  // Add date and user info
  pdf.setFontSize(12);
  pdf.text(`Date: ${format(timelineData.date, 'MMMM d, yyyy')}`, 14, 35);
  pdf.text(`User: ${timelineData.username}`, 14, 42);
  
  // Capture timeline image
  const canvas = await html2canvas(timelineElement, {
    scale: 1,
    logging: false,
    useCORS: true
  });
  
  // Add timeline image to PDF
  const timelineImg = canvas.toDataURL('image/png');
  pdf.addImage(timelineImg, 'PNG', 14, 50, 270, 60);
  
  // Add activity details table
  pdf.addPage();
  pdf.setFontSize(18);
  pdf.text('Detailed Activity List', 14, 22);
  
  // Table headers
  const headers = ['Time', 'Duration', 'Type', 'Title', 'Details'];
  let y = 35;
  
  pdf.setFontSize(10);
  pdf.setTextColor(100);
  pdf.text(headers[0], 14, y);
  pdf.text(headers[1], 55, y);
  pdf.text(headers[2], 85, y);
  pdf.text(headers[3], 115, y);
  pdf.text(headers[4], 180, y);
  
  // Draw header line
  pdf.setDrawColor(200);
  pdf.line(14, y + 3, 280, y + 3);
  
  // Draw activity rows
  pdf.setTextColor(0);
  y += 12;
  
  timelineData.activities.forEach((activity) => {
    if (y > 180) {
      pdf.addPage();
      y = 20;
    }
    
    pdf.text(format(activity.startTime, 'h:mm a'), 14, y);
    pdf.text(`${activity.durationMinutes} min`, 55, y);
    pdf.text(activity.type, 85, y);
    pdf.text(activity.title.substring(0, 30), 115, y);
    pdf.text(activity.details || '', 180, y);
    
    y += 10;
  });
  
  // Return as Blob
  return pdf.output('blob');
}
```

## 🎨 Styling & Theming

### Tailwind CSS v4 Configuration

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Activity type colors
        web: "#4f46e5", // Indigo for web pages
        app: "#10b981", // Emerald for applications
        idle: "#94a3b8", // Slate for idle time
        other: "#8b5cf6", // Violet for other activities
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

### Global CSS

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
 
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;

    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
 
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
 
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
 
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
 
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
 
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
 
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
 
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
 
    --radius: 0.5rem;
  }
 
  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
 
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
 
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
 
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
 
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
 
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
 
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
 
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
 
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}
 
@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

/* Print-specific styles */
@media print {
  .print\:hidden {
    display: none !important;
  }
  
  .print\:block {
    display: block !important;
  }
  
  .timeline-container {
    width: 100% !important;
    page-break-inside: avoid;
  }
}
```

## 📦 Installation & Setup

### Prerequisite Tools:
- Node.js 20.x+
- pnpm 8.x+

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourusername/zorus-activity-timeline.git
cd zorus-activity-timeline

# Install dependencies
pnpm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```
ZORUS_API_KEY=your_api_key_here
ZORUS_API_URL=https://developer.zorustech.com/api
```

### 3. Development Server

```bash
pnpm dev
```

### 4. Build for Production

```bash
pnpm build
```

### 5. Start Production Server

```bash
pnpm start
```

## ✅ Features

- 🏢 **Organization Selection**: Search and select from available customers
- 👤 **User Selection**: View and select users from chosen organization
- 📅 **Date Selection**: Pick specific dates to view activity
- 📊 **Timeline Visualization**: Color-coded activity bars on a timeline
- 🎛️ **Activity Filtering**: Toggle different activity types (Web, App, Idle, Other)
- 🔍 **Zoom Controls**: Adjust timeline granularity (1h, 3h, 6h, 12h, 24h)
- ⏱️ **Time Markers**: Adaptive intervals based on zoom level (15min, 30min, 1h)
- 🗺️ **Minimap Overview**: Day-at-a-glance with visible section highlighted
- 📝 **Activity Details**: Detailed information when clicking activities
- 📄 **PDF Export**: Generate comprehensive activity reports
- 🖨️ **Print Support**: Print-optimized layout

## 🧪 Testing Requirements

Implement comprehensive testing:

- **Unit Tests**: For core utility functions and isolated components
- **Integration Tests**: For API services and connected components
- **E2E Tests**: For critical user flows (organization selection, timeline view)

## 🚀 Deployment

The application should be deployable to Vercel or similar platforms with the following considerations:

- Environment variables for API credentials
- API rate limiting protection 
- Error monitoring
- Performance tracking

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
