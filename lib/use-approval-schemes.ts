'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import {
  APPROVAL_SCHEMES,
  buildApprovalSchemesFromRows,
  type ApprovalSchemeInfo,
} from '@/lib/approval-schemes';

export const APPROVAL_SCHEMES_ENDPOINT = '/api/approval-schemes';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export type ApprovalSchemesResult = {
  /** Catalogue to render: database-backed when available, bundled fallback otherwise. */
  schemes: ApprovalSchemeInfo[];
  /** True while the first request is still in flight. */
  isLoading: boolean;
  /** True when the list came from the database rather than the bundled catalogue. */
  isDatabaseBacked: boolean;
};

/**
 * Loads the approval scheme catalogue that admins maintain, so logos uploaded
 * through the admin screen reach the pages that display them. Falls back to the
 * bundled catalogue when the request fails or returns nothing, which keeps the
 * selector usable offline and during the very first paint.
 *
 * The returned object and array are memoised on the fetch payload, so consumers
 * can safely use them as effect dependencies.
 */
export function useApprovalSchemes(): ApprovalSchemesResult {
  const { data, isLoading } = useSWR<unknown>(APPROVAL_SCHEMES_ENDPOINT, fetcher, {
    revalidateOnFocus: false,
  });

  const databaseSchemes = useMemo(() => buildApprovalSchemesFromRows(data), [data]);

  return useMemo(() => {
    const isDatabaseBacked = databaseSchemes.length > 0;

    return {
      schemes: isDatabaseBacked ? databaseSchemes : APPROVAL_SCHEMES,
      isLoading,
      isDatabaseBacked,
    };
  }, [databaseSchemes, isLoading]);
}
