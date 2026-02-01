/**
 * AttendeeList — table/card view of RSVP + checkin status per attendee.
 *
 * Shows a summary row at the top and handles empty state.
 */

import { Avatar } from "~/components/Avatar";

interface AttendeeListProps {
  attendees: Array<{
    rsvpId: string;
    userId: string;
    rsvpStatus: "confirmed" | "waitlisted" | "cancelled";
    checkedIn: boolean;
    checkedInAt: string | null;
    checkinMethod: string | null;
    user: {
      id: string;
      name: string | null;
      username: string | null;
      avatarUrl: string | null;
    } | null;
  }>;
}

const STATUS_BADGE: Record<
  "confirmed" | "waitlisted" | "cancelled",
  { bg: string; text: string; label: string }
> = {
  confirmed: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-400",
    label: "Confirmed",
  },
  waitlisted: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-700 dark:text-yellow-400",
    label: "Waitlisted",
  },
  cancelled: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
    label: "Cancelled",
  },
};

function CheckinMethodBadge({ method }: { method: string | null }) {
  if (!method) return null;

  const labels: Record<string, { icon: string; label: string }> = {
    link: { icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1", label: "Link" },
    qr: { icon: "M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z", label: "QR" },
    nfc: { icon: "M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0", label: "NFC" },
  };

  const info = labels[method] ?? { icon: "", label: method };

  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      {info.icon && (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d={info.icon} />
        </svg>
      )}
      {info.label}
    </span>
  );
}

function formatCheckinTime(iso: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    });
  } catch {
    return "-";
  }
}

export function AttendeeList({ attendees }: AttendeeListProps) {
  const confirmedCount = attendees.filter((a) => a.rsvpStatus === "confirmed").length;
  const waitlistedCount = attendees.filter((a) => a.rsvpStatus === "waitlisted").length;
  const checkedInCount = attendees.filter((a) => a.checkedIn).length;

  if (attendees.length === 0) {
    return (
      <div className="text-center py-16">
        <svg
          className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <p className="text-gray-500 dark:text-gray-400">No attendees yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {confirmedCount} confirmed
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {waitlistedCount} waitlisted
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {checkedInCount} checked in
        </span>
      </div>

      {/* Table (desktop) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
              <th className="pb-3 pr-4 font-medium">Attendee</th>
              <th className="pb-3 pr-4 font-medium">RSVP Status</th>
              <th className="pb-3 pr-4 font-medium">Checked In</th>
              <th className="pb-3 pr-4 font-medium">Checkin Time</th>
              <th className="pb-3 font-medium">Method</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {attendees.map((attendee) => {
              const badge = STATUS_BADGE[attendee.rsvpStatus];
              return (
                <tr key={attendee.rsvpId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  {/* Avatar + Name */}
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={attendee.user?.avatarUrl || undefined}
                        name={attendee.user?.name || attendee.user?.username || "?"}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {attendee.user?.name || attendee.user?.username || "Unknown"}
                        </p>
                        {attendee.user?.username && attendee.user.name && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            @{attendee.user.username}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* RSVP Status */}
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
                    >
                      {badge.label}
                    </span>
                  </td>

                  {/* Checked In */}
                  <td className="py-3 pr-4">
                    {attendee.checkedIn ? (
                      <svg
                        className="w-5 h-5 text-green-600 dark:text-green-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-600">&mdash;</span>
                    )}
                  </td>

                  {/* Checkin Time */}
                  <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                    {formatCheckinTime(attendee.checkedInAt)}
                  </td>

                  {/* Method */}
                  <td className="py-3">
                    <CheckinMethodBadge method={attendee.checkinMethod} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Card list (mobile) */}
      <div className="md:hidden space-y-3">
        {attendees.map((attendee) => {
          const badge = STATUS_BADGE[attendee.rsvpStatus];
          return (
            <div
              key={attendee.rsvpId}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <Avatar
                  src={attendee.user?.avatarUrl || undefined}
                  name={attendee.user?.name || attendee.user?.username || "?"}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {attendee.user?.name || attendee.user?.username || "Unknown"}
                  </p>
                  {attendee.user?.username && attendee.user.name && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      @{attendee.user.username}
                    </p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
                >
                  {badge.label}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1">
                  {attendee.checkedIn ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-green-700 dark:text-green-400">Checked in</span>
                    </>
                  ) : (
                    <span>Not checked in</span>
                  )}
                </span>
                {attendee.checkedInAt && (
                  <span>{formatCheckinTime(attendee.checkedInAt)}</span>
                )}
                <CheckinMethodBadge method={attendee.checkinMethod} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
