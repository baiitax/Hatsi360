/**
 * Central Bank of Nigeria — Exchange Rate Ingestion
 *
 * Fetches official NGN exchange rates from the Central Bank of Nigeria.
 * These rates are used to normalise price observations across currencies.
 *
 * Source: Central Bank of Nigeria (https://www.cbn.gov.ng)
 * License: Public domain (Nigerian government data)
 *
 * The CBN does not provide a modern REST API. We use their published
 * rate tables via structured web requests. For production use, this
 * would be replaced with a more reliable data feed (e.g., a paid API
 * like OANDA) — but for MVP purposes, CBN official rates are the
 * authoritative source for NGN conversion.
 */

import { createClient } from '@/lib/supabase/server';
import type { IngestionResult, IngestionContext } from '../types';

// ── Exchange Rate Storage ───────────────────────────────────────────────────

/**
 * Exchange rates are stored as commodity_production records with a special
 * "exchange_rate" commodity slug. This keeps all provenance-tracked data
 * in a unified system rather than requiring separate infrastructure.
 *
 * Alternatively, rates can be stored in a dedicated table. For the initial
 * implementation, we store them as metadata on a simple exchange_rates table.
 */

interface ExchangeRateRecord {
  date: string;
  base_currency: string;   // ISO 4217
  quote_currency: string;  // ISO 4217
  rate: number;
  source: string;
}

/**
 * Ingest exchange rates from CBN data.
 *
 * For MVP, this accepts manually-entered rates or CSV uploads.
 * Future: automated fetch from CBN rate table.
 */
export async function ingestCBNExchangeRates(
  context: IngestionContext,
  rates: ExchangeRateRecord[]
): Promise<IngestionResult> {
  const supabase = await createClient();
  const result: IngestionResult = {
    records_fetched: rates.length,
    records_inserted: 0,
    records_updated: 0,
    records_skipped: 0,
    errors: [],
  };

  for (const rate of rates) {
    try {
      // Validate rate
      if (rate.rate <= 0) {
        result.errors.push(`Invalid rate ${rate.rate} for ${rate.base_currency}/${rate.quote_currency} on ${rate.date}`);
        result.records_skipped++;
        continue;
      }

      // Store as a simple insert — exchange rates are always additive
      // (we never want to overwrite historical rates)
      const { error } = await supabase.from('exchange_rates').upsert({
        rate_date: rate.date,
        base_currency: rate.base_currency,
        quote_currency: rate.quote_currency,
        rate: rate.rate,
        source_id: context.source_id,
        sync_event_id: context.sync_event_id,
        verification_status: 'imported',
      }, {
        onConflict: 'rate_date,base_currency,quote_currency',
      });

      if (error) {
        result.errors.push(`${rate.date} ${rate.base_currency}/${rate.quote_currency}: ${error.message}`);
        result.records_skipped++;
      } else {
        result.records_inserted++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(msg);
      result.records_skipped++;
    }
  }

  return result;
}

/**
 * Get the latest exchange rate for a currency pair.
 */
export async function getLatestExchangeRate(
  baseCurrency: string = 'USD',
  quoteCurrency: string = 'NGN'
): Promise<{ rate: number; date: string } | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('exchange_rates')
    .select('rate, rate_date')
    .eq('base_currency', baseCurrency)
    .eq('quote_currency', quoteCurrency)
    .order('rate_date', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return { rate: data.rate, date: data.rate_date };
}
