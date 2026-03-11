import { ScriptEditor } from '@/components/ai-studio/script-doctor/script-editor';

export default function ScriptDoctorPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Script Doctor</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Write and improve your scripts with AI-powered suggestions.
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <ScriptEditor />
      </div>
    </div>
  );
}
