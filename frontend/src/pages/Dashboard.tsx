import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, MessageCircle, Users } from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DateFilter from "@/components/dashboard/DateFilter";
import StatusBadge from "@/components/dashboard/StatusBadge";
import {
  matchesDateFilter,
  type DateFilter as DateFilterValue,
} from "@/lib/dateFilter";
import {
  getCaseSummary,
  getCurrentUser,
  getLeads,
  logout,
  type CaseDashboardSummary,
  type CurrentUser,
  type LeadSummary,
} from "@/services/api";

function Dashboard() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [leads, setLeads] = useState<LeadSummary[] | null>(null);
  const [caseSummary, setCaseSummary] =
    useState<CaseDashboardSummary | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    kind: "all",
  });

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [error, setError] = useState("");
  const [leadsError, setLeadsError] = useState("");
  const [casesError, setCasesError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      let currentUser: CurrentUser;
      try {
        currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Authentication required."
        ) {
          window.location.href = "/login";
          return;
        }

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load dashboard data.",
        );
        setIsCheckingAuth(false);
        setIsLoadingLeads(false);
        return;
      }

      setIsCheckingAuth(false);
      if (currentUser.is_admin) setIsLoadingCases(true);

      const leadPromise = getLeads()
        .then((data) => ({ data }) as const)
        .catch((reason: unknown) => ({ reason }) as const);
      const casePromise = currentUser.is_admin
        ? getCaseSummary()
            .then((summary) => ({ summary }) as const)
            .catch((reason: unknown) => ({ reason }) as const)
        : Promise.resolve(null);
      const [leadResult, caseResult] = await Promise.all([
        leadPromise,
        casePromise,
      ]);

      if ("data" in leadResult) {
        setLeads(leadResult.data);
      } else {
        setLeadsError(
          leadResult.reason instanceof Error
            ? leadResult.reason.message
            : "Unable to load enquiries.",
        );
      }
      setIsLoadingLeads(false);

      if (currentUser.is_admin) {
        if (caseResult && "summary" in caseResult) {
          setCaseSummary(caseResult.summary);
        } else if (caseResult && "reason" in caseResult) {
          setCasesError(
            caseResult.reason instanceof Error
              ? caseResult.reason.message
              : "Unable to load the case summary.",
          );
        }
        setIsLoadingCases(false);
      }
    }

    loadDashboard();
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
      window.location.href = "/login";
    } catch {
      setIsLoggingOut(false);
    }
  }

  const filteredLeads =
    leads?.filter((lead) =>
      matchesDateFilter(lead.created_at, dateFilter),
    ) ?? [];
  const recentLeads = filteredLeads.slice(0, 5);
  const filteredStatistics =
    leads === null
      ? null
      : {
      total: filteredLeads.length,
      new: filteredLeads.filter((lead) => lead.status === "NEW").length,
      contacted: filteredLeads.filter((lead) => lead.status === "CONTACTED")
        .length,
      converted: filteredLeads.filter((lead) => lead.status === "CONVERTED")
        .length,
      closed: filteredLeads.filter((lead) => lead.status === "CLOSED").length,
    };

  if (isCheckingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">
          Checking authentication...
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-md space-y-4 text-center">
          <p role="alert" className="text-sm text-destructive">
            {error || "Unable to load your account. Please try again."}
          </p>
          <a
            href="/login"
            className="text-sm font-medium text-foreground underline underline-offset-4"
          >
            Return to sign in
          </a>
        </div>
      </main>
    );
  }

  return (
    <DashboardLayout
      fullName={user.full_name}
      email={user.email}
      isAdmin={user.is_admin}
      onLogout={handleLogout}
      isLoggingOut={isLoggingOut}
    >
      <div className="min-h-screen">
        {/* Header */}
        <header className="flex h-20 items-center border-b border-border px-6 sm:px-8">
          <div>
            <p className="text-sm text-muted-foreground">
              {user.is_admin ? "Administrator Portal" : "Consultant Portal"}
            </p>

            <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          </div>
        </header>

        {/* Content */}
        <div className="space-y-8 px-6 py-8 sm:px-8">
          {/* Welcome */}
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Welcome back, {user.full_name}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Here's an overview of your client enquiries.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          {/* Statistics */}
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <DateFilter value={dateFilter} onChange={setDateFilter} />
          </section>

          <section
            aria-label="Lead statistics"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
          >
            <StatCard
              label="Total Leads"
              value={filteredStatistics?.total ?? null}
              icon={Users}
              isLoading={isLoadingLeads}
              hasError={Boolean(leadsError)}
            />

            <StatCard
              label="New"
              value={filteredStatistics?.new ?? null}
              icon={Clock3}
              isLoading={isLoadingLeads}
              hasError={Boolean(leadsError)}
            />

            <StatCard
              label="Contacted"
              value={filteredStatistics?.contacted ?? null}
              icon={MessageCircle}
              isLoading={isLoadingLeads}
              hasError={Boolean(leadsError)}
            />

            <StatCard
              label="Converted"
              value={filteredStatistics?.converted ?? null}
              icon={CheckCircle2}
              isLoading={isLoadingLeads}
              hasError={Boolean(leadsError)}
            />

            <StatCard
              label="Closed"
              value={filteredStatistics?.closed ?? null}
              icon={CheckCircle2}
              isLoading={isLoadingLeads}
              hasError={Boolean(leadsError)}
            />
          </section>

          {leadsError && (
            <p role="alert" className="text-sm text-destructive">
              Lead summary unavailable: {leadsError}
            </p>
          )}

          {user.is_admin && (
            <section
              aria-label="Case summary"
              className="rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold">Cases</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Current case workload.
                  </p>
                </div>
                <a
                  href="/dashboard/cases"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition hover:bg-muted"
                >
                  View cases
                </a>
              </div>
              {isLoadingCases ? (
                <p className="mt-5 text-sm text-muted-foreground">
                  Loading case summary...
                </p>
              ) : casesError ? (
                <p role="alert" className="mt-5 text-sm text-destructive">
                  Case summary unavailable: {casesError}
                </p>
              ) : caseSummary ? (
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <SummaryCount label="Total cases" value={caseSummary.total_cases} />
                  <SummaryCount
                    label="Active cases"
                    value={
                      caseSummary.total_cases -
                      caseSummary.cases_by_status.COMPLETED -
                      caseSummary.cases_by_status.CANCELLED
                    }
                  />
                </dl>
              ) : null}
            </section>
          )}

          {/* Recent Leads */}
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <h2 className="font-semibold">Recent Enquiries</h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Latest enquiries received through the website.
                </p>
              </div>

              <a
                href="/dashboard/leads"
                className="text-sm font-medium text-foreground transition-colors hover:text-muted-foreground"
              >
                View all
              </a>
            </div>

            {isLoadingLeads ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                Loading enquiries...
              </div>
            ) : leadsError ? (
              <div className="px-6 py-10 text-center text-sm text-destructive">
                Enquiries could not be loaded.
              </div>
            ) : recentLeads.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                {leads?.length === 0
                  ? "No enquiries have been received yet."
                  : "No enquiries match the selected date filter."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="px-6 py-3 font-medium">Lead</th>

                      <th className="px-6 py-3 font-medium">Name</th>

                      <th className="px-6 py-3 font-medium">Service</th>

                      <th className="px-6 py-3 font-medium">Contact</th>

                      <th className="px-6 py-3 font-medium">Status</th>

                      <th className="px-6 py-3 font-medium">Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-6 py-4">
                          <a
                            href={`/dashboard/leads/${lead.id}`}
                            className="font-medium underline-offset-4 hover:underline"
                          >
                            {lead.id}
                          </a>
                        </td>

                        <td className="px-6 py-4 font-medium">{lead.name}</td>

                        <td className="px-6 py-4 text-muted-foreground">
                          {lead.service}
                        </td>

                        <td className="px-6 py-4 text-muted-foreground">
                          {lead.phone}
                        </td>

                        <td className="px-6 py-4">
                          <StatusBadge status={lead.status} />
                        </td>

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

interface StatCardProps {
  label: string;
  value: number | null;
  icon: typeof Users;
  isLoading: boolean;
  hasError: boolean;
}

function StatCard({
  label,
  value,
  icon: Icon,
  isLoading,
  hasError,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>

        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight">
        {isLoading ? "Loading..." : hasError ? "Unavailable" : (value ?? "—")}
      </p>
    </div>
  );
}

function SummaryCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-xl font-semibold">{value}</dd>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default Dashboard;
