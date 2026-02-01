import { describe, it, expect } from 'vitest';
import { render, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { RsvpButton } from './RsvpButton';
import { CapacityIndicator } from './CapacityIndicator';
import { GroupBadgeSection } from './GroupBadgeSection';
import type { GroupBadgeGroup, GroupBadgeInfo } from '~/lib/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Render a component inside a React Router context and return scoped queries. */
function renderWithRouter(ui: React.ReactElement) {
  const router = createMemoryRouter(
    [{ path: '/', element: ui }],
    { initialEntries: ['/'] },
  );
  const result = render(<RouterProvider router={router} />);
  return { ...result, q: within(result.container) };
}

/** Render a plain component (no router needed) and return scoped queries. */
function renderComponent(ui: React.ReactElement) {
  const result = render(ui);
  return { ...result, q: within(result.container) };
}

// ─── Badge / Group fixtures ─────────────────────────────────────────────────

function makeBadge(overrides: Partial<GroupBadgeInfo> = {}): GroupBadgeInfo {
  return {
    id: overrides.id ?? 'badge-1',
    name: overrides.name ?? 'First Event',
    description: overrides.description ?? 'Attend your first event',
    icon: overrides.icon ?? null,
    color: overrides.color ?? null,
    points: overrides.points ?? 10,
    groupId: overrides.groupId ?? 'group-1',
    groupName: overrides.groupName ?? 'Tampa Devs',
    groupSlug: overrides.groupSlug ?? 'tampa-devs',
    groupPhotoUrl: overrides.groupPhotoUrl ?? null,
  };
}

function makeGroup(overrides: Partial<GroupBadgeGroup> = {}): GroupBadgeGroup {
  return {
    groupId: overrides.groupId ?? 'group-1',
    groupName: overrides.groupName ?? 'Tampa Devs',
    groupSlug: overrides.groupSlug ?? 'tampa-devs',
    groupPhotoUrl: overrides.groupPhotoUrl ?? null,
    totalXp: overrides.totalXp ?? 50,
    badges: overrides.badges ?? [makeBadge()],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// RsvpButton
// ═══════════════════════════════════════════════════════════════════════════

describe('RsvpButton', () => {
  it('renders "Log in to RSVP" when user is not logged in', () => {
    const { q } = renderWithRouter(
      <RsvpButton
        eventId="evt-1"
        initialStatus={null}
        capacity={null}
        confirmed={0}
        waitlisted={0}
        isLoggedIn={false}
      />,
    );

    expect(q.getByText('Log in to RSVP')).toBeInTheDocument();
  });

  it('renders login link pointing to /login by default', () => {
    const { q } = renderWithRouter(
      <RsvpButton
        eventId="evt-1"
        initialStatus={null}
        capacity={null}
        confirmed={0}
        waitlisted={0}
        isLoggedIn={false}
      />,
    );

    const link = q.getByText('Log in to RSVP').closest('a');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/login');
  });

  it('renders "RSVP" button when logged in and not RSVP\'d', () => {
    const { q } = renderWithRouter(
      <RsvpButton
        eventId="evt-1"
        initialStatus={null}
        capacity={100}
        confirmed={10}
        waitlisted={0}
        isLoggedIn={true}
      />,
    );

    expect(q.getByText('RSVP')).toBeInTheDocument();
    expect(q.getByRole('button')).toBeInTheDocument();
  });

  it('renders "Going" when initialStatus is confirmed', () => {
    const { q } = renderWithRouter(
      <RsvpButton
        eventId="evt-1"
        initialStatus="confirmed"
        capacity={100}
        confirmed={10}
        waitlisted={0}
        isLoggedIn={true}
      />,
    );

    expect(q.getByText('Going')).toBeInTheDocument();
  });

  it('renders "Waitlisted" when initialStatus is waitlisted', () => {
    const { q } = renderWithRouter(
      <RsvpButton
        eventId="evt-1"
        initialStatus="waitlisted"
        capacity={100}
        confirmed={100}
        waitlisted={5}
        isLoggedIn={true}
      />,
    );

    expect(q.getByText('Waitlisted')).toBeInTheDocument();
  });

  it('renders "Join Waitlist" when at capacity and not RSVP\'d', () => {
    const { q } = renderWithRouter(
      <RsvpButton
        eventId="evt-1"
        initialStatus={null}
        capacity={50}
        confirmed={50}
        waitlisted={3}
        isLoggedIn={true}
      />,
    );

    expect(q.getByText('Join Waitlist')).toBeInTheDocument();
  });

  it('button is present and not disabled in idle state', () => {
    const { q } = renderWithRouter(
      <RsvpButton
        eventId="evt-1"
        initialStatus={null}
        capacity={100}
        confirmed={10}
        waitlisted={0}
        isLoggedIn={true}
      />,
    );

    const button = q.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('renders "RSVP" when capacity is null (unlimited) and not RSVP\'d', () => {
    const { q } = renderWithRouter(
      <RsvpButton
        eventId="evt-1"
        initialStatus={null}
        capacity={null}
        confirmed={200}
        waitlisted={0}
        isLoggedIn={true}
      />,
    );

    expect(q.getByText('RSVP')).toBeInTheDocument();
  });

  it('uses custom loginUrl when provided', () => {
    const { q } = renderWithRouter(
      <RsvpButton
        eventId="evt-1"
        initialStatus={null}
        capacity={null}
        confirmed={0}
        waitlisted={0}
        isLoggedIn={false}
        loginUrl="/auth/signin"
      />,
    );

    const link = q.getByText('Log in to RSVP').closest('a');
    expect(link).toHaveAttribute('href', '/auth/signin');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CapacityIndicator
// ═══════════════════════════════════════════════════════════════════════════

describe('CapacityIndicator', () => {
  it('shows "{confirmed} going" when capacity is null (unlimited)', () => {
    const { q } = renderComponent(
      <CapacityIndicator confirmed={42} capacity={null} />,
    );

    expect(q.getByText('42 going')).toBeInTheDocument();
  });

  it('shows "{confirmed} / {capacity} spots" when capacity is set', () => {
    const { q } = renderComponent(
      <CapacityIndicator confirmed={30} capacity={100} />,
    );

    expect(q.getByText('30 / 100 spots')).toBeInTheDocument();
  });

  it('shows "Sold out" when confirmed >= capacity', () => {
    const { q } = renderComponent(
      <CapacityIndicator confirmed={100} capacity={100} />,
    );

    expect(q.getByText('Sold out')).toBeInTheDocument();
  });

  it('shows "Sold out" when confirmed exceeds capacity', () => {
    const { q } = renderComponent(
      <CapacityIndicator confirmed={120} capacity={100} />,
    );

    expect(q.getByText('Sold out')).toBeInTheDocument();
  });

  it('shows green (emerald) styling when under 75% capacity', () => {
    const { container } = renderComponent(
      <CapacityIndicator confirmed={20} capacity={100} />,
    );

    // The text span should have emerald color classes
    const textSpan = container.querySelector('.text-emerald-600');
    expect(textSpan).toBeInTheDocument();

    // The progress bar should use emerald background
    const bar = container.querySelector('.bg-emerald-500');
    expect(bar).toBeInTheDocument();
  });

  it('shows amber styling when 75-99% full', () => {
    const { container } = renderComponent(
      <CapacityIndicator confirmed={80} capacity={100} />,
    );

    // The text span should have amber color classes
    const textSpan = container.querySelector('.text-amber-600');
    expect(textSpan).toBeInTheDocument();

    // The progress bar should use amber background
    const bar = container.querySelector('.bg-amber-500');
    expect(bar).toBeInTheDocument();
  });

  it('shows red styling when at 100% (sold out)', () => {
    const { container } = renderComponent(
      <CapacityIndicator confirmed={100} capacity={100} />,
    );

    // The text span should have red color classes
    const textSpan = container.querySelector('.text-red-600');
    expect(textSpan).toBeInTheDocument();

    // The progress bar should use red background
    const bar = container.querySelector('.bg-red-500');
    expect(bar).toBeInTheDocument();
  });

  it('shows progress bar when capacity is set', () => {
    const { container } = renderComponent(
      <CapacityIndicator confirmed={50} capacity={100} />,
    );

    // The progress bar track (bg-gray-200) should be present
    const track = container.querySelector('.bg-gray-200');
    expect(track).toBeInTheDocument();

    // The inner bar should have a width style
    const bar = container.querySelector('[style]');
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveStyle({ width: '50%' });
  });

  it('does not show progress bar when capacity is null', () => {
    const { container } = renderComponent(
      <CapacityIndicator confirmed={42} capacity={null} />,
    );

    // No progress bar track should be present
    const track = container.querySelector('.bg-gray-200');
    expect(track).not.toBeInTheDocument();
  });

  it('clamps progress bar at 100% when confirmed exceeds capacity', () => {
    const { container } = renderComponent(
      <CapacityIndicator confirmed={150} capacity={100} />,
    );

    const bar = container.querySelector('.bg-red-500');
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveStyle({ width: '100%' });
  });

  it('applies custom className', () => {
    const { container } = renderComponent(
      <CapacityIndicator confirmed={10} capacity={null} className="my-custom-class" />,
    );

    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass('my-custom-class');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GroupBadgeSection
// ═══════════════════════════════════════════════════════════════════════════

describe('GroupBadgeSection', () => {
  it('returns null when groups array is empty', () => {
    const { container } = renderWithRouter(
      <GroupBadgeSection groups={[]} />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders "Group Achievements" header when groups are provided', () => {
    const { q } = renderWithRouter(
      <GroupBadgeSection groups={[makeGroup()]} />,
    );

    expect(q.getByText('Group Achievements')).toBeInTheDocument();
  });

  it('renders group names', () => {
    const groups = [
      makeGroup({ groupId: 'g1', groupName: 'Tampa Devs', groupSlug: 'tampa-devs' }),
      makeGroup({ groupId: 'g2', groupName: 'React Tampa', groupSlug: 'react-tampa' }),
    ];

    const { q } = renderWithRouter(
      <GroupBadgeSection groups={groups} />,
    );

    expect(q.getByText('Tampa Devs')).toBeInTheDocument();
    expect(q.getByText('React Tampa')).toBeInTheDocument();
  });

  it('renders badge names within the first (expanded) group', () => {
    const badges = [
      makeBadge({ id: 'b1', name: 'First Event', points: 10 }),
      makeBadge({ id: 'b2', name: 'Regular Attendee', points: 25 }),
    ];
    const groups = [makeGroup({ badges })];

    const { q } = renderWithRouter(
      <GroupBadgeSection groups={groups} />,
    );

    expect(q.getByText('First Event')).toBeInTheDocument();
    expect(q.getByText('Regular Attendee')).toBeInTheDocument();
  });

  it('shows XP totals per group', () => {
    const groups = [
      makeGroup({ groupId: 'g1', groupName: 'Tampa Devs', totalXp: 150 }),
      makeGroup({ groupId: 'g2', groupName: 'React Tampa', totalXp: 75 }),
    ];

    const { q } = renderWithRouter(
      <GroupBadgeSection groups={groups} />,
    );

    expect(q.getByText('150 XP')).toBeInTheDocument();
    expect(q.getByText('75 XP')).toBeInTheDocument();
  });

  it('links group name to the correct URL (/groups/{slug})', () => {
    const groups = [
      makeGroup({ groupSlug: 'tampa-devs', groupName: 'Tampa Devs' }),
    ];

    const { q } = renderWithRouter(
      <GroupBadgeSection groups={groups} />,
    );

    const link = q.getByText('Tampa Devs').closest('a');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/groups/tampa-devs');
  });

  it('first group is expanded by default (badges visible)', () => {
    const firstBadges = [
      makeBadge({ id: 'b1', name: 'Welcome Badge', points: 5 }),
    ];
    const secondBadges = [
      makeBadge({ id: 'b2', name: 'Hidden Badge', points: 10 }),
    ];
    const groups = [
      makeGroup({ groupId: 'g1', groupName: 'First Group', badges: firstBadges }),
      makeGroup({ groupId: 'g2', groupName: 'Second Group', badges: secondBadges }),
    ];

    const { q } = renderWithRouter(
      <GroupBadgeSection groups={groups} />,
    );

    // First group's badge should be visible
    expect(q.getByText('Welcome Badge')).toBeInTheDocument();

    // Second group's badge should NOT be visible (collapsed by default)
    expect(q.queryByText('Hidden Badge')).not.toBeInTheDocument();
  });

  it('renders group initials when no photo URL is provided', () => {
    const groups = [
      makeGroup({ groupName: 'Tampa Devs', groupPhotoUrl: null }),
    ];

    const { q } = renderWithRouter(
      <GroupBadgeSection groups={groups} />,
    );

    // Initials for "Tampa Devs" should be "TD"
    expect(q.getByText('TD')).toBeInTheDocument();
  });

  it('renders group photo when groupPhotoUrl is provided', () => {
    const groups = [
      makeGroup({ groupPhotoUrl: 'https://example.com/photo.jpg' }),
    ];

    const { container } = renderWithRouter(
      <GroupBadgeSection groups={groups} />,
    );

    const img = container.querySelector('img[src="https://example.com/photo.jpg"]');
    expect(img).toBeInTheDocument();
  });

  it('shows badge XP within badge pills', () => {
    const badges = [
      makeBadge({ id: 'b1', name: 'Star Badge', points: 25 }),
    ];
    const groups = [makeGroup({ badges })];

    const { q } = renderWithRouter(
      <GroupBadgeSection groups={groups} />,
    );

    // The badge pill shows "{points} XP" alongside the name
    expect(q.getByText('25 XP')).toBeInTheDocument();
  });

  it('does not show XP in badge pill when points is 0', () => {
    const badges = [
      makeBadge({ id: 'b1', name: 'Zero Badge', points: 0 }),
    ];
    const groups = [makeGroup({ badges, totalXp: 0 })];

    const { q } = renderWithRouter(
      <GroupBadgeSection groups={groups} />,
    );

    expect(q.getByText('Zero Badge')).toBeInTheDocument();
    // "0 XP" appears in the group header for totalXp, but the badge pill should not show "0 XP"
    // The group totalXp text is "0 XP"
    expect(q.getByText('0 XP')).toBeInTheDocument();
  });
});
