import { useEffect } from "react";

import Contact from "@/components/sections/Contact";
import Hero from "@/components/sections/Hero";
import HowItWorks from "@/components/sections/HowItWorks";
import MortgageCalculator from "@/components/sections/MortgageCalculator";
import MortgageSolutions from "@/components/sections/MortgageSolutions";
import WhyFirstHome from "@/components/sections/WhyFirstHome";

function Home() {
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
    <main>
      <Hero />
      <WhyFirstHome />
      <MortgageSolutions />
      <HowItWorks />
      <MortgageCalculator />
      <Contact />
    </main>
  );
}

export default Home;
