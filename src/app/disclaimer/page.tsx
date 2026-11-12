import type { Metadata } from 'next';
import { PageHero } from '@/components/ui/PageHero';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Price Data Disclaimer',
  description:
    'What GonaPulse price data does and does not represent, the limits of each published observation, and the rules for using it.',
  alternates: { canonical: '/disclaimer' },
};

export default function DisclaimerPage() {
  return (
    <>
      <PageHero
        eyebrow="Disclaimer"
        title="Price data disclaimer"
        lede={`Please read this before relying on any figure published on ${BRAND.name}. It explains exactly what each published price does and does not represent.`}
        breadcrumbs={[{ label: 'Disclaimer' }]}
      />

      <div className="section">
        <div className="container-page max-w-3xl">
          <div className="prose-gona">
            <h2>1. What a published price is</h2>
            <p>
              A published price is an <strong>observation</strong>: a value that a named market agent
              recorded at a named market, for a named commodity, at a stated time, and that a
              verification officer reviewed and approved. It is a record of what was observed, not a
              guarantee of what a given buyer or seller will pay today.
            </p>

            <h2>2. It is not an official or statutory price</h2>
            <p>
              Nothing on this site is an official price, an index, a benchmark, a quotation or a
              regulated reference rate. {BRAND.name} is a private data service operated by Pluck
              Agro. We are not a government agency, a commodity exchange, or a recognised
              price-reporting agency.
            </p>

            <h2>3. Price types are not interchangeable</h2>
            <p>
              {BRAND.name} distinguishes the price types it publishes: farmgate purchase prices,
              wholesale asking prices, wholesale transaction prices, retail prices, processor
              procurement prices, exporter offers and indicative estimates. These measure different
              things. A wholesale asking price is what a buyer asked; a wholesale transaction price
              is what a trade actually completed at. They are not averaged together, and they are
              not presented as one another.
            </p>

            <h2>4. Legacy records carry known gaps</h2>
            <p>
              Some records currently published were migrated from the previous Pluck Live system.
              Those records contain no measurement unit, no price type, no collection time of day
              and no verification trail. They are published with an explicit{' '}
              <em>Legacy record — unverified</em> label. They should not be treated as current
              market quotes, and they must not be presented as verified data.
            </p>

            <h2>5. Prices are not comparable unless we say they are</h2>
            <p>
              A price quoted per bag and a price quoted per kilogram are different quantities, and
              bags do not all weigh the same. {BRAND.name} converts between units only where a
              valid conversion rule exists. Where a record has no unit, we show the figure as
              reported and mark it. The Compare tool refuses to place figures with incompatible units
              side by side, and never compares an asking price against a transaction price.
            </p>

            <h2>6. Summaries carry their sample size</h2>
            <p>
              Where several observations exist, the published summary is the median of those
              observations, and the page always shows the observation count, the range and the time
              window. A single report is never presented as the definitive market price. Please
              read the observation count before acting on a summary.
            </p>

            <h2>7. Stale data is marked, not hidden</h2>
            <p>
              Every commodity has a freshness window. Observations older than that window are still
              published, but they are marked as stale and their age is shown. A price that is stale
              is a historical fact, not a current quote.
            </p>

            <h2>8. No forecasts on this site</h2>
            <p>
              {BRAND.name} does not publish price forecasts. The previous Pluck Live system displayed
              a &ldquo;Price Forecast&rdquo; figure without explaining how it was produced. If
              forecasting is offered in future it will be labelled explicitly as a model-generated
              estimate, its method and limitations will be stated, and it will be evaluated against
              historical observations.
            </p>

            <h2>9. Coverage is stated, not implied</h2>
            <p>
              Where a market, commodity or state has no published observations, the site says so. We
              do not estimate, interpolate or simulate a price to fill a gap, and we do not claim
              coverage we have not built.
            </p>

            <h2>10. Your responsibility</h2>
            <p>
              Prices change, sometimes quickly, and published data has a lag. We are not liable for
              any loss arising from reliance on data published here. If a price materially affects a
              commercial decision, confirm it directly with the market before acting.
            </p>

            <h2>11. Reporting a problem</h2>
            <p>
              If you believe a published price is wrong, please{' '}
              <a href="/contact" className="font-semibold text-brand-700 underline">
                contact us
              </a>{' '}
              with the commodity, market and date. Published observations are never silently
              overwritten: a correction is published as a new record that supersedes the original,
              and the original is retained with the reason for the change.
            </p>

            <h2>12. Corrections to this disclaimer</h2>
            <p>
              We may update this disclaimer as the platform develops. The version published on this
              page applies to the data published on this site at the time you read it.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
