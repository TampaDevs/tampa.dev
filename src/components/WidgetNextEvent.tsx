/**
 * Next Event widget component
 */
import type { Event } from '../../models/index.js';
import { PageLayout } from './PageLayout.js';
import { EventCard, EmptyState } from './EventCard.js';

interface WidgetNextEventProps {
  events: Event[];
}

export function WidgetNextEvent({ events }: WidgetNextEventProps) {
  return (
    <PageLayout>
      {events.length > 0 ? (
        events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))
      ) : (
        <EmptyState />
      )}
    </PageLayout>
  );
}
