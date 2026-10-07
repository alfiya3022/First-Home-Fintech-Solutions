import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";

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
  /*
   * --------------------------------------------
   * ACTUAL CALCULATOR VALUES
   * --------------------------------------------
   *
   * These are intentionally separate from the
   * visible input strings.
   */
  const [propertyPrice, setPropertyPrice] = useState(
    DEFAULT_VALUES.propertyPrice,
  );

  const [downPayment, setDownPayment] = useState(DEFAULT_VALUES.downPayment);

  const [loanPeriod, setLoanPeriod] = useState(DEFAULT_VALUES.loanPeriod);

  const [interestRate, setInterestRate] = useState(DEFAULT_VALUES.interestRate);

  const [residencyStatus, setResidencyStatus] = useState<ResidencyStatus>(
    DEFAULT_VALUES.residencyStatus,
  );

  /*
   * --------------------------------------------
   * VISIBLE INPUT VALUES
   * --------------------------------------------
   *
   * Empty string = show placeholder "0".
   */
  const [propertyPriceInput, setPropertyPriceInput] = useState("");

  const [downPaymentInput, setDownPaymentInput] = useState("");

  const [loanAmountInput, setLoanAmountInput] = useState("");

  const [loanPeriodInput, setLoanPeriodInput] = useState("");

  const [interestRateInput, setInterestRateInput] = useState("");

  /*
   * --------------------------------------------
   * VALIDATION
   * --------------------------------------------
   */
  const [propertyPriceError, setPropertyPriceError] = useState<string | null>(
    null,
  );

  const [downPaymentError, setDownPaymentError] = useState<string | null>(null);

  const [loanAmountError, setLoanAmountError] = useState<string | null>(null);

  const [loanPeriodError, setLoanPeriodError] = useState<string | null>(null);

  const [interestRateError, setInterestRateError] = useState<string | null>(
    null,
  );

  const [calculateError, setCalculateError] = useState<string | null>(null);

  /*
   * --------------------------------------------
   * RESULT STATE
   * --------------------------------------------
   */
  const [hasCalculated, setHasCalculated] = useState(false);

  /*
   * --------------------------------------------
   * DERIVED VALUES
   * --------------------------------------------
   */
  const minimumDownPayment = getMinimumDownPayment(
    propertyPrice,
    residencyStatus,
  );

  const maximumDownPayment = propertyPrice;

  const minimumDownPaymentPercentage =
    MIN_DOWN_PAYMENT_PERCENT[residencyStatus];

  const maximumLoanPercentage = 100 - minimumDownPaymentPercentage;

  const loanAmount = Math.max(propertyPrice - downPayment, 0);

  const maximumLoanAmount = Math.max(propertyPrice - minimumDownPayment, 0);

  const loanPercentage =
    propertyPrice > 0 ? (loanAmount / propertyPrice) * 100 : 0;

  const downPaymentPercentage =
    propertyPrice > 0 ? (downPayment / propertyPrice) * 100 : 0;

  const monthlyPayment = calculateMonthlyPayment(
    loanAmount,
    interestRate,
    loanPeriod,
  );

  /*
   * --------------------------------------------
   * HELPER
   * --------------------------------------------
   */
  function hideResult() {
    setHasCalculated(false);
    setCalculateError(null);
  }

  /*
   * --------------------------------------------
   * PURCHASE PRICE
   * --------------------------------------------
   */
  function handlePropertyPriceInputChange(value: string) {
    setPropertyPriceInput(value);
    hideResult();

    if (value.trim() === "") {
      setPropertyPriceError(null);
      return;
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      setPropertyPriceError("Please enter a valid purchase price.");
      return;
    }

    if (numericValue < PROPERTY_PRICE_MIN) {
      setPropertyPriceError(
        `Minimum purchase price is ${formatAED(PROPERTY_PRICE_MIN)} AED.`,
      );
      return;
    }

    if (numericValue > PROPERTY_PRICE_MAX) {
      setPropertyPriceError(
        `Maximum purchase price is ${formatAED(PROPERTY_PRICE_MAX)} AED.`,
      );
      return;
    }

    setPropertyPriceError(null);

    setPropertyPrice(numericValue);

    const nextMinimumDownPayment = getMinimumDownPayment(
      numericValue,
      residencyStatus,
    );

    const nextDownPayment = clamp(
      downPayment,
      nextMinimumDownPayment,
      numericValue,
    );

    setDownPayment(nextDownPayment);

    /*
     * If the user has already entered a down payment,
     * keep it synchronized with the new property value.
     */
    if (downPaymentInput.trim() !== "") {
      setDownPaymentInput(String(Math.round(nextDownPayment)));
      setDownPaymentError(null);
    }

    /*
     * Loan amount is derived from property price
     * and down payment, so clear its visible value
     * if it has not been manually entered yet.
     */
    if (loanAmountInput.trim() !== "") {
      const nextLoanAmount = numericValue - nextDownPayment;

      setLoanAmountInput(String(Math.round(nextLoanAmount)));
      setLoanAmountError(null);
    }
  }

  function handlePropertyPriceBlur() {
    if (propertyPriceInput.trim() === "") {
      setPropertyPriceError("Please enter a purchase price.");
      return;
    }

    const numericValue = Number(propertyPriceInput);

    if (
      !Number.isFinite(numericValue) ||
      numericValue < PROPERTY_PRICE_MIN ||
      numericValue > PROPERTY_PRICE_MAX
    ) {
      return;
    }

    setPropertyPriceInput(String(Math.round(numericValue)));
  }

  function handlePropertyPriceSlider(value: number) {
    const nextPropertyPrice = clamp(
      value,
      PROPERTY_PRICE_MIN,
      PROPERTY_PRICE_MAX,
    );

    setPropertyPrice(nextPropertyPrice);

    setPropertyPriceInput(String(Math.round(nextPropertyPrice)));

    setPropertyPriceError(null);
    hideResult();

    const nextMinimumDownPayment = getMinimumDownPayment(
      nextPropertyPrice,
      residencyStatus,
    );

    const nextDownPayment = clamp(
      downPayment,
      nextMinimumDownPayment,
      nextPropertyPrice,
    );

    setDownPayment(nextDownPayment);

    if (downPaymentInput.trim() !== "") {
      setDownPaymentInput(String(Math.round(nextDownPayment)));
      setDownPaymentError(null);
    }

    if (loanAmountInput.trim() !== "") {
      const nextLoanAmount = nextPropertyPrice - nextDownPayment;

      setLoanAmountInput(String(Math.round(nextLoanAmount)));
      setLoanAmountError(null);
    }
  }

  /*
   * --------------------------------------------
   * RESIDENCY
   * --------------------------------------------
   */
  function updateResidencyStatus(status: ResidencyStatus) {
    setResidencyStatus(status);
    hideResult();

    const nextMinimumDownPayment = getMinimumDownPayment(propertyPrice, status);

    setDownPayment(nextMinimumDownPayment);

    /*
     * Only update the visible field if the user
     * has already interacted with it.
     */
    if (downPaymentInput.trim() !== "") {
      setDownPaymentInput(String(Math.round(nextMinimumDownPayment)));
    }

    setDownPaymentError(null);

    const nextLoanAmount = propertyPrice - nextMinimumDownPayment;

    if (loanAmountInput.trim() !== "") {
      setLoanAmountInput(String(Math.round(nextLoanAmount)));
    }

    setLoanAmountError(null);
  }

  /*
   * --------------------------------------------
   * DOWN PAYMENT
   * --------------------------------------------
   */
  function handleDownPaymentInputChange(value: string) {
    setDownPaymentInput(value);
    hideResult();

    if (value.trim() === "") {
      setDownPaymentError(null);
      return;
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      setDownPaymentError("Please enter a valid down payment.");
      return;
    }

    if (numericValue < minimumDownPayment) {
      setDownPaymentError(
        `Minimum down payment is ${formatAED(
          minimumDownPayment,
        )} AED (${minimumDownPaymentPercentage}%).`,
      );
      return;
    }

    if (numericValue > maximumDownPayment) {
      setDownPaymentError(
        `Down payment cannot exceed ${formatAED(maximumDownPayment)} AED.`,
      );
      return;
    }

    setDownPaymentError(null);
    setDownPayment(numericValue);

    /*
     * If loan amount has already been entered,
     * keep it synchronized.
     */
    if (loanAmountInput.trim() !== "") {
      const nextLoanAmount = propertyPrice - numericValue;

      setLoanAmountInput(String(Math.round(nextLoanAmount)));

      setLoanAmountError(null);
    }
  }

  function handleDownPaymentBlur() {
    if (downPaymentInput.trim() === "") {
      setDownPaymentError("Please enter a down payment.");
      return;
    }

    const numericValue = Number(downPaymentInput);

    if (
      !Number.isFinite(numericValue) ||
      numericValue < minimumDownPayment ||
      numericValue > maximumDownPayment
    ) {
      return;
    }

    setDownPaymentInput(String(Math.round(numericValue)));
  }

  function handleDownPaymentSlider(value: number) {
    const nextDownPayment = clamp(
      value,
      minimumDownPayment,
      maximumDownPayment,
    );

    setDownPayment(nextDownPayment);

    setDownPaymentInput(String(Math.round(nextDownPayment)));

    setDownPaymentError(null);
    hideResult();

    const nextLoanAmount = propertyPrice - nextDownPayment;

    if (loanAmountInput.trim() !== "") {
      setLoanAmountInput(String(Math.round(nextLoanAmount)));
      setLoanAmountError(null);
    }
  }

  /*
   * --------------------------------------------
   * LOAN AMOUNT
   * --------------------------------------------
   */
  function handleLoanAmountInputChange(value: string) {
    setLoanAmountInput(value);
    hideResult();

    if (value.trim() === "") {
      setLoanAmountError(null);
      return;
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      setLoanAmountError("Please enter a valid loan amount.");
      return;
    }

    if (numericValue < 0) {
      setLoanAmountError("Loan amount cannot be negative.");
      return;
    }

    if (numericValue > maximumLoanAmount) {
      setLoanAmountError(
        `Maximum loan amount is ${formatAED(
          maximumLoanAmount,
        )} AED (${maximumLoanPercentage}%).`,
      );
      return;
    }

    setLoanAmountError(null);

    const nextDownPayment = propertyPrice - numericValue;

    setLoanAmountInput(value);
    setDownPayment(nextDownPayment);

    if (downPaymentInput.trim() !== "") {
      setDownPaymentInput(String(Math.round(nextDownPayment)));
    }

    setDownPaymentError(null);
  }

  function handleLoanAmountBlur() {
    if (loanAmountInput.trim() === "") {
      setLoanAmountError("Please enter a loan amount.");
      return;
    }

    const numericValue = Number(loanAmountInput);

    if (
      !Number.isFinite(numericValue) ||
      numericValue < 0 ||
      numericValue > maximumLoanAmount
    ) {
      return;
    }

    setLoanAmountInput(String(Math.round(numericValue)));
  }

  function handleLoanAmountSlider(value: number) {
    const nextLoanAmount = clamp(value, 0, maximumLoanAmount);

    const nextDownPayment = propertyPrice - nextLoanAmount;

    setDownPayment(nextDownPayment);

    setLoanAmountInput(String(Math.round(nextLoanAmount)));

    setLoanAmountError(null);
    hideResult();

    if (downPaymentInput.trim() !== "") {
      setDownPaymentInput(String(Math.round(nextDownPayment)));
    }

    setDownPaymentError(null);
  }

  /*
   * --------------------------------------------
   * LOAN PERIOD
   * --------------------------------------------
   */
  function handleLoanPeriodInputChange(value: string) {
    setLoanPeriodInput(value);
    hideResult();

    if (value.trim() === "") {
      setLoanPeriodError(null);
      return;
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      setLoanPeriodError("Please enter a valid loan period.");
      return;
    }

    if (numericValue < LOAN_PERIOD_MIN) {
      setLoanPeriodError(`Minimum loan period is ${LOAN_PERIOD_MIN} year.`);
      return;
    }

    if (numericValue > LOAN_PERIOD_MAX) {
      setLoanPeriodError(`Maximum loan period is ${LOAN_PERIOD_MAX} years.`);
      return;
    }

    setLoanPeriodError(null);
    setLoanPeriod(numericValue);
  }

  function handleLoanPeriodBlur() {
    if (loanPeriodInput.trim() === "") {
      setLoanPeriodError("Please enter a loan period.");
      return;
    }

    const numericValue = Number(loanPeriodInput);

    if (
      !Number.isFinite(numericValue) ||
      numericValue < LOAN_PERIOD_MIN ||
      numericValue > LOAN_PERIOD_MAX
    ) {
      return;
    }

    setLoanPeriodInput(String(numericValue));
  }

  function handleLoanPeriodSlider(value: number) {
    const nextLoanPeriod = clamp(value, LOAN_PERIOD_MIN, LOAN_PERIOD_MAX);

    setLoanPeriod(nextLoanPeriod);

    setLoanPeriodInput(String(nextLoanPeriod));

    setLoanPeriodError(null);
    hideResult();
  }

  /*
   * --------------------------------------------
   * INTEREST RATE
   * --------------------------------------------
   */
  function handleInterestRateInputChange(value: string) {
    setInterestRateInput(value);
    hideResult();

    if (value.trim() === "") {
      setInterestRateError(null);
      return;
    }

    /*
     * Allow:
     * 4
     * 4.
     * 4.2
     * 4.25
     */
    if (!/^\d*\.?\d*$/.test(value)) {
      setInterestRateError("Please enter a valid interest rate.");
      return;
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      setInterestRateError("Please enter a valid interest rate.");
      return;
    }

    if (numericValue < INTEREST_RATE_MIN) {
      setInterestRateError(`Minimum interest rate is ${INTEREST_RATE_MIN}%.`);
      return;
    }

    if (numericValue > INTEREST_RATE_MAX) {
      setInterestRateError(`Maximum interest rate is ${INTEREST_RATE_MAX}%.`);
      return;
    }

    setInterestRateError(null);
    setInterestRate(numericValue);
  }

  function handleInterestRateBlur() {
    if (interestRateInput.trim() === "") {
      setInterestRateError("Please enter an interest rate.");
      return;
    }

    const numericValue = Number(interestRateInput);

    if (
      !Number.isFinite(numericValue) ||
      numericValue < INTEREST_RATE_MIN ||
      numericValue > INTEREST_RATE_MAX
    ) {
      return;
    }

    setInterestRateInput(String(numericValue));
  }

  function handleInterestRateSlider(value: number) {
    const nextInterestRate = clamp(value, INTEREST_RATE_MIN, INTEREST_RATE_MAX);

    setInterestRate(nextInterestRate);

    setInterestRateInput(String(nextInterestRate));

    setInterestRateError(null);
    hideResult();
  }

  /*
   * --------------------------------------------
   * CALCULATE
   * --------------------------------------------
   */
  function handleCalculate() {
    let hasError = false;

    /*
     * PURCHASE PRICE
     */
    if (propertyPriceInput.trim() === "") {
      setPropertyPriceError("Please enter a purchase price.");
      hasError = true;
    } else {
      const value = Number(propertyPriceInput);

      if (
        !Number.isFinite(value) ||
        value < PROPERTY_PRICE_MIN ||
        value > PROPERTY_PRICE_MAX
      ) {
        hasError = true;
      }
    }

    /*
     * DOWN PAYMENT
     */
    if (downPaymentInput.trim() === "") {
      setDownPaymentError("Please enter a down payment.");
      hasError = true;
    } else {
      const value = Number(downPaymentInput);

      if (
        !Number.isFinite(value) ||
        value < minimumDownPayment ||
        value > maximumDownPayment
      ) {
        hasError = true;
      }
    }

    /*
     * LOAN AMOUNT
     */
    if (loanAmountInput.trim() === "") {
      setLoanAmountError("Please enter a loan amount.");
      hasError = true;
    } else {
      const value = Number(loanAmountInput);

      if (!Number.isFinite(value) || value < 0 || value > maximumLoanAmount) {
        hasError = true;
      }
    }

    /*
     * LOAN PERIOD
     */
    if (loanPeriodInput.trim() === "") {
      setLoanPeriodError("Please enter a loan period.");
      hasError = true;
    } else {
      const value = Number(loanPeriodInput);

      if (
        !Number.isFinite(value) ||
        value < LOAN_PERIOD_MIN ||
        value > LOAN_PERIOD_MAX
      ) {
        hasError = true;
      }
    }

    /*
     * INTEREST RATE
     */
    if (interestRateInput.trim() === "") {
      setInterestRateError("Please enter an interest rate.");
      hasError = true;
    } else {
      const value = Number(interestRateInput);

      if (
        !Number.isFinite(value) ||
        value < INTEREST_RATE_MIN ||
        value > INTEREST_RATE_MAX
      ) {
        hasError = true;
      }
    }

    if (hasError) {
      setHasCalculated(false);
      setCalculateError(
        "Please correct the highlighted fields before calculating.",
      );
      return;
    }

    /*
     * All inputs are valid.
     */
    setCalculateError(null);
    setHasCalculated(true);
  }

  /*
   * --------------------------------------------
   * RESET
   * --------------------------------------------
   */
  function resetCalculator() {
    /*
     * Restore internal calculator values.
     */
    setPropertyPrice(DEFAULT_VALUES.propertyPrice);

    setDownPayment(DEFAULT_VALUES.downPayment);

    setLoanPeriod(DEFAULT_VALUES.loanPeriod);

    setInterestRate(DEFAULT_VALUES.interestRate);

    setResidencyStatus(DEFAULT_VALUES.residencyStatus);

    /*
     * Clear visible inputs so the placeholder "0"
     * appears again.
     */
    setPropertyPriceInput("");
    setDownPaymentInput("");
    setLoanAmountInput("");
    setLoanPeriodInput("");
    setInterestRateInput("");

    /*
     * Clear validation.
     */
    setPropertyPriceError(null);
    setDownPaymentError(null);
    setLoanAmountError(null);
    setLoanPeriodError(null);
    setInterestRateError(null);
    setCalculateError(null);

    /*
     * Hide result.
     */
    setHasCalculated(false);
  }

  return (
    <section id="calculator" className="bg-[#071B2D] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-start gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          {/* LEFT SIDE */}
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

          {/* CALCULATOR CARD */}
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
              {/* PURCHASE PRICE */}
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
                      value={propertyPriceInput}
                      placeholder="0"
                      onChange={(event) =>
                        handlePropertyPriceInputChange(event.target.value)
                      }
                      onBlur={handlePropertyPriceBlur}
                      className={`w-full rounded-lg border bg-white py-2 pl-3 pr-12 text-right text-sm font-semibold outline-none transition-colors ${
                        propertyPriceError
                          ? "border-red-400 text-[#071B2D] focus:border-red-500 focus:ring-2 focus:ring-red-200"
                          : "border-slate-200 text-[#071B2D] focus:border-[#A98C4F] focus:ring-2 focus:ring-[#D9BC7A]/20"
                      } placeholder:text-slate-300`}
                    />

                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                      AED
                    </span>
                  </div>
                </div>

                {propertyPriceError && (
                  <p className="mt-2 text-right text-xs font-medium text-red-500">
                    {propertyPriceError}
                  </p>
                )}

                <input
                  type="range"
                  min={PROPERTY_PRICE_MIN}
                  max={PROPERTY_PRICE_MAX}
                  step="10000"
                  value={propertyPrice}
                  onChange={(event) =>
                    handlePropertyPriceSlider(Number(event.target.value))
                  }
                  className="mt-4 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-300 accent-[#A98C4F]"
                  aria-label="Purchase price"
                />

                <div className="mt-2 flex justify-between text-xs text-slate-400">
                  <span>{formatAED(PROPERTY_PRICE_MIN)} AED</span>

                  <span>{formatAED(PROPERTY_PRICE_MAX)} AED</span>
                </div>
              </div>

              {/* RESIDENCY STATUS */}
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

              {/* DOWN PAYMENT */}
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
                        value={downPaymentInput}
                        placeholder="0"
                        onChange={(event) =>
                          handleDownPaymentInputChange(event.target.value)
                        }
                        onBlur={handleDownPaymentBlur}
                        className={`w-full rounded-lg border bg-white py-2 pl-3 pr-12 text-right text-sm font-semibold outline-none transition-colors ${
                          downPaymentError
                            ? "border-red-400 text-[#071B2D] focus:border-red-500 focus:ring-2 focus:ring-red-200"
                            : "border-slate-200 text-[#071B2D] focus:border-[#A98C4F] focus:ring-2 focus:ring-[#D9BC7A]/20"
                        } placeholder:text-slate-300`}
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

                {downPaymentError && (
                  <p className="mt-2 text-right text-xs font-medium text-red-500">
                    {downPaymentError}
                  </p>
                )}

                <input
                  type="range"
                  min={minimumDownPayment}
                  max={maximumDownPayment}
                  step="10000"
                  value={downPayment}
                  onChange={(event) =>
                    handleDownPaymentSlider(Number(event.target.value))
                  }
                  className="mt-4 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-300 accent-[#A98C4F]"
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

              {/* LOAN AMOUNT */}
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
                        max={maximumLoanAmount}
                        step="10000"
                        value={loanAmountInput}
                        placeholder="0"
                        onChange={(event) =>
                          handleLoanAmountInputChange(event.target.value)
                        }
                        onBlur={handleLoanAmountBlur}
                        className={`w-full rounded-lg border bg-white py-2 pl-3 pr-12 text-right text-sm font-semibold outline-none transition-colors ${
                          loanAmountError
                            ? "border-red-400 text-[#071B2D] focus:border-red-500 focus:ring-2 focus:ring-red-200"
                            : "border-slate-200 text-[#071B2D] focus:border-[#A98C4F] focus:ring-2 focus:ring-[#D9BC7A]/20"
                        } placeholder:text-slate-300`}
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

                {loanAmountError && (
                  <p className="mt-2 text-right text-xs font-medium text-red-500">
                    {loanAmountError}
                  </p>
                )}

                <input
                  type="range"
                  min="0"
                  max={maximumLoanAmount}
                  step="10000"
                  value={loanAmount}
                  onChange={(event) =>
                    handleLoanAmountSlider(Number(event.target.value))
                  }
                  className="mt-4 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-300 accent-[#A98C4F]"
                  aria-label="Loan amount"
                />

                <div className="mt-2 flex justify-between text-xs text-slate-400">
                  <span>0 AED</span>

                  <span>{formatAED(maximumLoanAmount)} AED</span>
                </div>
              </div>

              {/* LOAN PERIOD */}
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
                      value={loanPeriodInput}
                      placeholder="0"
                      onChange={(event) =>
                        handleLoanPeriodInputChange(event.target.value)
                      }
                      onBlur={handleLoanPeriodBlur}
                      className={`w-full rounded-lg border bg-white py-2 pl-3 pr-16 text-right text-sm font-semibold outline-none transition-colors ${
                        loanPeriodError
                          ? "border-red-400 text-[#071B2D] focus:border-red-500 focus:ring-2 focus:ring-red-200"
                          : "border-slate-200 text-[#071B2D] focus:border-[#A98C4F] focus:ring-2 focus:ring-[#D9BC7A]/20"
                      } placeholder:text-slate-300`}
                    />

                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                      years
                    </span>
                  </div>
                </div>

                {loanPeriodError && (
                  <p className="mt-2 text-right text-xs font-medium text-red-500">
                    {loanPeriodError}
                  </p>
                )}

                <input
                  type="range"
                  min={LOAN_PERIOD_MIN}
                  max={LOAN_PERIOD_MAX}
                  step="1"
                  value={loanPeriod}
                  onChange={(event) =>
                    handleLoanPeriodSlider(Number(event.target.value))
                  }
                  className="mt-4 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-300 accent-[#A98C4F]"
                  aria-label="Loan period"
                />

                <div className="mt-2 flex justify-between text-xs text-slate-400">
                  <span>{LOAN_PERIOD_MIN} year</span>

                  <span>{LOAN_PERIOD_MAX} years</span>
                </div>
              </div>

              {/* INTEREST RATE */}
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
                      value={interestRateInput}
                      placeholder="0"
                      onChange={(event) =>
                        handleInterestRateInputChange(event.target.value)
                      }
                      onBlur={handleInterestRateBlur}
                      className={`w-full rounded-lg border bg-white py-2 pl-3 pr-8 text-right text-sm font-semibold outline-none transition-colors ${
                        interestRateError
                          ? "border-red-400 text-[#071B2D] focus:border-red-500 focus:ring-2 focus:ring-red-200"
                          : "border-slate-200 text-[#071B2D] focus:border-[#A98C4F] focus:ring-2 focus:ring-[#D9BC7A]/20"
                      } placeholder:text-slate-300`}
                    />

                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                      %
                    </span>
                  </div>
                </div>

                {interestRateError && (
                  <p className="mt-2 text-right text-xs font-medium text-red-500">
                    {interestRateError}
                  </p>
                )}

                <input
                  type="range"
                  min={INTEREST_RATE_MIN}
                  max={INTEREST_RATE_MAX}
                  step="0.01"
                  value={interestRate}
                  onChange={(event) =>
                    handleInterestRateSlider(Number(event.target.value))
                  }
                  className="mt-4 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-300 accent-[#A98C4F]"
                  aria-label="Interest rate"
                />

                <div className="mt-2 flex justify-between text-xs text-slate-400">
                  <span>{INTEREST_RATE_MIN}%</span>

                  <span>{INTEREST_RATE_MAX}%</span>
                </div>
              </div>
            </div>

            {/* CALCULATE ACTION */}
            <div className="mt-10 border-t border-slate-200 pt-8">
              {calculateError && (
                <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {calculateError}
                </p>
              )}

              <button
                type="button"
                onClick={handleCalculate}
                className="w-full rounded-xl bg-[#D9BC7A] px-6 py-3.5 text-sm font-semibold text-[#071B2D] transition-colors hover:bg-[#E3CA96]"
              >
                Calculate Mortgage
              </button>
            </div>

            {/* RESULT */}
            {hasCalculated && (
              <div className="mt-8 border-t border-slate-200 pt-8">
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
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default MortgageCalculator;
