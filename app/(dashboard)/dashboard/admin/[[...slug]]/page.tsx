import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{
    slug?: string[];
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildQueryString(searchParams: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') {
      query.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, item);
      }
    }
  }

  const result = query.toString();
  return result ? `?${result}` : '';
}

export default async function DashboardAdminRedirectPage({
  params,
  searchParams,
}: PageProps) {
  const [{ slug = [] }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  const adminPath = slug.length > 0 ? `/admin/${slug.join('/')}` : '/admin';
  redirect(`${adminPath}${buildQueryString(resolvedSearchParams)}`);
}
