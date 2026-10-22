import 'server-only';

import { isSupabaseConfigured } from '@/lib/supabase/config';
import { fixtureSource } from './fixture';
import { supabaseSource } from './supabase';
import type { DataSource } from './source';

export type { DataSource, Provenance } from './source';

/**
 * The active data source.
 *
 * When Supabase is configured the application reads from PostgreSQL. When it
 * is not, it serves the migrated legacy dataset so the site still runs and the
 * interface can be exercised end to end.
 */
export async function getDataSource(): Promise<DataSource> {
  return isSupabaseConfigured() ? supabaseSource : fixtureSource;
}

/** True when the active source is the migrated legacy dataset. */
export async function isMigratedDataset(): Promise<boolean> {
  return (await getDataSource()).isMigrated;
}
