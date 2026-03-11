import Link from 'next/link';
import { Button } from '@ordo/ui';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      {/* Simple SVG illustration */}
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="60" cy="60" r="56" stroke="currentColor" strokeWidth="2" className="text-muted" />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          className="text-muted-foreground"
          fontSize="40"
          fontWeight="bold"
          fill="currentColor"
        >
          404
        </text>
      </svg>

      <div>
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>

      <Button asChild>
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
