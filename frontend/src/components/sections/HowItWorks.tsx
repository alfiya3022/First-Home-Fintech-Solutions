import Reveal from "@/components/ui/Reveal";

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

        {/* Steps */}
        <div className="relative mt-16">
          {/* Desktop Connecting Line */}
          <div
            className="absolute left-[12.5%] right-[12.5%] top-6 hidden h-px bg-slate-200 lg:block"
            aria-hidden="true"
          />

          <div className="grid gap-10 lg:grid-cols-4 lg:gap-8">
            {steps.map((step, index) => (
              <Reveal key={step.number} delay={index * 120}>
                <article className="relative text-center lg:text-left">
                  {/* Step Number */}
                  <div className="relative z-10 mx-auto flex size-12 items-center justify-center rounded-full border border-[#D9BC7A] bg-white text-sm font-semibold text-[#071B2D] lg:mx-0">
                    {step.number}
                  </div>

                  <h3 className="mt-6 text-lg font-semibold text-[#071B2D]">
                    {step.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {step.description}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
