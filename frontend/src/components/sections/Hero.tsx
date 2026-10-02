import { useEffect, useState } from "react";
import { ArrowRight, Calculator, Check, Info } from "lucide-react";

import burDubaiImage from "@/assets/images/hero/bur dubai.jpg";
import deiraImage from "@/assets/images/hero/deira.jpg";
import downtownImage from "@/assets/images/hero/downdown.png";
import internationalCityImage from "@/assets/images/hero/international city.jpg";
import palmJumerahImage from "@/assets/images/hero/palm jumerah.jpg";

import b1Image from "@/assets/images/hero/b1.jpg";
import b2Image from "@/assets/images/hero/b2.jpg";
import b3Image from "@/assets/images/hero/b3.jpg";
import b4Image from "@/assets/images/hero/b4.png";
import b5Image from "@/assets/images/hero/b5.png";
import b7Image from "@/assets/images/hero/b7.jpg";
import b8Image from "@/assets/images/hero/b8.png";

const heroImages = [
  burDubaiImage,
  deiraImage,
  downtownImage,
  internationalCityImage,
  palmJumerahImage,
  b1Image,
  b2Image,
  b3Image,
  b4Image,
  b5Image,
  b7Image,
  b8Image,
];

function Hero() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handleMotionPreferenceChange = () => {
      setReducedMotion(mediaQuery.matches);
    };

    handleMotionPreferenceChange();
    mediaQuery.addEventListener("change", handleMotionPreferenceChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMotionPreferenceChange);
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    const interval = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % heroImages.length);
    }, 1800);

    return () => window.clearInterval(interval);
  }, [reducedMotion]);

  return (
    <section
      id="home"
      className="relative isolate min-h-[calc(100svh-5rem)] overflow-hidden bg-[#071B2D]"
    >
      {heroImages.map((image, index) => (
        <img
          key={image}
          src={image}
          alt=""
          className={`absolute right-0 top-0 -z-20 h-full w-[55%] object-cover object-center brightness-90 saturate-92 transition-opacity duration-1000 ease-in-out motion-reduce:transition-none ${
            activeIndex === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      <div
        className="absolute right-0 top-0 -z-10 h-full w-[55%] bg-[linear-gradient(to_right,#071B2D_0%,rgba(7,27,45,0.75)_12%,rgba(7,27,45,0.25)_25%,transparent_38%)]"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-32 bg-gradient-to-t from-[#071B2D] via-[#071B2D]/80 to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto flex min-h-[calc(100svh-5rem)] max-w-7xl items-center px-6 py-20">
        <div className="max-w-3xl text-white">
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Smart Solutions for Smart Buyers
          </h1>

          <p className="mb-5 text-xs font-medium uppercase tracking-[0.3em] text-white/75">
            Your Home. Our Expertise.
          </p>

          <p className="mt-6 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
            Expert mortgage guidance designed to help you navigate your home
            financing journey with clarity and confidence.
          </p>

          {/* CTA BUTTONS */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#contact"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#D6BE8A] px-6 py-3 text-sm font-semibold text-[#071B2D] transition-transform hover:-translate-y-0.5"
            >
              Talk to a Consultant
              <ArrowRight className="size-4" />
            </a>

            <a
              href="#calculator"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/30 bg-white/5 px-6 py-3 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/10"
            >
              <Calculator className="size-4" />
              Calculate Your Mortgage
            </a>
          </div>

          {/* EIBOR RATES */}
          {/* EIBOR RATES */}
          <div
            className="
    mt-6 w-full max-w-xs
    -translate-y-1
    rounded-lg
    border border-white/80
    border-l-4 border-l-[#D6BE8A]
    bg-white
    px-4 py-3
    shadow-[0_10px_28px_rgba(0,0,0,0.20)]
  "
          >
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[#071B2D]">
              EIBOR Rates Today
            </h2>

            <div className="mt-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#071B2D]/65">
                  1 Month
                </span>

                <span className="text-sm font-bold text-[#071B2D]">4.09%</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#071B2D]/65">
                  3 Months
                </span>

                <span className="text-sm font-bold text-[#071B2D]">4.22%</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#071B2D]/65">
                  6 Months
                </span>

                <span className="text-sm font-bold text-[#071B2D]">4.42%</span>
              </div>
            </div>

            <div className="mt-2.5 border-t border-[#071B2D]/10 pt-2">
              <p className="text-[9px] text-[#071B2D]/45">Based on CBUAE</p>

              <a
                href="https://centralbank.ae/en/forex-eibor/eibor-rates/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Learn more about EIBOR from the Central Bank of the UAE"
                className="
        group
        relative
        mt-0.5
        inline-flex
        items-center
        gap-1
        text-[10px]
        font-medium
        text-[#B08A3E]
        transition-colors
        hover:text-[#8E6D2F]
      "
              >
                <span className="relative">
                  <Info className="size-3" aria-hidden="true" />

                  <span
                    className="
            pointer-events-none
            absolute bottom-full left-1/2 mb-2
            hidden -translate-x-1/2
            whitespace-nowrap
            rounded-md
            bg-[#071B2D]
            px-2 py-1
            text-[9px] font-medium text-white
            shadow-lg
            group-hover:block
          "
                  >
                    Click here to learn more
                  </span>
                </span>

                <span className="underline underline-offset-2">
                  Want to know more about EIBOR?
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
