"use client";

import React, { useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Use shadcn Input for consistency
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string; // e.g., '.xlsx, .xls'
  className?: string;
  disabled?: boolean;
}

export function FileUpload({
  onFileSelect,
  accept = ".csv",
  className,
  disabled = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
      // Reset input value to allow selecting the same file again
      event.target.value = "";
    }
  };

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className={cn("flex items-center", className)}>
      <Input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden" // Hide the actual input
        disabled={disabled}
      />
      <Button
        onClick={handleButtonClick}
        variant="outline"
        size="default"
        disabled={disabled}
      >
        <Upload className="mr-2 h-4 w-4" />
        Load CSV File
      </Button>
      {/* Optional: Display selected filename? */}
    </div>
  );
}
