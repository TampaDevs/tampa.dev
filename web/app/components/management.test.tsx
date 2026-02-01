import { describe, it, expect } from 'vitest';
import { render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { EventForm } from './EventForm';
import { AttendeeList } from './AttendeeList';
import { QrCodeDisplay } from './QrCodeDisplay';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Render a component inside a React Router context and return scoped queries on the form. */
function renderForm(ui: React.ReactElement) {
  const router = createMemoryRouter(
    [{ path: '/', element: ui }],
    { initialEntries: ['/'] },
  );
  const result = render(<RouterProvider router={router} />);
  const form = result.container.querySelector('form')!;
  return { ...result, form, q: within(form) };
}

/** Render a plain component and return scoped queries on the container's first child. */
function renderComponent(ui: React.ReactElement) {
  const result = render(ui);
  return { ...result, q: within(result.container) };
}

// ─── Attendee fixtures ──────────────────────────────────────────────────────

function makeAttendee(overrides: Partial<{
  rsvpId: string;
  userId: string;
  rsvpStatus: 'confirmed' | 'waitlisted' | 'cancelled';
  checkedIn: boolean;
  checkedInAt: string | null;
  checkinMethod: string | null;
  user: { id: string; name: string | null; username: string | null; avatarUrl: string | null } | null;
}> = {}) {
  return {
    rsvpId: overrides.rsvpId ?? 'rsvp-1',
    userId: overrides.userId ?? 'user-1',
    rsvpStatus: overrides.rsvpStatus ?? 'confirmed',
    checkedIn: overrides.checkedIn ?? false,
    checkedInAt: overrides.checkedInAt ?? null,
    checkinMethod: overrides.checkinMethod ?? null,
    user: overrides.user !== undefined ? overrides.user : {
      id: 'user-1',
      name: 'Alice Smith',
      username: 'alice',
      avatarUrl: null,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EventForm
// ═══════════════════════════════════════════════════════════════════════════

describe('EventForm', () => {
  it('renders all required form fields', () => {
    const { q } = renderForm(<EventForm />);

    // Title
    expect(q.getByLabelText(/title/i)).toBeInTheDocument();
    // Description
    expect(q.getByLabelText(/description/i)).toBeInTheDocument();
    // Start Time
    expect(q.getByLabelText(/start time/i)).toBeInTheDocument();
    // Timezone
    expect(q.getByLabelText(/timezone/i)).toBeInTheDocument();
    // Event Type (fieldset with radio buttons)
    expect(q.getByText('In-Person')).toBeInTheDocument();
    expect(q.getByText('Online')).toBeInTheDocument();
    expect(q.getByText('Hybrid')).toBeInTheDocument();
  });

  it('renders optional form fields (end time, max attendees, photo URL, status)', () => {
    const { q } = renderForm(<EventForm />);

    expect(q.getByLabelText(/end time/i)).toBeInTheDocument();
    expect(q.getByLabelText(/max attendees/i)).toBeInTheDocument();
    expect(q.getByLabelText(/photo url/i)).toBeInTheDocument();
    expect(q.getByLabelText(/status/i)).toBeInTheDocument();
  });

  it('renders venue fields when eventType defaults to "physical"', () => {
    const { q } = renderForm(<EventForm />);

    // Default eventType is "physical", so venue section should be visible
    expect(q.getByLabelText(/venue name/i)).toBeInTheDocument();
    expect(q.getByLabelText(/^address$/i)).toBeInTheDocument();
    expect(q.getByLabelText(/^city$/i)).toBeInTheDocument();
    expect(q.getByLabelText(/^state$/i)).toBeInTheDocument();
  });

  it('renders venue fields when eventType is "hybrid"', () => {
    const { q } = renderForm(
      <EventForm defaultValues={{ eventType: 'hybrid' }} />,
    );

    expect(q.getByLabelText(/venue name/i)).toBeInTheDocument();
    expect(q.getByLabelText(/^address$/i)).toBeInTheDocument();
    expect(q.getByLabelText(/^city$/i)).toBeInTheDocument();
    expect(q.getByLabelText(/^state$/i)).toBeInTheDocument();
  });

  it('does NOT render venue fields when eventType is "online"', () => {
    const { q } = renderForm(
      <EventForm defaultValues={{ eventType: 'online' }} />,
    );

    expect(q.queryByLabelText(/venue name/i)).not.toBeInTheDocument();
    expect(q.queryByLabelText(/^address$/i)).not.toBeInTheDocument();
  });

  it('pre-fills fields when defaultValues is provided', () => {
    const { q } = renderForm(
      <EventForm
        defaultValues={{
          title: 'Tampa.dev Monthly',
          description: 'A great monthly event',
          timezone: 'America/Chicago',
          eventType: 'physical',
          status: 'active',
          maxAttendees: 50,
          photoUrl: 'https://example.com/photo.jpg',
          venue: {
            name: 'Tampa Convention Center',
            address: '333 S Franklin St',
            city: 'Tampa',
            state: 'FL',
          },
        }}
      />,
    );

    expect(q.getByLabelText(/title/i)).toHaveValue('Tampa.dev Monthly');
    expect(q.getByLabelText(/description/i)).toHaveValue('A great monthly event');
    expect(q.getByLabelText(/timezone/i)).toHaveValue('America/Chicago');
    expect(q.getByLabelText(/status/i)).toHaveValue('active');
    expect(q.getByLabelText(/max attendees/i)).toHaveValue(50);
    expect(q.getByLabelText(/photo url/i)).toHaveValue('https://example.com/photo.jpg');
    expect(q.getByLabelText(/venue name/i)).toHaveValue('Tampa Convention Center');
    expect(q.getByLabelText(/^address$/i)).toHaveValue('333 S Franklin St');
    expect(q.getByLabelText(/^city$/i)).toHaveValue('Tampa');
    expect(q.getByLabelText(/^state$/i)).toHaveValue('FL');
  });

  it('shows "Create Event" as the default submit button label', () => {
    const { q } = renderForm(<EventForm />);

    expect(q.getByRole('button', { name: 'Create Event' })).toBeInTheDocument();
  });

  it('shows custom submitLabel when provided', () => {
    const { q } = renderForm(<EventForm submitLabel="Update Event" />);

    expect(q.getByRole('button', { name: 'Update Event' })).toBeInTheDocument();
  });

  it('renders the submit button with type="submit"', () => {
    const { q } = renderForm(<EventForm />);

    const submitButton = q.getByRole('button', { name: 'Create Event' });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveAttribute('type', 'submit');
  });

  it('disables the submit button when isSubmitting is true', () => {
    const { q } = renderForm(<EventForm isSubmitting={true} />);

    const submitButton = q.getByRole('button', { name: 'Saving...' });
    expect(submitButton).toBeDisabled();
  });

  it('displays an error message when error prop is set', () => {
    const { q } = renderForm(<EventForm error="Something went wrong" />);

    expect(q.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('has the "In-Person" radio checked by default', () => {
    const { q } = renderForm(<EventForm />);

    const physicalRadio = q.getByDisplayValue('physical');
    expect(physicalRadio).toBeChecked();
  });

  it('has the correct radio checked when eventType is provided via defaultValues', () => {
    const { q } = renderForm(
      <EventForm defaultValues={{ eventType: 'online' }} />,
    );

    const onlineRadio = q.getByDisplayValue('online');
    expect(onlineRadio).toBeChecked();
  });

  it('hides venue section after switching event type to online', async () => {
    const user = userEvent.setup();
    const { q } = renderForm(<EventForm />);

    // Initially venue section is visible (default is physical)
    expect(q.getByLabelText(/venue name/i)).toBeInTheDocument();

    // Click the "Online" radio button
    await user.click(q.getByDisplayValue('online'));

    // Venue section should now be hidden
    expect(q.queryByLabelText(/venue name/i)).not.toBeInTheDocument();
  });

  it('includes the hidden intent field', () => {
    const { form } = renderForm(
      <EventForm intent="updateEvent" />,
    );

    const intentInput = form.querySelector('input[name="intent"]') as HTMLInputElement;
    expect(intentInput).toBeInTheDocument();
    expect(intentInput).toHaveValue('updateEvent');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AttendeeList
// ═══════════════════════════════════════════════════════════════════════════

describe('AttendeeList', () => {
  it('renders attendee names', () => {
    const attendees = [
      makeAttendee({ rsvpId: 'r1', user: { id: 'u1', name: 'Alice Smith', username: 'alice', avatarUrl: null } }),
      makeAttendee({ rsvpId: 'r2', user: { id: 'u2', name: 'Bob Jones', username: 'bob', avatarUrl: null } }),
    ];

    const { q } = renderComponent(<AttendeeList attendees={attendees} />);

    // Names appear in both the desktop table and the mobile card list
    expect(q.getAllByText('Alice Smith').length).toBeGreaterThanOrEqual(1);
    expect(q.getAllByText('Bob Jones').length).toBeGreaterThanOrEqual(1);
  });

  it('shows RSVP status badges (confirmed, waitlisted, cancelled)', () => {
    const attendees = [
      makeAttendee({ rsvpId: 'r1', rsvpStatus: 'confirmed', user: { id: 'u1', name: 'Alice', username: 'alice', avatarUrl: null } }),
      makeAttendee({ rsvpId: 'r2', rsvpStatus: 'waitlisted', user: { id: 'u2', name: 'Bob', username: 'bob', avatarUrl: null } }),
      makeAttendee({ rsvpId: 'r3', rsvpStatus: 'cancelled', user: { id: 'u3', name: 'Carol', username: 'carol', avatarUrl: null } }),
    ];

    const { q } = renderComponent(<AttendeeList attendees={attendees} />);

    // Badge labels come from STATUS_BADGE mapping — appear in both table and card views
    expect(q.getAllByText('Confirmed').length).toBeGreaterThanOrEqual(1);
    expect(q.getAllByText('Waitlisted').length).toBeGreaterThanOrEqual(1);
    expect(q.getAllByText('Cancelled').length).toBeGreaterThanOrEqual(1);
  });

  it('shows checkin status indicators', () => {
    const attendees = [
      makeAttendee({
        rsvpId: 'r1',
        checkedIn: true,
        checkedInAt: '2025-03-15T18:00:00Z',
        checkinMethod: 'qr',
        user: { id: 'u1', name: 'Alice', username: 'alice', avatarUrl: null },
      }),
      makeAttendee({
        rsvpId: 'r2',
        checkedIn: false,
        user: { id: 'u2', name: 'Bob', username: 'bob', avatarUrl: null },
      }),
    ];

    const { q } = renderComponent(<AttendeeList attendees={attendees} />);

    // The mobile card view renders "Checked in" / "Not checked in" text
    // Both desktop and mobile views are rendered, so use getAllBy
    expect(q.getAllByText('Checked in').length).toBeGreaterThanOrEqual(1);
    expect(q.getAllByText('Not checked in').length).toBeGreaterThanOrEqual(1);
  });

  it('shows checkin method badge', () => {
    const attendees = [
      makeAttendee({
        rsvpId: 'r1',
        checkedIn: true,
        checkedInAt: '2025-03-15T18:00:00Z',
        checkinMethod: 'qr',
        user: { id: 'u1', name: 'Alice', username: 'alice', avatarUrl: null },
      }),
    ];

    const { q } = renderComponent(<AttendeeList attendees={attendees} />);

    // "QR" label from CheckinMethodBadge (appears in both table and card)
    expect(q.getAllByText('QR').length).toBeGreaterThanOrEqual(1);
  });

  it('shows "No attendees yet." message when list is empty', () => {
    const { q } = renderComponent(<AttendeeList attendees={[]} />);

    expect(q.getByText('No attendees yet.')).toBeInTheDocument();
  });

  it('does not render the table or card list when there are no attendees', () => {
    const { container } = renderComponent(<AttendeeList attendees={[]} />);

    expect(container.querySelector('table')).not.toBeInTheDocument();
  });

  it('renders summary counts', () => {
    const attendees = [
      makeAttendee({ rsvpId: 'r1', rsvpStatus: 'confirmed', checkedIn: true, user: { id: 'u1', name: 'Alice', username: 'alice', avatarUrl: null } }),
      makeAttendee({ rsvpId: 'r2', rsvpStatus: 'confirmed', checkedIn: true, user: { id: 'u2', name: 'Bob', username: 'bob', avatarUrl: null } }),
      makeAttendee({ rsvpId: 'r3', rsvpStatus: 'waitlisted', checkedIn: false, user: { id: 'u3', name: 'Carol', username: 'carol', avatarUrl: null } }),
      makeAttendee({ rsvpId: 'r4', rsvpStatus: 'cancelled', checkedIn: false, user: { id: 'u4', name: 'Dave', username: 'dave', avatarUrl: null } }),
    ];

    const { q } = renderComponent(<AttendeeList attendees={attendees} />);

    expect(q.getByText('2 confirmed')).toBeInTheDocument();
    expect(q.getByText('1 waitlisted')).toBeInTheDocument();
    expect(q.getByText('2 checked in')).toBeInTheDocument();
  });

  it('renders usernames when both name and username are present', () => {
    const attendees = [
      makeAttendee({
        rsvpId: 'r1',
        user: { id: 'u1', name: 'Alice Smith', username: 'alicedev', avatarUrl: null },
      }),
    ];

    const { q } = renderComponent(<AttendeeList attendees={attendees} />);

    // "@alicedev" is rendered as secondary text when name is also present
    expect(q.getAllByText('@alicedev').length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Unknown" when user object is null', () => {
    const attendees = [
      makeAttendee({ rsvpId: 'r1', user: null }),
    ];

    const { q } = renderComponent(<AttendeeList attendees={attendees} />);

    expect(q.getAllByText('Unknown').length).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// QrCodeDisplay
// ═══════════════════════════════════════════════════════════════════════════

describe('QrCodeDisplay', () => {
  const testUrl = 'https://events.tampa.dev/checkin/evt-123';

  it('renders an img element with the QR code URL', () => {
    const { q } = renderComponent(<QrCodeDisplay value={testUrl} />);

    const img = q.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img.tagName).toBe('IMG');
  });

  it('includes the correct URL in the src attribute', () => {
    const { q } = renderComponent(<QrCodeDisplay value={testUrl} size={300} />);

    const img = q.getByRole('img');
    const expectedSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(testUrl)}`;
    expect(img).toHaveAttribute('src', expectedSrc);
  });

  it('uses the default size of 200 when not specified', () => {
    const { q } = renderComponent(<QrCodeDisplay value={testUrl} />);

    const img = q.getByRole('img');
    const expectedSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(testUrl)}`;
    expect(img).toHaveAttribute('src', expectedSrc);
  });

  it('sets proper width and height attributes on the image', () => {
    const { q } = renderComponent(<QrCodeDisplay value={testUrl} size={250} />);

    const img = q.getByRole('img');
    expect(img).toHaveAttribute('width', '250');
    expect(img).toHaveAttribute('height', '250');
  });

  it('shows the URL text below the QR code', () => {
    const { q } = renderComponent(<QrCodeDisplay value={testUrl} />);

    expect(q.getByText(testUrl)).toBeInTheDocument();
  });

  it('truncates long URLs in the display text', () => {
    const longUrl = 'https://events.tampa.dev/checkin/this-is-a-very-long-event-identifier-that-exceeds-sixty-characters-total';
    const { q } = renderComponent(<QrCodeDisplay value={longUrl} />);

    // The component truncates to 57 chars + "..."
    const truncated = longUrl.slice(0, 57) + '...';
    expect(q.getByText(truncated)).toBeInTheDocument();
  });

  it('sets the full URL as the title attribute on the paragraph', () => {
    const { q } = renderComponent(<QrCodeDisplay value={testUrl} />);

    const paragraph = q.getByTitle(testUrl);
    expect(paragraph).toBeInTheDocument();
  });

  it('sets the alt text with the value', () => {
    const { q } = renderComponent(<QrCodeDisplay value={testUrl} />);

    const img = q.getByRole('img');
    expect(img).toHaveAttribute('alt', `QR code for ${testUrl}`);
  });

  it('renders a download link', () => {
    const { q } = renderComponent(<QrCodeDisplay value={testUrl} />);

    const downloadLink = q.getByText('Download QR').closest('a');
    expect(downloadLink).toBeInTheDocument();
    expect(downloadLink).toHaveAttribute('target', '_blank');
    expect(downloadLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('applies custom className', () => {
    const { container } = renderComponent(
      <QrCodeDisplay value={testUrl} className="my-custom-class" />,
    );

    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass('my-custom-class');
  });
});
