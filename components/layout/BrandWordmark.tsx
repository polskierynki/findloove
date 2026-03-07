'use client';

interface BrandWordmarkProps {
  className?: string;
  accentClassName?: string;
}

export default function BrandWordmark({
  className = '',
  accentClassName = 'text-rose-500',
}: BrandWordmarkProps) {
  return (
    <span className={className} aria-label="findloove.pl">
      <span aria-hidden="true">findl</span>
      <span
        aria-hidden="true"
        className={`relative mx-[0.08em] inline-flex items-center align-middle ${accentClassName}`}
      >
        <span className="inline-block h-[0.72em] w-[0.72em] rounded-full border-[0.11em] border-current" />
        <span className="-ml-[0.16em] inline-block h-[0.72em] w-[0.72em] rounded-full border-[0.11em] border-current" />
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute h-[0.34em] w-[0.34em] fill-current"
        >
          <path d="M12 21.3l-1.2-1.1C6.2 16 3 13.1 3 9.5 3 6.4 5.4 4 8.5 4c1.8 0 3.5.8 4.5 2.1C14 4.8 15.7 4 17.5 4 20.6 4 23 6.4 23 9.5c0 3.6-3.2 6.5-7.8 10.7L12 21.3z" />
        </svg>
      </span>
      <span aria-hidden="true">ve.pl</span>
    </span>
  );
}
