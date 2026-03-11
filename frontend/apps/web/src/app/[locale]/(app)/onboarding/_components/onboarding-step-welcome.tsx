import { Button } from '@ordo/ui';
import { Sparkles } from 'lucide-react';

interface OnboardingStepWelcomeProps {
  onNext: () => void;
  userName?: string;
}

export function OnboardingStepWelcome({ onNext, userName }: OnboardingStepWelcomeProps) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>

      <div>
        <h1 className="text-3xl font-bold">
          Welcome{userName ? `, ${userName}` : ''}!
        </h1>
        <p className="mt-2 text-muted-foreground">
          {"You're about to set up your Ordo Creator OS. It only takes a minute."}
        </p>
      </div>

      <Button onClick={onNext} size="lg" className="px-8">
        Get started
      </Button>
    </div>
  );
}
