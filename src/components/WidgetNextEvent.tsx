/**
 * Next Event widget component
 */
import type { Event } from '../../models/index.js';
import { PageLayout } from './PageLayout.js';
import { EventCard, EmptyState } from './EventCard.js';

interface WidgetNextEventProps {
  events: Event[];
  timeZone?: string;
}

export function WidgetNextEvent({ events, timeZone }: WidgetNextEventProps) {
  return (
    <PageLayout>
      {events.length > 0 ? (
        events.map((event) => (
          <EventCard key={event.id} event={event} timeZone={timeZone} />
        ))
      ) : (
        <EmptyState />
      )}
    </PageLayout>
  );
}
