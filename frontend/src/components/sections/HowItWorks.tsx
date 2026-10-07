import { ArrowRight } from "lucide-react";

import Reveal from "@/components/ui/Reveal";

import worksImage from "@/assets/images/works.jpg";

const steps = [
  {
    number: "01",
    title: "Understand Your Needs",
    description: "Tell us about your property goals and requirements.",
  },
  {
    number: "02",
    title: "Assess Your Options",
    description: "Explore suitable financing routes for your situation.",
  },
  {
    number: "03",
    title: "Explore Financing",
    description: "Understand available mortgage options and requirements.",
  },
  {
    number: "04",
    title: "Move Forward",
    description: "We guide you through the next steps.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section Heading */}
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#A98C4F]">
              How It Works
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#071B2D] sm:text-4xl lg:text-5xl">
              A Clearer Path to Your Property Goals
            </h2>

            <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">
              From understanding your needs to moving forward, we keep the
              mortgage journey clear and structured.
            </p>
          </div>
        </Reveal>

        {/* Image + Steps */}
        <div className="mt-16 grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          {/* Consultation Image */}
          <Reveal>
            <div className="overflow-hidden rounded-3xl">
              <img
                src={worksImage}
                alt="Mortgage consultation between a property advisor and clients"
                className="h-[360px] w-full object-cover transition-transform duration-700 hover:scale-[1.02] motion-reduce:transition-none sm:h-[440px] lg:h-[500px]"
              />
            </div>
          </Reveal>

          {/* Steps + CTA */}
          <div className="relative">
            {/* Vertical Connecting Line */}
            <div
              className="absolute left-6 top-6 hidden h-[calc(100%-24px)] w-px bg-slate-200 sm:block"
              aria-hidden="true"
            />

            <div className="space-y-8">
              {steps.map((step, index) => (
                <Reveal key={step.number} delay={index * 120}>
                  <article className="relative flex gap-6">
                    {/* Step Number */}
                    <div className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full border border-[#D9BC7A] bg-white text-sm font-semibold text-[#071B2D]">
                      {step.number}
                    </div>

                    {/* Step Content */}
                    <div className="pt-1">
                      <h3 className="text-lg font-semibold text-[#071B2D]">
                        {step.title}
                      </h3>

                      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600 sm:text-base">
                        {step.description}
                      </p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>

            {/* Contextual CTA */}
            <Reveal delay={500}>
              <div className="mt-10 rounded-2xl border border-slate-200 bg-[#FBFAF7] p-6 sm:p-7">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#A98C4F]">
                  Not sure where to start?
                </p>

                <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                  Tell us what you&apos;re looking for and we&apos;ll help you
                  understand the options available to you.
                </p>

                <a
                  href="/#contact"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#071B2D] transition-colors hover:text-[#A98C4F]"
                >
                  Get Started
                  <ArrowRight className="size-4" aria-hidden="true" />
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
