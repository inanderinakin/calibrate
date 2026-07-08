const steps = [
  { number: 1, label: "Upload CV" },
  { number: 2, label: "Select Role" },
  { number: 3, label: "Analyze" },
];

export default function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-10 mb-6">
      {steps.map((step) => (
        <div key={step.number} className="flex items-center gap-3">
          <div
            className={`w-[53px] h-[53px] rounded-full flex items-center justify-center font-bold text-[35px]
              ${
                step.number === currentStep
                  ? "bg-primary-light dark:bg-accent-dark text-cream"
                  : "bg-[#d8a7a7]/30 dark:bg-cream/10 text-primary-light dark:text-accent-dark"
              }`}
          >
            {step.number}
          </div>
          <span className="font-bold text-[23px] text-primary-light dark:text-accent-dark">
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}