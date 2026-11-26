// @vitest-environment jsdom
/**
 * The WhatsApp alerts segment.
 *
 * What is asserted here is the part a screenshot cannot show: that the segment
 * asks for consent before it asks for anything else, that a failure is announced
 * as a failure rather than dressed up as a thank-you, and that the confirmation
 * a visitor sees is the one the action actually returned.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const joinWhatsAppAlerts = vi.fn();

vi.mock('@/lib/forms/actions', () => ({
  joinWhatsAppAlerts: (...args: unknown[]) => joinWhatsAppAlerts(...args),
}));

import { WhatsAppAlerts } from '@/components/homepage/WhatsAppAlerts';
import { WHATSAPP_CONSENT_TEXT } from '@/lib/forms/whatsapp-consent';

function submit() {
  const form = screen.getByRole('button', { name: /alerts list/i }).closest('form');
  if (!form) throw new Error('the segment has no form to submit');
  fireEvent.submit(form);
}

describe('WhatsApp alerts segment', () => {
  afterEach(() => {
    cleanup();
    joinWhatsAppAlerts.mockReset();
  });

  it('asks for a number and for consent, in the words that will be stored', () => {
    render(<WhatsAppAlerts />);

    expect(screen.getByLabelText(/whatsapp number/i)).toHaveProperty('type', 'tel');
    expect(screen.getByLabelText(WHATSAPP_CONSENT_TEXT)).toHaveProperty('type', 'checkbox');

    // The waitlist is described as a waitlist: nothing claims delivery is live.
    expect(screen.getByText(/when the channel opens/i)).toBeDefined();
    expect(screen.queryByText(/instant/i)).toBeNull();
  });

  it('announces a refusal from the action instead of pretending it worked', async () => {
    joinWhatsAppAlerts.mockResolvedValue({
      error: 'The alerts list is not connected in this deployment, so your number was not stored.',
    });

    render(<WhatsAppAlerts />);
    submit();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/not stored/i);
    // The form stays on screen so the visitor can try again.
    expect(screen.getByLabelText(/whatsapp number/i)).toBeDefined();
  });

  it('replaces the form with the confirmation the action returned', async () => {
    joinWhatsAppAlerts.mockResolvedValue({
      success: 'You are on the list. We will message you when alerts open.',
    });

    render(<WhatsAppAlerts />);
    submit();

    const status = await screen.findByRole('status');
    expect(status.textContent).toMatch(/on the list/i);
    expect(status.textContent).toMatch(/when alerts open/i);
    await waitFor(() => expect(screen.queryByLabelText(/whatsapp number/i)).toBeNull());
  });
});
