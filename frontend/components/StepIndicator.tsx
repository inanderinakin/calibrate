const STEPS = [
  { n: 1, label: "Upload CV" },
  { n: 2, label: "Select Role" },
  { n: 3, label: "Analyze" },
];

export default function StepIndicator({ activeStep }: { activeStep: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-center gap-4 md:gap-10">
      {STEPS.map((step, i) => {
        const isActive = step.n === activeStep;
        const isDone = step.n < activeStep;
        return (
          <div key={step.n} className="flex items-center gap-4 md:gap-10">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl border-2 border-[var(--accent)] ${
                  isActive || isDone
                    ? "bg-[var(--accent)] text-[var(--on-accent)]"
                    : "bg-transparent text-[var(--accent)]"
                }`}
              >
                {step.n}
              </div>
              <span
                className={`text-sm md:text-base ${
                  isActive ? "font-black" : "font-light"
                } text-[var(--accent)]`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-10 md:w-24 h-0.5 bg-[var(--accent)]" />
            )}
          </div>
        );
      })}
    </div>
  );
}
