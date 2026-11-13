import { redirect } from 'next/navigation';

/**
 * The assignments screen now lives at `/agent/assignments`.
 *
 * The old URL is kept so links and bookmarks still resolve. The new screen
 * carries the filters, the detail view and the correction workflow that this
 * list did not have room for.
 */
export default function RedirectPage() {
  redirect('/agent/assignments');
}
