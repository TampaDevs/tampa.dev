/**
 * Carousel widget component
 */
import type { Event } from '../../models/index.js';
import { PageLayout } from './PageLayout.js';
import { EventCard, EmptyState } from './EventCard.js';

interface WidgetCarouselProps {
  events: Event[];
}

export function WidgetCarousel({ events }: WidgetCarouselProps) {
  return (
    <PageLayout>
      {events.length > 0 ? (
        <div class="flex overflow-x-auto py-4 space-x-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} variant="carousel" />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </PageLayout>
  );
}
