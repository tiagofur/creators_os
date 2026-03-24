'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@ordo/validations';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@ordo/ui';
import { apiClient } from '@/lib/api-client';

export function ForgotPasswordForm() {
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordInput) {
    try {
      await apiClient.post('/api/v1/auth/forgot-password', data);
      setSent(true);
    } catch {
      setError('root', { message: 'Failed to send reset link. Please try again.' });
    }
  }

  if (sent) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a password reset link to your email address.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link href={`/${locale}/login`} className="text-sm text-primary hover:underline">
            Back to login
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Forgot your password?</CardTitle>
        <CardDescription>
          Enter your email and we'll send you a reset link.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {errors.root && (
            <p className="text-sm text-destructive text-center" role="alert">
              {errors.root.message}
            </p>
          )}
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Send reset link
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <Link href={`/${locale}/login`} className="text-sm text-muted-foreground hover:text-foreground">
          Back to login
        </Link>
      </CardFooter>
    </Card>
  );
}
