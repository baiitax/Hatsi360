import { HatsiTableSkeleton } from '@/components/loading/HatsiSkeletons';

/**
 * The route-level loading boundary for `/prices`.
 *
 * The App Router streams this in while the page's server component resolves.
 * The placeholder holds the shape of the table that is coming.
 * It never blocks content that has already arrived, and it never leaves a
 * reader with an indefinite spinner.
 */

export default function Loading() {
  return <HatsiTableSkeleton rows={8} columns={5} />;
}
