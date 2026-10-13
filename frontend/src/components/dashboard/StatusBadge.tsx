import type { CaseStatus, LeadStatus } from "@/services/api";

type Status = CaseStatus | LeadStatus;

const STATUS_STYLES: Record<Status, string> = {
  NEW: "bg-sky-500/10 text-sky-800 dark:text-sky-200",
  OPEN: "bg-sky-500/10 text-sky-800 dark:text-sky-200",
  CONTACTED: "bg-amber-500/10 text-amber-800 dark:text-amber-200",
  DOCUMENTS_PENDING: "bg-amber-500/10 text-amber-800 dark:text-amber-200",
  DOCUMENTS_RECEIVED: "bg-indigo-500/10 text-indigo-800 dark:text-indigo-200",
  UNDER_REVIEW: "bg-indigo-500/10 text-indigo-800 dark:text-indigo-200",
  SUBMITTED: "bg-indigo-500/10 text-indigo-800 dark:text-indigo-200",
  CONVERTED: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  APPROVED: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  COMPLETED: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  CLOSED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-muted text-muted-foreground",
};

function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

export default StatusBadge;
