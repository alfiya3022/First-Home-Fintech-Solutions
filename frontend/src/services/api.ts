const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ============================================================
// Contact
// ============================================================

export interface ContactRequest {
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
  website: string;
}

export interface ContactResponse {
  success: boolean;
  message: string;
  lead_id: number;
  status: string;
}

export async function submitContactEnquiry(
  data: ContactRequest,
): Promise<ContactResponse> {
  const response = await fetch(`${API_BASE_URL}/api/contact`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Contact enquiry submission failed.");
  }

  return (await response.json()) as ContactResponse;
}

// ============================================================
// Authentication
// ============================================================

export interface LoginResponse {
  success: boolean;
  message: string;
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Invalid email or password.");
    }

    throw new Error("Unable to log in.");
  }

  return (await response.json()) as LoginResponse;
}

export interface CurrentUser {
  id: number;
  email: string;
  full_name: string;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Authentication required.");
    }

    throw new Error("Unable to load current user.");
  }

  return (await response.json()) as CurrentUser;
}

export async function logout(): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Unable to log out.");
  }

  return (await response.json()) as LoginResponse;
}

// ============================================================
// Leads
// ============================================================

export type LeadStatus = "NEW" | "CONTACTED" | "CONVERTED" | "CLOSED";

export interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
}

interface LeadListResponse {
  leads: Lead[];
}

export async function getLeads(): Promise<Lead[]> {
  const response = await fetch(`${API_BASE_URL}/api/admin/leads`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Authentication required.");
    }

    throw new Error("Unable to load leads.");
  }

  const data = (await response.json()) as LeadListResponse;

  return data.leads;
}

export async function getLead(leadId: number): Promise<Lead> {
  const response = await fetch(`${API_BASE_URL}/api/admin/leads/${leadId}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Authentication required.");
    }

    if (response.status === 404) {
      throw new Error("Lead not found.");
    }

    throw new Error("Unable to load lead.");
  }

  return (await response.json()) as Lead;
}

export async function updateLeadStatus(
  leadId: number,
  status: LeadStatus,
): Promise<Lead> {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/leads/${leadId}/status`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status,
      }),
    },
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Authentication required.");
    }

    if (response.status === 404) {
      throw new Error("Lead not found.");
    }

    throw new Error("Unable to update lead status.");
  }

  return (await response.json()) as Lead;
}

// ============================================================
// Excel Export
// ============================================================

export async function exportLeads(): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/api/admin/leads/export`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Authentication required.");
    }

    throw new Error("Unable to export leads.");
  }

  return response.blob();
}

// ============================================================
// Cases
// ============================================================

export type CaseStatus =
  | "OPEN"
  | "DOCUMENTS_PENDING"
  | "DOCUMENTS_RECEIVED"
  | "UNDER_REVIEW"
  | "SUBMITTED"
  | "APPROVED"
  | "COMPLETED"
  | "CANCELLED";

export interface Case {
  id: number;
  lead_id: number;
  lead_name?: string | null;
  case_reference: string;
  status: CaseStatus;
  property_type: string | null;
  property_value: number | null;
  loan_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CaseListResponse {
  cases: Case[];
}

export async function getCases(): Promise<Case[]> {
  const response = await fetch(`${API_BASE_URL}/api/admin/cases`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Authentication required.");
    }

    throw new Error("Unable to load cases.");
  }

  const data = (await response.json()) as CaseListResponse;

  return data.cases;
}

export async function getCase(caseId: number): Promise<Case> {
  const response = await fetch(`${API_BASE_URL}/api/admin/cases/${caseId}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Authentication required.");
    }

    if (response.status === 404) {
      throw new Error("Case not found.");
    }

    throw new Error("Unable to load case.");
  }

  return (await response.json()) as Case;
}

export interface CreateCaseRequest {
  lead_id: number;
  property_type: string | null;
  property_value: number | null;
  loan_amount: number | null;
  notes: string | null;
}

export async function createCase(data: CreateCaseRequest): Promise<Case> {
  const response = await fetch(`${API_BASE_URL}/api/admin/cases`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Authentication required.");
    }

    if (response.status === 404) {
      throw new Error("Lead not found.");
    }

    if (response.status === 409) {
      throw new Error("A case already exists for this lead.");
    }

    if (response.status === 400) {
      const errorData = (await response.json()) as {
        detail?: string;
      };

      throw new Error(
        errorData.detail ?? "A case cannot be created for this lead.",
      );
    }

    throw new Error("Unable to create case.");
  }

  return (await response.json()) as Case;
}

export async function updateCaseStatus(
  caseId: number,
  status: CaseStatus,
): Promise<Case> {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/cases/${caseId}/status`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status,
      }),
    },
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Authentication required.");
    }

    if (response.status === 404) {
      throw new Error("Case not found.");
    }

    throw new Error("Unable to update case status.");
  }

  return (await response.json()) as Case;
}

// ============================================================
// Case Documents
// ============================================================

export type CaseDocumentStatus = "PENDING" | "RECEIVED";

export interface CaseDocumentFile {
  id: number;
  case_document_id: number;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  uploaded_at: string;
}

export interface CaseDocument {
  id: number;
  case_id: number;
  document_type: string;
  status: CaseDocumentStatus;
  received_at: string | null;
  created_at: string;
  updated_at: string;
  files: CaseDocumentFile[];
}

interface CaseDocumentListResponse {
  documents: CaseDocument[];
}

export async function getCaseDocuments(
  caseId: number,
): Promise<CaseDocument[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/cases/${caseId}/documents`,
    {
      method: "GET",
      credentials: "include",
    },
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Authentication required.");
    }

    if (response.status === 404) {
      throw new Error("Case not found.");
    }

    throw new Error("Unable to load case documents.");
  }

  const data = (await response.json()) as CaseDocumentListResponse;

  return data.documents;
}

export async function updateCaseDocumentStatus(
  caseId: number,
  documentId: number,
  status: CaseDocumentStatus,
): Promise<CaseDocument> {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/cases/${caseId}/documents/${documentId}/status`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status,
      }),
    },
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Authentication required.");
    }

    if (response.status === 404) {
      throw new Error("Case or document not found.");
    }

    if (response.status === 400) {
      const errorData = (await response.json()) as {
        detail?: string;
      };

      throw new Error(
        errorData.detail ?? "Document has already been received.",
      );
    }

    throw new Error("Unable to update document status.");
  }

  return (await response.json()) as CaseDocument;
}

export async function uploadCaseDocumentFile(
  caseId: number,
  documentId: number,
  file: File,
): Promise<CaseDocument> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}/api/admin/cases/${caseId}/documents/${documentId}/files`,
    {
      method: "POST",
      credentials: "include",
      body: formData,
    },
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Authentication required.");
    }

    let message = "Unable to upload document.";

    try {
      const data = await response.json();

      if (typeof data?.detail === "string") {
        message = data.detail;
      }
    } catch {
      // Keep the default error message.
    }

    throw new Error(message);
  }

  return (await response.json()) as CaseDocument;
}

export async function downloadCaseDocumentFile(
  caseId: number,
  documentId: number,
  fileId: number,
  filename: string,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/cases/${caseId}/documents/${documentId}/files/${fileId}/download`,
    {
      method: "GET",
      credentials: "include",
    },
  );

  if (response.status === 401) {
    throw new Error("Authentication required.");
  }

  if (!response.ok) {
    let message = "Unable to download document.";

    try {
      const data = await response.json();

      if (typeof data?.detail === "string") {
        message = data.detail;
      }
    } catch {
      // Keep the default error message.
    }

    throw new Error(message);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(objectUrl);
}

// ============================================================
// Case Notes
// ============================================================

export async function updateCaseNotes(
  caseId: number,
  notes: string,
): Promise<Case> {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/cases/${caseId}/notes`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notes,
      }),
    },
  );

  if (response.status === 401) {
    throw new Error("Authentication required.");
  }

  if (response.status === 404) {
    throw new Error("Case not found.");
  }

  if (!response.ok) {
    let message = "Unable to update case notes.";

    try {
      const data = await response.json();

      if (typeof data?.detail === "string") {
        message = data.detail;
      }
    } catch {
      // Keep the default message.
    }

    throw new Error(message);
  }

  return response.json();
}
