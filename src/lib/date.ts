const DAY_MS = 24 * 60 * 60 * 1000;

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function fromDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function shiftDateKey(dateKey: string, offsetDays: number): string {
  const shifted = new Date(
    fromDateKey(dateKey).getTime() + offsetDays * DAY_MS,
  );
  return toDateKey(shifted);
}

export function buildDateWindow(reference: string, days: number): string[] {
  const output: string[] = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    output.push(shiftDateKey(reference, -index));
  }

  return output;
}

export function formatDateHeading(dateKey: string, locale = "en-GB"): string {
  const today = toDateKey(new Date());

  if (dateKey === today) {
    return "Today";
  }

  if (dateKey === shiftDateKey(today, -1)) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(fromDateKey(dateKey));
}
