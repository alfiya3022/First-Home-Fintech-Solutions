import { ArrowRight, Check, RotateCcw } from "lucide-react";
import { useState } from "react";

const DEFAULT_VALUES = {
  propertyPrice: 1000000,
  downPayment: 200000,
  interestRate: 4.5,
  loanTenure: 20,
};

function formatAED(value: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(value);
}

function calculateMonthlyPayment(
  loanAmount: number,
  annualInterestRate: number,
  loanTenureYears: number,
) {
  const numberOfPayments = loanTenureYears * 12;

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

function MortgageCalculator() {
  const [propertyPrice, setPropertyPrice] = useState<number | null>(
    DEFAULT_VALUES.propertyPrice,
  );

  const [downPayment, setDownPayment] = useState<number | null>(
    DEFAULT_VALUES.downPayment,
  );

  const [interestRate, setInterestRate] = useState<number | null>(
    DEFAULT_VALUES.interestRate,
  );

  const [loanTenure, setLoanTenure] = useState<number | null>(
    DEFAULT_VALUES.loanTenure,
  );

  const [loanAmount, setLoanAmount] = useState<number | null>(null);
  const [monthlyPayment, setMonthlyPayment] = useState<number | null>(null);
  const [error, setError] = useState("");

  function handleCalculate() {
    setError("");

    if (propertyPrice === null || propertyPrice <= 0) {
      setError("Please enter a valid property price.");
      return;
    }

    if (downPayment === null || downPayment < 0) {
      setError("Please enter a valid down payment.");
      return;
    }

    if (downPayment >= propertyPrice) {
      setError("Down payment must be less than the property price.");
      return;
    }

    if (interestRate === null || interestRate < 0 || interestRate > 20) {
      setError("Interest rate must be between 0% and 20%.");
      return;
    }

    if (loanTenure === null || loanTenure < 1 || loanTenure > 40) {
      setError("Loan tenure must be between 1 and 40 years.");
      return;
    }

    const calculatedLoanAmount = propertyPrice - downPayment;

    const calculatedMonthlyPayment = calculateMonthlyPayment(
      calculatedLoanAmount,
      interestRate,
      loanTenure,
    );

    setLoanAmount(calculatedLoanAmount);
    setMonthlyPayment(calculatedMonthlyPayment);
  }

  function handleReset() {
    setPropertyPrice(null);
    setDownPayment(null);
    setInterestRate(null);
    setLoanTenure(null);

    setLoanAmount(null);
    setMonthlyPayment(null);
    setError("");
  }

  return (
    <section id="calculator" className="bg-[#071B2D] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-start gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          {/* Left Content */}
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

          {/* Calculator Card */}
          <div className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.15)] sm:p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Inputs */}
              <div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A98C4F]">
                    Your Details
                  </p>

                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#071B2D]">
                    Mortgage Inputs
                  </h3>
                </div>

                <div className="mt-8 space-y-6">
                  {/* Property Price */}
                  <div>
                    <label
                      htmlFor="property-price"
                      className="block text-sm font-medium text-[#071B2D]"
                    >
                      Property Price
                    </label>

                    <div className="relative mt-2">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                        AED
                      </span>

                      <input
                        id="property-price"
                        type="number"
                        min="1"
                        step="10000"
                        value={propertyPrice ?? ""}
                        onChange={(event) =>
                          setPropertyPrice(
                            event.target.value === ""
                              ? null
                              : Number(event.target.value),
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-14 pr-4 text-sm text-[#071B2D] outline-none transition-colors focus:border-[#A98C4F] focus:ring-2 focus:ring-[#D9BC7A]/20"
                      />
                    </div>
                  </div>

                  {/* Down Payment */}
                  <div>
                    <label
                      htmlFor="down-payment"
                      className="block text-sm font-medium text-[#071B2D]"
                    >
                      Down Payment
                    </label>

                    <div className="relative mt-2">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                        AED
                      </span>

                      <input
                        id="down-payment"
                        type="number"
                        min="0"
                        step="10000"
                        value={downPayment ?? ""}
                        onChange={(event) =>
                          setDownPayment(
                            event.target.value === ""
                              ? null
                              : Number(event.target.value),
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-14 pr-4 text-sm text-[#071B2D] outline-none transition-colors focus:border-[#A98C4F] focus:ring-2 focus:ring-[#D9BC7A]/20"
                      />
                    </div>
                  </div>

                  {/* Interest Rate */}
                  <div>
                    <label
                      htmlFor="interest-rate"
                      className="block text-sm font-medium text-[#071B2D]"
                    >
                      Interest Rate
                    </label>

                    <div className="relative mt-2">
                      <input
                        id="interest-rate"
                        type="number"
                        min="0"
                        max="20"
                        step="0.1"
                        value={interestRate ?? ""}
                        onChange={(event) =>
                          setInterestRate(
                            event.target.value === ""
                              ? null
                              : Number(event.target.value),
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pr-12 text-sm text-[#071B2D] outline-none transition-colors focus:border-[#A98C4F] focus:ring-2 focus:ring-[#D9BC7A]/20"
                      />

                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                        %
                      </span>
                    </div>
                  </div>

                  {/* Loan Tenure */}
                  <div>
                    <label
                      htmlFor="loan-tenure"
                      className="block text-sm font-medium text-[#071B2D]"
                    >
                      Loan Tenure
                    </label>

                    <div className="relative mt-2">
                      <input
                        id="loan-tenure"
                        type="number"
                        min="1"
                        max="40"
                        step="1"
                        value={loanTenure ?? ""}
                        onChange={(event) =>
                          setLoanTenure(
                            event.target.value === ""
                              ? null
                              : Number(event.target.value),
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pr-16 text-sm text-[#071B2D] outline-none transition-colors focus:border-[#A98C4F] focus:ring-2 focus:ring-[#D9BC7A]/20"
                      />

                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                        years
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleCalculate}
                    className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#071B2D] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#102B43]"
                  >
                    Calculate
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3.5 text-sm font-semibold text-[#071B2D] transition-colors hover:border-[#A98C4F] hover:bg-[#FBFAF7]"
                  >
                    <RotateCcw className="size-4" aria-hidden="true" />
                    Reset
                  </button>
                </div>

                {error && (
                  <p
                    role="alert"
                    className="mt-4 text-sm font-medium text-red-600"
                  >
                    {error}
                  </p>
                )}
              </div>

              {/* Results */}
              <div className="flex flex-col rounded-2xl bg-[#FBFAF7] p-6 sm:p-7">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A98C4F]">
                    Your Estimate
                  </p>

                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#071B2D]">
                    Estimated Repayment
                  </h3>
                </div>

                <div className="mt-8 rounded-2xl bg-[#071B2D] p-6 text-white">
                  <p className="text-sm text-white/60">
                    Estimated Monthly Repayment
                  </p>

                  <p
                    className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
                    aria-live="polite"
                  >
                    {monthlyPayment !== null ? formatAED(monthlyPayment) : "—"}
                  </p>

                  <p className="mt-2 text-xs text-white/45">
                    Calculated estimate based on the values entered above.
                  </p>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <span className="text-sm text-slate-500">
                      Property Price
                    </span>

                    <span className="text-sm font-semibold text-[#071B2D]">
                      {propertyPrice !== null ? formatAED(propertyPrice) : "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <span className="text-sm text-slate-500">Down Payment</span>

                    <span className="text-sm font-semibold text-[#071B2D]">
                      {downPayment !== null ? formatAED(downPayment) : "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <span className="text-sm text-slate-500">
                      Estimated Loan Amount
                    </span>

                    <span className="text-sm font-semibold text-[#071B2D]">
                      {loanAmount !== null ? formatAED(loanAmount) : "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-500">
                      Interest Rate
                    </span>

                    <span className="text-sm font-semibold text-[#071B2D]">
                      {interestRate !== null ? `${interestRate}%` : "—"}
                    </span>
                  </div>
                </div>

                <p className="mt-auto pt-8 text-xs leading-5 text-slate-500">
                  This calculator provides an illustrative estimate only. Actual
                  mortgage repayments, rates, fees, eligibility, and financing
                  terms may vary depending on the lender and your individual
                  circumstances.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default MortgageCalculator;
