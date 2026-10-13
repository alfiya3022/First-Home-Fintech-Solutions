import assert from "node:assert/strict";
import test from "node:test";

import { matchesDateFilter } from "../src/lib/dateFilter.ts";

function localTimestamp(year, month, day, hour = 12) {
  return new Date(year, month - 1, day, hour).toISOString();
}

test("day and Monday-to-Sunday week ranges include their full calendar dates", () => {
  const selectedDay = { kind: "day", date: "2026-10-13" };
  assert.equal(matchesDateFilter(localTimestamp(2026, 10, 13, 0), selectedDay), true);
  assert.equal(matchesDateFilter(localTimestamp(2026, 10, 13, 23), selectedDay), true);
  assert.equal(matchesDateFilter(localTimestamp(2026, 10, 14, 0), selectedDay), false);

  const selectedWeek = { kind: "week", date: "2026-10-14" };
  assert.equal(matchesDateFilter(localTimestamp(2026, 10, 12, 0), selectedWeek), true);
  assert.equal(matchesDateFilter(localTimestamp(2026, 10, 18, 23), selectedWeek), true);
  assert.equal(matchesDateFilter(localTimestamp(2026, 10, 19, 0), selectedWeek), false);
  assert.equal(matchesDateFilter(localTimestamp(2026, 10, 11, 23), selectedWeek), false);
});

test("month and year ranges handle calendar boundaries and leap days", () => {
  assert.equal(
    matchesDateFilter(localTimestamp(2024, 2, 29), {
      kind: "month",
      month: "2024-02",
    }),
    true,
  );
  assert.equal(
    matchesDateFilter(localTimestamp(2024, 3, 1, 0), {
      kind: "month",
      month: "2024-02",
    }),
    false,
  );
  assert.equal(
    matchesDateFilter(localTimestamp(2025, 12, 31, 23), {
      kind: "year",
      year: "2025",
    }),
    true,
  );
  assert.equal(
    matchesDateFilter(localTimestamp(2026, 1, 1, 0), {
      kind: "year",
      year: "2025",
    }),
    false,
  );
});

test("custom ranges are inclusive and support open-ended and reversed ranges", () => {
  const range = {
    kind: "custom",
    startDate: "2026-10-10",
    endDate: "2026-10-12",
  };
  assert.equal(matchesDateFilter(localTimestamp(2026, 10, 10, 0), range), true);
  assert.equal(matchesDateFilter(localTimestamp(2026, 10, 12, 23), range), true);
  assert.equal(matchesDateFilter(localTimestamp(2026, 10, 13, 0), range), false);
  assert.equal(
    matchesDateFilter(localTimestamp(2026, 10, 9), {
      kind: "custom",
      startDate: "",
      endDate: "2026-10-10",
    }),
    true,
  );
  assert.equal(
    matchesDateFilter(localTimestamp(2026, 10, 13), {
      kind: "custom",
      startDate: "2026-10-10",
      endDate: "",
    }),
    true,
  );
  assert.equal(
    matchesDateFilter(localTimestamp(2026, 10, 11), {
      kind: "custom",
      startDate: "2026-10-12",
      endDate: "2026-10-10",
    }),
    false,
  );
});
