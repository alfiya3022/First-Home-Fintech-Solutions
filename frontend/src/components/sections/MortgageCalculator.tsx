import { ArrowRight, Check } from "lucide-react";
import { useMemo, useState } from "react";

type ResidencyStatus = "UAE national" | "UAE resident" | "Non resident";

const DEFAULT_VALUES = {
  propertyPrice: 1000000,
  downPayment: 200000,
  loanPeriod: 20,
  interestRate: 4.5,
  residencyStatus: "UAE resident" as ResidencyStatus,
};

const PROPERTY_PRICE_MIN = 300000;
const PROPERTY_PRICE_MAX = 200000000;

const LOAN_PERIOD_MIN = 1;
const LOAN_PERIOD_MAX = 25;

const INTEREST_RATE_MIN = 1;
const INTEREST_RATE_MAX = 10;

const MIN_DOWN_PAYMENT_PERCENT: Record<ResidencyStatus, number> = {
  "UAE national": 15,
  "UAE resident": 20,
  "Non resident": 40,
};

function formatAED(value: number) {
  return new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function calculateMonthlyPayment(
  loanAmount: number,
  annualInterestRate: number,
  loanPeriodYears: number,
) {
  const numberOfPayments = loanPeriodYears * 12;

  if (loanAmount <= 0 || numberOfPayments <= 0) {
    return 0;
  }

  if (annualInterestRate === 0) {
    return loanAmount / numberOfPayments;
  }

  const monthlyRate = annualInterestRate / 100 / 12;

  return (
    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1)
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getMinimumDownPayment(
  propertyPrice: number,
  residencyStatus: ResidencyStatus,
) {
  return propertyPrice * (MIN_DOWN_PAYMENT_PERCENT[residencyStatus] / 100);
}

function MortgageCalculator() {
  const [propertyPrice, setPropertyPrice] = useState(
    DEFAULT_VALUES.propertyPrice,
  );

  const [downPayment, setDownPayment] = useState(DEFAULT_VALUES.downPayment);

  const [loanPeriod, setLoanPeriod] = useState(DEFAULT_VALUES.loanPeriod);

  const [interestRate, setInterestRate] = useState(DEFAULT_VALUES.interestRate);

  const [residencyStatus, setResidencyStatus] = useState<ResidencyStatus>(
    DEFAULT_VALUES.residencyStatus,
  );

  const minimumDownPayment = useMemo(
    () => getMinimumDownPayment(propertyPrice, residencyStatus),
    [propertyPrice, residencyStatus],
  );

  const maximumDownPayment = propertyPrice;

  const minimumDownPaymentPercentage =
    MIN_DOWN_PAYMENT_PERCENT[residencyStatus];

  const maximumLoanPercentage = 100 - minimumDownPaymentPercentage;

  const loanAmount = Math.max(propertyPrice - downPayment, 0);

  const loanPercentage =
    propertyPrice > 0 ? (loanAmount / propertyPrice) * 100 : 0;

  const downPaymentPercentage =
    propertyPrice > 0 ? (downPayment / propertyPrice) * 100 : 0;

  const monthlyPayment = calculateMonthlyPayment(
    loanAmount,
    interestRate,
    loanPeriod,
  );

  function updatePropertyPrice(value: number) {
    if (!Number.isFinite(value)) return;

    const nextPropertyPrice = clamp(
      value,
      PROPERTY_PRICE_MIN,
      PROPERTY_PRICE_MAX,
    );

    const nextMinimumDownPayment = getMinimumDownPayment(
      nextPropertyPrice,
      residencyStatus,
    );

    setPropertyPrice(nextPropertyPrice);

    setDownPayment(
      Math.max(
        nextMinimumDownPayment,
        Math.min(downPayment, nextPropertyPrice),
      ),
    );
  }

  function updateResidencyStatus(status: ResidencyStatus) {
    setResidencyStatus(status);

    const nextMinimumDownPayment = getMinimumDownPayment(propertyPrice, status);

    setDownPayment(
      Math.max(nextMinimumDownPayment, Math.min(downPayment, propertyPrice)),
    );
  }

  function updateDownPayment(value: number) {
    if (!Number.isFinite(value)) return;

    setDownPayment(clamp(value, minimumDownPayment, maximumDownPayment));
  }

  function updateLoanAmount(value: number) {
    if (!Number.isFinite(value)) return;

    const maximumLoanAmount = propertyPrice - minimumDownPayment;

    const nextLoanAmount = clamp(value, 0, maximumLoanAmount);

    setDownPayment(propertyPrice - nextLoanAmount);
  }

  function updateLoanPeriod(value: number) {
    if (!Number.isFinite(value)) return;

    setLoanPeriod(clamp(value, LOAN_PERIOD_MIN, LOAN_PERIOD_MAX));
  }

  function updateInterestRate(value: number) {
    if (!Number.isFinite(value)) return;

    setInterestRate(clamp(value, INTEREST_RATE_MIN, INTEREST_RATE_MAX));
  }

  function resetCalculator() {
    setPropertyPrice(DEFAULT_VALUES.propertyPrice);
    setDownPayment(DEFAULT_VALUES.downPayment);
    setLoanPeriod(DEFAULT_VALUES.loanPeriod);
    setInterestRate(DEFAULT_VALUES.interestRate);
    setResidencyStatus(DEFAULT_VALUES.residencyStatus);
  }

  return (
    <section id="calculator" className="bg-[#071B2D] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-start gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div className="lg:sticky lg:top-28">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#D9BC7A]">
              Mortgage Calculator
            </p>

            <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Estimate Your Monthly Mortgage Payment
            </h2>

            <p className="mt-6 max-w-xl text-base leading-7 text-white/65 sm:text-lg">
              Adjust your property and financing details to get an illustrative
              estimate of your potential monthly mortgage repayment.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#D9BC7A]">
                  <Check className="size-3" aria-hidden="true" />
                </div>

                <p className="text-sm leading-6 text-white/70">
                  Adjust your property and financing details
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#D9BC7A]">
                  <Check className="size-3" aria-hidden="true" />
                </div>

                <p className="text-sm leading-6 text-white/70">
                  See your estimated loan amount
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#D9BC7A]">
                  <Check className="size-3" aria-hidden="true" />
                </div>

                <p className="text-sm leading-6 text-white/70">
                  Understand your potential monthly repayment
                </p>
              </div>
            </div>

            <a
              href="/#contact"
              className="mt-9 inline-flex items-center gap-2 rounded-xl bg-[#D9BC7A] px-6 py-3.5 text-sm font-semibold text-[#071B2D] transition-colors hover:bg-[#E3CA96]"
            >
              Talk to a Consultant
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.15)] sm:p-8 lg:p-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A98C4F]">
                  Your Details
                </p>

                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#071B2D]">
                  Mortgage Calculator
                </h3>
              </div>

              <button
                type="button"
                onClick={resetCalculator}
                className="text-xs font-semibold text-slate-500 transition-colors hover:text-[#071B2D]"
              >
                Reset
              </button>
            </div>

            <div className="mt-8 space-y-8">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <label
                    htmlFor="property-price"
                    className="text-sm font-medium text-[#071B2D]"
                  >
                    Purchase Price
                  </label>

                  <div className="relative w-40">
                    <input
                      id="property-price"
                      type="number"
                      min={PROPERTY_PRICE_MIN}
                      max={PROPERTY_PRICE_MAX}
                      step="10000"
                      value={propertyPrice}
                      onChange={(event) =>
                        updatePropertyPrice(Number(event.target.value))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-12 text-right text-sm font-semibold text-[#071B2D] outline-none transition-colors focus:border-[#A98C4F] focus:ring-2 focus:ring-[#D9BC7A]/20"
                    />

                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                      AED
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min={PROPERTY_PRICE_MIN}
                  max={PROPERTY_PRICE_MAX}
                  step="10000"
                  value={propertyPrice}
                  onChange={(event) =>
                    updatePropertyPrice(Number(event.target.value))
                  }
                  className="mt-4 h-1.5 w-full cursor-pointer accent-[#A98C4F]"
                  aria-label="Purchase price"
                />

                <div className="mt-2 flex justify-between text-xs text-slate-400">
                  <span>{formatAED(PROPERTY_PRICE_MIN)} AED</span>
                  <span>{formatAED(PROPERTY_PRICE_MAX)} AED</span>
                </div>
              </div>

              <fieldset>
                <legend className="text-sm font-medium text-[#071B2D]">
                  Residency Status
                </legend>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {(
                    [
                      "UAE national",
                      "UAE resident",
                      "Non resident",
                    ] as ResidencyStatus[]
                  ).map((status) => {
                    const selected = residencyStatus === status;

                    return (
                      <button
                        key={status}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => updateResidencyStatus(status)}
                        className={
                          selected
                            ? "rounded-xl border border-[#071B2D] bg-[#071B2D] px-4 py-3 text-sm font-medium text-white transition-colors"
                            : "rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:border-[#A98C4F] hover:bg-[#FBFAF7]"
                        }
                      >
                        {status}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 rounded-xl bg-[#FBFAF7] px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-slate-500">
                      Minimum down payment
                    </span>

                    <span className="text-sm font-semibold text-[#071B2D]">
                      {minimumDownPaymentPercentage}%
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-4">
                    <span className="text-xs text-slate-500">Maximum loan</span>

                    <span className="text-sm font-semibold text-[#071B2D]">
                      {maximumLoanPercentage}%
                    </span>
                  </div>
                </div>
              </fieldset>

              <div>
                <div className="flex items-center justify-between gap-4">
                  <label
                    htmlFor="down-payment"
                    className="text-sm font-medium text-[#071B2D]"
                  >
                    Down payment
                  </label>

                  <div className="flex items-center gap-2">
                    <div className="relative w-32">
                      <input
                        id="down-payment"
                        type="number"
                        min={minimumDownPayment}
                        max={maximumDownPayment}
                        step="10000"
                        value={Math.round(downPayment)}
                        onChange={(event) =>
                          updateDownPayment(Number(event.target.value))
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-12 text-right text-sm font-semibold text-[#071B2D] outline-none transition-colors focus:border-[#A98C4F] focus:ring-2 focus:ring-[#D9BC7A]/20"
                      />

                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                        AED
                      </span>
                    </div>

                    <span className="min-w-12 text-right text-sm font-semibold text-[#A98C4F]">
                      {Math.round(downPaymentPercentage)}%
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min={minimumDownPayment}
                  max={maximumDownPayment}
                  step="10000"
                  value={downPayment}
                  onChange={(event) =>
                    updateDownPayment(Number(event.target.value))
                  }
                  className="mt-4 h-1.5 w-full cursor-pointer accent-[#A98C4F]"
                  aria-label="Down payment"
                />

                <div className="mt-2 flex justify-between text-xs text-slate-400">
                  <span>{formatAED(minimumDownPayment)} AED</span>

                  <span>{formatAED(maximumDownPayment)} AED</span>
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  Minimum required for {residencyStatus}:{" "}
                  {minimumDownPaymentPercentage}%
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between gap-4">
                  <label
                    htmlFor="loan-amount"
                    className="text-sm font-medium text-[#071B2D]"
                  >
                    Loan amount
                  </label>

                  <div className="flex items-center gap-2">
                    <div className="relative w-32">
                      <input
                        id="loan-amount"
                        type="number"
                        min="0"
                        max={propertyPrice - minimumDownPayment}
                        step="10000"
                        value={Math.round(loanAmount)}
                        onChange={(event) =>
                          updateLoanAmount(Number(event.target.value))
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-12 text-right text-sm font-semibold text-[#071B2D] outline-none transition-colors focus:border-[#A98C4F] focus:ring-2 focus:ring-[#D9BC7A]/20"
                      />

                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                        AED
                      </span>
                    </div>

                    <span className="min-w-12 text-right text-sm font-semibold text-[#A98C4F]">
                      {Math.round(loanPercentage)}%
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max={propertyPrice - minimumDownPayment}
                  step="10000"
                  value={loanAmount}
                  onChange={(event) =>
                    updateLoanAmount(Number(event.target.value))
                  }
                  className="mt-4 h-1.5 w-full cursor-pointer accent-[#A98C4F]"
                  aria-label="Loan amount"
                />

                <div className="mt-2 flex justify-between text-xs text-slate-400">
                  <span>0 AED</span>

                  <span>
                    {formatAED(propertyPrice - minimumDownPayment)} AED
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-4">
                  <label
                    htmlFor="loan-period"
                    className="text-sm font-medium text-[#071B2D]"
                  >
                    Loan Period
                  </label>

                  <div className="relative w-32">
                    <input
                      id="loan-period"
                      type="number"
                      min={LOAN_PERIOD_MIN}
                      max={LOAN_PERIOD_MAX}
                      step="1"
                      value={loanPeriod}
                      onChange={(event) =>
                        updateLoanPeriod(Number(event.target.value))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-16 text-right text-sm font-semibold text-[#071B2D] outline-none transition-colors focus:border-[#A98C4F] focus:ring-2 focus:ring-[#D9BC7A]/20"
                    />

                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                      years
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min={LOAN_PERIOD_MIN}
                  max={LOAN_PERIOD_MAX}
                  step="1"
                  value={loanPeriod}
                  onChange={(event) =>
                    updateLoanPeriod(Number(event.target.value))
                  }
                  className="mt-4 h-1.5 w-full cursor-pointer accent-[#A98C4F]"
                  aria-label="Loan period"
                />

                <div className="mt-2 flex justify-between text-xs text-slate-400">
                  <span>{LOAN_PERIOD_MIN} year</span>
                  <span>{LOAN_PERIOD_MAX} years</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-4">
                  <label
                    htmlFor="interest-rate"
                    className="text-sm font-medium text-[#071B2D]"
                  >
                    Interest rate
                  </label>

                  <div className="relative w-32">
                    <input
                      id="interest-rate"
                      type="number"
                      min={INTEREST_RATE_MIN}
                      max={INTEREST_RATE_MAX}
                      step="0.01"
                      value={interestRate}
                      onChange={(event) =>
                        updateInterestRate(Number(event.target.value))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-right text-sm font-semibold text-[#071B2D] outline-none transition-colors focus:border-[#A98C4F] focus:ring-2 focus:ring-[#D9BC7A]/20"
                    />

                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                      %
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min={INTEREST_RATE_MIN}
                  max={INTEREST_RATE_MAX}
                  step="0.01"
                  value={interestRate}
                  onChange={(event) =>
                    updateInterestRate(Number(event.target.value))
                  }
                  className="mt-4 h-1.5 w-full cursor-pointer accent-[#A98C4F]"
                  aria-label="Interest rate"
                />

                <div className="mt-2 flex justify-between text-xs text-slate-400">
                  <span>{INTEREST_RATE_MIN}%</span>
                  <span>{INTEREST_RATE_MAX}%</span>
                </div>
              </div>
            </div>

            <div className="mt-10 border-t border-slate-200 pt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A98C4F]">
                Estimate your monthly mortgage payment
              </p>

              <div className="mt-4 rounded-2xl bg-[#071B2D] p-6 text-white sm:p-7">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm text-white/60">Monthly payment</p>

                    <p
                      className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
                      aria-live="polite"
                    >
                      {formatAED(monthlyPayment)} AED
                    </p>
                  </div>

                  <p className="text-sm text-white/55">
                    with interest rate of{" "}
                    <span className="font-semibold text-white">
                      {interestRate}%
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-[#FBFAF7] p-4">
                  <p className="text-xs text-slate-500">Down payment</p>

                  <p className="mt-1 text-base font-semibold text-[#071B2D]">
                    {formatAED(downPayment)} AED
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-[#FBFAF7] p-4">
                  <p className="text-xs text-slate-500">Loan amount</p>

                  <p className="mt-1 text-base font-semibold text-[#071B2D]">
                    {formatAED(loanAmount)} AED
                  </p>
                </div>
              </div>

              <p className="mt-6 text-xs leading-5 text-slate-500">
                This calculator provides an illustrative estimate only. Actual
                mortgage repayments, rates, fees, eligibility, and financing
                terms may vary depending on the lender and your individual
                circumstances.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default MortgageCalculator;
