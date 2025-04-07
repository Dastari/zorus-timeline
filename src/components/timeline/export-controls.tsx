"use client";

import React, { useState } from "react";
import { Download } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { TimelineData } from "@/types";
import { exportActivityToPdf } from "@/services/activity-service";
import { cn } from "@/lib/utils";

// Import the advanced export service if/when created
// import { generateActivityPdf } from '@/services/export-service';

interface ExportControlsProps {
  timelineData: TimelineData | null; // Can be null if no data is loaded
  className?: string;
  disabled?: boolean; // Add disabled prop
  // We might need a ref to the timeline element for html2canvas
  // timelineElementRef?: React.RefObject<HTMLElement>;
}

export function ExportControls({
  timelineData,
  className,
  disabled = false, // Add disabled prop with default
}: // timelineElementRef
ExportControlsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!timelineData) {
      setError("No data available to export.");
      return;
    }

    // Ensure we have the element to capture if using html2canvas
    // const elementToCapture = timelineElementRef?.current;
    // if (!elementToCapture) {
    //   setError('Timeline element not found for export.');
    //   return;
    // }

    setIsExporting(true);
    setError(null);
    try {
      // --- Call the PDF export function ---
      const pdfBlob = await exportActivityToPdf(timelineData);
      // --- OR: Call the actual implementation when ready ---
      // const pdfBlob = await generateActivityPdf(timelineData, elementToCapture);

      // Create a URL for the Blob and trigger download
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      // Generate filename
      const filename = `activity_report_${timelineData.username}_${format(
        timelineData.date,
        "yyyyMMdd"
      )}.pdf`;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();

      // Clean up
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export PDF:", err);
      setError(err instanceof Error ? err.message : "PDF export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  // Combine component disabled state with internal exporting state
  const isButtonDisabled = disabled || isExporting || !timelineData;

  return (
    <div className={cn("flex flex-col items-end", className)}>
      <Button
        onClick={handleExport}
        disabled={isButtonDisabled} // Use combined disabled state
        variant="outline"
        size="sm"
      >
        <Download className="mr-2 h-4 w-4" />
        {isExporting ? "Exporting..." : "Export PDF"}
      </Button>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
