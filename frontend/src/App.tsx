import type { ComponentType } from "react";

import MainLayout from "@/components/layout/MainLayout";

import About from "@/pages/About";
import Cases from "@/pages/Cases";
import CaseDetails from "@/pages/CaseDetails";
import Dashboard from "@/pages/Dashboard";
import Disclaimer from "@/pages/Disclaimer";
import Home from "@/pages/Home";
import LeadDetails from "@/pages/LeadDetails";
import Leads from "@/pages/Leads";
import Login from "@/pages/Login";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsAndConditions from "@/pages/TermsAndConditions";

const publicRoutes: Record<string, ComponentType> = {
  "/": Home,
  "/about": About,
  "/privacy-policy": PrivacyPolicy,
  "/terms-and-conditions": TermsAndConditions,
  "/disclaimer": Disclaimer,
};

function App() {
  const path = window.location.pathname;

  // Private login
  if (path === "/login") {
    return <Login />;
  }

  // Lead details
  if (path.startsWith("/dashboard/leads/")) {
    const leadId = Number(path.split("/").pop());

    if (Number.isInteger(leadId) && leadId > 0) {
      return <LeadDetails leadId={leadId} />;
    }
  }

  // Leads list
  if (path === "/dashboard/leads") {
    return <Leads />;
  }

  // Case details
  if (path.startsWith("/dashboard/cases/")) {
    const caseId = Number(path.split("/").pop());

    if (Number.isInteger(caseId) && caseId > 0) {
      return <CaseDetails caseId={caseId} />;
    }
  }

  // Cases list
  if (path === "/dashboard/cases") {
    return <Cases />;
  }

  // Dashboard
  if (path === "/dashboard") {
    return <Dashboard />;
  }

  // Public pages
  const Page = publicRoutes[path] ?? Home;

  return (
    <MainLayout>
      <Page />
    </MainLayout>
  );
}

export default App;
