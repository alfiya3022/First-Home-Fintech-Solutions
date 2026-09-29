import {
  ArrowRight,
  Handshake,
  Headphones,
  Landmark,
  ShieldCheck,
} from "lucide-react";
import Reveal from "@/components/ui/Reveal";

const benefits = [
  {
    icon: Handshake,
    title: "Client-Centric Approach",
    description:
      "We take the time to understand your goals and guide you toward financing that fits your situation.",
  },
  {
    icon: ShieldCheck,
    title: "Trusted Expertise",
    description:
      "Get clear, practical mortgage guidance throughout your property financing journey.",
  },
  {
    icon: Landmark,
    title: "Access to Multiple Lenders",
    description:
      "Explore suitable financing routes across a range of mortgage and lending options.",
  },
  {
    icon: Headphones,
    title: "End-to-End Support",
    description:
      "From understanding your options to moving forward, we help make the process clearer.",
  },
];

function WhyFirstHome() {
  return (
    <section id="about" className="bg-[#FBFAF7] py-20 sm:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20">
        {/* Left Content */}
        <Reveal>
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#A98C4F]">
              Why First Home
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#071B2D] sm:text-4xl lg:text-5xl">
              More Than a Mortgage Partner
            </h2>

            <p className="mt-6 text-base leading-7 text-slate-600 sm:text-lg">
              We help make property financing easier to understand, giving you
              clearer options and practical guidance at every stage of your
              journey.
            </p>

            <a
              href="/about"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#071B2D] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0D2A43]"
            >
              Learn More About Us
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </div>
        </Reveal>

        {/* Benefit Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;

            return (
              <Reveal key={benefit.title} delay={index * 100}>
                <article className="group h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(7,27,45,0.05)] transition-transform duration-300 hover:-translate-y-1">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-[#071B2D]/5 text-[#A98C4F]">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>

                  <h3 className="mt-5 text-lg font-semibold text-[#071B2D]">
                    {benefit.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {benefit.description}
                  </p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default WhyFirstHome;
