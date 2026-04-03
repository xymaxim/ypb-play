import { clampOffset } from "./dateUtils";
import type { Timestamp, ViewRange } from "../types";

export function getVisibleRange(
  dayStart: Timestamp,
  zoom: number,
  offsetHours: number,
): ViewRange {
  const ONE_DAY_MS = 24 * 3600 * 1000;
  const ONE_HOUR_MS = 3600 * 1000;

  if (zoom >= ONE_DAY_MS) {
    return { start: dayStart, end: dayStart + ONE_DAY_MS };
  }

  const clampedOffset = clampOffset(offsetHours);
  const start = dayStart + clampedOffset * ONE_HOUR_MS;
  return { start, end: start + ONE_HOUR_MS };
}

export function timeToPixel(
  time: Timestamp,
  range: ViewRange,
  barWidth: number,
): number | null {
  const { start, end } = range;
  if (time < start || time > end) return null;
  return ((time - start) / (end - start)) * barWidth;
}

export function pixelToTime(
  px: number,
  range: ViewRange,
  barWidth: number,
): Timestamp {
  const clamped = Math.max(0, Math.min(barWidth, px));
  return range.start + (clamped / barWidth) * (range.end - range.start);
}

export function timeToViewfinderPixel(
  time: Timestamp,
  dayStart: Timestamp,
  barWidth: number,
): number | null {
  const ONE_DAY_MS = 24 * 3600 * 1000;
  const range: ViewRange = { start: dayStart, end: dayStart + ONE_DAY_MS };
  return timeToPixel(time, range, barWidth);
}

export function viewfinderWindowWidth(barWidth: number): number {
  return barWidth / 24;
}

export function viewfinderWindowLeft(
  offsetHours: number,
  barWidth: number,
): number {
  return (clampOffset(offsetHours) / 24) * barWidth;
}
