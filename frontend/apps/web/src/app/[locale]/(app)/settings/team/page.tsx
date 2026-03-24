import { Card, CardContent, CardHeader, CardTitle } from '@ordo/ui';
import { InviteMemberForm } from '@/components/settings/invite-member-form';
import { TeamMemberList } from '@/components/settings/team-member-list';
import { PendingInvitationsList } from '@/components/settings/pending-invitations-list';
import { TierGate } from '@/components/tier-gate';

export default function TeamSettingsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invite team members</CardTitle>
        </CardHeader>
        <CardContent>
          <TierGate feature="teamMembers" action="invite team members">
            <InviteMemberForm />
          </TierGate>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending invitations</CardTitle>
        </CardHeader>
        <CardContent>
          <PendingInvitationsList />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team members</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamMemberList />
        </CardContent>
      </Card>
    </div>
  );
}
