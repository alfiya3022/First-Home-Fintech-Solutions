import type { ReactNode } from "react";

import DateFilter from "@/components/dashboard/DateFilter";
import type { DateFilter as DateFilterValue } from "@/lib/dateFilter";

interface FilterToolbarProps {
  search: ReactNode;
  status: ReactNode;
  additional?: ReactNode;
  dateFilter: DateFilterValue;
  onDateFilterChange: (value: DateFilterValue) => void;
  hasActiveFilters: boolean;
  onClear: () => void;
}

function FilterToolbar({
  search,
  status,
  additional,
  dateFilter,
  onDateFilterChange,
  hasActiveFilters,
  onClear,
}: FilterToolbarProps) {
  return (
    <section
      aria-label="Filter records"
      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="grid min-w-0 grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_repeat(auto-fit,minmax(10rem,1fr))]">
        {search}
        {status}
        {additional}
        <DateFilter value={dateFilter} onChange={onDateFilterChange} />
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="h-10 whitespace-nowrap rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Clear filters
          </button>
        )}
      </div>
    </section>
  );
}

export default FilterToolbar;
