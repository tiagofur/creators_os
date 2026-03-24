'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Copy, Check, ExternalLink, Loader2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  useToast,
} from '@ordo/ui';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@ordo/api-client';
import { useWorkspaceStore } from '@ordo/stores';
import { ApprovalStatusBadge } from './approval-status-badge';
import type { ApprovalLink } from '@ordo/types';

interface ApprovalLinkDialogProps {
  contentId: string;
  contentTitle: string;
  open: boolean;
  onClose: () => void;
}

export function ApprovalLinkDialog({ contentId, contentTitle, open, onClose }: ApprovalLinkDialogProps) {
  const [reviewerName, setReviewerName] = React.useState('');
  const [reviewerEmail, setReviewerEmail] = React.useState('');
  const [expiryHours, setExpiryHours] = React.useState('168'); // 7 days default
  const [generatedUrl, setGeneratedUrl] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';

  // Fetch existing approval links
  const { data: approvalLinks, isLoading: isLoadingLinks } = useQuery({
    queryKey: queryKeys.content.approvalLinks(contentId),
    queryFn: () =>
      apiClient.get<ApprovalLink[]>(
        `/api/v1/workspaces/${workspaceId}/contents/${contentId}/approval-links`,
      ),
    enabled: open && Boolean(workspaceId) && Boolean(contentId),
  });

  // Create approval link mutation
  const { mutate: createLink, isPending: isCreating } = useMutation({
    mutationFn: () =>
      apiClient.post<ApprovalLink>(
        `/api/v1/workspaces/${workspaceId}/contents/${contentId}/approval-links`,
        {
          reviewer_name: reviewerName || undefined,
          reviewer_email: reviewerEmail || undefined,
          expires_in_hours: parseInt(expiryHours, 10),
        },
      ),
    onSuccess: (link: ApprovalLink) => {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      setGeneratedUrl(`${baseUrl}/review/${link.token}`);
      setReviewerName('');
      setReviewerEmail('');
      queryClient.invalidateQueries({ queryKey: queryKeys.content.approvalLinks(contentId) });
      toast({ title: 'Approval link created' });
    },
    onError: () => {
      toast({ title: 'Failed to create approval link', variant: 'destructive' });
    },
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy to clipboard', variant: 'destructive' });
    }
  };

  const handleClose = () => {
    setGeneratedUrl('');
    setReviewerName('');
    setReviewerEmail('');
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Approval</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Generate a review link for &ldquo;{contentTitle}&rdquo;. The reviewer does not need an account.
        </p>

        <div className="space-y-4 mt-4">
          {/* Create new link form */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="reviewer-name">Reviewer Name</Label>
              <Input
                id="reviewer-name"
                placeholder="e.g. Jane from BrandCo"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="reviewer-email">Reviewer Email</Label>
              <Input
                id="reviewer-email"
                type="email"
                placeholder="jane@brandco.com"
                value={reviewerEmail}
                onChange={(e) => setReviewerEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="expiry">Link Expiry</Label>
              <Select value={expiryHours} onValueChange={setExpiryHours}>
                <SelectTrigger id="expiry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">1 day</SelectItem>
                  <SelectItem value="72">3 days</SelectItem>
                  <SelectItem value="168">7 days</SelectItem>
                  <SelectItem value="336">14 days</SelectItem>
                  <SelectItem value="720">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => createLink()} loading={isCreating} className="w-full">
              Generate Review Link
            </Button>
          </div>

          {/* Show generated URL */}
          {generatedUrl && (
            <div className="rounded-md border p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Review Link</p>
              <div className="flex items-center gap-2">
                <Input value={generatedUrl} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* Existing links */}
          {(approvalLinks && approvalLinks.length > 0) && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground mb-2">
                  Existing Approval Links
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {approvalLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between rounded-md border p-2 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {link.reviewer_name || link.reviewer_email || 'Anonymous'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Expires {format(new Date(link.expires_at), 'MMM d, yyyy')}
                        </p>
                        {link.comment && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            &ldquo;{link.comment}&rdquo;
                          </p>
                        )}
                      </div>
                      <ApprovalStatusBadge status={link.status} className="ml-2 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {isLoadingLinks && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
