'use server';

import { z } from 'zod';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';

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
