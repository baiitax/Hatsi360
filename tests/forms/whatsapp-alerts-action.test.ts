import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The WhatsApp waitlist write path.
 *
 * The value of this test is in the *failures*: a form that thanks a visitor for
 * a row that was never written is the kind of dishonesty the rest of this
 * application is careful to avoid, so every way of failing is asserted to
 * produce a message that says nothing was stored.
 */

const upsert = vi.fn();
const from = vi.fn(() => ({ upsert }));
const createAdminClient = vi.fn(() => ({ from }));
const isAdminConfigured = vi.fn(() => true);

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient, isAdminConfigured }));

const { joinWhatsAppAlerts } = await import('@/lib/forms/actions');
const { WHATSAPP_CONSENT_TEXT } = await import('@/lib/forms/whatsapp-consent');

function submission(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const VALID = { phone: '0803 123 4567', consent: 'on' };

describe('joinWhatsAppAlerts', () => {
  beforeEach(() => {
    isAdminConfigured.mockReturnValue(true);
    upsert.mockReset();
    upsert.mockResolvedValue({ error: null });
    from.mockClear();
    createAdminClient.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stores the number in E.164 with the consent that was given', async () => {
    const state = await joinWhatsAppAlerts({}, submission(VALID));

    expect(state.error).toBeUndefined();
    expect(state.success).toMatch(/on the list/i);

    expect(from).toHaveBeenCalledWith('whatsapp_subscribers');
    const [row, options] = upsert.mock.calls[0];
    expect(row.phone_e164).toBe('+2348031234567');
    expect(row.phone_entered).toBe('0803 123 4567');
    // The wording stored is the wording displayed, not a paraphrase.
    expect(row.consent_text).toBe(WHATSAPP_CONSENT_TEXT);
    expect(typeof row.consent_at).toBe('string');
    expect(options).toEqual({ onConflict: 'phone_e164' });
  });

  it('will not store a number without consent, and says so', async () => {
    const state = await joinWhatsAppAlerts({}, submission({ phone: '0803 123 4567' }));

    expect(state.success).toBeUndefined();
    expect(state.error).toMatch(/tick the box/i);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('refuses an unusable number without touching the database', async () => {
    const state = await joinWhatsAppAlerts({}, submission({ phone: '0803 CALL', consent: 'on' }));

    expect(state.error).toMatch(/digits only/i);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('reports that nothing was stored when the deployment has no service role', async () => {
    isAdminConfigured.mockReturnValue(false);
    const state = await joinWhatsAppAlerts({}, submission(VALID));

    expect(state.success).toBeUndefined();
    expect(state.error).toMatch(/not stored/i);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('reports a database refusal without leaking it to the visitor', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    upsert.mockResolvedValue({ error: { message: 'duplicate key value violates unique constraint' } });

    const state = await joinWhatsAppAlerts({}, submission(VALID));

    expect(state.success).toBeUndefined();
    expect(state.error).toMatch(/could not save/i);
    expect(state.error).not.toMatch(/constraint|duplicate key/i);
    // The detail is kept in the server log, where it belongs.
    expect(consoleError).toHaveBeenCalled();
  });

  it('reports rather than throws when the client cannot be created', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    createAdminClient.mockImplementation(() => {
      throw new Error('Supabase admin access is not configured.');
    });

    const state = await joinWhatsAppAlerts({}, submission(VALID));

    expect(state.success).toBeUndefined();
    expect(state.error).toMatch(/could not save/i);
    expect(consoleError).toHaveBeenCalled();
  });
});
