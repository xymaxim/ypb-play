export type Timestamp = number;
export type ZoomLevel = number; // span duration in ms

export const ZOOM_LEVELS = {
  "5m": 5 * 60 * 1000,
  "1h": 1 * 60 * 60 * 1000,
  "2h": 2 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
} as const;

export type ZoomLevelKey = keyof typeof ZOOM_LEVELS;

export type MarkId = "A" | "B";

export interface Mark {
  id: MarkId;
  time: Timestamp;
}

export interface MarksState {
  enabled: boolean;
  activeTarget: MarkId | null;
  A: Timestamp | null;
  B: Timestamp | null;
}

export interface Interval {
  a: Timestamp;
  b: Timestamp;
}

export interface ViewRange {
  start: Timestamp;
  end: Timestamp;
}

export interface DayEntry {
  date: Date;
  /** Midnight timestamp of this day (local time) */
  dayStart: Timestamp;
  /** End-of-day timestamp (exclusive, i.e. start of next day) */
  dayEnd: Timestamp;
  available: boolean;
}
