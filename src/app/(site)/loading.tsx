import { HatsiPageSkeleton } from '@/components/loading/HatsiSkeletons';

/**
 * The route-level loading boundary for the public platform.
 *
 * The App Router streams this in while the public site's server components
 * resolve. The placeholder holds the shape of the page that is coming.
 * It never blocks content that has already arrived, and it never leaves a
 * reader with an indefinite spinner.
 */

export default function Loading() {
  return <HatsiPageSkeleton title="Loading page" />;
}
