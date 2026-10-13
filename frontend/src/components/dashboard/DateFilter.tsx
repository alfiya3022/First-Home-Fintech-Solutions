import type { ChangeEvent } from "react";

import type { DateFilter as DateFilterValue } from "@/lib/dateFilter";

interface DateFilterProps {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
}

function DateFilter({ value, onChange }: DateFilterProps) {
  function changeKind(event: ChangeEvent<HTMLSelectElement>) {
    const kind = event.target.value;
    if (kind === "all") {
      onChange({ kind: "all" });
    } else if (kind === "day" || kind === "week") {
      onChange({ kind, date: "" });
    } else if (kind === "month") {
      onChange({ kind, month: "" });
    } else if (kind === "year") {
      onChange({ kind, year: "" });
    } else {
      onChange({ kind: "custom", startDate: "", endDate: "" });
    }
  }

  function changeDate(event: ChangeEvent<HTMLInputElement>) {
    if (value.kind === "day" || value.kind === "week") {
      onChange({ ...value, date: event.target.value });
    } else if (value.kind === "month") {
      onChange({ ...value, month: event.target.value });
    } else if (value.kind === "year") {
      onChange({ ...value, year: event.target.value });
    }
  }

  let dateControl = null;
  if (value.kind === "day" || value.kind === "week") {
    dateControl = (
      <label className="grid min-w-0 gap-1 text-xs text-muted-foreground">
        {value.kind === "week" ? "Date in week" : "Date"}
        <input
          aria-label={
            value.kind === "week" ? "Date in selected week" : "Selected date"
          }
          type="date"
          value={value.date}
          onChange={changeDate}
          className="h-10 min-w-0 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
        />
      </label>
    );
  } else if (value.kind === "month") {
    dateControl = (
      <label className="grid min-w-0 gap-1 text-xs text-muted-foreground">
        Month
        <input
          aria-label="Selected month"
          type="month"
          value={value.month}
          onChange={changeDate}
          className="h-10 min-w-0 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
        />
      </label>
    );
  } else if (value.kind === "year") {
    dateControl = (
      <label className="grid min-w-0 gap-1 text-xs text-muted-foreground">
        Year
        <input
          aria-label="Selected year"
          type="number"
          min="1900"
          max="9999"
          inputMode="numeric"
          value={value.year}
          onChange={changeDate}
          className="h-10 min-w-0 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
        />
      </label>
    );
  } else if (value.kind === "custom") {
    dateControl = (
      <>
        <label className="grid min-w-0 gap-1 text-xs text-muted-foreground">
          Start date
          <input
            aria-label="Custom start date"
            type="date"
            value={value.startDate}
            onChange={(event) =>
              onChange({ ...value, startDate: event.target.value })
            }
            className="h-10 min-w-0 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
          />
        </label>
        <label className="grid min-w-0 gap-1 text-xs text-muted-foreground">
          End date
          <input
            aria-label="Custom end date"
            type="date"
            value={value.endDate}
            onChange={(event) =>
              onChange({ ...value, endDate: event.target.value })
            }
            className="h-10 min-w-0 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
          />
        </label>
      </>
    );
  }

  return (
    <>
      <label className="grid min-w-0 gap-1 text-xs text-muted-foreground">
        Date
        <select
          aria-label="Date filter period"
          value={value.kind}
          onChange={changeKind}
          className="h-10 min-w-0 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
        >
          <option value="all">All</option>
          <option value="day">Day</option>
          <option value="week">Week (Mon–Sun)</option>
          <option value="month">Month</option>
          <option value="year">Year</option>
          <option value="custom">Custom range</option>
        </select>
      </label>
      {dateControl}
    </>
  );
}

export default DateFilter;
