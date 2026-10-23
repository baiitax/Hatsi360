import { redirect } from 'next/navigation';

/**
 * The field collection entry point.
 *
 * The URL is kept so old links and bookmarks still work; the workspace itself
 * now lives at `/agent/home`.
 */
export default function AgentPage() {
  redirect('/agent/home');
}
