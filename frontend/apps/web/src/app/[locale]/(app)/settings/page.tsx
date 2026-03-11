import { redirect } from 'next/navigation';

interface SettingsPageProps {
  params: { locale: string };
}

export default function SettingsPage({ params }: SettingsPageProps) {
  redirect(`/${params.locale}/settings/profile`);
}
