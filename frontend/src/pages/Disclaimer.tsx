const sections = [
  {
    title: "1. General Information",
    paragraphs: [
      `The information provided on the First Home Fintech Solutions website is intended for general informational and educational purposes only.`,
      `Although we make reasonable efforts to keep the information on this website accurate and useful, we do not guarantee that all information is complete, current, accurate, or suitable for every individual or circumstance.`,
      `Information on this website may be updated, changed, or removed without prior notice.`,
    ],
  },
  {
    title: "2. No Financial Advice",
    paragraphs: [
      `Nothing on this website should be interpreted as personalised financial, investment, legal, tax, accounting, or other professional advice.`,
      `Information about mortgages, property financing, interest rates, repayment estimates, financing structures, lender options, or eligibility is provided for general informational purposes and should not be relied upon as a substitute for advice based on your individual circumstances.`,
      `You should obtain appropriate professional advice before making financial, property, borrowing, or investment decisions.`,
    ],
  },
  {
    title: "3. Mortgage and Financing Information",
    paragraphs: [
      `Information regarding mortgage and property-financing solutions is provided to help visitors understand potential financing routes and prepare for discussions with a mortgage consultant.`,
      `The availability of any financing product or option may depend on factors including income, employment status, residency, credit profile, property type, property value, loan amount, documentation, lender criteria, applicable regulations, and other circumstances.`,
      `A financing option discussed through this website does not guarantee eligibility, approval, availability, or funding.`,
    ],
  },
  {
    title: "4. Mortgage Calculator Disclaimer",
    paragraphs: [
      `The mortgage calculator provided on this website is an illustrative calculation tool only.`,
      `Results are generated using the information entered by the user and assumptions incorporated into the calculator. The results are estimates and may not reflect the actual terms, repayment amount, interest rate, fees, charges, or conditions that may be offered by a lender.`,
      `Calculator results should not be interpreted as a quotation, financing offer, loan approval, financial recommendation, or guarantee of financing.`,
    ],
  },
  {
    title: "5. Interest Rates, Fees and Charges",
    paragraphs: [
      `Any interest rates, fees, charges, repayment figures, or other financial information displayed or discussed through the website may be subject to change.`,
      `Actual rates, fees, charges, repayment structures, and financing terms are determined by the applicable financing institution and may depend on the applicant's circumstances and the terms available at the relevant time.`,
      `Users should confirm all financial terms directly with the relevant institution or through a First Home consultant before making a decision.`,
    ],
  },
  {
    title: "6. Lender and Product Availability",
    paragraphs: [
      `First Home may provide information about financing solutions available through third-party financial institutions or other financing providers.`,
      `The appearance or discussion of a lender, financing route, or product on this website does not constitute a guarantee that the lender will accept an application or that a particular product will be available to every customer.`,
      `Lender participation, product availability, eligibility criteria, rates, fees, and approval requirements may change from time to time.`,
    ],
  },
  {
    title: "7. No Guarantee of Approval",
    paragraphs: [
      `Submitting an enquiry, speaking with a consultant, using the mortgage calculator, or providing information through this website does not guarantee mortgage approval or financing.`,
      `Final approval remains subject to the assessment, policies, requirements, and decision-making process of the relevant financing institution.`,
    ],
  },
  {
    title: "8. Property Information",
    paragraphs: [
      `Any property-related information presented on the website is provided for general informational purposes.`,
      `Users should independently verify property details, valuations, ownership information, project information, developer information, fees, charges, and other relevant facts before entering into a property transaction or financing arrangement.`,
    ],
  },
  {
    title: "9. Third-Party Information",
    paragraphs: [
      `This website may refer to third-party financial institutions, property providers, service providers, websites, or other organisations.`,
      `First Home does not control third-party information, websites, products, services, policies, or decisions and does not guarantee their accuracy, availability, suitability, or performance.`,
      `Any third-party terms, conditions, policies, and privacy practices are governed by the relevant third party.`,
    ],
  },
  {
    title: "10. No Professional Relationship",
    paragraphs: [
      `Use of this website, submission of an online enquiry, or communication through the website does not by itself establish a financial advisory, legal, tax, investment, or other professional relationship between you and First Home.`,
      `Any formal relationship or service engagement will be subject to the applicable terms, agreements, and requirements communicated separately.`,
    ],
  },
  {
    title: "11. Accuracy and Completeness",
    paragraphs: [
      `We seek to provide useful and accurate information, but errors, omissions, delays, or outdated information may occur.`,
      `First Home does not warrant that the website or its content will always be complete, accurate, current, uninterrupted, or free from errors.`,
      `Users should verify material information before relying on it for a financial or property-related decision.`,
    ],
  },
  {
    title: "12. Limitation of Responsibility",
    paragraphs: [
      `To the extent permitted by applicable law, First Home shall not be responsible for losses or damages arising from reliance on general website information, illustrative calculations, third-party information, website availability, technical errors, or decisions made based solely on information presented through this website.`,
      `Nothing in this Disclaimer is intended to exclude or limit any responsibility or liability that cannot lawfully be excluded or limited under applicable law.`,
    ],
  },
  {
    title: "13. Changes to This Disclaimer",
    paragraphs: [
      `First Home may update this Disclaimer from time to time to reflect changes to the website, services, business practices, or applicable legal and regulatory requirements.`,
      `Any updated version will be published on this page. Users are encouraged to review this page periodically for changes.`,
    ],
  },
];

function Disclaimer() {
  return (
    <main className="bg-[#FBFAF7]">
      {/* Hero */}
      <section className="bg-[#071B2D] px-6 pb-20 pt-32 text-white sm:pb-24 sm:pt-36">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#D9BC7A]">
            Legal
          </p>

          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Disclaimer
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
            Important information about the use of the First Home website,
            mortgage information, and financing estimates.
          </p>

          <p className="mt-6 text-sm text-white/50">
            Last Updated: 29 September 2026
          </p>
        </div>
      </section>

      {/* Disclaimer Content */}
      <section className="px-6 py-14 sm:py-16">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-6 shadow-sm sm:p-10 lg:p-12">
          <div className="space-y-12">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold tracking-tight text-[#071B2D] sm:text-2xl">
                  {section.title}
                </h2>

                <div className="mt-5 space-y-4 text-[15px] leading-7 text-slate-600 sm:text-base">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Contact */}
          <section className="mt-12 border-t border-slate-200 pt-10">
            <h2 className="text-xl font-semibold tracking-tight text-[#071B2D] sm:text-2xl">
              14. Contact Us
            </h2>

            <div className="mt-5 space-y-4 text-[15px] leading-7 text-slate-600 sm:text-base">
              <p>
                If you have questions regarding this Disclaimer or the
                information presented on the website, you may contact First Home
                using the following details:
              </p>

              <div className="rounded-2xl border border-slate-200 bg-[#FBFAF7] p-5">
                <p className="font-semibold text-[#071B2D]">
                  First Home Fintech Solutions
                </p>

                <p className="mt-2">
                  Al Dubai Digital Park, IFZA Properties, Dubai Silicon Oasis,
                  Dubai, UAE
                </p>

                <p className="mt-1">
                  Phone:{" "}
                  <a
                    href="tel:+971566357860"
                    className="font-medium text-[#071B2D] underline-offset-4 hover:underline"
                  >
                    +971 56 635 7860
                  </a>
                </p>

                <p className="mt-1">
                  Website:{" "}
                  <a
                    href="https://www.firsthomefintech.com"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-[#071B2D] underline-offset-4 hover:underline"
                  >
                    www.firsthomefintech.com
                  </a>
                </p>
              </div>
            </div>
          </section>

          {/* Legal Review Note */}
          <div className="mt-12 border-t border-slate-200 pt-8">
            <p className="text-xs leading-6 text-slate-500">
              This website document is intended as a general disclaimer
              framework and should be reviewed by the company's legal adviser
              before publication. The final version should be aligned with First
              Home's legal entity details, licensing arrangements, regulatory
              obligations, financing activities, service-provider relationships,
              and applicable UAE and local laws.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Disclaimer;
