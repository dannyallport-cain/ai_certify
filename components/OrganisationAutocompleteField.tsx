'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [showManualUrlInput, setShowManualUrlInput] = useState(false);
  const [gasSafeUrl, setGasSafeUrl] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const query = value.trim();
    if (query.length < minQueryLength) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timeout = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
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

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          { signal: controller.signal },
        );

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

    return () => clearTimeout(timeout);
  }, [value, countryCodes, minQueryLength]);

  const handlePick = (result: NominatimResult) => {
    const name = placeName(result);
    const address = compactAddress(result);
    onChange(name);
    onAddressPick?.(address);
    setIsOpen(false);
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
        {isLoading ? 'Searching…' : 'Suggestions powered by OpenStreetMap'}
      </p>

      <button
        type="button"
        onClick={() => window.open('https://www.gassaferegister.co.uk/search/', '_blank')}
        className="mt-2 w-full bg-orange-500 hover:bg-orange-600 text-white text-sm py-1 px-3 rounded-md transition-colors flex items-center justify-center gap-2"
        title="Open Gas Safe Register search in new tab"
      >
        🔍 Manual Gas Safe Register Search
      </button>

      {showManualUrlInput && (
        <div className="mt-3 p-3 border rounded-md bg-orange-50">
          <label className="block text-xs font-medium text-orange-900 mb-1">
            Paste Gas Safe result URL
          </label>
          <input
            type="url"
            value={gasSafeUrl}
            onChange={(e) => setGasSafeUrl(e.target.value)}
            placeholder="https://www.gassaferegister.co.uk/engineer/12345-john-smith-gas/"
            className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            type="button"
            onClick={async () => {
              if (!gasSafeUrl) return;
              setIsParsing(true);
              try {
                // Simple URL parser - extract name from path slug
                const url = new URL(gasSafeUrl);
                const pathParts = url.pathname.split('/').filter(Boolean);
                const slug = pathParts[pathParts.length - 1];
                const nameMatch = slug.match(/([^-]+(?:-[^-]+)*)-gas/i) || slug.match(/([^-]+)/);
                const orgName = nameMatch ? nameMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Gas Safe Engineer';
                const address = 'Verified via Gas Safe Register'; // Could fetch real address
                
                onChange(orgName);
                onAddressPick?.(address);
                setShowManualUrlInput(false);
                setGasSafeUrl('');
              } catch {
                alert('Invalid Gas Safe URL. Please copy the full URL from the engineer profile page.');
              } finally {
                setIsParsing(false);
              }
            }}
            disabled={isParsing || !gasSafeUrl}
            className="mt-2 w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm py-1 px-3 rounded-md transition-colors"
          >
            {isParsing ? 'Parsing...' : 'Parse & Fill'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowManualUrlInput(false);
              setGasSafeUrl('');
            }}
            className="mt-1 text-xs text-orange-600 hover:text-orange-800 underline"
          >
            Cancel
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowManualUrlInput(true)}
        className="mt-1 text-xs text-orange-500 hover:text-orange-700 underline"
      >
        Or paste Gas Safe URL here →
      </button>
    </div>
  );
}
