'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { Suspense } from 'react';
import { z } from 'zod';
import { resetPasswordSchema } from '@ordo/validations';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Spinner,
} from '@ordo/ui';
import { apiClient } from '@/lib/api-client';

type ResetPasswordFormInput = z.infer<typeof resetPasswordSchema>;

function ResetPasswordFormInner() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const searchParams = useSearchParams();
  const locale = params.locale;
  const token = searchParams.get('token') ?? '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ResetPasswordFormInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  async function onSubmit(data: ResetPasswordFormInput) {
    try {
      await apiClient.post('/api/v1/auth/reset-password', data);
      router.push(`/${locale}/login?message=password_reset`);
    } catch {
      setError('root', { message: 'Reset failed. The link may have expired.' });
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>Enter a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {errors.root && (
            <p className="text-sm text-destructive text-center" role="alert">
              {errors.root.message}
            </p>
          )}
          <Input
            label="New password"
            type="password"
            placeholder="8+ characters"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            label="Confirm new password"
            type="password"
            placeholder="Repeat password"
            autoComplete="new-password"
            error={errors.password_confirmation?.message}
            {...register('password_confirmation')}
          />
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Reset password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense fallback={<Spinner />}>
      <ResetPasswordFormInner />
    </Suspense>
  );
}
