import { useEffect, useState } from "react";

import {
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatusBadge from "@/components/dashboard/StatusBadge";

import {
  createCase,
  getCaseForLead,
  getCurrentUser,
  getLead,
  logout,
  updateLeadStatus,
  type Case,
  type CurrentUser,
  type Lead,
} from "@/services/api";

const STATUS_OPTIONS: Lead["status"][] = [
  "NEW",
  "CONTACTED",
  "CONVERTED",
  "CLOSED",
];

interface LeadDetailsProps {
  leadId: number;
}

function LeadDetails({ leadId }: LeadDetailsProps) {
  const [user, setUser] = useState<CurrentUser | null>(null);

  const [lead, setLead] = useState<Lead | null>(null);

  const [selectedStatus, setSelectedStatus] = useState<Lead["status"]>("NEW");

  const [isEditingStatus, setIsEditingStatus] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [error, setError] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [caseLookupError, setCaseLookupError] = useState("");

  const [isLoadingCase, setIsLoadingCase] = useState(true);

  const [isCreatingCase, setIsCreatingCase] = useState(false);

  const [propertyType, setPropertyType] = useState("");

  const [propertyValue, setPropertyValue] = useState("");

  const [loanAmount, setLoanAmount] = useState("");

  const [caseNotes, setCaseNotes] = useState("");

  useEffect(() => {
    async function loadLeadDetails() {
      try {
        const currentUser = await getCurrentUser();

        setUser(currentUser);

        const leadData = await getLead(leadId);

        setLead(leadData);
        setSelectedStatus(leadData.status);

        if (currentUser.is_admin) {
          try {
            setCaseData(await getCaseForLead(leadData.id));
          } catch (caseError) {
            if (
              caseError instanceof Error &&
              caseError.message === "Case not found for this lead."
            ) {
              setCaseData(null);
            } else {
              setCaseLookupError(
                "Unable to verify whether a case already exists. Case creation is unavailable until this can be checked.",
              );
            }
          }
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Authentication required."
        ) {
          window.location.href = "/login";

          return;
        }

        setError(
          error instanceof Error ? error.message : "Unable to load lead.",
        );
      } finally {
        setIsLoadingCase(false);
        setIsLoading(false);
      }
    }

    loadLeadDetails();
  }, [leadId]);

  function handleEditStatus() {
    if (!lead) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setSelectedStatus(lead.status);
    setIsEditingStatus(true);
  }

  function handleCancelStatusEdit() {
    if (!lead) {
      return;
    }

    setSelectedStatus(lead.status);
    setIsEditingStatus(false);
    setError("");
  }

  async function handleStatusUpdate() {
    if (!lead || selectedStatus === lead.status) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsSaving(true);

    try {
      const updatedLead = await updateLeadStatus(lead.id, selectedStatus);

      setLead(updatedLead);
      setSelectedStatus(updatedLead.status);
      setIsEditingStatus(false);

      setSuccessMessage("Lead status updated successfully.");
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
          : "Unable to update lead status.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateCase() {
    if (!lead) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsCreatingCase(true);

    try {
      const createdCase = await createCase({
        lead_id: lead.id,
        property_type: propertyType.trim() || null,
        property_value: propertyValue ? Number(propertyValue) : null,
        loan_amount: loanAmount ? Number(loanAmount) : null,
        notes: caseNotes.trim() || null,
      });

      setCaseData(createdCase);
      setLead({ ...lead, status: "CONVERTED" });
      setSelectedStatus("CONVERTED");

      setPropertyType("");
      setPropertyValue("");
      setLoanAmount("");
      setCaseNotes("");

      setSuccessMessage("Case created successfully. Lead converted.");
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Authentication required."
      ) {
        window.location.href = "/login";

        return;
      }

      if (
        error instanceof Error &&
        error.message === "A case already exists for this lead."
      ) {
        try {
          const existingCase = await getCaseForLead(lead.id);
          setCaseData(existingCase);
          const updatedLead = await getLead(lead.id);
          setLead(updatedLead);
          setSelectedStatus(updatedLead.status);
          setSuccessMessage(
            "This lead already has a case. The existing case is shown below.",
          );
          return;
        } catch {
          setError(
            "A case already exists for this lead, but its details could not be loaded. Refresh the page to try again.",
          );
          return;
        }
      }

      setError(
        error instanceof Error ? error.message : "Unable to create case.",
      );
    } finally {
      setIsCreatingCase(false);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();

      window.location.href = "/login";
    } catch {
      setIsLoggingOut(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading lead...</p>
      </main>
    );
  }

  if (!user || !lead) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Lead unavailable</h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {error || "The requested lead could not be found."}
          </p>

          <a
            href="/dashboard/leads"
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Leads
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
        <header className="border-b border-border">
          <div className="flex min-h-20 items-center justify-between gap-4 px-6 sm:px-8">
            <div>
              <p className="text-sm text-muted-foreground">
                {user.is_admin ? "Administrator Portal" : "Consultant Portal"}
              </p>

              <h1 className="text-xl font-semibold tracking-tight">
                Lead Details
              </h1>
            </div>

            <a
              href="/dashboard/leads"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to Leads
            </a>
          </div>
        </header>

        {/* Content */}
        <div className="space-y-6 px-6 py-8 sm:px-8">
          {/* Error */}
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          {/* Success */}
          {successMessage && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-300"
            >
              <Check className="size-4" aria-hidden="true" />

              {successMessage}
            </div>
          )}

          {/* Lead header */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted">
                  <UserRound
                    className="size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {lead.name}
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {lead.id}
                  </p>
                </div>
              </div>

              <StatusBadge status={lead.status} />
            </div>
          </section>

          {/* Contact + enquiry */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Contact information */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-semibold">Contact Information</h2>

              <div className="mt-5 space-y-4">
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-start gap-3 text-sm transition-colors hover:text-muted-foreground"
                >
                  <Mail
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />

                  <span className="break-all">{lead.email}</span>
                </a>

                <a
                  href={`tel:${lead.phone}`}
                  className="flex items-start gap-3 text-sm transition-colors hover:text-muted-foreground"
                >
                  <Phone
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />

                  <span>{lead.phone}</span>
                </a>
              </div>
            </section>

            {/* Enquiry */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
              <h2 className="font-semibold">Enquiry</h2>

              <dl className="mt-5 space-y-4">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Service
                  </dt>

                  <dd className="mt-1 text-sm">{lead.service}</dd>
                </div>

                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Message
                  </dt>

                  <dd className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {lead.message}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          {/* Lead status */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-semibold">Lead Status</h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {user.is_admin
                    ? "Update the current stage of this enquiry."
                    : "Current stage of this enquiry."}
                </p>
              </div>

              {user.is_admin && !isEditingStatus && (
                <button
                  type="button"
                  onClick={handleEditStatus}
                  className="h-10 rounded-lg border border-border bg-background px-4 text-sm font-medium transition hover:bg-muted"
                >
                  Edit Status
                </button>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="w-full sm:max-w-xs">
                <label
                  htmlFor="lead-status"
                  className="mb-2 block text-sm font-medium"
                >
                  Status
                </label>

                <select
                  id="lead-status"
                  value={selectedStatus}
                  onChange={(event) =>
                    setSelectedStatus(event.target.value as Lead["status"])
                  }
                  disabled={!user.is_admin || !isEditingStatus || isSaving}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              {isEditingStatus && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleStatusUpdate}
                    disabled={isSaving || selectedStatus === lead.status}
                    className="h-11 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Status"}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelStatusEdit}
                    disabled={isSaving}
                    className="h-11 rounded-lg border border-border bg-background px-5 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </section>

          {user.is_admin && !isLoadingCase && !caseData && (
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <h2 className="font-semibold">Case eligibility</h2>
              {caseLookupError ? (
                <p role="alert" className="mt-2 text-sm text-destructive">
                  {caseLookupError}
                </p>
              ) : lead.status !== "CONTACTED" ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  A case is unavailable while this lead is {lead.status}. Update
                  the lead to CONTACTED before creating a case.
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  This lead is eligible. Creating a case will convert it to
                  CONVERTED. Each lead can have one case.
                </p>
              )}
            </section>
          )}

          {/* Create Case */}
          {user.is_admin &&
            lead.status === "CONTACTED" &&
            !caseData &&
            !isLoadingCase &&
            !caseLookupError && (
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <BriefcaseBusiness
                    className="size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <h2 className="font-semibold">Create Case</h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    A case can be created after this lead reaches CONTACTED.
                    Creating the case changes the lead to CONVERTED.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="property-type"
                    className="mb-2 block text-sm font-medium"
                  >
                    Property Type
                  </label>

                  <input
                    id="property-type"
                    type="text"
                    value={propertyType}
                    onChange={(event) => setPropertyType(event.target.value)}
                    placeholder="e.g. Apartment"
                    className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="property-value"
                    className="mb-2 block text-sm font-medium"
                  >
                    Property Value (AED)
                  </label>

                  <input
                    id="property-value"
                    type="number"
                    min="0"
                    value={propertyValue}
                    onChange={(event) => setPropertyValue(event.target.value)}
                    placeholder="e.g. 1000000"
                    className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="loan-amount"
                    className="mb-2 block text-sm font-medium"
                  >
                    Loan Amount (AED)
                  </label>

                  <input
                    id="loan-amount"
                    type="number"
                    min="0"
                    value={loanAmount}
                    onChange={(event) => setLoanAmount(event.target.value)}
                    placeholder="e.g. 800000"
                    className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="case-notes"
                    className="mb-2 block text-sm font-medium"
                  >
                    Notes
                  </label>

                  <textarea
                    id="case-notes"
                    value={caseNotes}
                    onChange={(event) => setCaseNotes(event.target.value)}
                    rows={4}
                    placeholder="Add any relevant case notes..."
                    className="w-full resize-none rounded-lg border border-input bg-background px-3 py-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleCreateCase}
                  disabled={isCreatingCase}
                  className="h-11 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreatingCase ? "Creating Case..." : "Create Case"}
                </button>
              </div>
            </section>
            )}

          {/* Existing Case */}
          {user.is_admin && !isLoadingCase && caseData && (
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <BriefcaseBusiness
                      className="size-5 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>

                  <div>
                    <h2 className="font-semibold">Financing Case</h2>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Case {caseData.id}
                    </p>
                  </div>
                </div>

                <a
                  href={`/dashboard/cases/${caseData.id}`}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium transition hover:bg-muted"
                >
                  View Case
                </a>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Case Status
                  </p>
                  <div className="mt-2">
                    <StatusBadge status={caseData.status} />
                  </div>
                </div>

                <InfoCard
                  label="Property Type"
                  value={caseData.property_type || "Not provided"}
                />

                <InfoCard
                  label="Loan Amount"
                  value={
                    caseData.loan_amount !== null
                      ? formatAED(caseData.loan_amount)
                      : "Not provided"
                  }
                />
              </div>
            </section>
          )}

          {/* Metadata */}
          <section className="grid gap-4 sm:grid-cols-2">
            <InfoCard label="Created" value={formatDate(lead.created_at)} />

            <InfoCard
              label="Last Updated"
              value={formatDate(lead.updated_at)}
            />
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatAED(value: number | string) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export default LeadDetails;
