import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import mortgageSolutionsImage from "@/assets/images/mortgage-solutions-financing.png";

const services = [
  "Home Purchase Mortgage",
  "Mortgage Refinancing / Buyout",
  "Equity Release",
  "Non-Resident Mortgages",
  "Commercial Mortgages",
  "Off-Plan Property Financing",
  "Ready Property Financing",
  "UAE Resident Mortgages",
  "Overseas / Expat Financing",
  "First-Time Home Buyer Solutions",
  "Property Investor Financing",
  "Self-Employed Mortgage Solutions",
  "Islamic / Sharia-Compliant Financing",
];

const CARD_WIDTH = 280;
const GAP = 20;
const STEP = CARD_WIDTH + GAP;
const SPEED = 100;
const TOTAL_LOOP_WIDTH = services.length * STEP;

function MortgageSolutions() {
  const trackRef = useRef<HTMLDivElement>(null);

  const animationFrameRef = useRef<number | null>(null);
  const positionRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);

  const isRunningRef = useRef(true);
  const isHoveredRef = useRef(false);
  const isAnimatingRef = useRef(false);

  const applyPosition = (position: number) => {
    if (!trackRef.current) return;

    trackRef.current.style.transform = `translate3d(${position}px, 0, 0)`;
  };

  const normalizePosition = () => {
    while (positionRef.current <= -TOTAL_LOOP_WIDTH) {
      positionRef.current += TOTAL_LOOP_WIDTH;
    }

    while (positionRef.current > 0) {
      positionRef.current -= TOTAL_LOOP_WIDTH;
    }
  };

  const startAutomaticMovement = () => {
    if (isRunningRef.current) return;

    isRunningRef.current = true;
    lastTimeRef.current = performance.now();
  };

  const stopAutomaticMovement = () => {
    isRunningRef.current = false;
    lastTimeRef.current = null;
  };

  useEffect(() => {
    const animate = (time: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }

      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;

      const shouldMove =
        isRunningRef.current &&
        !isHoveredRef.current &&
        !isAnimatingRef.current;

      if (shouldMove) {
        positionRef.current -= (SPEED * deltaTime) / 1000;

        normalizePosition();
        applyPosition(positionRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const moveCarousel = (direction: "left" | "right") => {
    if (!trackRef.current || isAnimatingRef.current) return;

    isAnimatingRef.current = true;
    stopAutomaticMovement();

    const movement = direction === "left" ? -STEP : STEP;
    const targetPosition = positionRef.current + movement;

    trackRef.current.style.transition =
      "transform 700ms cubic-bezier(0.22, 1, 0.36, 1)";

    positionRef.current = targetPosition;
    applyPosition(positionRef.current);

    window.setTimeout(() => {
      if (!trackRef.current) return;

      normalizePosition();

      trackRef.current.style.transition = "none";
      applyPosition(positionRef.current);

      isAnimatingRef.current = false;

      if (!isHoveredRef.current) {
        startAutomaticMovement();
      }
    }, 700);
  };

  const scrollingServices = [...services, ...services, ...services];

  return (
    <section
      id="services"
      className="relative overflow-hidden bg-[#FBFAF7] pb-8 pt-20 sm:pb-10 sm:pt-24"
    >
      {/* Mortgage Solutions visual */}
      <div className="pointer-events-none absolute right-0 top-0 h-[610px] w-[72%] overflow-hidden">
        <img
          src={mortgageSolutionsImage}
          alt=""
          aria-hidden="true"
          className="absolute -top-16 h-[610px] w-full object-cover object-center"
        />

        {/* Large feathered top edge */}
        <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(to_bottom,#FBFAF7_0%,rgba(251,250,247,0.92)_22%,rgba(251,250,247,0.45)_55%,transparent_100%)]" />

        {/* Strong left fade into the page background */}
        <div className="absolute inset-y-0 left-0 w-[58%] bg-[linear-gradient(to_right,#FBFAF7_0%,rgba(251,250,247,0.96)_18%,rgba(251,250,247,0.75)_38%,rgba(251,250,247,0.30)_65%,transparent_100%)]" />

        {/* Soft bottom fade before the cards */}
        <div className="absolute inset-x-0 bottom-0 h-52 bg-[linear-gradient(to_top,#FBFAF7_0%,rgba(251,250,247,0.94)_25%,rgba(251,250,247,0.55)_55%,transparent_100%)]" />

        {/* Very subtle overall blend */}
        <div className="absolute inset-0 bg-white/[0.03]" />
      </div>

      {/* Section introduction */}
      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="max-w-2xl">
          <div className="mb-5 flex items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#B99657]">
              Mortgage Solutions
            </p>

            <span className="h-px w-8 bg-[#D6BE8A]" />
          </div>

          <h2 className="font-serif text-4xl font-medium leading-[1.08] tracking-tight text-[#071B2D] sm:text-5xl">
            Financing Solutions Built Around Your Needs
          </h2>

          <p className="mt-6 max-w-xl text-base leading-7 text-[#5F6872] sm:text-[17px]">
            Explore mortgage solutions designed for different property,
            financing, and customer requirements.
          </p>
        </div>
      </div>

      {/* Service carousel */}
      <div
        className="relative z-10 mt-35 flex items-center gap-3 px-6"
        onMouseEnter={() => {
          isHoveredRef.current = true;
        }}
        onMouseLeave={() => {
          isHoveredRef.current = false;

          if (!isAnimatingRef.current) {
            startAutomaticMovement();
          }
        }}
      >
        <button
          type="button"
          onClick={() => moveCarousel("right")}
          aria-label="Show previous mortgage services"
          className="z-10 flex size-11 shrink-0 items-center justify-center rounded-full border border-[#DCD8D0] bg-white text-[#071B2D] shadow-sm transition-all duration-200 hover:border-[#D6BE8A] hover:bg-[#071B2D] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B99657] focus-visible:ring-offset-2"
        >
          <ChevronLeft className="size-5" />
        </button>

        <div className="min-w-0 flex-1 overflow-hidden">
          <div
            ref={trackRef}
            className="flex w-max gap-5"
            style={{
              willChange: "transform",
              transform: "translate3d(0, 0, 0)",
            }}
          >
            {scrollingServices.map((service, index) => (
              <article
                key={`${service}-${index}`}
                className="flex h-30 w-[200px] shrink-0 flex-col rounded-2xl border border-[#E7E3DB] bg-white p-6 shadow-[0_8px_30px_rgba(7,27,45,0.04)] transition-transform duration-300 hover:-translate-y-1 sm:w-[280px]"
              >
                <span className="text-xs font-semibold tracking-[0.18em] text-[#B99657]">
                  {((index % services.length) + 1).toString().padStart(2, "0")}
                </span>

                <h3 className="mt-1 -[180px] text-xl font-medium leading-7 text-[#071B2D]">
                  {service}
                </h3>
              </article>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => moveCarousel("left")}
          aria-label="Show next mortgage services"
          className="z-10 flex size-11 shrink-0 items-center justify-center rounded-full border border-[#DCD8D0] bg-white text-[#071B2D] shadow-sm transition-all duration-200 hover:border-[#D6BE8A] hover:bg-[#071B2D] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B99657] focus-visible:ring-offset-2"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </section>
  );
}

export default MortgageSolutions;
