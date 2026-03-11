import type { Metadata } from 'next';
import { LoginForm } from './_components/login-form';

export const metadata: Metadata = {
  title: 'Log in',
  description: 'Log in to your Ordo account',
};

export default function LoginPage() {
  return <LoginForm />;
}
