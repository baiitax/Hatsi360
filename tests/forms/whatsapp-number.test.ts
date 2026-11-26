import { describe, expect, it } from 'vitest';

import { normaliseWhatsAppNumber } from '@/lib/forms/phone';

/**
 * A number has one canonical form.
 *
 * The point of these cases is that the same person is the same row: someone who
 * types `0803 123 4567`, `+234 803 123 4567` and `2348031234567` must land on
 * `+2348031234567` every time, or the list quietly fills with duplicates.
 */
describe('normaliseWhatsAppNumber', () => {
  const canonical = '+2348031234567';

  it.each([
    ['08031234567', 'local, no separators'],
    ['0803 123 4567', 'local, spaced'],
    ['0803-123-4567', 'local, dashed'],
    ['0803.123.4567', 'local, dotted'],
    ['(0803) 123 4567', 'local, bracketed'],
    ['+2348031234567', 'international, plus'],
    ['+234 803 123 4567', 'international, spaced'],
    ['2348031234567', 'international, no plus'],
    ['002348031234567', 'international, 00 prefix'],
    ['8031234567', 'local without its trunk zero'],
    ['+23408031234567', 'country code followed by a stray zero'],
    ['  0803 123 4567  ', 'surrounded by spaces'],
  ])('reads %s as the same number (%s)', (input) => {
    expect(normaliseWhatsAppNumber(input)).toEqual({ ok: true, e164: canonical });
  });

  it('accepts other countries only when the country code is given', () => {
    expect(normaliseWhatsAppNumber('+44 7700 900123')).toEqual({
      ok: true,
      e164: '+447700900123',
    });
    expect(normaliseWhatsAppNumber('+233 24 123 4567')).toEqual({
      ok: true,
      e164: '+233241234567',
    });
  });

  it('refuses a number that is not a Nigerian mobile prefix', () => {
    // 0701… is a landline-style prefix; 201… is not a mobile at all.
    const result = normaliseWhatsAppNumber('02012345678');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/Nigerian mobile/);
  });

  it('refuses letters rather than guessing', () => {
    const result = normaliseWhatsAppNumber('0803 CALL ME');
    expect(result.ok).toBe(false);
if (!result.ok) expect(result.reason).toMatch(/digits only/);
  });

  it('refuses a number that is too short or too long', () => {
    expect(normaliseWhatsAppNumber('080312').ok).toBe(false);
    expect(normaliseWhatsAppNumber('+234803123456789012').ok).toBe(false);
  });

  it('asks for a country code when the shape is ambiguous', () => {
    const result = normaliseWhatsAppNumber('12345678');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/country code/);
  });

  it('asks for a number when the field is empty', () => {
    const result = normaliseWhatsAppNumber('   ');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/Enter your WhatsApp number/);
  });
});
