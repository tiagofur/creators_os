'use client';

import { useForm } from 'react-hook-form';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ordo/ui';
import { useInviteMember } from '@/hooks/use-team';
import { useWorkspaceStore } from '@ordo/stores';

interface InviteFormValues {
  email: string;
  role: string;
}

export function InviteMemberForm() {
  const workspace = useWorkspaceStore((s) => s.activeWorkspace);
  const inviteMutation = useInviteMember(workspace?.id ?? '');
  const { register, handleSubmit, setValue, reset, formState: { isSubmitting } } = useForm<InviteFormValues>({
    defaultValues: { email: '', role: 'editor' },
  });

  async function onSubmit(data: InviteFormValues) {
    await inviteMutation.mutateAsync(data);
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-48 space-y-1.5">
        <Label htmlFor="invite-email">Email address</Label>
        <Input
          id="invite-email"
          type="email"
          placeholder="colleague@example.com"
          {...register('email', { required: true })}
        />
      </div>
      <div className="w-36 space-y-1.5">
        <Label htmlFor="invite-role">Role</Label>
        <Select defaultValue="editor" onValueChange={(v) => setValue('role', v)}>
          <SelectTrigger id="invite-role" aria-label="Select role">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="viewer">Viewer</SelectItem>
            <SelectItem value="editor">Editor</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" loading={isSubmitting || inviteMutation.isPending}>
        Send invite
      </Button>
    </form>
  );
}
