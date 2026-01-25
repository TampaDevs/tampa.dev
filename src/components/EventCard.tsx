/**
 * Reusable event card component for widgets
 */
import type { Event } from '../../models/index.js';
import { getPhotoUrl, formatDate, addUtm, renderShortDescription } from './helpers.js';

type EventCardVariant = 'default' | 'carousel';

interface EventCardProps {
  event: Event;
  variant?: EventCardVariant;
}

const containerStyles: Record<EventCardVariant, string> = {
  default: 'max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl',
  carousel: 'shrink-0 bg-white rounded-xl shadow-md overflow-hidden w-full max-w-lg',
};

const flexStyles: Record<EventCardVariant, string> = {
  default: 'md:flex',
  carousel: 'flex h-full flex-col md:flex-row',
};

const imageStyles: Record<EventCardVariant, string> = {
  default: 'h-48 w-full object-cover md:h-full md:w-48',
  carousel: 'w-full md:w-48 object-cover md:h-full',
};

const contentStyles: Record<EventCardVariant, string> = {
  default: 'p-8',
  carousel: 'p-4 md:p-8',
};

export function EventCard({ event, variant = 'default' }: EventCardProps) {
  const photoUrl = getPhotoUrl(event);
  const eventUrl = addUtm(event.eventUrl);

  return (
    <div class={containerStyles[variant]}>
      <div class={flexStyles[variant]}>
        <div class="md:shrink-0">
          <a href={eventUrl} target="_blank">
            {photoUrl && (
              <img
                class={imageStyles[variant]}
                src={photoUrl}
                alt={event.title}
              />
            )}
          </a>
        </div>
        <div class={contentStyles[variant]}>
          <div class="uppercase tracking-wide text-sm text-blue-500 font-semibold">
            <a href={eventUrl} target="_blank">
              {formatDate(event.dateTime)} &bull; {event.rsvpCount} Going
            </a>
          </div>
          <a
            href={eventUrl}
            class="block mt-1 text-lg leading-tight font-medium text-black hover:underline"
            target="_blank"
          >
            {event.group.name} - {event.title}
          </a>
          <p class="mt-2 text-slate-500">
            <a href={eventUrl} target="_blank">
              <span dangerouslySetInnerHTML={{ __html: renderShortDescription(event.description) }} />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export function EmptyState() {
  return (
    <div class="bg-white shadow rounded-lg p-6">
      <div class="flex mt-4 mb-4 justify-center items-center">
        <h2 class="text-2xl font-semibold">No upcoming events.</h2>
      </div>
    </div>
  );
}
