'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Github } from 'lucide-react';
import { registerSchema, type RegisterInput } from '@ordo/validations';
import { useAuthStore } from '@ordo/stores';
import {
  Button,
  Input,
  Checkbox,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@ordo/ui';
import { apiClient } from '@/lib/api-client';
import type { AuthTokens } from '@ordo/types';

export function RegisterForm() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setValue,
    watch,
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { terms_accepted: false },
  });

  async function onSubmit(data: RegisterInput) {
    try {
      const tokens = await apiClient.post<AuthTokens>('/v1/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
      });
      setAccessToken(tokens.access_token);

      const user = await apiClient.get('/v1/auth/me');
      setUser(user as Parameters<typeof setUser>[0]);

      router.push(`/${locale}/onboarding`);
    } catch {
      setError('root', { message: 'Registration failed. Please try again.' });
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Start building your creator OS today</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {errors.root && (
            <p className="text-sm text-destructive text-center" role="alert">
              {errors.root.message}
            </p>
          )}

          <Input
            label="Full name"
            type="text"
            placeholder="Jane Smith"
            autoComplete="name"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Password"
            type="password"
            placeholder="8+ characters"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />

          <Input
            label="Confirm password"
            type="password"
            placeholder="Repeat password"
            autoComplete="new-password"
            error={errors.password_confirmation?.message}
            {...register('password_confirmation')}
          />

          <Checkbox
            label="I accept the Terms of Service and Privacy Policy"
            error={errors.terms_accepted?.message}
            checked={watch('terms_accepted')}
            onCheckedChange={(checked) =>
              setValue('terms_accepted', checked === true, { shouldValidate: true })
            }
          />

          <Button type="submit" className="w-full" loading={isSubmitting}>
            Create account
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => window.location.href = `/api/auth/oauth/google`}
          >
            Continue with Google
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={() => window.location.href = `/api/auth/oauth/github`}
          >
            <Github className="h-4 w-4" aria-hidden="true" />
            Continue with GitHub
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href={`/${locale}/login`} className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
