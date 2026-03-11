import { CreateWorkspaceForm } from '@/app/[locale]/(app)/workspaces/new/_components/create-workspace-form';
import { Button } from '@ordo/ui';

interface OnboardingStepWorkspaceProps {
  onBack: () => void;
}

export function OnboardingStepWorkspace({ onBack }: OnboardingStepWorkspaceProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Set up your workspace</h2>
        <p className="mt-2 text-muted-foreground">
          Your workspace is where you organize all your creative work.
        </p>
      </div>

      <CreateWorkspaceForm />

      <Button variant="ghost" onClick={onBack}>
        Back
      </Button>
    </div>
  );
}
