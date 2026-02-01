import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { createMockEvent, createMockOnlineEvent, createMockGroup } from '~/test/fixtures';
import { EventCard } from './EventCard';

/** Render a component inside a React Router context and return a scoped query helper. */
function renderCard(ui: React.ReactElement) {
  const router = createMemoryRouter(
    [{ path: '/', element: ui }],
    { initialEntries: ['/'] },
  );
  const { container } = render(<RouterProvider router={router} />);
  const article = container.querySelector('article')!;
  return within(article);
}

describe('EventCard', () => {
  it('renders event title and group name', () => {
    const event = createMockEvent({ title: 'React State of the Art' });
    const card = renderCard(<EventCard event={event} />);

    expect(card.getByText('React State of the Art')).toBeInTheDocument();
    expect(card.getByText('Tampa Devs')).toBeInTheDocument();
  });

  it('shows venue name for in-person events', () => {
    const event = createMockEvent({
      venues: [{ name: 'Tampa Theatre', city: 'Tampa', state: 'FL' }],
      isOnline: false,
    });
    const card = renderCard(<EventCard event={event} />);

    expect(card.getByText('Tampa Theatre')).toBeInTheDocument();
  });

  it('shows Online indicator for online events', () => {
    const event = createMockOnlineEvent();
    const card = renderCard(<EventCard event={event} />);

    expect(card.getByText('Online Event')).toBeInTheDocument();
  });

  it('renders RSVP count when present', () => {
    const event = createMockEvent({ rsvpCount: 42 });
    const card = renderCard(<EventCard event={event} />);

    expect(card.getByText('42')).toBeInTheDocument();
  });

  it('does not render RSVP count when zero', () => {
    const event = createMockEvent({ rsvpCount: 0 });
    const card = renderCard(<EventCard event={event} />);

    expect(card.queryByText('going')).not.toBeInTheDocument();
  });

  it('links group name when groups prop is provided', () => {
    const event = createMockEvent();
    const groups = [createMockGroup()];
    const card = renderCard(<EventCard event={event} groups={groups} />);

    const groupLink = card.getByText('Tampa Devs').closest('a');
    expect(groupLink).toHaveAttribute('href', '/groups/tampadevs');
  });

  describe('compact variant', () => {
    it('renders title and group name', () => {
      const event = createMockEvent({ title: 'Quick Talk' });
      const card = renderCard(<EventCard event={event} variant="compact" />);

      expect(card.getByText('Quick Talk')).toBeInTheDocument();
      expect(card.getByText('Tampa Devs')).toBeInTheDocument();
    });

    it('shows RSVP count with "going" label', () => {
      const event = createMockEvent({ rsvpCount: 25 });
      const card = renderCard(<EventCard event={event} variant="compact" />);

      expect(card.getByText('25 going')).toBeInTheDocument();
    });

    it('shows Online for online events', () => {
      const event = createMockOnlineEvent();
      const card = renderCard(<EventCard event={event} variant="compact" />);

      expect(card.getByText('Online')).toBeInTheDocument();
    });
  });

  describe('featured variant', () => {
    it('renders title and group name', () => {
      const event = createMockEvent({ title: 'Annual Conference' });
      const card = renderCard(<EventCard event={event} variant="featured" />);

      expect(card.getByText('Annual Conference')).toBeInTheDocument();
      expect(card.getByText('Tampa Devs')).toBeInTheDocument();
    });

    it('renders a View Event link', () => {
      const event = createMockEvent({ id: 'evt-featured' });
      const card = renderCard(<EventCard event={event} variant="featured" />);

      const viewLink = card.getByText('View Event').closest('a');
      expect(viewLink).toHaveAttribute('href', '/events/evt-featured');
    });

    it('shows RSVP count with "going" label', () => {
      const event = createMockEvent({ rsvpCount: 100 });
      const card = renderCard(<EventCard event={event} variant="featured" />);

      expect(card.getByText('100 going')).toBeInTheDocument();
    });
  });
});
