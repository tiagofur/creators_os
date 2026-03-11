import { InboxList } from '@/components/inbox/inbox-list';

export default function InboxPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-5">
        <h1 className="text-2xl font-bold">Inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Comments, mentions, and approvals from your team.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        <InboxList />
      </div>
    </div>
  );
}
