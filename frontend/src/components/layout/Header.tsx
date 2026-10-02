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
      <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <a
          href="/"
          aria-label="First Home Fintech Solutions home"
          className="shrink-0"
        >
          <img
            src={logo}
            alt="First Home Fintech Solutions"
            className="h-14 w-auto"
          />
        </a>

        {/* Desktop Navigation */}
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-9 lg:flex"
        >
          {navigationLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="
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
          aria-label="Open navigation menu"
          className="
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
          <span className="sr-only">Open menu</span>

          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-5 fill-none stroke-current"
            strokeWidth="1.8"
          >
            <path d="M4 7h16" />
            <path d="M4 12h16" />
            <path d="M4 17h16" />
          </svg>
        </button>
      </div>
    </header>
  );
}

export default Header;
