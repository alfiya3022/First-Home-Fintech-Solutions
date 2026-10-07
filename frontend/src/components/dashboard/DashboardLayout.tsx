import type { ReactNode } from "react";

import Sidebar from "@/components/dashboard/Sidebar";

interface DashboardLayoutProps {
  children: ReactNode;
  fullName: string;
  email: string;
  onLogout: () => void;
  isLoggingOut: boolean;
}

function DashboardLayout({
  children,
  fullName,
  email,
  onLogout,
  isLoggingOut,
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        fullName={fullName}
        email={email}
        onLogout={onLogout}
        isLoggingOut={isLoggingOut}
      />

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

export default DashboardLayout;
