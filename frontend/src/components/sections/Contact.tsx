import { useState, type FormEvent } from "react";

import { ArrowRight } from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

import contactImage from "@/assets/images/contact-image.jpg";

import { submitContactEnquiry } from "@/services/api";

const serviceOptions = [
  "Home Financing",
  "Mortgage Refinancing / Buyout",
  "Equity Release",
  "Non-Resident Mortgages",
  "Commercial Mortgages",
  "Off-Plan Property Financing",
  "Ready Property Financing",
  "UAE Resident Mortgages",
  "First-Time Home Buyers",
  "Property Investors",
  "Self-Employed Mortgage Solutions",
  "Islamic / Sharia-Compliant Financing",
  "Other",
];

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
  website: string;
}

const initialFormData: ContactFormData = {
  name: "",
  email: "",
  phone: "",
  service: "",
  message: "",
  website: "",
};

function Contact() {
  const [formData, setFormData] = useState<ContactFormData>(initialFormData);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  function handleChange(field: keyof ContactFormData, value: string) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));

    if (statusMessage) {
      setStatusMessage("");
      setIsSuccess(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (formData.message.trim().length < 10) {
      setStatusMessage("Please enter at least 10 characters in your message.");
      setIsSuccess(false);
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("");
    setIsSuccess(false);

    try {
      const response = await submitContactEnquiry(formData);

      setStatusMessage(response.message);
      setIsSuccess(true);
      setFormData(initialFormData);
    } catch {
      setStatusMessage(
        "We couldn't submit your enquiry right now. Please check your connection and try again.",
      );
      setIsSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section id="contact" className="bg-[#FBFAF7] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid overflow-hidden rounded-3xl bg-white lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative min-h-[420px] lg:min-h-full">
            <img
              src={contactImage}
              alt="Residential property and mortgage planning"
              className="absolute inset-0 h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-[#071B2D]/85 via-[#071B2D]/20 to-transparent" />

            <div className="absolute bottom-0 left-0 max-w-md p-8 text-white sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#D6BE8A]">
                Talk to First Home
              </p>

              <h2 className="mt-4 font-serif text-3xl font-medium leading-tight sm:text-4xl">
                Let&apos;s Find the Right Mortgage Solution for You
              </h2>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="max-w-xl">
              <div className="mb-5 flex items-center gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#B99657]">
                  Contact Us
                </p>

                <span className="h-px w-8 bg-[#D6BE8A]" />
              </div>

              <h2 className="font-serif text-4xl font-medium leading-[1.08] tracking-tight text-[#071B2D] sm:text-5xl">
                Speak With a Mortgage Consultant
              </h2>

              <p className="mt-5 text-base leading-7 text-[#68727D]">
                Share a few details about what you are looking for and our team
                can help you explore the next steps.
              </p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div
                aria-hidden="true"
                className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
              >
                <label htmlFor="contact-website">Leave this field empty</label>

                <input
                  id="contact-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={formData.website}
                  onChange={(event) =>
                    handleChange("website", event.target.value)
                  }
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="contact-name"
                    className="mb-2 block text-sm font-medium text-[#071B2D]"
                  >
                    Name
                  </label>

                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={formData.name}
                    onChange={(event) =>
                      handleChange("name", event.target.value)
                    }
                    className="h-12 w-full rounded-xl border border-[#E4E0D8] bg-[#FBFAF7] px-4 text-sm text-[#071B2D] outline-none transition placeholder:text-[#9AA1A8] focus:border-[#B99657] focus:ring-2 focus:ring-[#D6BE8A]/30"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="contact-email"
                    className="mb-2 block text-sm font-medium text-[#071B2D]"
                  >
                    Email
                  </label>

                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={(event) =>
                      handleChange("email", event.target.value)
                    }
                    className="h-12 w-full rounded-xl border border-[#E4E0D8] bg-[#FBFAF7] px-4 text-sm text-[#071B2D] outline-none transition placeholder:text-[#9AA1A8] focus:border-[#B99657] focus:ring-2 focus:ring-[#D6BE8A]/30"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="contact-phone"
                    className="mb-2 block text-sm font-medium text-[#071B2D]"
                  >
                    Phone
                  </label>

                  <PhoneInput
                    id="contact-phone"
                    international
                    defaultCountry="AE"
                    countryCallingCodeEditable={false}
                    value={formData.phone}
                    onChange={(value) => handleChange("phone", value ?? "")}
                    className="
    flex h-12 w-full items-center
    rounded-xl border border-[#E4E0D8]
    bg-[#FBFAF7]
    px-3
    text-sm text-[#071B2D]
    outline-none
    transition
    focus-within:border-[#B99657]
    focus-within:ring-2
    focus-within:ring-[#D6BE8A]/30
    [&_.PhoneInputCountry]:mr-2
    [&_.PhoneInputCountry]:flex
    [&_.PhoneInputCountry]:items-center
    [&_.PhoneInputCountry]:border-0
    [&_.PhoneInputInput]:h-full
    [&_.PhoneInputInput]:min-w-0
    [&_.PhoneInputInput]:flex-1
    [&_.PhoneInputInput]:border-0
    [&_.PhoneInputInput]:bg-transparent
    [&_.PhoneInputInput]:px-1
    [&_.PhoneInputInput]:text-sm
    [&_.PhoneInputInput]:text-[#071B2D]
    [&_.PhoneInputInput]:outline-none
    [&_.PhoneInputInput]:placeholder:text-[#9AA1A8]
  "
                  />
                </div>

                <div>
                  <label
                    htmlFor="contact-service"
                    className="mb-2 block text-sm font-medium text-[#071B2D]"
                  >
                    Service
                  </label>

                  <select
                    id="contact-service"
                    name="service"
                    required
                    value={formData.service}
                    onChange={(event) =>
                      handleChange("service", event.target.value)
                    }
                    className="h-12 w-full rounded-xl border border-[#E4E0D8] bg-[#FBFAF7] px-4 text-sm text-[#071B2D] outline-none transition focus:border-[#B99657] focus:ring-2 focus:ring-[#D6BE8A]/30"
                  >
                    <option value="" disabled>
                      Select a service
                    </option>

                    {serviceOptions.map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="contact-message"
                  className="mb-2 block text-sm font-medium text-[#071B2D]"
                >
                  Message
                </label>

                <textarea
                  id="contact-message"
                  name="message"
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={5}
                  value={formData.message}
                  onChange={(event) =>
                    handleChange("message", event.target.value)
                  }
                  className="w-full resize-none rounded-xl border border-[#E4E0D8] bg-[#FBFAF7] px-4 py-3 text-sm text-[#071B2D] outline-none transition placeholder:text-[#9AA1A8] focus:border-[#B99657] focus:ring-2 focus:ring-[#D6BE8A]/30"
                  placeholder="Tell us how we can help..."
                />
              </div>

              {statusMessage && (
                <p
                  role={isSuccess ? "status" : "alert"}
                  className={`text-sm leading-6 ${
                    isSuccess ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {statusMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#071B2D] px-6 py-3.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B99657] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {isSubmitting ? "Submitting..." : "Submit Enquiry"}

                {!isSubmitting && <ArrowRight className="size-4" />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Contact;
