import { ZOOM_LEVELS } from "../types";
import type { DayEntry, ViewRange, Timestamp } from "../types";
import { MS_PER_SECOND, MS_PER_MINUTE, MS_PER_HOUR } from "./dateUtils";
import { timeToPixel } from "./timePixelUtils";

export interface Tick {
  px: number;
  label: string | null;
  major: boolean;
}

// View range
export function findDay(ts: Timestamp, days: DayEntry[]): DayEntry | null {
  return (
    days.find((d) => ts >= d.dayStart && ts < d.dayEnd) ??
    days.find((d) => ts === d.dayStart) ??
    null
  );
}

export function clampViewRange(
  center: Timestamp,
  spanMs: number,
  days: DayEntry[],
  centeredOnMidnight = false,
): ViewRange {
  let windowStart: number;
  let windowEnd: number;

  if (centeredOnMidnight) {
    const todayEnd = days[0]?.dayEnd;
    const nearest = days.reduce((best, d) =>
      Math.abs(d.dayStart - center) < Math.abs(best.dayStart - center)
        ? d
        : best,
    );
    const midnight =
      todayEnd &&
      Math.abs(todayEnd - center) < Math.abs(nearest.dayStart - center)
        ? todayEnd
        : nearest.dayStart;
    windowStart = midnight - 12 * MS_PER_HOUR;
    windowEnd = midnight + 12 * MS_PER_HOUR;
  } else {
    const day =
      days.find((d) => center >= d.dayStart && center < d.dayEnd) ??
      days.find((d) => center === d.dayStart);
    windowStart = day ? day.dayStart : center - 12 * MS_PER_HOUR;
    windowEnd = day ? day.dayEnd : center + 12 * MS_PER_HOUR;
  }

  let start = center - spanMs / 2;
  let end = start + spanMs;

  if (start < windowStart) {
    start = windowStart;
    end = start + spanMs;
  }
  if (end > windowEnd) {
    end = windowEnd;
    start = end - spanMs;
  }

  return { start, end };
}

// Ticks
export function getTickIntervals(spanMs: number): {
  minor: number;
  major: number;
} {
  switch (true) {
    case spanMs <= 30 * MS_PER_MINUTE:
      return { minor: 0.5 * MS_PER_MINUTE, major: MS_PER_MINUTE };
    case spanMs <= ZOOM_LEVELS["1h"]:
      return { minor: 5 * MS_PER_MINUTE, major: 10 * MS_PER_MINUTE };
    case spanMs <= ZOOM_LEVELS["2h"]:
      return { minor: 10 * MS_PER_MINUTE, major: 30 * MS_PER_MINUTE };
    case spanMs <= ZOOM_LEVELS["12h"]:
      return { minor: MS_PER_HOUR, major: 2 * MS_PER_HOUR };
    default:
      return { minor: MS_PER_HOUR, major: 3 * MS_PER_HOUR };
  }
}

export function formatTickLabel(ts: Timestamp, offsetMinutes: number): string {
  const shifted = new Date(ts + offsetMinutes * 60 * 1000);
  return (
    String(shifted.getUTCHours()).padStart(2, "0") +
    ":" +
    String(shifted.getUTCMinutes()).padStart(2, "0")
  );
}

export function buildTicks(
  range: ViewRange,
  barWidth: number,
  dayStart: Timestamp,
  offsetMinutes: number,
): Tick[] {
  const spanMs = range.end - range.start;
  const { minor, major } = getTickIntervals(spanMs);
  const alignAnchor = Math.floor(dayStart / MS_PER_HOUR) * MS_PER_HOUR;
  const result: Tick[] = [];
  let t = Math.ceil(range.start / minor) * minor;
  while (t <= range.end) {
    const px = timeToPixel(t, range, barWidth);
    const isMajor = (t - alignAnchor) % major === 0;
    if (px !== null) {
      result.push({
        px,
        major: isMajor,
        label: isMajor ? formatTickLabel(t, offsetMinutes) : null,
      });
    }
    t += minor;
  }
  return result;
}

// Snapping
export function snapTime(ts: Timestamp, spanMs: number): Timestamp {
  switch (true) {
    case spanMs <= 30 * MS_PER_MINUTE:
      return snapToMinute(ts, 2);
    case spanMs <= ZOOM_LEVELS["1h"]:
      return snapToMinute(ts, 10);
    case spanMs <= ZOOM_LEVELS["2h"]:
      return snapToMinute(ts, 30);
    case spanMs <= ZOOM_LEVELS["12h"]:
      return snapToHour(ts, 5);
    default:
      return snapToHour(ts, 10);
  }
}

function snapToHour(ts: Timestamp, thresholdMinutes: number): Timestamp {
  const nearestHour = Math.round(ts / MS_PER_HOUR) * MS_PER_HOUR;
  if (Math.abs(ts - nearestHour) <= thresholdMinutes * MS_PER_MINUTE)
    return nearestHour;
  return ts - (ts % MS_PER_MINUTE);
}

function snapToMinute(ts: Timestamp, thresholdSeconds: number): Timestamp {
  const nearestMinute = Math.round(ts / MS_PER_MINUTE) * MS_PER_MINUTE;
  if (Math.abs(ts - nearestMinute) <= thresholdSeconds * MS_PER_SECOND)
    return nearestMinute;
  return ts;
}

// Formatting
export function formatHoverTime(
  ts: Timestamp,
  spanMs: number,
  offsetMinutes: number,
): string {
  const shifted = new Date(ts + offsetMinutes * 60 * 1000);
  const h = String(shifted.getUTCHours()).padStart(2, "0");
  const m = String(shifted.getUTCMinutes()).padStart(2, "0");
  const s = String(shifted.getUTCSeconds()).padStart(2, "0");
  return spanMs <= ZOOM_LEVELS["1h"] ? `${h}:${m}:${s}` : `${h}:${m}`;
}

// Background
export function getStripeBackground(
  range: ViewRange,
  barWidth: number,
  timezoneOffsetMs: number,
): { stripeWidthPx: number; stripeOffsetPx: number; stripeGradient: string } {
  const spanMs = range.end - range.start;
  const stripeMs = spanMs <= 12 * MS_PER_HOUR ? MS_PER_HOUR : 24 * MS_PER_HOUR;

  const stripeOffsetPx =
    stripeMs >= 12 * MS_PER_HOUR
      ? -(
          ((((range.start + timezoneOffsetMs) % stripeMs) + stripeMs) %
            stripeMs) /
          spanMs
        ) * barWidth
      : -((range.start % stripeMs) / spanMs) * barWidth;

  const stripeGradient =
    "repeating-linear-gradient(90deg, rgb(0 0 0 / 5%) 0%, rgb(221 201 172 / 100%) 5%, rgb(0 0 0 / 5%) 100%)";

  return {
    stripeWidthPx: (stripeMs / spanMs) * barWidth,
    stripeOffsetPx,
    stripeGradient,
  };
}
