import { ArrowRight, Check, ChevronDown } from "lucide-react";

import Reveal from "@/components/ui/Reveal";

import aboutImage from "@/assets/images/about-page.jpg";

// =========================================================
// CUSTOMER SEGMENTS
// =========================================================

const customerSegments = [
  "UAE Residents",
  "UAE Nationals",
  "Expats",
  "Non-Residents",
  "First-Time Buyers",
  "Property Investors",
  "Business Owners",
  "Commercial Customers",
  "Property Professionals",
];

// =========================================================
// REVIEWS
// =========================================================

const reviews = [
  {
    name: "VOLKAH H",
    quote:
      "The team made the mortgage process much easier to understand and guided us clearly through our options.",
    detail: "Client · UAE",
  },
  {
    name: "RAJNESH ARORA",
    quote:
      "I appreciated the straightforward approach and the support provided while exploring different financing options.",
    detail: "Client · UAE",
  },
  {
    name: "FARHA D",
    quote:
      "The First Home team was responsive and made the overall financing journey feel much more structured.",
    detail: "Client · Dubai",
  },
];

// =========================================================
// FAQ
// =========================================================

const faqs = [
  {
    question: "What does a mortgage consultant help with?",
    answer:
      "A mortgage consultant can help you understand financing options, assess suitable routes, compare available solutions, and navigate the mortgage process.",
  },
  {
    question: "Can First Home help non-resident buyers?",
    answer:
      "First Home provides guidance for non-resident property financing requirements and helps clients understand the options that may be relevant to their situation.",
  },
  {
    question: "Can I explore options before choosing a property?",
    answer:
      "Yes. Understanding your potential financing options early can help you approach your property search with greater clarity around your requirements and budget.",
  },
  {
    question: "Does First Home provide Islamic financing options?",
    answer:
      "First Home can help clients explore Islamic and Sharia-compliant financing routes where suitable.",
  },
];

// =========================================================
// ABOUT PAGE
// =========================================================

function About() {
  return (
    <main>
      {/* =========================================================
          ABOUT HERO
      ========================================================= */}

      <section className="bg-[#071B2D] py-24 sm:py-28 lg:py-32">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20">
          <Reveal>
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#D9BC7A]">
                About Us
              </p>

              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Mortgage Guidance Built Around Your Goals
              </h1>

              <p className="mt-6 text-base leading-7 text-white/70 sm:text-lg">
                First Home helps individuals, families, investors, and
                businesses navigate property financing with clearer options,
                practical guidance, and support throughout the journey.
              </p>

              <p className="mt-6 text-base leading-7 text-white/70 sm:text-lg">
                From your initial questions through the next stages of the
                financing journey, First Home focuses on clear communication,
                practical guidance, and a structured experience.
              </p>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="relative overflow-hidden rounded-3xl">
              <img
                src={aboutImage}
                alt="Mortgage consultation with a property financing specialist"
                className="h-[420px] w-full object-cover transition-transform duration-700 hover:scale-[1.02] motion-reduce:transition-none"
              />

              <div
                className="absolute inset-0 bg-gradient-to-t from-[#071B2D]/40 to-transparent"
                aria-hidden="true"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* =========================================================
          WHO WE HELP
      ========================================================= */}

      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#071B2D] sm:text-4xl">
                Who We Help
              </h2>

              <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">
                Whether you are buying your first home, investing in property,
                or exploring financing for a business, we help you understand
                the routes available to you.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customerSegments.map((segment, index) => (
              <Reveal key={segment} delay={index * 70}>
                <article className="group flex min-h-[110px] items-center gap-4 rounded-2xl border border-slate-200 bg-[#FBFAF7] px-6 py-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#D9BC7A] hover:bg-white">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#071B2D] text-[#D9BC7A] transition-transform duration-300 group-hover:scale-105">
                    <Check className="size-4" aria-hidden="true" />
                  </div>

                  <h3 className="text-base font-semibold text-[#071B2D]">
                    {segment}
                  </h3>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          CLIENT REVIEWS
      ========================================================= */}

      <section className="bg-[#071B2D] py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                A Clearer Experience for Our Clients
              </h1>

              <p className="mt-5 text-base leading-7 text-white/65 sm:text-lg">
                Hear what our clients have to say about their experience with
                First Home.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review, index) => (
              <Reveal key={review.name} delay={index * 100}>
                <article className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-7 transition-transform duration-300 hover:-translate-y-1">
                  <p className="text-sm font-semibold text-white">
                    {review.name}
                  </p>

                  <p className="mt-1 text-xs text-white/50">{review.detail}</p>

                  <div className="mt-6 border-t border-white/10 pt-2" />

                  <p className="mt-2 text-base leading-7 text-white/75">
                    “{review.quote}”
                  </p>

                  <div
                    className="mt-6 flex gap-1"
                    aria-label="Five star review"
                  >
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <span
                        key={starIndex}
                        className="text-sm text-[#D9BC7A]"
                        aria-hidden="true"
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          FAQ
      ========================================================= */}

      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-4xl px-6">
          <Reveal>
            <div className="text-center">
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#071B2D] sm:text-4xl">
                Frequently Asked Questions
              </h2>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="mt-12 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-[#FBFAF7]">
              {faqs.map((faq) => (
                <details key={faq.question} className="group px-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-left text-base font-semibold text-[#071B2D] [&::-webkit-details-marker]:hidden">
                    <span>{faq.question}</span>

                    <ChevronDown
                      className="size-5 shrink-0 text-[#A98C4F] transition-transform duration-300 group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>

                  <p className="max-w-3xl pb-6 pr-8 text-sm leading-7 text-slate-600">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* =========================================================
          CTA
      ========================================================= */}

      <section className="bg-[#FBFAF7] py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="overflow-hidden rounded-3xl bg-[#071B2D] px-6 py-12 text-center sm:px-10 sm:py-16">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#D9BC7A]">
                Let's Talk
              </p>

              <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Let's Find the Right Mortgage Solution for You
              </h2>

              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
                Speak with First Home and explore your property-financing
                options with greater clarity.
              </p>

              <a
                href="/#contact"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#D9BC7A] px-6 py-3.5 text-sm font-semibold text-[#071B2D] transition-colors hover:bg-[#E3CA96]"
              >
                Talk to a Consultant
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}

export default About;
