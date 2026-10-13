import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, SlidersHorizontal } from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import FilterToolbar from "@/components/dashboard/FilterToolbar";
import StatusBadge from "@/components/dashboard/StatusBadge";
import {
  matchesDateFilter,
  type DateFilter as DateFilterValue,
} from "@/lib/dateFilter";
import {
  getCases,
  getCurrentUser,
  logout,
  type Case,
  type CaseStatus,
} from "@/services/api";

const caseStatuses: CaseStatus[] = [
  "OPEN",
  "DOCUMENTS_PENDING",
  "DOCUMENTS_RECEIVED",
  "UNDER_REVIEW",
  "SUBMITTED",
  "APPROVED",
  "COMPLETED",
  "CANCELLED",
];

function formatStatus(status: CaseStatus) {
  return status.replaceAll("_", " ");
}

function formatCurrency(value: number | null) {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function Cases() {
  const [cases, setCases] = useState<Case[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CaseStatus | "ALL">("ALL");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    kind: "all",
  });

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCases() {
      setIsLoading(true);
      setError("");

      try {
        const user = await getCurrentUser();

        setFullName(user.full_name);
        setEmail(user.email);
        setIsAdmin(user.is_admin);
        if (!user.is_admin) {
          setError("Administrator access required.");
          return;
        }
        setCases(await getCases());
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Authentication required."
        ) {
          window.location.href = "/login";
          return;
        }

        setError(
          error instanceof Error ? error.message : "Unable to load cases.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadCases();
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
      window.location.href = "/login";
    } catch {
      setIsLoggingOut(false);
      setError("Unable to log out right now.");
    }
  }

  const filteredCases = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return cases.filter((currentCase) => {
      const matchesSearch =
        query === "" ||
        String(currentCase.id).includes(query) ||
        currentCase.case_reference.toLowerCase().includes(query) ||
        (currentCase.lead_name ?? "").toLowerCase().includes(query) ||
        String(currentCase.lead_id).includes(query) ||
        (currentCase.property_type ?? "").toLowerCase().includes(query) ||
        currentCase.status.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" || currentCase.status === statusFilter;
      const matchesDate = matchesDateFilter(currentCase.created_at, dateFilter);

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [cases, searchQuery, statusFilter, dateFilter]);

  return (
    <DashboardLayout
      fullName={fullName}
      email={email}
      isAdmin={isAdmin}
      onLogout={handleLogout}
      isLoggingOut={isLoggingOut}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <a
              href="/dashboard"
              className="mb-3 inline-flex items-center gap-2 text-lg font-medium text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </a>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ffff] text-white"></div>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Cases
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Manage active financing cases and their progress.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Total Cases
            </p>

            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {isLoading ? "Loading..." : error ? "Unavailable" : cases.length}
            </p>
          </div>
        </div>

        {/* Filters */}

        <FilterToolbar
          search={
            <label className="grid min-w-0 gap-1 text-xs text-muted-foreground">
              Search cases
              <span className="relative min-w-0">
                <Search
                  size={18}
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Case, lead name or ID"
                  className="h-10 w-full min-w-0 rounded-lg border border-input bg-background pl-10 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </span>
            </label>
          }
          status={
            <label className="grid min-w-0 gap-1 text-xs text-muted-foreground">
              Status
              <span className="relative min-w-0">
                <SlidersHorizontal
                  size={17}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <select
                  aria-label="Filter cases by status"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as CaseStatus | "ALL")
                  }
                  className="h-10 w-full min-w-0 appearance-none rounded-lg border border-input bg-background pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                >
                  <option value="ALL">All statuses</option>
                  {caseStatuses.map((status) => (
                    <option key={status} value={status}>
                      {formatStatus(status)}
                    </option>
                  ))}
                </select>
              </span>
            </label>
          }
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          hasActiveFilters={
            Boolean(searchQuery.trim()) ||
            statusFilter !== "ALL" ||
            dateFilter.kind !== "all"
          }
          onClear={() => {
            setSearchQuery("");
            setStatusFilter("ALL");
            setDateFilter({ kind: "all" });
          }}
        />

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <p className="text-sm text-slate-500">Loading cases...</p>
            </div>
          ) : error ? (
            <div className="flex min-h-[300px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
              Cases could not be loaded.
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100"></div>

              <h2 className="mt-4 text-base font-semibold text-slate-900">
                No cases found
              </h2>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                {cases.length === 0
                  ? "There are currently no financing cases."
                  : "No cases match the current search or filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Case
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Lead
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Property
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Loan Amount
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Created
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredCases.map((currentCase) => (
                    <tr
                      key={currentCase.id}
                      className="transition-colors hover:bg-muted/50"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <a
                            href={`/dashboard/cases/${currentCase.id}`}
                            className="text-sm font-semibold text-foreground underline-offset-4 hover:underline"
                          >
                            {currentCase.id}
                          </a>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <a
                          href={`/dashboard/leads/${currentCase.lead_id}`}
                          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          {currentCase.lead_name ||
                            `Lead ${currentCase.lead_id}`}
                        </a>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Lead {currentCase.lead_id}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {currentCase.property_type || "—"}
                          </p>

                          {currentCase.property_value !== null && (
                            <p className="mt-1 text-xs text-slate-400">
                              {formatCurrency(currentCase.property_value)}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-700">
                          {formatCurrency(currentCase.loan_amount)}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={currentCase.status} />
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600">
                          {formatDate(currentCase.created_at)}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!isLoading && filteredCases.length > 0 && (
          <p className="text-xs text-slate-400">
            Showing {filteredCases.length} of {cases.length} cases
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Cases;
