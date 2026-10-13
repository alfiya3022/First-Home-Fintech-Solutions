import {
  BriefcaseBusiness,
  LayoutDashboard,
  LogOut,
  Users,
} from "lucide-react";

import logo from "@/assets/logo/first-home-logo-white.png";

interface SidebarProps {
  fullName: string;
  email: string;
  isAdmin: boolean;
  onLogout: () => void;
  isLoggingOut: boolean;
}

const navigationItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Leads",
    href: "/dashboard/leads",
    icon: Users,
  },
  {
    label: "Cases",
    href: "/dashboard/cases",
    icon: BriefcaseBusiness,
  },
];

function Sidebar({
  fullName,
  email,
  isAdmin,
  onLogout,
  isLoggingOut,
}: SidebarProps) {
  const currentPath = window.location.pathname;
  const visibleNavigationItems = navigationItems.filter(
    (item) => item.href !== "/dashboard/cases" || isAdmin,
  );

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-[#071B2D] text-white">
      {/* Logo */}
      <div className="flex h-20 items-center border-b border-white/10 px-6">
        <img
          src={logo}
          alt="First Home Fintech Solutions"
          className="h-10 w-auto"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
          Workspace
        </p>

        <div className="space-y-1">
          {visibleNavigationItems.map((item) => {
            const Icon = item.icon;

            const isActive =
              currentPath === item.href ||
              (item.href !== "/dashboard" &&
                currentPath.startsWith(`${item.href}/`));

            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={18} />

                <span>{item.label}</span>
              </a>
            );
          })}
        </div>
      </nav>

      {/* Consultant */}
      <div className="border-t border-white/10 px-4 py-4">
        <div className="rounded-xl bg-white/5 p-3">
          <p className="truncate text-sm font-medium text-white">{fullName}</p>

          <p className="mt-1 truncate text-xs text-white/50">{email}</p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut size={18} />

          <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
