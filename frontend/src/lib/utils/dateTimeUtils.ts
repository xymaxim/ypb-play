export interface UtcOffset {
  label: string;
  value: string;
  offsetMinutes: number;
}

export const UTC_OFFSETS: UtcOffset[] = [
  { offsetMinutes: -720 },
  { offsetMinutes: -660 },
  { offsetMinutes: -600 },
  { offsetMinutes: -570 },
  { offsetMinutes: -540 },
  { offsetMinutes: -480 },
  { offsetMinutes: -420 },
  { offsetMinutes: -360 },
  { offsetMinutes: -300 },
  { offsetMinutes: -240 },
  { offsetMinutes: -210 },
  { offsetMinutes: -180 },
  { offsetMinutes: -120 },
  { offsetMinutes: -60 },
  { offsetMinutes: 0 },
  { offsetMinutes: 60 },
  { offsetMinutes: 120 },
  { offsetMinutes: 180 },
  { offsetMinutes: 210 },
  { offsetMinutes: 240 },
  { offsetMinutes: 270 },
  { offsetMinutes: 300 },
  { offsetMinutes: 330 },
  { offsetMinutes: 345 },
  { offsetMinutes: 360 },
  { offsetMinutes: 390 },
  { offsetMinutes: 420 },
  { offsetMinutes: 480 },
  { offsetMinutes: 525 },
  { offsetMinutes: 540 },
  { offsetMinutes: 570 },
  { offsetMinutes: 600 },
  { offsetMinutes: 630 },
  { offsetMinutes: 660 },
  { offsetMinutes: 690 },
  { offsetMinutes: 720 },
  { offsetMinutes: 765 },
  { offsetMinutes: 780 },
  { offsetMinutes: 840 },
].map(({ offsetMinutes }) => {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hours = String(Math.floor(abs / 60)).padStart(2, "0");
  const minutes = String(abs % 60).padStart(2, "0");
  const label = `UTC${sign}${hours}:${minutes}`;
  return { label, value: label, offsetMinutes };
});

export function localOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export interface DateTimeParts {
  date: string;
  time: string;
  offset: string;
}

export function getDateTimeParts(
  ts: number,
  offsetMinutes: number,
): DateTimeParts {
  const shifted = new Date(ts + offsetMinutes * 60_000);

  const date = shifted.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  const time = `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}`;

  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absOffset = Math.abs(offsetMinutes);
  const offsetH = pad(Math.floor(absOffset / 60));
  const offsetM = absOffset % 60;
  // const offset = offsetM === 0 ? `${sign}${offsetH}` : `${sign}${offsetH}:${pad(offsetM)}`;
  const offset = `${sign}${offsetH}:${pad(offsetM)}`;

  return { date, time, offset };
}

export function formatDate(ts: number, offsetMinutes: number): string {
  return getDateTimeParts(ts, offsetMinutes).date;
}

export function formatTime(ts: number, offsetMinutes: number): string {
  return getDateTimeParts(ts, offsetMinutes).time;
}

export function formatOffset(offsetMinutes: number): string {
  return getDateTimeParts(0, offsetMinutes).offset;
}

export function formatDateTime(
  ts: number,
  offsetMinutes: number,
  includeOffset = true,
): string {
  const { date, time, offset } = getDateTimeParts(ts, offsetMinutes);
  return includeOffset ? `${date}, ${time} ${offset}` : `${date}, ${time}`;
}

export function formatISOString(ts: number, offsetMinutes: number): string {
  const shifted = new Date(ts + offsetMinutes * 60_000);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absOffset = Math.abs(offsetMinutes);
  const offsetH = pad(Math.floor(absOffset / 60));
  const offsetM = pad(absOffset % 60);
  return `${shifted.toISOString().slice(0, 19)}${sign}${offsetH}:${offsetM}`;
}
