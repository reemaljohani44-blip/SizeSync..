import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  name: string;
  description?: string;
}

interface ProgressStepperProps {
  steps: Step[];
  currentStep: number;
  variant?: "light" | "dark"; // "light" for dark backgrounds, "dark" for light backgrounds
}

export function ProgressStepper({ steps, currentStep, variant = "dark" }: ProgressStepperProps) {
  const isLight = variant === "light";
  
  return (
    <div className="w-full py-6 md:py-8" data-testid="progress-stepper">
      {/* Desktop: Horizontal */}
      <div className="hidden md:flex items-center justify-center gap-3">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              {/* Circle */}
              <div
                className={cn(
                  "w-16 h-16 rounded-full border-[3px] flex items-center justify-center transition-all duration-300 shadow-lg",
                  isLight ? (
                    // Dark variant for light backgrounds
                    index < currentStep
                      ? "bg-purple-600 border-purple-600 text-white shadow-purple-500/50"
                      : index === currentStep
                      ? "border-purple-600 bg-purple-100 scale-110 text-purple-700 shadow-purple-500/50 ring-4 ring-purple-200/50"
                      : "border-gray-300 bg-white text-gray-400 shadow-gray-200/50"
                  ) : (
                    // Light variant for dark backgrounds
                    index < currentStep
                      ? "bg-white border-white text-purple-600 shadow-white/30"
                      : index === currentStep
                      ? "border-white bg-white/90 scale-110 text-purple-700 shadow-white/50 ring-4 ring-white/40"
                      : "border-white/40 bg-white/10 text-white/70 shadow-white/10"
                  )
                )}
                data-testid={`step-${step.id}-indicator`}
              >
                {index < currentStep ? (
                  <Check className="w-7 h-7 stroke-[3]" />
                ) : (
                  <span className="font-bold text-lg">{step.id}</span>
                )}
              </div>
              {/* Label */}
              <span
                className={cn(
                  "mt-3 text-base font-semibold text-center transition-all duration-300 break-words max-w-[120px]",
                  isLight ? (
                    index < currentStep 
                      ? "text-purple-700 font-bold" 
                      : index === currentStep 
                      ? "text-purple-700 font-extrabold text-lg" 
                      : "text-gray-500"
                  ) : (
                    index < currentStep 
                      ? "text-white font-bold" 
                      : index === currentStep 
                      ? "text-white font-extrabold text-lg" 
                      : "text-white/70"
                  )
                )}
              >
                {step.name}
              </span>
            </div>
            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-28 h-1 mx-3 mb-10 rounded-full transition-all duration-300",
                  isLight ? (
                    index < currentStep ? "bg-purple-600 shadow-sm shadow-purple-500/30" : "bg-gray-300"
                  ) : (
                    index < currentStep ? "bg-white shadow-sm shadow-white/30" : "bg-white/30"
                  )
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Mobile: Vertical */}
      <div className="md:hidden flex flex-col gap-5 px-2">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-4">
            {/* Circle and line */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-14 h-14 rounded-full border-[3px] flex items-center justify-center shrink-0 transition-all duration-300 shadow-lg",
                  isLight ? (
                    index < currentStep
                      ? "bg-purple-600 border-purple-600 text-white shadow-purple-500/50"
                      : index === currentStep
                      ? "border-purple-600 bg-purple-100 scale-110 text-purple-700 shadow-purple-500/50 ring-2 ring-purple-200/50"
                      : "border-gray-300 bg-white text-gray-400 shadow-gray-200/50"
                  ) : (
                    index < currentStep
                      ? "bg-white border-white text-purple-600 shadow-white/30"
                      : index === currentStep
                      ? "border-white bg-white/90 scale-110 text-purple-700 shadow-white/50 ring-2 ring-white/40"
                      : "border-white/40 bg-white/10 text-white/70 shadow-white/10"
                  )
                )}
              >
                {index < currentStep ? (
                  <Check className="w-6 h-6 stroke-[3]" />
                ) : (
                  <span className="text-base font-bold">
                    {step.id}
                  </span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-1 h-14 mt-2 rounded-full transition-all duration-300",
                    isLight ? (
                      index < currentStep ? "bg-purple-600 shadow-sm shadow-purple-500/30" : "bg-gray-300"
                    ) : (
                      index < currentStep ? "bg-white shadow-sm shadow-white/30" : "bg-white/30"
                    )
                  )}
                />
              )}
            </div>
            {/* Text */}
            <div className="flex-1 pt-2 min-w-0">
              <p
                className={cn(
                  "font-semibold transition-all duration-300 text-base break-words",
                  isLight ? (
                    index < currentStep 
                      ? "text-purple-700 font-bold" 
                      : index === currentStep 
                      ? "text-purple-700 font-extrabold text-lg" 
                      : "text-gray-500"
                  ) : (
                    index < currentStep 
                      ? "text-white font-bold" 
                      : index === currentStep 
                      ? "text-white font-extrabold text-lg" 
                      : "text-white/70"
                  )
                )}
              >
                {step.name}
              </p>
              {step.description && (
                <p className={cn(
                  "text-sm mt-1.5 font-medium",
                  isLight ? "text-gray-600" : "text-white/50"
                )}>
                  {step.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
