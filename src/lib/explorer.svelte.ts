import { getContext, setContext } from "svelte";
import type {
  Interval,
  MarkId,
  MarksState,
  Timestamp,
  ViewRange,
  ZoomLevel,
} from "./types";
import { ZOOM_LEVELS } from "./types";
import { buildAvailableDays, MS_PER_DAY, MS_PER_HOUR } from "./utils/dateUtils";
import { clampViewRange } from "./utils/timelineUtils";
import { localOffsetMinutes } from "./utils/dateTimeUtils";

export const DEPTH_HOURS = 167;

// Context
const EXPLORER_KEY = Symbol("explorer");

export function setExplorerContext(store: Explorer): void {
  setContext(EXPLORER_KEY, store);
}

export function getExplorerContext(): Explorer {
  const store = getContext<Explorer>(EXPLORER_KEY);
  if (!store)
    throw new Error("getExplorerContext() called outside of explorer tree");
  return store;
}

export function createExplorer(
  options: {
    depthHours?: number;
  } = {},
): Explorer {
  const { depthHours = DEPTH_HOURS } = options;

  let now = $state(Date.now());
  const nowInterval = setInterval(() => {
    now = Date.now();
  }, 1000);

  // State
  let isRewinding = $state(false);
  let pauseAfterRewind = $state(false);

  let timezoneOffset = $state<number>(localOffsetMinutes());
  let centeredOnMidnight = $state<boolean>(false);
  let showTimelineViewRange = $state<boolean>(false);
  let streamStartTime = $state<number | null>(null);

  let zoomLevel = $state<ZoomLevel>(ZOOM_LEVELS["1d"]);
  let selectedTime = $state<Timestamp | null>(null);
  let playheadTime = $state<Timestamp | null>(null);

  let marks = $state<MarksState>({
    enabled: false,
    activeTarget: "A",
    A: null,
    B: null,
  });

  // Derived
  const depthMs = depthHours * MS_PER_HOUR;

  const availableRange = $derived.by<{ start: number; end: number } | null>(
    () => {
      if (streamStartTime === null) return null;
      const depthStart = now - depthMs;
      return {
        start: Math.max(streamStartTime, depthStart),
        end: now,
      };
    },
  );

  const days = $derived.by(() => {
    if (availableRange === null) return [];
    const depthDays = Math.ceil((now - availableRange.start) / MS_PER_DAY) + 1;
    return buildAvailableDays(new Date(now), depthDays, timezoneOffset).filter(
      (d) => d.dayEnd > availableRange!.start,
    );
  });

  let viewRange = $state<ViewRange | null>(
    days[0] ? { start: days[0].dayStart, end: days[0].dayEnd } : null,
  );

  const dayWindow = $derived.by<ViewRange | null>(() => {
    if (viewRange === null) return null;
    const center = (viewRange.start + viewRange.end) / 2;

    if (centeredOnMidnight) {
      if (days.length === 0) return null;
      const todayEnd = days[0].dayEnd;
      const nearest = days.reduce((best, d) =>
        Math.abs(d.dayStart - center) < Math.abs(best.dayStart - center)
          ? d
          : best,
      );
      const useTonight =
        Math.abs(todayEnd - center) < Math.abs(nearest.dayStart - center);
      const midnight = useTonight ? todayEnd : nearest.dayStart;
      return {
        start: midnight - 12 * MS_PER_HOUR,
        end: midnight + 12 * MS_PER_HOUR,
      };
    }

    const day =
      days.find((d) => center >= d.dayStart && center < d.dayEnd) ??
      days.find((d) => center === d.dayStart);
    return day ? { start: day.dayStart, end: day.dayEnd } : null;
  });

  // State
  function setIsRewinding(value: boolean): void {
    isRewinding = value;
  }

  function setPauseAfterRewind(value: boolean): void {
    pauseAfterRewind = value;
  }

  function setStreamStartTime(ts: number): void {
    streamStartTime = ts;
  }

  // View actions
  function setZoom(level: ZoomLevel): void {
    zoomLevel = level;
    if (viewRange === null) return;
    const center = selectedTime ?? (viewRange.start + viewRange.end) / 2;
    viewRange = clampViewRange(center, level, days, centeredOnMidnight);
  }

  function setViewRange(range: ViewRange | null): void {
    viewRange = range;
  }

  function setTimezoneOffset(offsetMinutes: number): void {
    timezoneOffset = offsetMinutes;
    if (viewRange === null) return;
    const center = selectedTime ?? (viewRange.start + viewRange.end) / 2;
    const spanMs = viewRange.end - viewRange.start;
    viewRange = clampViewRange(center, spanMs, days, centeredOnMidnight);
  }

  function setCenteredOnMidnight(value: boolean): void {
    centeredOnMidnight = value;
    if (viewRange === null) return;
    const center =
      selectedTime ??
      Math.min((viewRange.start + viewRange.end) / 2, days[0].dayEnd - 1);
    const spanMs = viewRange.end - viewRange.start;
    viewRange = clampViewRange(center, spanMs, days, centeredOnMidnight);
  }

  // Time selection
  function setSelectedTime(time: Timestamp): void {
    selectedTime = time;
  }

  function clearSelectedTime(): void {
    selectedTime = null;
  }

  function setPlayheadTime(time: Timestamp | null): void {
    playheadTime = time;
    if (time !== null && viewRange === null) {
      const matchingDay = days.find(
        (d) => time >= d.dayStart && time < d.dayEnd,
      );
      if (matchingDay)
        viewRange = { start: matchingDay.dayStart, end: matchingDay.dayEnd };
    }
  }

  // Marks
  function clearAllMarks(): void {
    marks = { ...marks, A: null, B: null, activeTarget: "A" };
  }

  function assignMark(id: MarkId, time: Timestamp): void {
    marks = { ...marks, [id]: time };
    const { A, B } = marks;
    if (A !== null && B !== null && A > B) marks = { ...marks, A: B, B: A };
  }

  function getInterval(): Interval | null {
    if (marks.A === null || marks.B === null) return null;
    const [a, b] = marks.A <= marks.B ? [marks.A, marks.B] : [marks.B, marks.A];
    return { a, b };
  }

  // Settings
  function setShowTimelineViewRange(value: boolean): void {
    showTimelineViewRange = value;
  }

  function destroy(): void {
    clearInterval(nowInterval);
  }

  return {
    get isRewinding() {
      return isRewinding;
    },
    get pauseAfterRewind() {
      return pauseAfterRewind;
    },
    get days() {
      return days;
    },
    get zoomLevel() {
      return zoomLevel;
    },
    get viewRange() {
      return viewRange;
    },
    get dayWindow() {
      return dayWindow;
    },
    get selectedTime() {
      return selectedTime;
    },
    get playheadTime() {
      return playheadTime;
    },
    get marks() {
      return marks;
    },
    get timezoneOffset() {
      return timezoneOffset;
    },
    get centeredOnMidnight() {
      return centeredOnMidnight;
    },
    get showTimelineViewRange() {
      return showTimelineViewRange;
    },
    get availableRange() {
      return availableRange;
    },

    setIsRewinding,
    setPauseAfterRewind,
    setStreamStartTime,
    setZoom,
    setViewRange,
    setTimezoneOffset,
    setCenteredOnMidnight,
    setSelectedTime,
    clearSelectedTime,
    setPlayheadTime,
    clearAllMarks,
    assignMark,
    getInterval,
    setShowTimelineViewRange,
    destroy,
  };
}

export type Explorer = ReturnType<typeof createExplorer>;
