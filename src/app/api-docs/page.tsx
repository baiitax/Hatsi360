import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/ui/PageHero';
import { getSiteUrl } from '@/lib/supabase/config';

export const metadata: Metadata = {
  title: 'Developer API',
  description:
    'Documentation for the GonaPulse REST API: commodities, markets, latest prices, price history, comparison and insights.',
  alternates: { canonical: '/api-docs' },
};

const baseUrl = getSiteUrl();

interface EndpointDoc {
  method: string;
  path: string;
  summary: string;
  auth: 'none' | 'optional' | 'required';
  params: { name: string; type: string; required: boolean; description: string }[];
  example: string;
  response: string;
}

const ENDPOINTS: EndpointDoc[] = [
  {
    method: 'GET',
    path: '/api/v1/commodities',
    summary: 'The commodity catalogue, with the markets currently reporting each commodity.',
    auth: 'optional',
    params: [
      { name: 'category', type: 'string', required: false, description: 'Category slug, e.g. grains-cereals.' },
      { name: 'q', type: 'string', required: false, description: 'Search commodity names and synonyms.' },
      { name: 'with_prices', type: '"true" | "false"', required: false, description: 'Set to "false" to list only commodities with no published prices.' },
      { name: 'limit', type: 'integer', required: false, description: 'Page size, 1–200. Default 50.' },
      { name: 'offset', type: 'integer', required: false, description: 'Number of records to skip. Default 0.' },
    ],
    example: `curl "${baseUrl}/api/v1/commodities?category=grains-cereals&limit=2"`,
    response: `{
  "data": {
    "commodities": [
      {
        "id": 1,
        "slug": "paddy-rice",
        "name": "Paddy Rice",
        "description": "Locally grown paddy rice, unprocessed.",
        "category": { "slug": "grains-cereals", "name": "Grains & Cereals" },
        "synonyms": ["paddy", "unmilled rice", "rice paddy", "paddy rice"],
        "marketsWithPrices": 3,
        "observationCount": 21,
        "latestObservationAt": "2025-07-06T00:00:00+00:00"
      }
    ],
    "pagination": { "limit": 2, "offset": 0, "total": 10, "totalPages": 5 }
  },
  "meta": {
    "requestId": "0f4c2f2e-...",
    "generatedAt": "2026-10-22T09:14:02.118Z",
    "rateLimit": { "limit": 120, "remaining": 119 }
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/markets',
    summary: 'The market directory, with observation counts and the latest collection time.',
    auth: 'optional',
    params: [
      { name: 'state', type: 'string', required: false, description: 'State slug, e.g. kano.' },
      { name: 'q', type: 'string', required: false, description: 'Search market names.' },
      { name: 'limit', type: 'integer', required: false, description: 'Page size, 1–200. Default 50.' },
      { name: 'offset', type: 'integer', required: false, description: 'Number of records to skip. Default 0.' },
    ],
    example: `curl "${baseUrl}/api/v1/markets?state=kano"`,
    response: `{
  "data": {
    "markets": [
      {
        "id": 1,
        "slug": "dawanau-international-grains-market",
        "name": "Dawanau International Grains Market",
        "description": "West Africa's largest grain market, trading in sorghum, millet, maize, rice, and beans.",
        "address": "Dawanau, Kano",
        "state": { "slug": "kano", "name": "Kano" },
        "country": "NG",
        "observationCount": 17,
        "latestObservationAt": "2025-07-06T00:00:00+00:00"
      }
    ],
    "pagination": { "limit": 50, "offset": 0, "total": 1, "totalPages": 1 }
  },
  "meta": { "requestId": "b91c77d1-...", "generatedAt": "2026-10-22T09:14:04.902Z" }
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/prices/latest',
    summary:
      'The latest published price per market, with the observation count and the window the summary covers.',
    auth: 'optional',
    params: [
      { name: 'commodity', type: 'string', required: false, description: 'Commodity slug.' },
      { name: 'market', type: 'string', required: false, description: 'Market slug.' },
      { name: 'state', type: 'string', required: false, description: 'State slug.' },
      {
        name: 'price_type',
        type: 'enum',
        required: false,
        description:
          'farmgate, wholesale_asking, wholesale_transaction, retail, processor_procurement, export_buy, export_sell, indicative, unspecified.',
      },
      { name: 'limit', type: 'integer', required: false, description: 'Page size, 1–200. Default 50.' },
      { name: 'offset', type: 'integer', required: false, description: 'Number of records to skip. Default 0.' },
    ],
    example: `curl "${baseUrl}/api/v1/prices/latest?commodity=paddy-rice"`,
    response: `{
  "data": {
    "prices": [
      {
        "commodity": { "slug": "paddy-rice", "id": 1 },
        "commodityName": "Paddy Rice",
        "market": { "slug": "dawanau-international-grains-market", "id": 1 },
        "marketName": "Dawanau International Grains Market",
        "state": "Kano",
        "priceType": "unspecified",
        "unit": { "code": "unspecified", "name": "unit not recorded", "recorded": false },
        "currency": "NGN",
        "medianAmount": 41200.0,
        "latestAmount": 40550.0,
        "minAmount": 40200.0,
        "maxAmount": 43550.0,
        "observationCount": 13,
        "windowStart": "2025-07-01T00:00:00+00:00",
        "windowEnd": "2025-07-06T00:00:00+00:00",
        "latestCollectedAt": "2025-07-06T00:00:00+00:00",
        "latestVerifiedAt": null,
        "isStale": true,
        "unitAmbiguous": true
      }
    ],
    "pagination": { "limit": 50, "offset": 0, "total": 3, "totalPages": 1 },
    "calculationRule": "medianAmount is the median of the underlying observations, rounded to 2 decimal places."
  },
  "meta": { "requestId": "5c2a9e10-...", "generatedAt": "2026-10-22T09:14:06.441Z" }
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/prices/history',
    summary: 'A daily price series for one commodity in one market.',
    auth: 'optional',
    params: [
      { name: 'commodity', type: 'string', required: true, description: 'Commodity slug.' },
      { name: 'market', type: 'string', required: true, description: 'Market slug.' },
      { name: 'start_date', type: 'YYYY-MM-DD', required: false, description: 'Inclusive start of the window.' },
      { name: 'end_date', type: 'YYYY-MM-DD', required: false, description: 'Inclusive end of the window.' },
    ],
    example: `curl "${baseUrl}/api/v1/prices/history?commodity=paddy-rice&market=dawanau-international-grains-market&start_date=2025-07-01&end_date=2025-07-06"`,
    response: `{
  "data": {
    "commodity": { "slug": "paddy-rice", "name": "Paddy Rice" },
    "market": { "slug": "dawanau-international-grains-market", "name": "Dawanau International Grains Market", "state": "Kano" },
    "range": { "start": "2025-07-01", "end": "2025-07-06" },
    "series": [
      { "date": "2025-07-01", "medianAmount": 41100.0, "minAmount": 41000.0, "maxAmount": 41200.0, "observations": 2 }
    ],
    "observationCount": 13,
    "calculationRule": "Each point is the median of that day's observations; minAmount and maxAmount are the observed range."
  },
  "meta": { "requestId": "1a4b7e02-...", "generatedAt": "2026-10-22T09:14:08.013Z" }
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/prices/compare',
    summary:
      'The same commodity, at the same price type, across markets. Only compatible units are compared.',
    auth: 'optional',
    params: [
      { name: 'commodity', type: 'string', required: true, description: 'Commodity slug.' },
      { name: 'price_type', type: 'enum', required: false, description: 'Restrict to one price type.' },
      { name: 'markets', type: 'string', required: false, description: 'Comma-separated market slugs. Defaults to every market reporting the commodity.' },
    ],
    example: `curl "${baseUrl}/api/v1/prices/compare?commodity=paddy-rice&price_type=unspecified"`,
    response: `{
  "data": {
    "commodity": { "slug": "paddy-rice", "name": "Paddy Rice" },
    "priceType": "unspecified",
    "unit": { "code": "unspecified", "name": "unit not recorded", "recorded": false },
    "comparisonRule": "Only observations sharing a commodity, price type and compatible measurement unit are compared.",
    "prices": [
      {
        "market": { "slug": "dawanau-international-grains-market", "id": 1, "name": "Dawanau International Grains Market" },
        "state": "Kano",
        "medianAmount": 41200.0,
        "latestAmount": 40550.0,
        "minAmount": 40200.0,
        "maxAmount": 43550.0,
        "observationCount": 13,
        "currency": "NGN",
        "windowStart": "2025-07-01T00:00:00+00:00",
        "windowEnd": "2025-07-06T00:00:00+00:00",
        "isStale": true
      }
    ],
    "spread": {
      "lowestMarket": "Mile 12 Market",
      "lowestAmount": 40912.0,
      "highestMarket": "Gujungu Market",
      "highestAmount": 41700.0,
      "spreadAmount": 788.0
    },
    "excludedForUnitMismatch": []
  },
  "meta": { "requestId": "c33d0b52-...", "generatedAt": "2026-10-22T09:14:09.775Z" }
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/insights',
    summary: 'Published market insights and analysis.',
    auth: 'optional',
    params: [
      { name: 'limit', type: 'integer', required: false, description: 'Page size, 1–50. Default 20.' },
      { name: 'offset', type: 'integer', required: false, description: 'Number of records to skip. Default 0.' },
    ],
    example: `curl "${baseUrl}/api/v1/insights?limit=2"`,
    response: `{
  "data": {
    "insights": [
      {
        "slug": "future-of-sustainable-farming-in-nigeria",
        "title": "The Future of Sustainable Farming in Nigeria",
        "excerpt": "Sustainable agriculture is more than just a buzzword...",
        "category": "Sustainability",
        "publishedAt": null,
        "readingMinutes": 4
      }
    ],
    "pagination": { "limit": 2, "offset": 0, "total": 4, "totalPages": 2 }
  },
  "meta": { "requestId": "7d1fbb90-...", "generatedAt": "2026-10-22T09:14:11.220Z" }
}`,
  },
];

export default function ApiDocsPage() {
  return (
    <>
      <PageHero
        eyebrow="Developer API"
        title="Integrate our data"
        lede="A REST API over the same published price observations the website uses. Every endpoint returns the same envelope, validates its parameters, and paginates."
        breadcrumbs={[{ label: 'API Access' }]}
      >
        <div className="flex flex-wrap gap-3">
          <Link
            href="/pricing"
            className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
          >
            Request an API key
          </Link>
          <Link
            href="/contact"
            className="rounded-full border border-ink-300 px-5 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-400 hover:text-brand-800"
          >
            Talk to us
          </Link>
        </div>
      </PageHero>

      <div className="section">
        <div className="container-page grid gap-12 lg:grid-cols-[16rem_1fr]">
          <nav aria-label="API endpoints" className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="text-xs font-bold uppercase tracking-widest text-ink-500">Endpoints</h2>
            <ul className="mt-3 space-y-2">
              {ENDPOINTS.map((endpoint) => (
                <li key={endpoint.path}>
                  <a
                    href={`#${endpoint.path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}`}
                    className="block text-sm font-medium text-ink-700 hover:text-brand-700"
                  >
                    <span className="mr-1.5 font-mono text-[0.7rem] text-brand-700">GET</span>
                    {endpoint.path}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-10">
            {/* ------------------------------------------------- basics -- */}
            <section className="card p-6">
              <h2 className="text-xl font-bold">Basics</h2>

              <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-ink-600">
                Base URL
              </h3>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-ink-950 p-4 text-sm text-brand-100">
                {baseUrl}/api/v1
              </pre>

              <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-ink-600">
                Authentication
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                The endpoints below are read-only and currently open. Send an API key if you have
                one — it raises your rate limit and unlocks the premium endpoints. Provide it as
                either header:
              </p>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-ink-950 p-4 text-sm text-brand-100">
{`Authorization: Bearer pl_live_xxxxxxxxxxxxxxxxxxxx
X-API-Key: pl_live_xxxxxxxxxxxxxxxxxxxx`}
              </pre>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">
                Keys are shown once when they are issued and stored only as a SHA-256 hash. We never
                log a key in plain text, and every request made with your key is logged against
                your application so you can see your own usage.
              </p>

              <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-ink-600">
                Response envelope
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                Every response — success or failure — uses the same shape, so your client needs one
                code path:
              </p>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-ink-950 p-4 text-sm text-brand-100">
{`{ "data": { ... }, "meta": { "requestId": "...", "generatedAt": "..." } }

{
  "error": { "code": "bad_request", "message": "...", "details": { ... } },
  "meta": { "requestId": "...", "generatedAt": "..." }
}`}
              </pre>

              <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-ink-600">
                Error codes
              </h3>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-ink-200 text-left">
                      <th scope="col" className="py-2 pr-4 font-semibold text-ink-700">
                        HTTP
                      </th>
                      <th scope="col" className="py-2 pr-4 font-semibold text-ink-700">
                        code
                      </th>
                      <th scope="col" className="py-2 font-semibold text-ink-700">
                        Meaning
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {[
                      ['400', 'bad_request', 'A query parameter is missing or invalid. `details` lists each problem.'],
                      ['401', 'unauthorized', 'An API key is required but was not supplied, or was not recognised.'],
                      ['403', 'forbidden', 'The key is inactive, expired, or lacks the scope for this endpoint.'],
                      ['404', 'not_found', 'The slug or record does not exist.'],
                      ['429', 'rate_limited', 'Too many requests. The `Retry-After` header gives the wait.'],
                      ['500', 'server_error', 'Something failed on our side. Retry with backoff.'],
                    ].map(([http, code, meaning]) => (
                      <tr key={code}>
                        <td className="py-2 pr-4 font-mono text-ink-700">{http}</td>
                        <td className="py-2 pr-4 font-mono text-ink-700">{code}</td>
                        <td className="py-2 text-ink-600">{meaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-ink-600">
                Rate limits
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                Limits are per application, per minute. The current limit and the remaining
                allowance are returned in the <code className="rounded bg-ink-100 px-1 py-0.5 text-xs">X-RateLimit-Limit</code>{' '}
                and <code className="rounded bg-ink-100 px-1 py-0.5 text-xs">X-RateLimit-Remaining</code>{' '}
                headers on every response.
              </p>
            </section>

            {/* ----------------------------------------------- endpoints -- */}
            {ENDPOINTS.map((endpoint) => (
              <section
                key={endpoint.path}
                id={endpoint.path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}
                className="card scroll-mt-28 p-6"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-md bg-brand-700 px-2 py-0.5 font-mono text-xs font-bold text-white">
                    {endpoint.method}
                  </span>
                  <h2 className="font-mono text-lg font-bold text-ink-950">{endpoint.path}</h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      endpoint.auth === 'required'
                        ? 'bg-amber-100 text-amber-900'
                        : endpoint.auth === 'optional'
                          ? 'bg-ink-100 text-ink-700'
                          : 'bg-emerald-100 text-emerald-900'
                    }`}
                  >
                    auth: {endpoint.auth}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-ink-600">{endpoint.summary}</p>

                <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-ink-600">
                  Query parameters
                </h3>
                {endpoint.params.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-500">This endpoint takes no parameters.</p>
                ) : (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-ink-200 text-left">
                          <th scope="col" className="py-2 pr-4 font-semibold text-ink-700">
                            Parameter
                          </th>
                          <th scope="col" className="py-2 pr-4 font-semibold text-ink-700">
                            Type
                          </th>
                          <th scope="col" className="py-2 pr-4 font-semibold text-ink-700">
                            Required
                          </th>
                          <th scope="col" className="py-2 font-semibold text-ink-700">
                            Description
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-100">
                        {endpoint.params.map((param) => (
                          <tr key={param.name}>
                            <td className="py-2 pr-4 font-mono text-ink-800">{param.name}</td>
                            <td className="py-2 pr-4 font-mono text-xs text-ink-600">{param.type}</td>
                            <td className="py-2 pr-4 text-ink-600">{param.required ? 'yes' : 'no'}</td>
                            <td className="py-2 text-ink-600">{param.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-ink-600">Example</h3>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-ink-950 p-4 text-sm text-brand-100">
                  {endpoint.example}
                </pre>

                <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-ink-600">
                  Response
                </h3>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-ink-950 p-4 text-xs leading-relaxed text-brand-100">
                  {endpoint.response}
                </pre>
              </section>
            ))}

            <section className="rounded-2xl border border-brand-200 bg-brand-50 p-6">
              <h2 className="text-lg font-bold text-brand-950">Reading the data correctly</h2>
              <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-brand-900">
                <li>
                  <strong>Check `unit.recorded`.</strong> When it is <code>false</code>, the source
                  record did not state a measurement unit. Those figures are shown exactly as
                  published and may not be directly comparable with unit-quoted prices.
                </li>
                <li>
                  <strong>Check `observationCount`.</strong> A summary built from one report is not
                  a settled market price. The count is always included so you can decide.
                </li>
                <li>
                  <strong>Check `isStale`.</strong> A price outside its commodity&rsquo;s freshness
                  window is a historical fact, not a current quote.
                </li>
                <li>
                  <strong>Do not mix price types.</strong> An asking price and a transaction price
                  are different quantities. Filter by <code>price_type</code> explicitly.
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
