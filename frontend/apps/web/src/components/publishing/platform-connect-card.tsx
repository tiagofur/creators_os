'use client';

import * as React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@ordo/core';
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useToast,
} from '@ordo/ui';
import { useDisconnectPlatform, type Platform, type PlatformCredential } from '@/hooks/use-platform-credentials';
import { useWorkspaceStore } from '@ordo/stores';
import { API_BASE_URL } from '@ordo/core';

const PLATFORM_INFO: Record<Platform, { label: string; color: string }> = {
  youtube: { label: 'YouTube', color: 'text-red-600' },
  instagram: { label: 'Instagram', color: 'text-purple-600' },
  tiktok: { label: 'TikTok', color: 'text-sky-600' },
  twitter: { label: 'Twitter / X', color: 'text-blue-600' },
  linkedin: { label: 'LinkedIn', color: 'text-indigo-600' },
};

interface PlatformConnectCardProps {
  credential: PlatformCredential;
}

export function PlatformConnectCard({ credential }: PlatformConnectCardProps) {
  const [disconnectOpen, setDisconnectOpen] = React.useState(false);
  const { mutateAsync: disconnect, isPending } = useDisconnectPlatform();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';
  const { toast } = useToast();

  const info = PLATFORM_INFO[credential.platform];

  const handleConnect = () => {
    // Redirect to OAuth flow handled by backend
    window.location.href = `${API_BASE_URL}/v1/oauth/${credential.platform}/authorize?workspace_id=${activeWorkspaceId}`;
  };

  const handleDisconnect = async () => {
    try {
      await disconnect({ workspaceId: activeWorkspaceId, platform: credential.platform });
      toast({ title: `${info.label} disconnected.` });
      setDisconnectOpen(false);
    } catch {
      toast({ title: 'Failed to disconnect', variant: 'destructive' });
    }
  };

  return (
    <>
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          {/* Platform name */}
          <div className="flex-1">
            <p className={cn('font-semibold', info.color)}>{info.label}</p>
            <div className="mt-1 flex items-center gap-1.5 text-xs">
              {credential.connected ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-green-600">Connected</span>
                </>
              ) : (
                <>
                  <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Not connected</span>
                </>
              )}
            </div>
          </div>

          {/* Action button */}
          {credential.connected ? (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDisconnectOpen(true)}
            >
              Disconnect
            </Button>
          ) : (
            <Button size="sm" onClick={handleConnect}>
              Connect
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Disconnect confirmation */}
      <Dialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect {info.label}?</DialogTitle>
            <DialogDescription>
              This will remove your {info.label} connection. You can reconnect at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDisconnectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={isPending}
              onClick={handleDisconnect}
            >
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
