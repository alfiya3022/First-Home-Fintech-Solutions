import { useEffect } from "react";

import MainLayout from "@/components/layout/MainLayout";
import Footer from "@/components/layout/Footer";

import About from "@/pages/About";
import Disclaimer from "@/pages/Disclaimer";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsAndConditions from "@/pages/TermsAndConditions";

import Contact from "@/components/sections/Contact";
import Hero from "@/components/sections/Hero";
import HowItWorks from "@/components/sections/HowItWorks";
import MortgageCalculator from "@/components/sections/MortgageCalculator";
import MortgageSolutions from "@/components/sections/MortgageSolutions";
import WhyFirstHome from "@/components/sections/WhyFirstHome";

function HomePage() {
  useEffect(() => {
    const hash = window.location.hash;

    if (!hash) {
      return;
    }

    const scrollToSection = () => {
      const element = document.querySelector(hash);

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    };

    requestAnimationFrame(scrollToSection);
  }, []);

  return (
    <>
      <main>
        <Hero />
        <WhyFirstHome />
        <MortgageSolutions />
        <HowItWorks />
        <MortgageCalculator />
        <Contact />
      </main>

      <Footer />
    </>
  );
}

function App() {
  const path = window.location.pathname;

  if (path === "/about") {
    return (
      <MainLayout>
        <About />
        <Footer />
      </MainLayout>
    );
  }

  if (path === "/privacy-policy") {
    return (
      <MainLayout>
        <PrivacyPolicy />
        <Footer />
      </MainLayout>
    );
  }

  if (path === "/terms-and-conditions") {
    return (
      <MainLayout>
        <TermsAndConditions />
        <Footer />
      </MainLayout>
    );
  }

  if (path === "/disclaimer") {
    return (
      <MainLayout>
        <Disclaimer />
        <Footer />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <HomePage />
    </MainLayout>
  );
}

export default App;
