import { cn } from "@/lib/utils";

export function Logo({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      className={cn("rounded-lg shrink-0", className)}
      aria-label="Ubumwe RMS"
      role="img"
    >
      <rect width="128" height="128" rx="20" fill="#2563eb" />
      <rect x="16" y="16" width="96" height="96" rx="14" fill="#ffffff" />
      <text
        x="64"
        y="86"
        textAnchor="middle"
        fill="#2563eb"
        fontSize="58"
        fontWeight="700"
        fontFamily="Segoe UI, Arial, Helvetica, sans-serif"
      >
        U
      </text>
    </svg>
  );
}
