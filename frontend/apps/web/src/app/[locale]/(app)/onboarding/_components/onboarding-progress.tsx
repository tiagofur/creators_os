import { cn } from '@ordo/core';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  return (
    <div className="flex items-center justify-center gap-2" aria-label={`Step ${currentStep} of ${totalSteps}`}>
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={cn(
            'h-2 rounded-full transition-all duration-300',
            i + 1 === currentStep
              ? 'w-6 bg-primary'
              : i + 1 < currentStep
              ? 'w-2 bg-primary/60'
              : 'w-2 bg-muted',
          )}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
