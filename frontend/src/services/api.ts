const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ContactRequest {
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
}

interface ContactResponse {
  success: boolean;
  message: string;
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

  return response.json() as Promise<ContactResponse>;
}
