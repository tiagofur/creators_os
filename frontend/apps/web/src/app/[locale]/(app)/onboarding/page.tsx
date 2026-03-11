'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@ordo/hooks';
import { OnboardingProgress } from './_components/onboarding-progress';
import { OnboardingStepWelcome } from './_components/onboarding-step-welcome';
import { OnboardingStepWorkspace } from './_components/onboarding-step-workspace';
import { OnboardingStepPlan } from './_components/onboarding-step-plan';

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const { user } = useAuth();
  const [step, setStep] = useState(1);

  function handleNext() {
    if (step < TOTAL_STEPS) setStep(step + 1);
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
  }

  function handlePlanSelect(_plan: string) {
    router.push(`/${locale}/dashboard`);
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <OnboardingProgress currentStep={step} totalSteps={TOTAL_STEPS} />
        </div>

        {step === 1 && (
          <OnboardingStepWelcome onNext={handleNext} userName={user?.name} />
        )}
        {step === 2 && (
          <OnboardingStepWorkspace onBack={handleBack} />
        )}
        {step === 3 && (
          <OnboardingStepPlan onSelect={handlePlanSelect} onBack={handleBack} />
        )}
      </div>
    </div>
  );
}
