import { redirect } from 'next/navigation';

interface AiStudioRootProps {
  params: Promise<{ locale: string }>;
}

export default async function AiStudioRoot({ params }: AiStudioRootProps) {
  const { locale } = await params;
  redirect(`/${locale}/ai-studio/chat`);
}
