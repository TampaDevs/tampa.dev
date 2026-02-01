import { describe, it, expect, afterEach } from 'vitest';
import { render, within, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmojiSelect, type EmojiSelectOption } from './EmojiSelect';

afterEach(cleanup);

// ─── Fixtures ──────────────────────────────────────────────────────────────

const badgeOptions: EmojiSelectOption[] = [
  { value: 'explorer', label: 'Explorer', emoji: '🔍' },
  { value: 'contributor', label: 'Contributor', emoji: '🛠️' },
  { value: 'champion', label: 'Champion', emoji: '🏆' },
];

const achievementOptions: EmojiSelectOption[] = [
  { value: '', label: 'None (badge only)' },
  { value: 'ach-1', label: 'First Event', emoji: '⭐' },
  { value: 'ach-2', label: 'Social Butterfly', emoji: '🦋' },
];

/**
 * Render inside a <form> to test hidden input for form submission.
 * Uses container-scoped queries to avoid cross-test leakage.
 */
function renderInForm(ui: React.ReactElement) {
  const result = render(<form>{ui}</form>);
  const form = result.container.querySelector('form') as HTMLFormElement;
  const scoped = within(result.container);
  return { ...result, ...scoped, form };
}

/** Get the hidden input's current value (the value submitted with the form). */
function getFormValue(form: HTMLFormElement, fieldName: string): string {
  const input = form.querySelector(`input[name="${fieldName}"]`) as HTMLInputElement;
  return input?.value ?? '';
}

// ═══════════════════════════════════════════════════════════════════════════
// Select mode (default, freeform=false)
// ═══════════════════════════════════════════════════════════════════════════

describe('EmojiSelect (select mode)', () => {
  it('renders a trigger button with placeholder text when no default value', () => {
    const { getByRole } = renderInForm(
      <EmojiSelect name="badge" options={badgeOptions} />,
    );
    const button = getByRole('combobox');
    expect(button.textContent).toContain('Select');
  });

  it('renders a trigger button showing the selected option when defaultValue is set', () => {
    const { getByRole } = renderInForm(
      <EmojiSelect name="badge" options={badgeOptions} defaultValue="champion" />,
    );
    const button = getByRole('combobox');
    expect(button.textContent).toContain('Champion');
  });

  it('carries the selected value in a hidden input for form submission', () => {
    const { form } = renderInForm(
      <EmojiSelect name="badgeId" options={badgeOptions} defaultValue="explorer" />,
    );
    expect(getFormValue(form, 'badgeId')).toBe('explorer');
  });

  it('opens dropdown when trigger is clicked', async () => {
    const user = userEvent.setup();
    const { getByRole, queryByRole } = renderInForm(
      <EmojiSelect name="badge" options={badgeOptions} />,
    );

    // Dropdown should be closed initially
    expect(queryByRole('listbox')).toBeNull();

    // Click the trigger button
    await user.click(getByRole('combobox'));

    // Dropdown should now be open
    expect(getByRole('listbox')).toBeInTheDocument();
  });

  it('shows all options in the dropdown', async () => {
    const user = userEvent.setup();
    const { getByRole } = renderInForm(
      <EmojiSelect name="badge" options={badgeOptions} />,
    );

    await user.click(getByRole('combobox'));
    const listbox = getByRole('listbox');
    const options = within(listbox).getAllByRole('option');

    expect(options).toHaveLength(3);
    expect(options[0].textContent).toContain('Explorer');
    expect(options[1].textContent).toContain('Contributor');
    expect(options[2].textContent).toContain('Champion');
  });

  it('renders Emoji images in dropdown options', async () => {
    const user = userEvent.setup();
    const { getByRole } = renderInForm(
      <EmojiSelect name="badge" options={badgeOptions} />,
    );

    await user.click(getByRole('combobox'));
    const listbox = getByRole('listbox');

    // Each option with an emoji should contain an <img> element
    const images = listbox.querySelectorAll('img');
    expect(images.length).toBe(3);
    expect(images[0].alt).toBe('🔍');
    expect(images[2].alt).toBe('🏆');
  });

  it('selects an option on click and closes the dropdown', async () => {
    const user = userEvent.setup();
    const { getByRole, queryByRole, form } = renderInForm(
      <EmojiSelect name="badgeId" options={badgeOptions} />,
    );

    await user.click(getByRole('combobox'));
    const listbox = getByRole('listbox');
    const options = within(listbox).getAllByRole('option');

    // Click the "Champion" option
    fireEvent.mouseDown(options[2]);

    // Dropdown should close
    expect(queryByRole('listbox')).toBeNull();

    // Trigger should show the selected option
    expect(getByRole('combobox').textContent).toContain('Champion');

    // Hidden input should carry the selected value
    expect(getFormValue(form, 'badgeId')).toBe('champion');
  });

  it('filters options when typing in the search input', async () => {
    const user = userEvent.setup();
    const { getByRole } = renderInForm(
      <EmojiSelect name="badge" options={badgeOptions} />,
    );

    await user.click(getByRole('combobox'));

    // The search input appears inside the dropdown
    const searchInput = getByRole('listbox')
      .closest('.absolute')!
      .querySelector('input[type="text"]')!;

    await user.type(searchInput, 'cham');

    const listbox = getByRole('listbox');
    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toContain('Champion');
  });

  it('shows "No matches" when search has no results', async () => {
    const user = userEvent.setup();
    const { getByRole } = renderInForm(
      <EmojiSelect name="badge" options={badgeOptions} />,
    );

    await user.click(getByRole('combobox'));

    const searchInput = getByRole('listbox')
      .closest('.absolute')!
      .querySelector('input[type="text"]')!;

    await user.type(searchInput, 'zzzzz');

    const listbox = getByRole('listbox');
    expect(within(listbox).queryAllByRole('option')).toHaveLength(0);
    expect(listbox.textContent).toContain('No matches');
  });

  it('supports options without emoji (plain text)', async () => {
    const user = userEvent.setup();
    const { getByRole } = renderInForm(
      <EmojiSelect name="ach" options={achievementOptions} />,
    );

    await user.click(getByRole('combobox'));
    const listbox = getByRole('listbox');
    const options = within(listbox).getAllByRole('option');

    // First option ("None") has no emoji, so no <img> inside it
    expect(options[0].querySelector('img')).toBeNull();
    expect(options[0].textContent).toContain('None (badge only)');

    // Second option has an emoji
    expect(options[1].querySelector('img')).not.toBeNull();
  });

  it('selects option via Enter key after arrow navigation', async () => {
    const user = userEvent.setup();
    const { getByRole, form } = renderInForm(
      <EmojiSelect name="badgeId" options={badgeOptions} />,
    );

    const trigger = getByRole('combobox');
    trigger.focus();

    // Open with ArrowDown
    await user.keyboard('{ArrowDown}');
    expect(getByRole('listbox')).toBeInTheDocument();

    // Navigate down to "Contributor" (index 1)
    await user.keyboard('{ArrowDown}');

    // Select with Enter
    await user.keyboard('{Enter}');

    expect(getFormValue(form, 'badgeId')).toBe('contributor');
    expect(trigger.textContent).toContain('Contributor');
  });

  it('closes dropdown on Escape', async () => {
    const user = userEvent.setup();
    const { getByRole, queryByRole } = renderInForm(
      <EmojiSelect name="badge" options={badgeOptions} />,
    );

    await user.click(getByRole('combobox'));
    expect(getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(queryByRole('listbox')).toBeNull();
  });

  it('shows a checkmark on the currently selected option', async () => {
    const user = userEvent.setup();
    const { getByRole } = renderInForm(
      <EmojiSelect name="badge" options={badgeOptions} defaultValue="contributor" />,
    );

    await user.click(getByRole('combobox'));
    const listbox = getByRole('listbox');
    const options = within(listbox).getAllByRole('option');

    // The selected option ("Contributor", index 1) should have aria-selected=true
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    // It should contain a checkmark SVG
    expect(options[1].querySelector('svg')).not.toBeNull();

    // Non-selected options should not
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
    expect(options[0].querySelector('svg')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Freeform mode (combobox, freeform=true)
// ═══════════════════════════════════════════════════════════════════════════

describe('EmojiSelect (freeform mode)', () => {
  it('renders an input with defaultValue', () => {
    const { getByRole } = renderInForm(
      <EmojiSelect name="slug" options={badgeOptions} defaultValue="explorer" freeform />,
    );
    const input = getByRole('combobox') as HTMLInputElement;
    expect(input.tagName).toBe('INPUT');
    expect(input.value).toBe('explorer');
  });

  it('carries the current value in a hidden input', () => {
    const { form } = renderInForm(
      <EmojiSelect name="badgeSlug" options={badgeOptions} defaultValue="champion" freeform />,
    );
    expect(getFormValue(form, 'badgeSlug')).toBe('champion');
  });

  it('opens dropdown on focus', async () => {
    const user = userEvent.setup();
    const { getByRole } = renderInForm(
      <EmojiSelect name="slug" options={badgeOptions} freeform />,
    );

    await user.click(getByRole('combobox'));
    expect(getByRole('listbox')).toBeInTheDocument();
  });

  it('filters suggestions as the user types', async () => {
    const user = userEvent.setup();
    const { getByRole } = renderInForm(
      <EmojiSelect name="slug" options={badgeOptions} freeform />,
    );

    const input = getByRole('combobox');
    await user.click(input);
    await user.clear(input);
    await user.type(input, 'exp');

    const listbox = getByRole('listbox');
    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toContain('Explorer');
  });

  it('updates the hidden form value as the user types', async () => {
    const user = userEvent.setup();
    const { getByRole, form } = renderInForm(
      <EmojiSelect name="badgeSlug" options={badgeOptions} freeform />,
    );

    const input = getByRole('combobox');
    await user.click(input);
    await user.clear(input);
    await user.type(input, 'my-new-slug');

    expect(getFormValue(form, 'badgeSlug')).toBe('my-new-slug');
  });

  it('allows selecting a suggestion by clicking it', async () => {
    const user = userEvent.setup();
    const { getByRole, form } = renderInForm(
      <EmojiSelect name="badgeSlug" options={badgeOptions} freeform />,
    );

    await user.click(getByRole('combobox'));
    const listbox = getByRole('listbox');
    const options = within(listbox).getAllByRole('option');

    fireEvent.mouseDown(options[1]); // "Contributor"

    const input = getByRole('combobox') as HTMLInputElement;
    expect(input.value).toBe('contributor');
    expect(getFormValue(form, 'badgeSlug')).toBe('contributor');
  });

  it('accepts a typed value that is not in the options list', async () => {
    const user = userEvent.setup();
    const { getByRole, form } = renderInForm(
      <EmojiSelect name="badgeSlug" options={badgeOptions} freeform />,
    );

    const input = getByRole('combobox');
    await user.click(input);
    await user.clear(input);
    await user.type(input, 'brand-new-badge');

    // The typed value should be in the hidden input even though it's not a known option
    expect(getFormValue(form, 'badgeSlug')).toBe('brand-new-badge');
  });

  it('shows "No matches" hint when no options match in freeform mode', async () => {
    const user = userEvent.setup();
    const { getByRole } = renderInForm(
      <EmojiSelect name="slug" options={badgeOptions} freeform />,
    );

    const input = getByRole('combobox');
    await user.click(input);
    await user.clear(input);
    await user.type(input, 'zzzzz');

    const listbox = getByRole('listbox');
    expect(within(listbox).queryAllByRole('option')).toHaveLength(0);
    expect(listbox.textContent).toContain('value will be used as-is');
  });

  it('selects suggestion via keyboard (ArrowDown + Enter)', async () => {
    const user = userEvent.setup();
    const { getByRole, form } = renderInForm(
      <EmojiSelect name="badgeSlug" options={badgeOptions} freeform />,
    );

    const input = getByRole('combobox');
    await user.click(input);
    await user.clear(input);

    // Dropdown opens with highlight at index 0 ("Explorer").
    // Enter selects the currently highlighted option.
    await user.keyboard('{Enter}');

    expect((input as HTMLInputElement).value).toBe('explorer');
    expect(getFormValue(form, 'badgeSlug')).toBe('explorer');
  });

  it('closes dropdown on Escape without changing value', async () => {
    const user = userEvent.setup();
    const { getByRole, queryByRole, form } = renderInForm(
      <EmojiSelect name="badgeSlug" options={badgeOptions} defaultValue="explorer" freeform />,
    );

    await user.click(getByRole('combobox'));
    expect(getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(queryByRole('listbox')).toBeNull();
    expect(getFormValue(form, 'badgeSlug')).toBe('explorer');
  });
});
