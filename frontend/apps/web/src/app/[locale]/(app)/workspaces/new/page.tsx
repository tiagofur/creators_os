import type { Metadata } from 'next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ordo/ui';
import { CreateWorkspaceForm } from './_components/create-workspace-form';

export const metadata: Metadata = {
  title: 'Create workspace',
};

export default function CreateWorkspacePage() {
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Create a workspace</CardTitle>
            <CardDescription>
              A workspace is where you organize your content creation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateWorkspaceForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
