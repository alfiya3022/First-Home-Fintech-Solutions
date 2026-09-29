import type { ReactNode } from "react";
import Header from "@/components/layout/Header";

interface MainLayoutProps {
  children: ReactNode;
}

function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
       <Header />
      {children}
    </div>
  );
}

export default MainLayout;