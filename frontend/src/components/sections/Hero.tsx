import { ArrowRight, Calculator, Check } from "lucide-react";
import heroImage from "@/assets/images/hero-dubai-skyline.png";

function Hero() {
  return (
    <section
      id="home"
      className="relative isolate min-h-[calc(100svh-5rem)] overflow-hidden bg-[#071B2D]"
    >
      <img
        src={heroImage}
        alt="Dubai skyline at dusk featuring the Burj Khalifa"
        className="absolute right-0 top-0 -z-20 h-full w-[55%] object-cover object-center brightness-90 saturate-92"
      />

      <div className="absolute right-0 top-0 -z-10 h-full w-[55%] bg-[linear-gradient(to_right,#071B2D_0%,rgba(7,27,45,0.75)_12%,rgba(7,27,45,0.25)_25%,transparent_38%)]" />

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

          <div className="mt-10 flex flex-col gap-4 border-t border-white/20 pt-6 sm:flex-row sm:items-center sm:gap-8">
            <div className="flex items-center gap-2 text-sm text-white/80">
              <Check className="size-4 text-[#D6BE8A]" />
              <span>Expert Guidance</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-white/80">
              <Check className="size-4 text-[#D6BE8A]" />
              <span>Tailored Solutions</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-white/80">
              <Check className="size-4 text-[#D6BE8A]" />
              <span>End-to-End Support</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
