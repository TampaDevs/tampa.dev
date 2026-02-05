/**
 * Carousel widget component
 */
import type { Event } from '../../models/index.js';
import { PageLayout } from './PageLayout.js';
import { EventCard, EmptyState } from './EventCard.js';

interface WidgetCarouselProps {
  events: Event[];
  timeZone?: string;
}

export function WidgetCarousel({ events, timeZone }: WidgetCarouselProps) {
  return (
    <PageLayout>
      {events.length > 0 ? (
        <div class="flex overflow-x-auto py-4 space-x-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} variant="carousel" timeZone={timeZone} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </PageLayout>
  );
}
