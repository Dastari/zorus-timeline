"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

export function Header() {
  return (
    <header className="bg-slate-950 text-white p-4 shadow-md">
      <div className="container mx-auto flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.svg" // Assumes logo.svg is in the public folder
            alt="Zorus Logo"
            width={128} // Adjust width as needed
            height={64} // Adjust height as needed
            priority // Load logo quickly
          />
          <span className="text-xl font-semibold whitespace-nowrap">
            Activity Timeline
          </span>
        </Link>
        {/* Add navigation or user profile links here if needed in the future */}
      </div>
    </header>
  );
}
