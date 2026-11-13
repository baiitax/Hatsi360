import { redirect } from 'next/navigation';

/**
 * The collection flow now lives at `/agent/collection/new` and
 * `/agent/collection/[id]`.
 *
 * The old URL is kept so a link, a bookmark or a notification still
 * resolves. The new flow opens a session, records each commodity as its own
 * observation, and submits explicitly.
 */
export default function RedirectPage() {
  redirect('/agent/collection/new');
}
