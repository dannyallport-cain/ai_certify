import { networkInterfaces } from 'node:os';
import type { NextRequest } from 'next/server';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

function isPrivateIpv4(hostname: string) {
  return (
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

function isLoopbackHost(hostname: string) {
  return LOCAL_HOSTNAMES.has(hostname);
}

function parseUrlCandidate(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function getPreferredLanIp() {
  const interfaces = networkInterfaces();
  const preferredInterfaceNames = ['en0', 'en1', 'Ethernet', 'Wi-Fi'];

  const candidates = Object.entries(interfaces)
    .flatMap(([name, entries]) =>
      (entries || []).map((entry) => ({ name, entry }))
    )
    .filter(({ entry }) => entry.family === 'IPv4' && !entry.internal)
    .filter(({ entry }) => isPrivateIpv4(entry.address));

  const preferredCandidate = preferredInterfaceNames
    .map((name) => candidates.find((candidate) => candidate.name === name))
    .find(Boolean);

  return preferredCandidate?.entry.address || candidates[0]?.entry.address || null;
}

function buildLanOrigin(url: URL) {
  const lanIp = getPreferredLanIp();

  if (!lanIp) {
    return null;
  }

  return `${url.protocol}//${lanIp}${url.port ? `:${url.port}` : ''}`;
}

export function getReachableBaseUrl(request: NextRequest) {
  const requestUrl = new URL(request.nextUrl.toString());
  const configuredBaseUrl =
    parseUrlCandidate(process.env.NEXT_PUBLIC_APP_URL) ||
    parseUrlCandidate(process.env.BASE_URL) ||
    parseUrlCandidate(process.env.NEXTAUTH_URL);

  if (!isLoopbackHost(requestUrl.hostname)) {
    return requestUrl.origin;
  }

  if (process.env.NODE_ENV !== 'production') {
    const lanOrigin = buildLanOrigin(requestUrl);

    if (lanOrigin) {
      return lanOrigin;
    }

    return requestUrl.origin;
  }

  if (configuredBaseUrl && !isLoopbackHost(configuredBaseUrl.hostname)) {
    return configuredBaseUrl.origin;
  }

  const lanOrigin = buildLanOrigin(configuredBaseUrl || requestUrl);

  if (lanOrigin) {
    return lanOrigin;
  }

  return (configuredBaseUrl || requestUrl).origin;
}
