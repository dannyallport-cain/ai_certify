'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

type NominatimResult = {
  place_id: number;
  display_name: string;
  address?: {
    amenity?: string;
    building?: string;
    shop?: string;
    office?: string;
    leisure?: string;
    tourism?: string;
    house_number?: string;
    road?: string;
    pedestrian?: string;
    residential?: string;
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    suburb?: string;
    postcode?: string;
    state_district?: string;
  };
};

/** Extract a short, human-readable place name from a Nominatim result. */
const placeName = (result: NominatimResult): string => {
  const addr = result.address || {};
  return (
    addr.amenity ||
    addr.building ||
    addr.shop ||
    addr.office ||
    addr.leisure ||
    addr.tourism ||
    result.display_name.split(',')[0].trim()
  );
};

/** Compact address line: "12 High Street, Bolton, BL1 2AB" – no country suffixes. */
const compactAddress = (result: NominatimResult): string => {
  const addr = result.address || {};
  const street = addr.road || addr.pedestrian || addr.residential || '';
  const town =
    addr.town || addr.city || addr.village || addr.hamlet || addr.suburb || addr.state_district || '';
  const postcode = addr.postcode || '';
  const line1 = [addr.house_number, street].filter(Boolean).join(' ').trim();
  const parts = [line1, town, postcode].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  return result.display_name
    .replace(/,\s*England\s*,\s*United Kingdom$/i, '')
    .replace(/,\s*United Kingdom$/i, '')
    .trim();
};

interface OrganisationAutocompleteFieldProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  /** Called when the user picks a suggestion — receives the compact address string. */
  onAddressPick?: (address: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  title?: string;
  countryCodes?: string;
  minQueryLength?: number;
}

export function OrganisationAutocompleteField({
  id,
  name,
  value,
  onChange,
  onAddressPick,
  placeholder,
  required,
  className,
  title,
  countryCodes = 'gb',
  minQueryLength = 3,
}: OrganisationAutocompleteFieldProps) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const searchOrganisations = useCallback(
    async (query: string): Promise<NominatimResult[]> => {
      if (query.trim().length < minQueryLength) {
        setSuggestions([]);
        setIsOpen(false);
        return [];
      }

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          q: query.trim(),
          format: 'jsonv2',
          addressdetails: '1',
          limit: '6',
          countrycodes: countryCodes,
        });

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          setSuggestions([]);
          setIsOpen(false);
          return [];
        }

        const data = (await response.json()) as NominatimResult[];
        const nextSuggestions = Array.isArray(data) ? data : [];
        setSuggestions(nextSuggestions);
        setIsOpen(nextSuggestions.length > 0);
        return nextSuggestions;
      } catch {
        setSuggestions([]);
        setIsOpen(false);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [countryCodes, minQueryLength],
  );

  useEffect(() => {
    const query = value.trim();
    if (query.length < minQueryLength) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timeout = setTimeout(() => {
      void searchOrganisations(query);
    }, 350);

    return () => clearTimeout(timeout);
  }, [minQueryLength, searchOrganisations, value]);

  const handlePick = (result: NominatimResult) => {
    const name = placeName(result);
    const address = compactAddress(result);
    onChange(name);
    onAddressPick?.(address);
    setIsOpen(false);
  };

  const handleFind = async () => {
    const query = value.trim();
    if (query.length < minQueryLength || isLoading) {
      return;
    }

    const results = await searchOrganisations(query);

    // A single match is an unambiguous find — auto-fill the name + address.
    if (results.length === 1) {
      handlePick(results[0]);
    }
  };

  const baseInputClass = cn(
    'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
    'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50 h-10',
    className,
  );

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        placeholder={placeholder || 'Type to search organisations and buildings'}
        required={required}
        title={title}
        autoComplete="off"
        className={baseInputClass}
      />

      <div className="mt-2">
        <button
          type="button"
          onMouseDown={(e) => {
            // Keep focus on the input so the blur handler does not close the dropdown.
            e.preventDefault();
          }}
          onClick={() => {
            void handleFind();
          }}
          disabled={value.trim().length < minQueryLength || isLoading}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Search address suggestions"
        >
          <Search className="h-4 w-4" />
          {isLoading ? 'Searching...' : 'Find'}
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg">
          <ul className="max-h-64 overflow-auto py-1">
            {suggestions.map((item) => (
              <li key={item.place_id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handlePick(item);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="font-medium">{placeName(item)}</span>
                  <span className="text-muted-foreground">{' — '}{compactAddress(item)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-1 text-xs text-muted-foreground">
        {isLoading ? 'Searching…' : 'Type a business name, then press Find to auto-fill the address from a match.'}
      </p>
    </div>
  );
}
