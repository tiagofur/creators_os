import type { Metadata } from 'next';
import { RegisterForm } from './_components/register-form';

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Create your Ordo account',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
