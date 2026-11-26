'use server';

import { z } from 'zod';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, isAdminConfigured } from '@/lib/supabase/admin';
import { normaliseWhatsAppNumber } from './phone';
import { WHATSAPP_CONSENT_TEXT } from './whatsapp-consent';

export interface EnquiryState {
  error?: string;
  success?: string;
}

const enquirySchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(120),
  email: z.string().trim().email('Enter a valid email address.').max(254),
  organisation: z.string().trim().max(120).optional(),
  topic: z.enum([
    'general',
    'market-partnership',
    'api',
    'report',
    'pricing',
    'data-correction',
  ]),
  message: z.string().trim().min(10, 'Please give us a little more detail.').max(5000),
});

export async function submitEnquiry(
  _prev: EnquiryState,
  formData: FormData,
): Promise<EnquiryState> {
  const parsed = enquirySchema.safeParse({
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    organisation: String(formData.get('organisation') ?? '') || undefined,
    topic: String(formData.get('topic') ?? 'general'),
    message: String(formData.get('message') ?? ''),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check your details and try again.' };
  }

  if (!isSupabaseConfigured()) {
    return {
      error:
        'This deployment has no database configured, so the enquiry could not be stored. Please email info@agripricelive.com instead.',
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('contact_enquiries').insert({
    name: parsed.data.name,
    email: parsed.data.email,
    organisation: parsed.data.organisation ?? null,
    topic: parsed.data.topic,
    message: parsed.data.message,
  });

  if (error) {
    // Never surface the raw database error to the visitor.
    console.error('contact_enquiries insert failed:', error.message);
    return {
      error: 'We could not send your message right now. Please email info@agripricelive.com.',
    };
  }

  return { success: 'Your enquiry has been logged and routed to the right person.' };
}

/* ==========================================================================
 * WhatsApp alerts — the homepage waitlist
 * ======================================================================== */

export interface WhatsAppAlertsState {
  error?: string;
  success?: string;
}

/**
 * Add a visitor to the WhatsApp alerts list.
 *
 * Three things are true of every path through this function:
 *
 *  - **Nothing is claimed that did not happen.** If the number could not be
 *    stored — no database, no service key, a database refusal — the visitor is
 *    told that, rather than shown a thank-you for a row that does not exist.
 *  - **Consent is required and recorded.** The checkbox is checked here as well
 *    as in the browser, and the wording that was agreed to is written into the
 *    row beside the timestamp.
 *  - **The number is normalised first.** The row holds E.164, so the same person
 *    cannot end up on the list twice under two spellings.
 *
 * The write uses the service role because `whatsapp_subscribers` has no policy
 * for the browser: RLS keeps the list closed, and this function is the only
 * door into it.
 */
export async function joinWhatsAppAlerts(
  _prev: WhatsAppAlertsState,
  formData: FormData,
): Promise<WhatsAppAlertsState> {
  if (String(formData.get('consent') ?? '') !== 'on') {
    return { error: 'Please tick the box to confirm you agree to be messaged on WhatsApp.' };
  }

  const entered = String(formData.get('phone') ?? '');
  const number = normaliseWhatsAppNumber(entered);
  if (!number.ok) return { error: number.reason };

  // The table is written with the service role, so a deployment without one is
  // a failure to store — not something to paper over with a success message.
  if (!isAdminConfigured()) {
    return {
      error:
        'The alerts list is not connected in this deployment, so your number was not stored.',
    };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('whatsapp_subscribers').upsert(
      {
        phone_e164: number.e164,
        phone_entered: entered.trim().slice(0, 40),
        // A submission is a fresh opt-in: someone who had unsubscribed and has
        // now asked again belongs back on the waiting list, not in limbo.
        status: 'pending',
        consent_at: new Date().toISOString(),
        consent_text: WHATSAPP_CONSENT_TEXT,
        source: 'homepage',
      },
      { onConflict: 'phone_e164' },
    );
    if (error) throw error;
  } catch (failure) {
    // Never surface a database message to the visitor.
    console.error(
      'whatsapp_subscribers upsert failed:',
      failure instanceof Error ? failure.message : failure,
    );
    return {
      error:
        'We could not save your number just now. Please try again, or email info@agripricelive.com.',
    };
  }

  return {
    success:
      'You are on the list. We will message you on WhatsApp when alerts open — nothing is sent before then.',
  };
}
