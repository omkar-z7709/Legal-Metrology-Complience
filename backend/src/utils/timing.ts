import { performance } from "perf_hooks";

export const globalTimings = new Map<string, any>();

/** Wall-clock milliseconds elapsed since a `performance.now()` mark. */
export function msSince(mark: number): number {
  return performance.now() - mark;
}

/** Rounds to whole milliseconds so the JSON payload stays stable and readable. */
export function ms(start: number, end: number): number {
  return Math.round(end - start);
}