'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronsUpDown, Plus, Building2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@ordo/ui';
import { useWorkspace } from '@ordo/hooks';
import { getInitials } from '@ordo/core';

export function WorkspaceSelector() {
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();
  const pathname = usePathname();
  const localeMatch = pathname.match(/^\/([a-z]{2})\//);
  const locale = localeMatch?.[1] ?? 'en';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Select workspace"
        >
          <Avatar className="h-6 w-6">
            {activeWorkspace?.logo_url && (
              <AvatarImage src={activeWorkspace.logo_url} alt={activeWorkspace.name} />
            )}
            <AvatarFallback className="text-xs">
              {activeWorkspace ? getInitials(activeWorkspace.name) : <Building2 className="h-3 w-3" />}
            </AvatarFallback>
          </Avatar>
          <span className="flex-1 truncate text-sm font-medium text-left">
            {activeWorkspace?.name ?? 'Select workspace'}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start" side="bottom">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => setActiveWorkspace(ws)}
              className="gap-2"
            >
              <Avatar className="h-5 w-5">
                {ws.logo_url && <AvatarImage src={ws.logo_url} alt={ws.name} />}
                <AvatarFallback className="text-xs">{getInitials(ws.name)}</AvatarFallback>
              </Avatar>
              <span className="truncate">{ws.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/${locale}/workspaces/new`} className="gap-2">
            <Plus className="h-4 w-4" />
            Create workspace
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
