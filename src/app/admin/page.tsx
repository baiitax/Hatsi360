import { redirect } from 'next/navigation';

/**
 * The operations console entry point.
 *
 * The URL is kept so old links and bookmarks still work; the control centre
 * itself now lives at `/admin/overview`.
 */
export default function AdminPage() {
  redirect('/admin/overview');
}
