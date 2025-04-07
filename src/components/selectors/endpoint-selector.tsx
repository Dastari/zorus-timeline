"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Laptop } from "lucide-react";
import { useDebounce } from "@uidotdev/usehooks";

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
import { getEndpoints } from "@/services/endpoint-service";
import { Endpoint } from "@/types";

interface EndpointSelectorProps {
  customerId: string;
  onSelectEndpoint: (endpoint: Endpoint | null) => void;
  selectedEndpointId?: string;
  className?: string;
  disabled?: boolean;
}

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function EndpointSelector({
  customerId,
  onSelectEndpoint,
  selectedEndpointId,
  className,
  disabled = false,
}: EndpointSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [endpoints, setEndpoints] = React.useState<Endpoint[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedValue, setSelectedValue] = React.useState<string | undefined>(
    selectedEndpointId
  );

  const selectedEndpoint = React.useMemo(
    () => endpoints.find((ep) => ep.uuid === selectedValue),
    [endpoints, selectedValue]
  );

  const isButtonDisabled =
    disabled ||
    !(typeof customerId === "string" && UUID_REGEX.test(customerId));

  React.useEffect(() => {
    const isValidUUID =
      typeof customerId === "string" && UUID_REGEX.test(customerId);

    if (!isValidUUID) {
      if (typeof customerId === "string" && customerId) {
        console.warn(
          `EndpointSelector received invalid customerId format: ${customerId}`
        );
      }
      setEndpoints([]);
      setError(null);
      return;
    }

    async function fetchEndpoints() {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedEndpoints = await getEndpoints(
          customerId,
          1,
          0,
          debouncedSearchTerm
        );
        setEndpoints(fetchedEndpoints);
      } catch (err) {
        console.error("Failed to fetch endpoints:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
        setEndpoints([]);
      } finally {
        setIsLoading(false);
      }
    }

    if (open || debouncedSearchTerm !== undefined) {
      fetchEndpoints();
    }
  }, [customerId, debouncedSearchTerm, open]);

  React.useEffect(() => {
    setSelectedValue(selectedEndpointId);
  }, [selectedEndpointId]);

  const handleSelect = (currentValue: string) => {
    const newSelectedId =
      currentValue === selectedValue ? undefined : currentValue;
    setSelectedValue(newSelectedId);
    setOpen(false);
    const selectedEp =
      endpoints.find((ep) => ep.uuid === newSelectedId) || null;
    onSelectEndpoint(selectedEp);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={isButtonDisabled}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={isButtonDisabled}
        >
          {selectedEndpoint ? selectedEndpoint.name : "Select endpoint..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search endpoints..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            {isLoading && (
              <CommandItem disabled>Loading endpoints...</CommandItem>
            )}
            {error && (
              <CommandItem disabled className="text-destructive">
                Error: {error}
              </CommandItem>
            )}
            {!isLoading && !error && endpoints.length === 0 && (
              <CommandEmpty>No endpoints found for this customer.</CommandEmpty>
            )}
            {!isLoading && !error && endpoints.length > 0 && (
              <CommandGroup>
                {endpoints.map((ep) => (
                  <CommandItem
                    key={ep.uuid}
                    value={ep.uuid}
                    onSelect={handleSelect}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedValue === ep.uuid ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <Laptop className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span>{ep.name}</span>
                      {ep.lastLoggedOnUsername && (
                        <span className="text-xs text-muted-foreground">
                          Last User: {ep.lastLoggedOnUsername}
                        </span>
                      )}
                    </div>
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
