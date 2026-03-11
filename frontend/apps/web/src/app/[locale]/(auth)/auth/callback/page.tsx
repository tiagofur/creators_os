'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useAuthStore } from '@ordo/stores';
import { Spinner } from '@ordo/ui';
import { apiClient } from '@/lib/api-client';
import type { AuthTokens } from '@ordo/types';

function OAuthCallbackInner() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const searchParams = useSearchParams();
  const locale = params.locale;
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const provider = searchParams.get('provider') ?? 'google';
    const error = searchParams.get('error');

    if (error) {
      router.replace(`/${locale}/login?error=oauth_failed`);
      return;
    }

    if (!code) {
      router.replace(`/${locale}/login`);
      return;
    }

    async function exchangeCode() {
      try {
        const tokens = await apiClient.post<AuthTokens>(
          `/v1/auth/oauth/${provider}/callback`,
          { code, state },
        );
        setAccessToken(tokens.access_token);

        const user = await apiClient.get('/v1/auth/me');
        setUser(user as Parameters<typeof setUser>[0]);

        router.replace(`/${locale}/dashboard`);
      } catch {
        router.replace(`/${locale}/login?error=oauth_failed`);
      }
    }

    void exchangeCode();
  }, [code, state, provider, error, locale, router, searchParams, setAccessToken, setUser]);

  return (
    <div className="flex flex-col items-center gap-4">
      <Spinner size="lg" />
      <p className="text-sm text-muted-foreground">Completing sign in...</p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <Suspense fallback={<Spinner size="lg" />}>
        <OAuthCallbackInner />
      </Suspense>
    </div>
  );
}
