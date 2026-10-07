import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, MessageCircle, Users } from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { getCurrentUser, getLeads, logout, type Lead } from "@/services/api";

interface CurrentUser {
  id: number;
  email: string;
  full_name: string;
}

function Dashboard() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
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
          error instanceof Error
            ? error.message
            : "Unable to load dashboard data.",
        );
      } finally {
        setIsCheckingAuth(false);
        setIsLoadingLeads(false);
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

  const statistics = useMemo(() => {
    return {
      total: leads.length,
      new: leads.filter((lead) => lead.status === "NEW").length,
      contacted: leads.filter((lead) => lead.status === "CONTACTED").length,
      converted: leads.filter((lead) => lead.status === "CONVERTED").length,
      closed: leads.filter((lead) => lead.status === "CLOSED").length,
    };
  }, [leads]);

  const recentLeads = leads.slice(0, 5);

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
    return null;
  }

  return (
    <DashboardLayout
      fullName={user.full_name}
      email={user.email}
      onLogout={handleLogout}
      isLoggingOut={isLoggingOut}
    >
      <div className="min-h-screen">
        {/* Header */}
        <header className="flex h-20 items-center border-b border-border px-6 sm:px-8">
          <div>
            <p className="text-sm text-muted-foreground">Consultant Portal</p>

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
          <section
            aria-label="Lead statistics"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
          >
            <StatCard
              label="Total Leads"
              value={statistics.total}
              icon={Users}
              isLoading={isLoadingLeads}
            />

            <StatCard
              label="New"
              value={statistics.new}
              icon={Clock3}
              isLoading={isLoadingLeads}
            />

            <StatCard
              label="Contacted"
              value={statistics.contacted}
              icon={MessageCircle}
              isLoading={isLoadingLeads}
            />

            <StatCard
              label="Converted"
              value={statistics.converted}
              icon={CheckCircle2}
              isLoading={isLoadingLeads}
            />

            <StatCard
              label="Closed"
              value={statistics.closed}
              icon={CheckCircle2}
              isLoading={isLoadingLeads}
            />
          </section>

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
            ) : recentLeads.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                No enquiries have been received yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
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
  value: number;
  icon: typeof Users;
  isLoading: boolean;
}

function StatCard({ label, value, icon: Icon, isLoading }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>

        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight">
        {isLoading ? "—" : value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: Lead["status"] }) {
  const styles: Record<Lead["status"], string> = {
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default Dashboard;
