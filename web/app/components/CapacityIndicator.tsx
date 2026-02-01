interface CapacityIndicatorProps {
  confirmed: number;
  capacity: number | null;
  className?: string;
}

export function CapacityIndicator({
  confirmed,
  capacity,
  className = "",
}: CapacityIndicatorProps) {
  // Unlimited capacity — just show count
  if (capacity === null) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 ${className}`}>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {confirmed} going
      </span>
    );
  }

  const percentage = capacity > 0 ? Math.min((confirmed / capacity) * 100, 100) : 0;
  const isFull = confirmed >= capacity;
  const isNearFull = percentage >= 75;

  // Color tiers: green < 75%, amber 75-99%, red 100%
  const colorClasses = isFull
    ? "text-red-600 dark:text-red-400"
    : isNearFull
      ? "text-amber-600 dark:text-amber-400"
      : "text-emerald-600 dark:text-emerald-400";

  const barColorClasses = isFull
    ? "bg-red-500"
    : isNearFull
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <span className={`inline-flex flex-col gap-1 ${className}`}>
      <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${colorClasses}`}>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {isFull ? "Sold out" : `${confirmed} / ${capacity} spots`}
      </span>
      {/* Progress bar */}
      <span className="block w-full h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <span
          className={`block h-full rounded-full transition-all duration-300 ${barColorClasses}`}
          style={{ width: `${percentage}%` }}
        />
      </span>
    </span>
  );
}
