'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type NominatimResult = {
  place_id: number;
  display_name: string;
  address?: {
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

type AddressParts = {
  line1: string;
  town: string;
  postcode: string;
};

const compactAddress = (result: NominatimResult): string => {
  const addr = result.address || {};
  const street = addr.road || addr.pedestrian || addr.residential || '';
  const town = addr.town || addr.city || addr.village || addr.hamlet || addr.suburb || addr.state_district || '';
  const postcode = addr.postcode || '';

  const line1 = [addr.house_number, street].filter(Boolean).join(' ').trim();
  const parts = [line1, town, postcode].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(', ');
  }

  // Fallback: strip country suffixes from the provider label.
  return result.display_name
    .replace(/,\s*England\s*,\s*United Kingdom$/i, '')
    .replace(/,\s*United Kingdom$/i, '')
    .trim();
};

const composeAddress = (parts: AddressParts): string => {
  return [parts.line1.trim(), parts.town.trim(), parts.postcode.trim()].filter(Boolean).join(', ');
};

const parseAddress = (value: string): AddressParts => {
  const segments = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    line1: segments[0] || '',
    town: segments[1] || '',
    postcode: segments[2] || '',
  };
};

const resultToParts = (result: NominatimResult, typedLine1: string): AddressParts => {
  const addr = result.address || {};
  const street = (addr.road || addr.pedestrian || addr.residential || '').trim();
  const town = (addr.town || addr.city || addr.village || addr.hamlet || addr.suburb || addr.state_district || '').trim();
  const postcode = (addr.postcode || '').trim();

  // Prefer Nominatim house_number; fall back to extracting any leading number/unit the user typed
  const nominatimNumber = (addr.house_number || '').trim();
  const typedNumberMatch = typedLine1.match(/^((?:flat|unit|apt|apartment|suite|room)\s*\S+|#?\d+[A-Za-z0-9/-]*)\s*/i);
  const typedNumber = typedNumberMatch ? typedNumberMatch[1].trim() : '';
  const number = nominatimNumber || typedNumber;

  const line1 = number && street ? `${number} ${street}` : street || typedLine1;

  return { line1, town, postcode };
};

interface AddressAutocompleteFieldProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  title?: string;
  countryCodes?: string;
  minQueryLength?: number;
}

export function AddressAutocompleteField({
  id,
  name,
  value,
  onChange,
  placeholder,
  required,
  className,
  title,
  countryCodes = 'gb',
  minQueryLength = 4,
}: AddressAutocompleteFieldProps) {
  const [parts, setParts] = useState<AddressParts>(() => parseAddress(value ?? ''));
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [shouldSuggest, setShouldSuggest] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const query = useMemo(() => composeAddress(parts).trim(), [parts]);

  useEffect(() => {
    const external = parseAddress(value);
    const current = composeAddress(parts);
    const incoming = composeAddress(external);
    if (incoming !== current) {
      setParts(external);
    }
  }, [value]);

  const updateParts = (
    next: Partial<AddressParts>,
    options?: { shouldTriggerSuggestions?: boolean },
  ) => {
    const updated = {
      ...parts,
      ...next,
    };
    setParts(updated);
    if (options?.shouldTriggerSuggestions ?? true) {
      setShouldSuggest(true);
    }
    onChange(composeAddress(updated));
  };

  useEffect(() => {
    if (!shouldSuggest || query.length < minQueryLength) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timeout = setTimeout(async () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          q: query,
          format: 'jsonv2',
          addressdetails: '1',
          limit: '6',
          countrycodes: countryCodes,
        });

        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          setSuggestions([]);
          setIsOpen(false);
          return;
        }

        const data = (await response.json()) as NominatimResult[];
        setSuggestions(Array.isArray(data) ? data : []);
        setIsOpen(Array.isArray(data) && data.length > 0);
      } catch {
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timeout);
    };
  }, [query, countryCodes, minQueryLength, shouldSuggest]);

  const baseFieldClass = cn(
    'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
    'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'h-10',
    className,
  );

  const handlePick = (result: NominatimResult) => {
    const next = resultToParts(result, parts.line1);
    setParts(next);
    setShouldSuggest(false);
    onChange(composeAddress(next));
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <input type="hidden" name={name} value={composeAddress(parts)} readOnly />

      <div className="flex flex-col gap-2">
        <input
          value={parts.line1}
          onChange={(e) => updateParts({ line1: e.target.value })}
          placeholder={placeholder || 'Address line 1 (e.g. 12 High Street)'}
          aria-label="Address line 1"
          required={required}
          title={title}
          autoComplete="address-line1"
          className={baseFieldClass}
        />

        <input
          value={parts.town}
          onChange={(e) => updateParts({ town: e.target.value })}
          placeholder="Town"
          aria-label="Town"
          title={title}
          autoComplete="address-level2"
          className={baseFieldClass}
        />

        <input
          value={parts.postcode}
          onChange={(e) => updateParts({ postcode: e.target.value.toUpperCase() })}
          placeholder="Postcode"
          aria-label="Postcode"
          title={title}
          autoComplete="postal-code"
          className={baseFieldClass}
        />
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
                  {compactAddress(item)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-1 text-xs text-muted-foreground">
        {isLoading ? 'Searching online addresses...' : 'Address suggestions powered by OpenStreetMap Nominatim'}
      </p>
    </div>
  );
}
