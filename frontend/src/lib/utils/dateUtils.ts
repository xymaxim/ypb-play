import type { DayEntry, Timestamp } from "../types";

export const MS_PER_SECOND = 1_000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

function midnightInOffset(utcMs: number, offsetMinutes: number): Timestamp {
  const shifted = utcMs + offsetMinutes * 60 * 1000;
  const floored = shifted - (shifted % MS_PER_DAY);
  return floored - offsetMinutes * 60 * 1000;
}

export function buildAvailableDays(
  now: Date = new Date(),
  depthDays: number = 7,
  offsetMinutes: number = -new Date().getTimezoneOffset(),
): DayEntry[] {
  const entries: DayEntry[] = [];
  for (let i = 0; i < depthDays; i++) {
    const dayMs = now.getTime() - i * MS_PER_DAY;
    const start = midnightInOffset(dayMs, offsetMinutes);
    const end = start + MS_PER_DAY;
    entries.push({
      date: new Date(start + offsetMinutes * 60 * 1000),
      dayStart: start,
      dayEnd: end,
      available: true,
    });
  }
  return entries;
}

export function isSameDay(
  a: Timestamp,
  b: Timestamp,
  offsetMinutes: number,
): boolean {
  const da = new Date(a + offsetMinutes * 60 * 1000);
  const db = new Date(b + offsetMinutes * 60 * 1000);
  return (
    da.getUTCFullYear() === db.getUTCFullYear() &&
    da.getUTCMonth() === db.getUTCMonth() &&
    da.getUTCDate() === db.getUTCDate()
  );
}

export function clampOffset(hours: number): number {
  return Math.max(0, Math.min(23, hours));
}
