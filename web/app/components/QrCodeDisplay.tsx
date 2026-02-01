/**
 * QR Code Display Component
 *
 * Renders a QR code for a given value string using a public QR code API.
 * Includes a download button and displays the encoded URL value.
 * Always uses a white background for the QR code area regardless of dark mode.
 */

interface QrCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

export function QrCodeDisplay({ value, size = 200, className = "" }: QrCodeDisplayProps) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;

  const truncatedValue =
    value.length > 60 ? value.slice(0, 57) + "..." : value;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-600">
        <img
          src={qrUrl}
          alt={`QR code for ${truncatedValue}`}
          width={size}
          height={size}
          className="block rounded"
          loading="lazy"
        />
      </div>

      <p
        className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center max-w-[250px] truncate font-mono"
        title={value}
      >
        {truncatedValue}
      </p>

      <a
        href={qrUrl}
        download={`qr-code-${Date.now()}.png`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        Download QR
      </a>
    </div>
  );
}
