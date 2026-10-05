"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

// In-flight GETs, keyed exactly like memoryCache. Without this, two consumers
// that ask for the same URL before the first response lands (e.g. React
// StrictMode's mount/unmount/mount effect replay) each open their own socket.
const inFlight = new Map<string, Promise<any>>();

function buildCacheKey(url: string, options?: RequestInit) {
  return `${url}:${JSON.stringify(options?.headers || {})}`;
}

export async function fetchWithCache<T = any>(
  url: string,
  options: RequestInit = {},
  ttlMs: number = 60000 // 1 minute default TTL
): Promise<T> {
  const cacheKey = buildCacheKey(url, options);
  const now = Date.now();
  const cached = memoryCache.get(cacheKey);

  if (cached && now - cached.timestamp < ttlMs) {
    return cached.data as T;
  }

  // Coalesce concurrent identical GETs onto one network request.
  const method = (options.method || "GET").toUpperCase();
  if (method === "GET") {
    const pending = inFlight.get(cacheKey);
    if (pending) return pending as Promise<T>;
  }

  const request = (async () => {
    const res = await fetch(url, options);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    memoryCache.set(cacheKey, { data, timestamp: Date.now() });
    return data as T;
  })();

  if (method === "GET") {
    inFlight.set(cacheKey, request);
    // Never let a failure poison the slot for the next caller.
    request.catch(() => {}).finally(() => {
      if (inFlight.get(cacheKey) === request) inFlight.delete(cacheKey);
    });
  }

  return request;
}

export function clearApiCache(urlPrefix?: string) {
  if (!urlPrefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(urlPrefix)) {
      memoryCache.delete(key);
    }
  }
}

export function useCachedApi<T = any>(
  url: string | null,
  options?: RequestInit,
  ttlMs: number = 60000
) {
  // Keyed on the serialized headers, not the `options` object identity. Callers
  // pass an inline literal, so identity changes every render and used to re-fire
  // the mount effect on every single render.
  const cacheKey = useMemo(
    () => (url ? buildCacheKey(url, options) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url, JSON.stringify(options?.headers || {})]
  );

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [data, setData] = useState<T | null>(() => {
    if (!cacheKey) return null;
    const cached = memoryCache.get(cacheKey);
    return cached ? (cached.data as T) : null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (!cacheKey) return false;
    return !memoryCache.has(cacheKey);
  });

  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const loadData = useCallback(
    async (forceFresh = false) => {
      if (!url || !cacheKey) return;
      const opts = optionsRef.current;
      const cached = memoryCache.get(cacheKey);
      const now = Date.now();

      // If we already have fresh data and aren't forcing, don't show loading
      if (!forceFresh && cached && now - cached.timestamp < ttlMs) {
        if (isMounted.current) {
          setData(cached.data);
          setLoading(false);
        }
        return;
      }

      // If we have stale data, set it immediately while fetching fresh in background
      if (cached && isMounted.current) {
        setData(cached.data);
        setLoading(false);
      } else if (isMounted.current) {
        setLoading(true);
      }

      try {
        const result = await fetchWithCache<T>(
          url,
          opts,
          forceFresh ? 0 : ttlMs
        );
        if (isMounted.current) {
          setData(result);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted.current) {
          setError(err.message || "Failed to fetch data");
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    },
    [url, cacheKey, ttlMs]
  );

  useEffect(() => {
    isMounted.current = true;
    loadData();
    return () => {
      isMounted.current = false;
    };
  }, [loadData]);

  return { data, loading, error, refetch: () => loadData(true) };
}
