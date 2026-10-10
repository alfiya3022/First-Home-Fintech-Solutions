import { useState } from "react";
import logo from "@/assets/logo/first-home-logo-white.png";

const navigationLinks = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "Services",
    href: "/#services",
  },
  {
    label: "About",
    href: "/about",
  },
  {
    label: "How It Works",
    href: "/#how-it-works",
  },
  {
    label: "Calculator",
    href: "/#calculator",
  },
  {
    label: "Contact",
    href: "/#contact",
  },
];

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header
      className="
        absolute inset-x-0 top-0 z-50
        bg-gradient-to-b
        from-[#071B2D]
        via-[#071B2D]/80
        to-transparent
      "
    >
      <div className="relative mx-auto flex h-25 max-w-7xl items-center px-6">
        {/* Logo */}
        <a
          href="/"
          aria-label="First Home Fintech Solutions home"
          className="flex shrink-0 items-center"
        >
          <img
            src={logo}
            alt="First Home Fintech Solutions"
            className="h-25 w-auto object-contain sm:h-[75px]"
          />
        </a>

        {/* Desktop Navigation */}
        <nav
          aria-label="Main navigation"
          className="
            absolute left-1/2 hidden
            -translate-x-1/2
            items-center gap-8
            lg:flex
          "
        >
          {navigationLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="
                whitespace-nowrap
                text-base font-medium text-white/90
                transition-colors
                hover:text-[#D9BC7A]
              "
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Mobile Menu Button */}
        <button
          type="button"
          aria-label={
            isMenuOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={isMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setIsMenuOpen((open) => !open)}
          className="
            ml-auto
            flex size-10 items-center justify-center
            rounded-lg
            border border-white/20
            text-white
            transition-colors
            hover:border-[#D9BC7A]
            hover:text-[#D9BC7A]
            lg:hidden
          "
        >
          <span className="sr-only">
            {isMenuOpen ? "Close menu" : "Open menu"}
          </span>

          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-5 fill-none stroke-current"
            strokeWidth="1.8"
          >
            {isMenuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <>
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="
            absolute inset-x-0 top-full
            border-t border-white/10
            bg-[#071B2D]/95
            px-6 py-4
            shadow-xl backdrop-blur-md
            lg:hidden
          "
        >
          <div className="mx-auto flex max-w-7xl flex-col">
            {navigationLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="
                  rounded-lg px-3 py-3
                  text-base font-medium text-white/90
                  transition-colors
                  hover:bg-white/5
                  hover:text-[#D9BC7A]
                "
              >
                {link.label}
              </a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

export default Header;
