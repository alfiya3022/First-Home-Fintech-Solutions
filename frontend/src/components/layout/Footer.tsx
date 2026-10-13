import logo from "@/assets/logo/first-home-logo-white.png";

const navigationLinks = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/#services" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Calculator", href: "/#calculator" },
  { label: "Contact", href: "/#contact" },
];

const companyLinks = [
  { label: "About First Home", href: "/about" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms-and-conditions" },
  { label: "Disclaimer", href: "/disclaimer" },
];

const socialLinks = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/first-home-fintech-solutions/",
    icon: (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-4 fill-current"
      >
        <path d="M6.5 8.5H3.2V21h3.3V8.5ZM4.85 3A1.95 1.95 0 1 0 4.85 6.9 1.95 1.95 0 0 0 4.85 3ZM21 13.84c0-3.76-2-5.51-4.67-5.51-2.15 0-3.11 1.18-3.65 2.01V8.5H9.38V21h3.3v-6.19c0-1.63.31-3.2 2.33-3.2 1.99 0 2.02 1.86 2.02 3.31V21H21v-7.16Z" />
      </svg>
    ),
  },

  {
    label: "Website",
    href: "https://firsthomefintech.ae",
    icon: (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-4 fill-none stroke-current"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3c2.2 2.4 3.3 5.4 3.3 9s-1.1 6.6-3.3 9c-2.2-2.4-3.3-5.4-3.3-9S9.8 5.4 12 3Z" />
      </svg>
    ),
  },
];

function Footer() {
  return (
    <footer className="bg-[#071B2D] text-white">
      <div className="mx-auto max-w-7xl px-6">
        {/* Main footer */}
        <div className="grid gap-12 border-b border-white/10 py-14 sm:py-16 lg:grid-cols-[1.5fr_1fr_1fr] lg:gap-16">
          {/* Brand & Contact */}
          <div className="max-w-sm">
            {/* Logo */}
            <a
              href="/"
              aria-label="First Home Fintech Solutions home"
              className="inline-flex items-center"
            >
              <img
                src={logo}
                alt="First Home Fintech Solutions"
                className="h-20 w-auto object-contain sm:h-[88px]"
              />
            </a>

            {/* Address */}
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D9BC7A]">
                Visit Us
              </p>

              <p className="mt-3 max-w-xs text-sm leading-6 text-white/65">
                A1 Dubai Digital Park, IFZA Properties,
                <br />
                Dubai Silicon Oasis, Dubai
              </p>
            </div>

            {/* Phone */}
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D9BC7A]">
                Call Us
              </p>

              <a
                href="tel:+971566357860"
                className="mt-2 inline-block text-sm text-white/65 transition-colors hover:text-[#D9BC7A]"
              >
                +971 56 635 7860
              </a>
            </div>

            {/* Email */}
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D9BC7A]">
                Email Us
              </p>

              <a
                href="mailto:admin@firsthomefintech.ae"
                className="mt-2 inline-block text-sm text-white/65 transition-colors hover:text-[#D9BC7A]"
              >
                admin@firsthomefintech.ae
              </a>
            </div>

            {/* Social Links */}
            <div className="mt-6 flex items-center gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-9 items-center justify-center rounded-full border border-white/15 text-white/65 transition-colors hover:border-[#D9BC7A] hover:text-[#D9BC7A]"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D9BC7A]">
              Navigation
            </p>

            <nav
              className="mt-5 flex flex-col gap-3"
              aria-label="Footer navigation"
            >
              {navigationLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="w-fit text-sm text-white/65 transition-colors hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Company */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D9BC7A]">
              Company
            </p>

            <nav
              className="mt-5 flex flex-col gap-3"
              aria-label="Company navigation"
            >
              {companyLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="w-fit text-sm text-white/65 transition-colors hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-3 py-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} First Home Fintech Solutions. All
            rights reserved.
          </p>

          <p>Mortgage solutions. Expert guidance. Clearer decisions.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
