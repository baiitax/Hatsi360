/**
 * Hatsi360 Field — the labels the agent app shares with the browser.
 *
 * This module holds no data and no server code: it is the vocabulary of the
 * field app, imported by both the server components and the client
 * components that render them. Keeping it separate from the data layer is
 * what allows a phone-sized form to show the same wording as the screens
 * that list a price, without pulling the server-only module into the
 * browser bundle.
 */

/** The price types an agent may record, with the wording shown on screen. */
export const FIELD_PRICE_TYPES: { value: string; label: string; short: string }[] = [
  { value: 'farmgate', label: 'Farmgate price', short: 'Farmgate' },
  { value: 'wholesale_asking', label: 'Wholesale asking price', short: 'Wholesale ask' },
  { value: 'wholesale_transaction', label: 'Wholesale transaction price', short: 'Wholesale' },
  { value: 'retail', label: 'Retail price', short: 'Retail' },
  { value: 'processor_procurement', label: 'Processor procurement price', short: 'Processor' },
  { value: 'export_buy', label: 'Exporter buying offer', short: 'Exporter buy' },
  { value: 'export_sell', label: 'Exporter selling offer', short: 'Exporter sell' },
  { value: 'indicative', label: 'Indicative market price', short: 'Indicative' },
];

export function priceTypeLabel(value: string): string {
  return FIELD_PRICE_TYPES.find((type) => type.value === value)?.label ?? value.replace(/_/g, ' ');
}

export function priceTypeShort(value: string): string {
  return FIELD_PRICE_TYPES.find((type) => type.value === value)?.short ?? value.replace(/_/g, ' ');
}

/** The verification states an agent sees on their own records. */
export const FIELD_VERIFICATION_LABEL: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  pending_verification: 'Awaiting review',
  verified: 'Approved',
  rejected: 'Rejected',
  correction_requested: 'Correction required',
  legacy_unverified: 'Legacy — unverified',
};

export function verificationLabel(status: string): string {
  return FIELD_VERIFICATION_LABEL[status] ?? status.replace(/_/g, ' ');
}

/** The states a collection task can be in, with the wording shown on screen. */
export const FIELD_TASK_STATUS_LABEL: Record<string, string> = {
  open: 'To do',
  in_progress: 'In progress',
  submitted: 'Submitted',
  awaiting_review: 'Awaiting review',
  correction_required: 'Correction required',
  completed: 'Completed',
  cancelled: 'Cancelled',
  skipped: 'Skipped',
};

export function taskStatusLabel(status: string): string {
  return FIELD_TASK_STATUS_LABEL[status] ?? status.replace(/_/g, ' ');
}
