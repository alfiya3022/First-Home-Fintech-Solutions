import Reveal from "@/components/ui/Reveal";

// =========================================================
// BANK LOGOS
// =========================================================

// Conventional banks
import adcbLogo from "@/assets/banks/ADCB.jpg";
import hsbcLogo from "@/assets/banks/HSBC.png";
import mashreqLogo from "@/assets/banks/mashreq.png";
import rakbankLogo from "@/assets/banks/rak bank.png";
import cbdLogo from "@/assets/banks/cbd.png";
import standardCharteredLogo from "@/assets/banks/standard chatered.png";
import nbfLogo from "@/assets/banks/nbf.png";
import emiratesNbdLogo from "@/assets/banks/emirates nbd.png";

// Islamic banks
import dibLogo from "@/assets/banks/DIB.jpg";
import adibLogo from "@/assets/banks/ADIB.jpg";
import emiratesIslamicLogo from "@/assets/banks/emirates.png";
import sibLogo from "@/assets/banks/sib.png";

// =========================================================
// BANK DATA
// =========================================================

const conventionalBankLogos = [
  {
    name: "Emirates NBD",
    logo: emiratesNbdLogo,
  },
  {
    name: "ADCB",
    logo: adcbLogo,
  },
  {
    name: "HSBC UAE",
    logo: hsbcLogo,
  },
  {
    name: "Mashreq Bank",
    logo: mashreqLogo,
  },
  {
    name: "RAKBANK",
    logo: rakbankLogo,
  },
  {
    name: "Commercial Bank of Dubai",
    logo: cbdLogo,
  },
  {
    name: "Standard Chartered UAE",
    logo: standardCharteredLogo,
  },
  {
    name: "National Bank of Fujairah",
    logo: nbfLogo,
  },
];

const islamicBankLogos = [
  {
    name: "Dubai Islamic Bank",
    logo: dibLogo,
  },
  {
    name: "Abu Dhabi Islamic Bank",
    logo: adibLogo,
  },
  {
    name: "Emirates Islamic",
    logo: emiratesIslamicLogo,
  },
  {
    name: "Sharjah Islamic Bank",
    logo: sibLogo,
  },
];

// =========================================================
// BANK MARQUEE
// =========================================================

function BankMarquee({
  logos,
  direction,
}: {
  logos: {
    name: string;
    logo: string;
  }[];
  direction: "left" | "right";
}) {
  const animationClass =
    direction === "left" ? "bank-marquee-left" : "bank-marquee-right";

  return (
    <div className="relative overflow-hidden">
      <div
        className={`flex w-max ${animationClass}`}
        style={{
          paddingLeft: "24px",
          paddingRight: "24px",
        }}
      >
        {/* First set */}
        <div className="flex shrink-0 items-center gap-8 px-3 sm:gap-10 sm:px-4">
          {logos.map((bank) => (
            <div
              key={bank.name}
              className="flex h-28 w-[250px] shrink-0 items-center justify-center rounded-2xl bg-white px-7"
            >
              <img
                src={bank.logo}
                alt={bank.name}
                className="block max-h-[72px] w-auto max-w-[205px] object-contain"
              />
            </div>
          ))}
        </div>

        {/* Duplicate set for seamless marquee */}
        <div
          className="flex shrink-0 items-center gap-8 px-3 sm:gap-10 sm:px-4"
          aria-hidden="true"
        >
          {logos.map((bank) => (
            <div
              key={`duplicate-${bank.name}`}
              className="flex h-28 w-[250px] shrink-0 items-center justify-center rounded-2xl bg-white px-7"
            >
              <img
                src={bank.logo}
                alt=""
                className="block max-h-[72px] w-auto max-w-[205px] object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =========================================================
// PARTNERED BANKS
// =========================================================

function PartneredBanks() {
  return (
    <section className="overflow-hidden bg-[#FBFAF7] py-14 sm:py-16">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#A98C4F]">
              Partnered Banks
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#071B2D] sm:text-4xl">
              Access to a Broad Financing Landscape
            </h2>

            <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">
              A selection of conventional and Islamic institutions relevant to
              the UAE mortgage and property-financing landscape.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 space-y-10">
          <Reveal>
            <BankMarquee logos={conventionalBankLogos} direction="left" />
          </Reveal>

          <Reveal delay={120}>
            <BankMarquee logos={islamicBankLogos} direction="right" />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export default PartneredBanks;
