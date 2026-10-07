import { useEffect, useState, type ReactNode } from "react";

import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  FileCheck2,
  FileText,
  Home,
  Loader2,
  User,
  X,
} from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";

import {
  getCase,
  getCaseDocuments,
  getCurrentUser,
  logout,
  updateCaseDocumentStatus,
  updateCaseNotes,
  updateCaseStatus,
  type Case,
  type CaseDocument,
  type CaseDocumentStatus,
  type CaseStatus,
} from "@/services/api";

interface CurrentUser {
  id: number;
  email: string;
  full_name: string;
}

const CASE_STATUS_OPTIONS: CaseStatus[] = [
  "OPEN",
  "DOCUMENTS_PENDING",
  "DOCUMENTS_RECEIVED",
  "UNDER_REVIEW",
  "SUBMITTED",
  "APPROVED",
  "COMPLETED",
  "CANCELLED",
];

interface CaseDetailsProps {
  caseId: number;
}

interface DocumentConfirmation {
  document: CaseDocument;
  nextStatus: CaseDocumentStatus;
}

function CaseDetails({ caseId }: CaseDetailsProps) {
  const [user, setUser] = useState<CurrentUser | null>(null);

  const [caseData, setCaseData] = useState<Case | null>(null);

  const [selectedStatus, setSelectedStatus] = useState<CaseStatus>("OPEN");

  const [isEditingStatus, setIsEditingStatus] = useState(false);

  const [documents, setDocuments] = useState<CaseDocument[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [isDocumentsLoading, setIsDocumentsLoading] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [error, setError] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  // Notes
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const [notesDraft, setNotesDraft] = useState("");

  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Documents
  const [documentConfirmation, setDocumentConfirmation] =
    useState<DocumentConfirmation | null>(null);

  const [isUpdatingDocument, setIsUpdatingDocument] = useState(false);

  useEffect(() => {
    async function loadCaseDetails() {
      try {
        const currentUser = await getCurrentUser();

        setUser(currentUser);

        const caseResponse = await getCase(caseId);

        setCaseData(caseResponse);
        setSelectedStatus(caseResponse.status);
        setNotesDraft(caseResponse.notes ?? "");

        await loadDocuments(caseId);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Authentication required."
        ) {
          window.location.href = "/login";
          return;
        }

        setError(
          error instanceof Error ? error.message : "Unable to load case.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadCaseDetails();
  }, [caseId]);

  async function loadDocuments(id: number) {
    setIsDocumentsLoading(true);

    try {
      const caseDocuments = await getCaseDocuments(id);

      setDocuments(caseDocuments);
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
          : "Unable to load case documents.",
      );
    } finally {
      setIsDocumentsLoading(false);
    }
  }

  function handleEditStatus() {
    if (!caseData) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setSelectedStatus(caseData.status);
    setIsEditingStatus(true);
  }

  function handleCancelStatusEdit() {
    if (!caseData) {
      return;
    }

    setSelectedStatus(caseData.status);
    setIsEditingStatus(false);
    setError("");
  }

  async function handleStatusUpdate() {
    if (!caseData || selectedStatus === caseData.status) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsSaving(true);

    try {
      const updatedCase = await updateCaseStatus(caseData.id, selectedStatus);

      setCaseData(updatedCase);
      setSelectedStatus(updatedCase.status);
      setIsEditingStatus(false);

      setSuccessMessage("Case status updated successfully.");
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
          : "Unable to update case status.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleEditNotes() {
    if (!caseData) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setNotesDraft(caseData.notes ?? "");
    setIsEditingNotes(true);
  }

  function handleCancelNotesEdit() {
    if (!caseData) {
      return;
    }

    setNotesDraft(caseData.notes ?? "");
    setIsEditingNotes(false);
    setError("");
  }

  async function handleSaveNotes() {
    if (!caseData) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsSavingNotes(true);

    try {
      const updatedCase = await updateCaseNotes(caseData.id, notesDraft);

      setCaseData(updatedCase);
      setNotesDraft(updatedCase.notes ?? "");
      setIsEditingNotes(false);

      setSuccessMessage("Case notes updated successfully.");
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Authentication required."
      ) {
        window.location.href = "/login";
        return;
      }

      setError(
        error instanceof Error ? error.message : "Unable to update case notes.",
      );
    } finally {
      setIsSavingNotes(false);
    }
  }

  function handleDocumentStatusChange(
    document: CaseDocument,
    nextStatus: CaseDocumentStatus,
  ) {
    setError("");
    setSuccessMessage("");

    setDocumentConfirmation({
      document,
      nextStatus,
    });
  }

  function closeDocumentConfirmation() {
    if (isUpdatingDocument) {
      return;
    }

    setDocumentConfirmation(null);
  }

  async function confirmDocumentStatusChange() {
    if (!documentConfirmation) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsUpdatingDocument(true);

    const { document, nextStatus } = documentConfirmation;

    try {
      const updatedDocument = await updateCaseDocumentStatus(
        caseId,
        document.id,
        nextStatus,
      );

      setDocuments((currentDocuments) =>
        currentDocuments.map((currentDocument) =>
          currentDocument.id === updatedDocument.id
            ? updatedDocument
            : currentDocument,
        ),
      );

      setDocumentConfirmation(null);

      if (nextStatus === "RECEIVED") {
        setSuccessMessage(`${document.document_type} marked as received.`);
      } else {
        setSuccessMessage(`${document.document_type} moved back to pending.`);
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
        error instanceof Error
          ? error.message
          : "Unable to update document status.",
      );
    } finally {
      setIsUpdatingDocument(false);
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading case...
        </div>
      </main>
    );
  }

  if (!user || !caseData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Case unavailable</h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {error || "The requested case could not be found."}
          </p>

          <a
            href="/dashboard/cases"
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Cases
          </a>
        </div>
      </main>
    );
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
        <header className="border-b border-border">
          <div className="flex min-h-20 items-center justify-between gap-4 px-6 sm:px-8">
            <div>
              <p className="text-sm text-muted-foreground">Consultant Portal</p>

              <h1 className="text-xl font-semibold tracking-tight">
                Case Details
              </h1>
            </div>

            <a
              href="/dashboard/cases"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to Cases
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

          {/* Case Header */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted">
                  <BriefcaseBusiness
                    className="size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {caseData.case_reference}
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Case #{caseData.id} · Lead #{caseData.lead_id}
                  </p>
                </div>
              </div>

              <CaseStatusBadge status={caseData.status} />
            </div>
          </section>

          {/* Case Status */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-semibold">Case Status</h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Update the current stage of this financing case.
                </p>
              </div>

              {!isEditingStatus && (
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
                  htmlFor="case-status"
                  className="mb-2 block text-sm font-medium"
                >
                  Status
                </label>

                <select
                  id="case-status"
                  value={selectedStatus}
                  onChange={(event) =>
                    setSelectedStatus(event.target.value as CaseStatus)
                  }
                  disabled={!isEditingStatus || isSaving}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {CASE_STATUS_OPTIONS.map((status) => (
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
                    disabled={isSaving || selectedStatus === caseData.status}
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

          {/* Property & Financing */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Home
                  className="size-5 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>

              <div>
                <h2 className="font-semibold">Property & Financing</h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Financing information associated with this case.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <InfoCard
                label="Property Type"
                value={caseData.property_type || "Not provided"}
              />

              <InfoCard
                label="Property Value"
                value={
                  caseData.property_value !== null
                    ? formatAED(caseData.property_value)
                    : "Not provided"
                }
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

          {/* Case Notes */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <FileText
                    className="size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <h2 className="font-semibold">Case Notes</h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Internal notes associated with this case.
                  </p>
                </div>
              </div>

              {!isEditingNotes && (
                <button
                  type="button"
                  onClick={handleEditNotes}
                  className="h-10 rounded-lg border border-border bg-background px-4 text-sm font-medium transition hover:bg-muted"
                >
                  Edit Notes
                </button>
              )}
            </div>

            {!isEditingNotes ? (
              <div className="mt-5 rounded-xl border border-border bg-muted/30 p-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {caseData.notes || "No notes added."}
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <label
                  htmlFor="case-notes"
                  className="block text-sm font-medium"
                >
                  Notes
                </label>

                <textarea
                  id="case-notes"
                  value={notesDraft}
                  onChange={(event) => setNotesDraft(event.target.value)}
                  disabled={isSavingNotes}
                  rows={6}
                  placeholder="Add internal notes about this case..."
                  className="w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    className="h-10 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSavingNotes ? "Saving..." : "Save Notes"}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelNotesEdit}
                    disabled={isSavingNotes}
                    className="h-10 rounded-lg border border-border bg-background px-5 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Documents */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <FileCheck2
                    className="size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <h2 className="font-semibold">Documents</h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Track the documents received for this case.
                  </p>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                {
                  documents.filter((document) => document.status === "RECEIVED")
                    .length
                }{" "}
                of {documents.length} received
              </div>
            </div>

            {isDocumentsLoading ? (
              <div className="mt-6 flex items-center justify-center rounded-xl border border-border bg-muted/20 px-4 py-8">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading documents...
                </div>
              </div>
            ) : documents.length === 0 ? (
              <div className="mt-6 rounded-xl border border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No documents found.
              </div>
            ) : (
              <div className="mt-6 divide-y divide-border rounded-xl border border-border">
                {documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {document.document_type}
                      </p>

                      {document.status === "RECEIVED" &&
                      document.received_at ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Received {formatDate(document.received_at)}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Awaiting document
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <DocumentStatusBadge status={document.status} />

                      {document.status === "PENDING" ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleDocumentStatusChange(document, "RECEIVED")
                          }
                          className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium transition hover:bg-muted"
                        >
                          Mark as Received
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            handleDocumentStatusChange(document, "PENDING")
                          }
                          className="text-xs font-medium text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
                        >
                          Undo
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Case Metadata */}
          <section className="grid gap-4 sm:grid-cols-2">
            <InfoCard
              label="Created"
              value={formatDate(caseData.created_at)}
              icon={<CalendarDays className="size-4" />}
            />

            <InfoCard
              label="Last Updated"
              value={formatDate(caseData.updated_at)}
              icon={<CalendarDays className="size-4" />}
            />
          </section>

          {/* Related Lead */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <User
                  className="size-5 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>

              <div>
                <h2 className="font-semibold">Related Lead</h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  This case was created from Lead #{caseData.lead_id}.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <a
                href={`/dashboard/leads/${caseData.lead_id}`}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium transition hover:bg-muted"
              >
                View Lead
              </a>
            </div>
          </section>
        </div>
      </div>

      {/* Document Confirmation Modal */}
      {documentConfirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="document-confirmation-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="document-confirmation-title"
                  className="text-lg font-semibold"
                >
                  {documentConfirmation.nextStatus === "RECEIVED"
                    ? "Mark document as received?"
                    : "Move document back to pending?"}
                </h2>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {documentConfirmation.nextStatus === "RECEIVED"
                    ? `Confirm that ${documentConfirmation.document.document_type} has been received.`
                    : `This will remove the received timestamp for ${documentConfirmation.document.document_type}.`}
                </p>
              </div>

              <button
                type="button"
                onClick={closeDocumentConfirmation}
                disabled={isUpdatingDocument}
                className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close confirmation"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDocumentConfirmation}
                disabled={isUpdatingDocument}
                className="h-10 rounded-lg border border-border bg-background px-4 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDocumentStatusChange}
                disabled={isUpdatingDocument}
                className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUpdatingDocument ? "Updating..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function CaseStatusBadge({ status }: { status: CaseStatus }) {
  const styles: Record<CaseStatus, string> = {
    OPEN: "bg-blue-500/10 text-blue-700 dark:text-blue-300",

    DOCUMENTS_PENDING: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",

    DOCUMENTS_RECEIVED: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",

    UNDER_REVIEW: "bg-purple-500/10 text-purple-700 dark:text-purple-300",

    SUBMITTED: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",

    APPROVED: "bg-green-500/10 text-green-700 dark:text-green-300",

    COMPLETED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",

    CANCELLED: "bg-muted text-muted-foreground",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function DocumentStatusBadge({ status }: { status: CaseDocumentStatus }) {
  if (status === "RECEIVED") {
    return (
      <span className="inline-flex rounded-full bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-300">
        RECEIVED
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-yellow-500/10 px-3 py-1.5 text-xs font-medium text-yellow-700 dark:text-yellow-300">
      PENDING
    </span>
  );
}

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}

        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>

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

export default CaseDetails;
