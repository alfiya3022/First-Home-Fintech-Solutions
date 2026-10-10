import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Search, SlidersHorizontal } from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  exportLeads,
  getCurrentUser,
  getLeads,
  logout,
  type Lead,
} from "@/services/api";

interface CurrentUser {
  id: number;
  email: string;
  full_name: string;
}

const STATUS_OPTIONS: Array<"ALL" | Lead["status"]> = [
  "ALL",
  "NEW",
  "CONTACTED",
  "CONVERTED",
  "CLOSED",
];

function Leads() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<"ALL" | Lead["status"]>(
    "ALL",
  );

  const [serviceFilter, setServiceFilter] = useState("ALL");

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [error, setError] = useState("");

  // =========================================================
  // Load consultant + leads
  // =========================================================

  useEffect(() => {
    async function loadLeads() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        const leadData = await getLeads();
        setLeads(leadData);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Authentication required."
        ) {
          window.location.href = "/login";
          return;
        }

        setError(
          error instanceof Error ? error.message : "Unable to load leads.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadLeads();
  }, []);

  // =========================================================
  // Logout
  // =========================================================

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
      window.location.href = "/login";
    } catch {
      setIsLoggingOut(false);
    }
  }

  // =========================================================
  // Excel export
  // =========================================================

  async function handleExport() {
    setError("");
    setIsExporting(true);

    try {
      const blob = await exportLeads();

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = "First Home Leads.xlsx";

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Authentication required."
      ) {
        window.location.href = "/login";
        return;
      }

      setError(
        error instanceof Error ? error.message : "Unable to export leads.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  // =========================================================
  // Service filter options
  // =========================================================

  const serviceOptions = useMemo(() => {
    const services = Array.from(new Set(leads.map((lead) => lead.service)));

    return services.sort((a, b) => a.localeCompare(b));
  }, [leads]);

  // =========================================================
  // Filter leads
  // =========================================================

  const filteredLeads = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return leads.filter((lead) => {
      const matchesSearch =
        !normalizedSearch ||
        lead.name.toLowerCase().includes(normalizedSearch) ||
        lead.email.toLowerCase().includes(normalizedSearch) ||
        lead.phone.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" || lead.status === statusFilter;

      const matchesService =
        serviceFilter === "ALL" || lead.service === serviceFilter;

      return matchesSearch && matchesStatus && matchesService;
    });
  }, [leads, search, statusFilter, serviceFilter]);

  // =========================================================
  // Loading state
  // =========================================================

  if (!user && isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading leads...</p>
      </main>
    );
  }

  // =========================================================
  // No authenticated user
  // =========================================================

  if (!user) {
    return null;
  }

  // =========================================================
  // Page
  // =========================================================

  return (
    <DashboardLayout
      fullName={user.full_name}
      email={user.email}
      onLogout={handleLogout}
      isLoggingOut={isLoggingOut}
    >
      <div className="min-h-screen">
        {/* ===================================================
            Header
        =================================================== */}

        <header className="border-b border-border">
          <div className="flex h-20 items-center px-6 sm:px-8">
            <div>
              <p className="text-sm text-muted-foreground">Consultant Portal</p>

              <h1 className="text-xl font-semibold tracking-tight">Leads</h1>
            </div>
          </div>
        </header>

        {/* ===================================================
            Content
        =================================================== */}

        <div className="space-y-6 px-6 py-8 sm:px-8">
          {/* Page introduction + actions */}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Client Enquiries
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                View and manage enquiries received through the website.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Export */}

              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting || isLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="size-4" aria-hidden="true" />

                {isExporting ? "Exporting..." : "Export Excel"}
              </button>

              {/* Dashboard */}

              <a
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Dashboard
              </a>
            </div>
          </div>

          {/* =================================================
              Error
          ================================================= */}

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          {/* =================================================
              Filters
          ================================================= */}

          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 pb-4">
              <SlidersHorizontal
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />

              <p className="text-sm font-medium">Filters</p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {/* Search */}

              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, email or phone..."
                  className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>

              {/* Status */}

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "ALL" | Lead["status"])
                }
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status === "ALL" ? "All statuses" : status}
                  </option>
                ))}
              </select>

              {/* Service */}

              <select
                value={serviceFilter}
                onChange={(event) => setServiceFilter(event.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              >
                <option value="ALL">All services</option>

                {serviceOptions.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* =================================================
              Results
          ================================================= */}

          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {/* Results header */}

            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <h2 className="font-semibold">All Leads</h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {isLoading
                    ? "Loading..."
                    : `${filteredLeads.length} ${
                        filteredLeads.length === 1 ? "lead" : "leads"
                      }`}
                </p>
              </div>
            </div>

            {/* Loading */}

            {isLoading ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                Loading enquiries...
              </div>
            ) : filteredLeads.length === 0 ? (
              /* Empty state */

              <div className="px-6 py-12 text-center">
                <p className="text-sm font-medium">No leads found</p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Try changing your search or filters.
                </p>
              </div>
            ) : (
              /* Table */

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="px-6 py-3 font-medium">Name</th>

                      <th className="px-6 py-3 font-medium">Email</th>

                      <th className="px-6 py-3 font-medium">Phone</th>

                      <th className="px-6 py-3 font-medium">Service</th>

                      <th className="px-6 py-3 font-medium">Status</th>

                      <th className="px-6 py-3 font-medium">Created</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        onClick={() => {
                          window.location.href = `/dashboard/leads/${lead.id}`;
                        }}
                        className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/50"
                      >
                        {/* Name */}

                        <td className="px-6 py-4 font-medium">{lead.name}</td>

                        {/* Email */}

                        <td className="px-6 py-4 text-muted-foreground">
                          {lead.email}
                        </td>

                        {/* Phone */}

                        <td className="px-6 py-4 text-muted-foreground">
                          {lead.phone}
                        </td>

                        {/* Service */}

                        <td className="max-w-[220px] truncate px-6 py-4 text-muted-foreground">
                          {lead.service}
                        </td>

                        {/* Status */}

                        <td className="px-6 py-4">
                          <StatusBadge status={lead.status} />
                        </td>

                        {/* Created */}

                        <td className="px-6 py-4 text-muted-foreground">
                          {formatDate(lead.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

// =========================================================
// Status Badge
// =========================================================

function StatusBadge({ status }: { status: Lead["status"] }) {
  const styles = {
    NEW: "bg-blue-500/10 text-blue-700 dark:text-blue-300",

    CONTACTED: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",

    CONVERTED: "bg-green-500/10 text-green-700 dark:text-green-300",

    CLOSED: "bg-muted text-muted-foreground",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

// =========================================================
// Date formatting
// =========================================================

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default Leads;
