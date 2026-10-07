import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
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

function getStatusClasses(status: CaseStatus) {
  switch (status) {
    case "OPEN":
      return "bg-blue-50 text-blue-700";

    case "DOCUMENTS_PENDING":
      return "bg-amber-50 text-amber-700";

    case "DOCUMENTS_RECEIVED":
      return "bg-cyan-50 text-cyan-700";

    case "UNDER_REVIEW":
      return "bg-purple-50 text-purple-700";

    case "SUBMITTED":
      return "bg-indigo-50 text-indigo-700";

    case "APPROVED":
      return "bg-emerald-50 text-emerald-700";

    case "COMPLETED":
      return "bg-green-50 text-green-700";

    case "CANCELLED":
      return "bg-red-50 text-red-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
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

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCases() {
      setIsLoading(true);
      setError("");

      try {
        const [user, caseList] = await Promise.all([
          getCurrentUser(),
          getCases(),
        ]);

        setFullName(user.full_name);
        setEmail(user.email);
        setCases(caseList);
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
        currentCase.case_reference.toLowerCase().includes(query) ||
        String(currentCase.lead_id).includes(query) ||
        (currentCase.property_type ?? "").toLowerCase().includes(query) ||
        currentCase.status.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" || currentCase.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [cases, searchQuery, statusFilter]);

  return (
    <DashboardLayout
      fullName={fullName}
      email={email}
      onLogout={handleLogout}
      isLoggingOut={isLoggingOut}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/dashboard";
              }}
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#071B2D] text-white">
                <BriefcaseBusiness size={21} />
              </div>

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
              {cases.length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by case reference, lead ID, property type..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
              />
            </div>

            <div className="relative lg:w-64">
              <SlidersHorizontal
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as CaseStatus | "ALL")
                }
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
              >
                <option value="ALL">All statuses</option>

                {caseStatuses.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

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
          ) : filteredCases.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <BriefcaseBusiness size={21} className="text-slate-500" />
              </div>

              <h2 className="mt-4 text-base font-semibold text-slate-900">
                No cases found
              </h2>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                {cases.length === 0
                  ? "There are currently no financing cases."
                  : "Try changing your search or status filter."}
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
                      onClick={() => {
                        window.location.href = `/dashboard/cases/${currentCase.id}`;
                      }}
                      className="cursor-pointer transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {currentCase.case_reference}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Case ID #{currentCase.id}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-700">
                          {currentCase.lead_name ||
                            `Lead #${currentCase.lead_id}`}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Lead #{currentCase.lead_id}
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
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                            currentCase.status,
                          )}`}
                        >
                          {formatStatus(currentCase.status)}
                        </span>
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
