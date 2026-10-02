import type { ComponentType } from "react";

import MainLayout from "@/components/layout/MainLayout";
import About from "@/pages/About";
import Disclaimer from "@/pages/Disclaimer";
import Home from "@/pages/Home";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsAndConditions from "@/pages/TermsAndConditions";

const routes: Record<string, ComponentType> = {
  "/": Home,
  "/about": About,
  "/privacy-policy": PrivacyPolicy,
  "/terms-and-conditions": TermsAndConditions,
  "/disclaimer": Disclaimer,
};

function App() {
  const path = window.location.pathname;
  const Page = routes[path] ?? Home;

  return (
    <MainLayout>
      <Page />
    </MainLayout>
  );
}

export default App;
