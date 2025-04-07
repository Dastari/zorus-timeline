"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useDebounce } from "@uidotdev/usehooks"; // Simple debounce hook

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getCustomers } from "@/services/customer-service";
import { Customer } from "@/types";

interface CustomerSelectorProps {
  onSelectCustomer: (customer: Customer | null) => void;
  selectedCustomerId?: string;
  className?: string;
  disabled?: boolean;
}

export function CustomerSelector({
  onSelectCustomer,
  selectedCustomerId,
  className,
  disabled = false,
}: CustomerSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce search input by 300ms
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedValue, setSelectedValue] = React.useState<string | undefined>(
    selectedCustomerId
  );

  const selectedCustomer = React.useMemo(
    () => customers.find((cust) => cust.uuid === selectedValue),
    [customers, selectedValue]
  );

  React.useEffect(() => {
    async function fetchCustomers() {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedCustomers = await getCustomers(1, 50, debouncedSearchTerm);
        setCustomers(fetchedCustomers);
      } catch (err) {
        console.error("Failed to fetch customers:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
        setCustomers([]);
      } finally {
        setIsLoading(false);
      }
    }

    if (open || (selectedCustomerId && customers.length === 0)) {
      fetchCustomers();
    } else if (!open) {
      // Optional: Clear results when closed if desired
      // setCustomers([]);
    }
  }, [debouncedSearchTerm, open, selectedCustomerId, customers.length]);

  React.useEffect(() => {
    setSelectedValue(selectedCustomerId);
  }, [selectedCustomerId]);

  const handleSelect = (currentValue: string) => {
    const newSelectedId =
      currentValue === selectedValue ? undefined : currentValue;
    setSelectedValue(newSelectedId);
    setOpen(false);
    const selectedCust =
      customers.find((cust) => cust.uuid === newSelectedId) || null;
    onSelectCustomer(selectedCust);
    // Optionally clear search term after selection
    // setSearchTerm('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          {selectedCustomer ? selectedCustomer.name : "Select customer..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
        <Command shouldFilter={false}>
          {" "}
          {/* We handle filtering via API */}
          <CommandInput
            placeholder="Search customers..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            {isLoading && <CommandItem disabled>Loading...</CommandItem>}
            {error && (
              <CommandItem disabled className="text-destructive">
                Error: {error}
              </CommandItem>
            )}
            {!isLoading && !error && customers.length === 0 && (
              <CommandEmpty>No customer found.</CommandEmpty>
            )}
            {!isLoading && !error && customers.length > 0 && (
              <CommandGroup>
                {customers.map((cust) => (
                  <CommandItem
                    key={cust.uuid}
                    value={cust.uuid}
                    onSelect={handleSelect}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedValue === cust.uuid
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {cust.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
