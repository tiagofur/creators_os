import { SponsorshipsNav } from '@/components/sponsorships/sponsorships-nav';

interface SponsorshipsLayoutProps {
  children: React.ReactNode;
}

export default function SponsorshipsLayout({ children }: SponsorshipsLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <SponsorshipsNav />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
