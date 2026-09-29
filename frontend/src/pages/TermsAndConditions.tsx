const sections = [
  {
    title: "1. Introduction",
    paragraphs: [
      `Welcome to the First Home Fintech Solutions website. These Terms and Conditions ("Terms") govern your access to and use of this website, including the information, tools, services, and enquiry facilities made available through it.`,
      `By accessing or using this website, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree with any part of these Terms, please discontinue use of the website.`,
    ],
  },
  {
    title: "2. About First Home",
    paragraphs: [
      `First Home Fintech Solutions ("First Home", "we", "us", or "our") provides mortgage and property-financing guidance and related consultation services.`,
      `Information presented on this website is intended to help visitors understand available financing options and initiate discussions with a mortgage consultant. Specific services, products, eligibility criteria, and financing arrangements may vary depending on individual circumstances and applicable lender requirements.`,
    ],
  },
  {
    title: "3. Use of the Website",
    paragraphs: [
      `You agree to use this website only for lawful purposes and in a manner that does not interfere with the operation, security, or availability of the website.`,
    ],
    list: [
      "Use the website for any unlawful, fraudulent, or unauthorised purpose.",
      "Attempt to gain unauthorised access to the website, its systems, or related services.",
      "Introduce malicious software, harmful code, or other material that could affect the website or its users.",
      "Misuse enquiry forms, communication facilities, or other website functionality.",
      "Copy, reproduce, modify, distribute, or commercially exploit website content without appropriate permission.",
    ],
    listIntro: "You must not:",
  },
  {
    title: "4. Website Information",
    paragraphs: [
      `We aim to keep the information presented on this website accurate, useful, and reasonably up to date. However, information may change without notice and we do not guarantee that every item of content will always be complete, current, or error-free.`,
      `Website content should therefore be considered general information and not a substitute for personalised professional advice or formal financing documentation.`,
    ],
  },
  {
    title: "5. Mortgage and Financing Information",
    paragraphs: [
      `Information relating to mortgages, financing options, repayment estimates, lender availability, eligibility, rates, fees, and other financial matters is provided for general informational purposes.`,
      `Any financing option discussed with you may be subject to lender policies, eligibility requirements, property valuation, credit assessment, applicable rates, fees, regulatory requirements, documentation, and final approval by the relevant financing institution.`,
      `Submitting an enquiry through this website does not constitute a mortgage application, financing approval, loan commitment, or guarantee of funding.`,
    ],
  },
  {
    title: "6. Mortgage Calculator",
    paragraphs: [
      `The mortgage calculator available on this website is provided as an illustrative planning tool only.`,
      `Calculations are based on the information entered by the user and assumptions used by the calculator. Actual mortgage repayments, interest costs, fees, eligibility, and financing terms may differ materially from the displayed estimates.`,
      `Calculator results should not be treated as a quotation, offer, approval, financial recommendation, or commitment by First Home or any lender.`,
    ],
  },
  {
    title: "7. Enquiries and Communications",
    paragraphs: [
      `By submitting an enquiry through the website, you confirm that the information provided by you is accurate and relates to you or that you are authorised to provide it.`,
      `We may use the information submitted through the enquiry form to respond to your request, understand your financing requirements, and communicate with you regarding relevant services.`,
      `Submission of an enquiry does not create an obligation for First Home to provide financing, accept an application, or enter into a contractual relationship.`,
    ],
  },
  {
    title: "8. Third-Party Lenders and Service Providers",
    paragraphs: [
      `First Home may discuss financing options offered by third-party financial institutions or other service providers.`,
      `Third-party institutions operate independently and may apply their own eligibility criteria, terms, conditions, fees, interest rates, approval procedures, documentation requirements, and other policies.`,
      `Any final financing arrangement is subject to the terms agreed between the relevant parties and the applicable third-party institution.`,
    ],
  },
  {
    title: "9. Intellectual Property",
    paragraphs: [
      `Unless otherwise stated, the website and its contents—including text, graphics, logos, visual elements, layouts, design elements, photographs, illustrations, and other materials—are owned by or licensed to First Home and are protected by applicable intellectual property laws.`,
      `You may view and use the website for personal and legitimate informational purposes. You may not reproduce, republish, distribute, modify, transmit, or commercially exploit website content without prior written permission.`,
    ],
  },
  {
    title: "10. Third-Party Links",
    paragraphs: [
      `This website may contain links to websites, platforms, or services operated by third parties.`,
      `These links are provided for convenience or informational purposes. First Home does not control third-party websites and is not responsible for their content, availability, security, privacy practices, or terms of use.`,
    ],
  },
  {
    title: "11. Website Availability and Security",
    paragraphs: [
      `We make reasonable efforts to maintain the availability and security of the website. However, we do not guarantee that the website will always be available, uninterrupted, secure, or free from technical errors.`,
      `Website availability may be affected by maintenance, technical issues, telecommunications failures, third-party services, or other circumstances beyond our reasonable control.`,
    ],
  },
  {
    title: "12. Limitation of Liability",
    paragraphs: [
      `To the extent permitted by applicable law, First Home shall not be responsible for losses or damages arising from reliance on general website information, calculator estimates, website interruptions, technical errors, third-party websites, or financing decisions made without obtaining appropriate professional advice.`,
      `Nothing in these Terms is intended to exclude or limit any liability that cannot lawfully be excluded or limited under applicable law.`,
    ],
  },
  {
    title: "13. Indemnity",
    paragraphs: [
      `To the extent permitted by applicable law, you agree to be responsible for losses, claims, liabilities, costs, or expenses arising from your unlawful use of the website, violation of these Terms, or infringement of the rights of First Home or any third party.`,
    ],
  },
  {
    title: "14. Privacy",
    paragraphs: [
      `Your use of this website and the handling of personal information submitted through it are also governed by our Privacy Policy.`,
      `Please review the Privacy Policy to understand how personal information may be collected, used, stored, and handled.`,
    ],
  },
  {
    title: "15. Changes to These Terms",
    paragraphs: [
      `First Home may update these Terms from time to time to reflect changes to the website, services, business practices, or applicable legal and regulatory requirements.`,
      `Updated Terms will be published on this page. Your continued use of the website after an updated version is published constitutes continued use of the website subject to the revised Terms, to the extent permitted by applicable law.`,
    ],
  },
  {
    title: "16. Governing Law and Jurisdiction",
    paragraphs: [
      `These Terms shall be interpreted and applied in accordance with the laws applicable in the United Arab Emirates, subject to any mandatory provisions of applicable law.`,
      `Any dispute arising in connection with the use of this website or these Terms shall be subject to the jurisdiction of the competent courts or authorities as determined by applicable law and the applicable jurisdiction of First Home's business operations.`,
    ],
  },
];

function TermsAndConditions() {
  return (
    <main className="bg-[#FBFAF7]">
      {/* Hero */}
      <section className="bg-[#071B2D] px-6 pb-20 pt-32 text-white sm:pb-24 sm:pt-36">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#D9BC7A]">
            Legal
          </p>

          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Terms & Conditions
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
            Terms and conditions governing the use of the First Home website and
            its online services.
          </p>

          <p className="mt-6 text-sm text-white/50">
            Last Updated: 29 September 2026
          </p>
        </div>
      </section>

      {/* Terms Content */}
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

                  {section.listIntro && (
                    <p className="font-medium text-slate-700">
                      {section.listIntro}
                    </p>
                  )}

                  {section.list && (
                    <ul className="list-disc space-y-2 pl-6">
                      {section.list.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}
          </div>

          {/* Contact */}
          <section className="mt-12 border-t border-slate-200 pt-10">
            <h2 className="text-xl font-semibold tracking-tight text-[#071B2D] sm:text-2xl">
              17. Contact Us
            </h2>

            <div className="mt-5 space-y-4 text-[15px] leading-7 text-slate-600 sm:text-base">
              <p>
                If you have questions regarding these Terms and Conditions, you
                may contact First Home using the following details:
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
              This website document is intended as a general terms framework and
              should be reviewed by the company's legal adviser before
              publication. The final version should be aligned with First Home's
              legal entity details, licensing arrangements, regulatory
              obligations, service-provider relationships, and applicable UAE
              and local laws.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default TermsAndConditions;
