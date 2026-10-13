export type DateFilter =
  | { kind: "all" }
  | { kind: "day"; date: string }
  | { kind: "week"; date: string }
  | { kind: "month"; month: string }
  | { kind: "year"; year: string }
  | { kind: "custom"; startDate: string; endDate: string };

interface DateRange {
  start: Date | null;
  endExclusive: Date | null;
}

function localDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return null;
  }

  return date;
}

function getDateRange(filter: DateFilter): DateRange {
  if (filter.kind === "all") return { start: null, endExclusive: null };

  if (filter.kind === "day" || filter.kind === "week") {
    const selectedDate = localDate(filter.date);
    if (!selectedDate) return { start: null, endExclusive: null };
    const start = new Date(selectedDate);

    if (filter.kind === "week") {
      const mondayOffset = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - mondayOffset);
    }

    const endExclusive = new Date(start);
    endExclusive.setDate(
      endExclusive.getDate() + (filter.kind === "week" ? 7 : 1),
    );
    return { start, endExclusive };
  }

  if (filter.kind === "month") {
    const match = /^(\d{4})-(\d{2})$/.exec(filter.month);
    if (!match) return { start: null, endExclusive: null };
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month < 1 || month > 12) return { start: null, endExclusive: null };
    return {
      start: new Date(year, month - 1, 1),
      endExclusive: new Date(year, month, 1),
    };
  }

  if (filter.kind === "year") {
    if (!/^\d{4}$/.test(filter.year)) {
      return { start: null, endExclusive: null };
    }
    const year = Number(filter.year);
    return {
      start: new Date(year, 0, 1),
      endExclusive: new Date(year + 1, 0, 1),
    };
  }

  const start = filter.startDate ? localDate(filter.startDate) : null;
  const endDate = filter.endDate ? localDate(filter.endDate) : null;
  const endExclusive = endDate ? new Date(endDate) : null;
  endExclusive?.setDate(endExclusive.getDate() + 1);

  if (start && endExclusive && start >= endExclusive) {
    return { start: new Date(1), endExclusive: new Date(0) };
  }
  return { start, endExclusive };
}

export function matchesDateFilter(value: string, filter: DateFilter): boolean {
  const { start, endExclusive } = getDateRange(filter);
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return false;

  return (
    (!start || timestamp >= start) &&
    (!endExclusive || timestamp < endExclusive)
  );
}
