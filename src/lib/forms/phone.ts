/**
 * WhatsApp numbers.
 *
 * A phone number typed by a person arrives in whatever shape they are used to:
 * `0803 123 4567`, `+234 803 123 4567`, `2348031234567`, `0803-123-4567`. The
 * database stores one canonical value — E.164 — so the same person cannot be
 * held twice under two spellings, and so a future messaging provider receives
 * something it can dial.
 *
 * The rules below are deliberately generous about the *format* and strict about
 * the *number*: separators and a stray trunk zero are forgiven because they are
 * conventions, but a Nigerian mobile number must have a real mobile prefix, and
 * an international number must carry its country code.
 */

export type PhoneResult = { ok: true; e164: string } | { ok: false; reason: string };

/** A Nigerian mobile number after the country code: 8031234567, 703…, 913…. */
const NIGERIAN_MOBILE = /^[789]\d{9}$/;

/** E.164 without the plus: 8 to 15 digits, no leading zero. */
const E164_DIGITS = /^[1-9]\d{7,14}$/;

/**
 * Reduce a typed number to E.164, or explain what is wrong with it.
 *
 * The reason is written to be shown to the visitor directly: it names the fix
 * rather than the rule.
 */
export function normaliseWhatsAppNumber(input: string | null | undefined): PhoneResult {
  const entered = (input ?? '').trim();

  if (!entered) {
    return { ok: false, reason: 'Enter your WhatsApp number.' };
  }

  // Spaces (including non-breaking), dashes, dots, brackets and slashes are
  // how people space a number out. They are not part of it.
  const compact = entered.replace(/[\s\u00A0\u202F.\-–—()/]/g, '');

  if (!/^\+?\d+$/.test(compact)) {
    return { ok: false, reason: 'Use digits only — for example 0803 123 4567.' };
  }

  const international = compact.startsWith('+');
  let digits = compact.replace(/^\+/, '');

  // 00 is the older international prefix, still common on landlines.
  const dialledInternationally = international || digits.startsWith('00');
  if (digits.startsWith('00')) digits = digits.replace(/^00/, '');

  if (digits.length < 7) {
    return {
      ok: false,
      reason: 'That number is too short. Include the full number, e.g. 0803 123 4567.',
    };
  }

  if (digits.length > 15) {
    return { ok: false, reason: 'That number is too long to be a phone number.' };
  }

  // Nigerian numbers, whether or not the country code was typed.
  if (digits.startsWith('234')) {
    const national = stripTrunkZero(digits.slice(3));
    if (NIGERIAN_MOBILE.test(national)) return { ok: true, e164: `+234${national}` };
    return {
      ok: false,
      reason:
        'That does not look like a Nigerian mobile number. Check the digits, or enter it with the country code.',
    };
  }

  // A local number with, or without, its leading zero.
  if (!dialledInternationally && (digits.length === 11 || digits.length === 10)) {
    const national = stripTrunkZero(digits);
    if (NIGERIAN_MOBILE.test(national)) return { ok: true, e164: `+234${national}` };
    return {
      ok: false,
      reason:
        'That does not look like a Nigerian mobile number. Check the digits, or enter it with the country code.',
    };
  }

  // Anything else is only a number if it says which country it belongs to.
  if (dialledInternationally && E164_DIGITS.test(digits)) {
    return { ok: true, e164: `+${digits}` };
  }

  return {
    ok: false,
    reason: 'Add the country code, starting with + (for example +44 7700 900123).',
  };
}

/** `0803…` and `803…` are the same number. */
function stripTrunkZero(national: string): string {
  return national.replace(/^0+/, '');
}
