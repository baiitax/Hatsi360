import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { HeroCarousel } from '@/components/data/HeroCarousel';
import { CommodityCard, MarketCard } from '@/components/data/Cards';
import { MarketComparisonTable } from '@/components/data/PriceTable';
import { DataCoverageNotice } from '@/components/data/DataCoverageNotice';
import { SectionHeading, EmptyState } from '@/components/ui';
import { getDataSource } from '@/lib/data';
import { summariseByMarket } from '@/lib/pricing';
import { formatMoney } from '@/lib/money';

export const metadata: Metadata = {
  title: 'Pluck Live — Agricultural Commodity Prices in Nigeria',
  description:
    'Timestamped, verified commodity price observations from markets across Nigeria. Compare prices across markets, see when each price was collected and how it was verified.',
  alternates: { canonical: '/' },
};

const SLIDES = [
  {
    id: 'welcome',
    eyebrow: 'Welcome to Pluck Live',
    title: 'Real-Time Agricultural Commodity Prices',
    body: 'Get the latest prices of food staples and agricultural commodities from major markets across Nigeria. Empowering farmers, traders and consumers with transparent data.',
    image: '/img/carousel-1.jpg',
    imageAlt: 'Grain market in Nigeria',
    primary: { href: '/prices', label: 'View Prices' },
    secondary: { href: '/about', label: 'Learn More' },
  },
  {
    id: 'trends',
    eyebrow: 'Data-Driven Decisions',
    title: 'Track Market Trends and Maximize Profits',
    body: 'Our platform provides historical data and trend analysis to help you make informed decisions, whether you are buying or selling.',
    image: '/img/carousel-2.jpg',
    imageAlt: 'Traders at a grain market',
    primary: { href: '/prices', label: 'View Prices' },
    secondary: { href: '/contact', label: 'Contact Us' },
  },
];

const SERVICES = [
  {
    title: 'Live Price Tracking',
    body: 'Access prices for a wide range of commodities from various markets, with the collection time and verification status attached.',
    image: '/img/service-1.jpg',
    href: '/markets',
    cta: 'View Prices',
  },
  {
    title: 'Historical Data Analysis',
    body: 'Analyse price history to understand market cycles, with the observation count shown for every point on the chart.',
    image: '/img/service-2.jpg',
    href: '/commodities',
    cta: 'Explore Data',
  },
  {
    title: 'Market Trend Insights',
    body: 'Read our analysis on market-moving factors and agricultural news from the Pluck Agro team.',
    image: '/img/service-3.jpg',
    href: '/insights',
    cta: 'Read Insights',
  },
  {
    title: 'Developer API',
    body: 'Integrate our price data into your own applications and services with our documented REST API.',
    image: '/img/service-4.jpg',
    href: '/api-docs',
    cta: 'Get API Key',
  },
  {
    title: 'Price Alerts',
    body: 'Get notified when a commodity or market you follow moves beyond a threshold you set.',
    image: '/img/service-5.jpg',
    href: '/pricing',
    cta: 'See Plans',
  },
  {
    title: 'Custom Reports',
    body: 'Need specific data? We can generate custom reports tailored to your business needs.',
    image: '/img/service-6.jpg',
    href: '/contact',
    cta: 'Inquire',
  },
];

const FEATURES = [
  {
    title: 'Multi-Country Support',
    body: 'While focused on Nigeria, our system is built to scale and include markets from other countries.',
    href: '/markets',
    cta: 'View Markets',
  },
  {
    title: 'Multiple Commodities',
    body: 'We track a diverse range of commodities, from grains and tubers to livestock and poultry.',
    href: '/commodities',
    cta: 'See List',
  },
  {
    title: 'Provenance On Every Price',
    body: 'Every published price carries its commodity, market, unit, price type and collection time.',
    href: '/about',
    cta: 'Our Method',
  },
  {
    title: 'Reliable & Fast',
    body: 'Server-rendered pages and indexed queries mean the data you need is quick to load.',
    href: '/api-docs',
    cta: 'Developer API',
  },
];

const OFFERS = [
  {
    title: 'For Farmers: Maximize Your Earnings',
    body: 'Know the best time and market to sell your produce. Avoid being underpaid and increase your profitability.',
    image: '/img/offer-1.jpg',
    href: '/prices',
    cta: 'Check Prices',
  },
  {
    title: 'For Traders: Optimize Your Margins',
    body: 'Source commodities at the best prices and identify arbitrage opportunities between different markets.',
    image: '/img/offer-2.jpg',
    href: '/compare',
    cta: 'Compare Markets',
  },
  {
    title: 'For Consumers: Know Fair Prices',
    body: 'Before you go to the market, check the current prices to ensure you are paying a fair price for your food items.',
    image: '/img/offer-3.jpg',
    href: '/prices',
    cta: "View Today's Prices",
  },
  {
    title: 'For Businesses: Power Your Apps',
    body: 'Use our powerful and reliable API to integrate agricultural price data into your applications and platforms.',
    image: '/img/offer-4.jpg',
    href: '/api-docs',
    cta: 'API Docs',
  },
];

const FAQS = [
  {
    question: 'How often are the prices updated?',
    answer:
      'Prices are published as agents collect them in the field and verification officers approve them. Each published price shows the exact time it was collected, so you can judge how current it is rather than relying on a label.',
  },
  {
    question: 'Which markets do you cover?',
    answer:
      'We currently list markets across Lagos, Kano, Jigawa, Kaduna, Katsina, Zamfara, Nasarawa, Borno, Bauchi, Benue and Sokoto. Coverage is expanding — the full list is on the Markets page, and a market appears in price results only once it has published observations.',
  },
  {
    question: 'Is the service free to use?',
    answer:
      'Yes. Browsing live and historical prices on our website is completely free. We offer premium services such as API access, exports and custom reports for businesses at a fee.',
  },
  {
    question: 'How can I contribute price data?',
    answer:
      'We run a network of market agents who collect prices in the field. If you are a major trader or market association interested in partnering with us, please contact us.',
  },
  {
    question: 'Why is some data labelled "Legacy record — unverified"?',
    answer:
      'Those records were migrated from the previous version of the Pluck Live system. They carry no verification trail, no measurement unit and no collection time, so we publish them clearly labelled rather than presenting them as verified current quotes. See the About page for how we collect and verify data.',
  },
  {
    question: 'Do you have a mobile app?',
    answer:
      'A dedicated mobile app is in development. The website is fully responsive, and market agents use a dedicated mobile-first collection interface built for low bandwidth.',
  },
];

export default async function HomePage() {
  const source = await getDataSource();

  const [commodities, markets, observations] = await Promise.all([
    source.listCommodities(),
    source.listMarkets(),
    source.listObservationsForAnalysis({}),
  ]);

  const withData = commodities.filter((c) => (c.observationCount ?? 0) > 0);
  const defaultCommodity = withData[0] ?? commodities[0];

  const latestCollectedAt = observations.length
    ? observations.reduce<string | null>(
        (acc, o) => (acc == null || o.collectedAt > acc ? o.collectedAt : acc),
        null,
      )
    : null;

  const comparisonCommodity = defaultCommodity
    ? commodities.find((c) => c.id === defaultCommodity.id) ?? null
    : null;

  const comparisonObservations = comparisonCommodity
    ? observations.filter((o) => o.commodityId === comparisonCommodity.id)
    : [];

  const summaries = summariseByMarket(comparisonObservations);
  const marketsWithPrices = markets.filter((m) => (m.observationCount ?? 0) > 0);

  return (
    <>
      <HeroCarousel slides={SLIDES} />

      {/* ------------------------------------------------ market comparison -- */}
      <section id="market-comparison-section" className="section bg-ink-50">
        <div className="container-page">
          <SectionHeading
            eyebrow="Market Comparison"
            title="Find the Best Prices"
            description="Select a commodity to see how its latest price varies across different markets in Nigeria. Every figure below shows the number of observations behind it and when they were collected."
          />

          <div className="mx-auto mt-8 max-w-xl">
            <form method="GET" action="/compare" className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <label htmlFor="commodity_id" className="sr-only">
                  Select commodity
                </label>
                <select
                  id="commodity_id"
                  name="commodity"
                  defaultValue={comparisonCommodity?.slug ?? ''}
                  className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
                >
                  {commodities.map((commodity) => (
                    <option key={commodity.id} value={commodity.slug}>
                      {commodity.name}
                      {(commodity.observationCount ?? 0) === 0 ? ' — no prices yet' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="rounded-xl bg-brand-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
              >
                Compare markets
              </button>
            </form>
          </div>

          <div className="mt-8">
            {summaries.length > 0 ? (
              <MarketComparisonTable
                rows={summaries}
                caption={`Latest published prices for ${comparisonCommodity?.name ?? ''} by market`}
              />
            ) : (
              <EmptyState
                title="No published prices for this commodity yet"
                description="This commodity is in our catalogue, but no verified or published price observation exists for it. Browse the full price directory to see what is currently available."
                action={
                  <Link
                    href="/prices"
                    className="mt-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
                  >
                    Browse all prices
                  </Link>
                }
              />
            )}
          </div>

          <p className="mt-4 text-center text-xs text-ink-500">
            Summary rule: the median of the underlying observations, with the range and observation
            count shown beside it. Prices with different units or price types are never compared.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------- about -- */}
      <section className="section bg-white">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-700">
              About Us
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Empowering Nigerian Agriculture with Data
            </h2>
            <p className="mt-5 text-base leading-relaxed text-ink-600">
              Pluck Live is dedicated to bringing transparency to the agricultural sector. We
              provide a reliable, easy-to-use platform for farmers, traders and consumers to access
              commodity prices from markets across the nation — with the provenance behind each
              figure made visible.
            </p>

            <dl className="mt-8 grid grid-cols-3 gap-4">
              <div className="card p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Markets listed
                </dt>
                <dd className="mt-1 text-2xl font-black text-brand-800">{markets.length}</dd>
              </div>
              <div className="card p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Commodities
                </dt>
                <dd className="mt-1 text-2xl font-black text-brand-800">{commodities.length}</dd>
              </div>
              <div className="card p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Observations
                </dt>
                <dd className="mt-1 text-2xl font-black text-brand-800">{observations.length}</dd>
              </div>
            </dl>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/about"
                className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
              >
                Discover More
              </Link>
              <Link
                href="/markets"
                className="rounded-full border border-ink-300 px-5 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-400 hover:text-brand-800"
              >
                See our markets
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Image
              src="/img/about-2.png"
              alt="A market agent collecting a price in the field"
              width={320}
              height={240}
              className="col-span-2 h-48 w-full rounded-2xl object-cover shadow-soft sm:h-56"
            />
            <Image
              src="/img/about-3.png"
              alt="Sacks of grain at a Nigerian market"
              width={200}
              height={200}
              className="h-36 w-full rounded-2xl object-cover shadow-soft"
            />
            <Image
              src="/img/about-4.png"
              alt="Market traders discussing prices"
              width={200}
              height={200}
              className="h-36 w-full rounded-2xl object-cover shadow-soft"
            />
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- services -- */}
      <section className="section bg-ink-50">
        <div className="container-page">
          <SectionHeading
            eyebrow="Our Services"
            title="What We Offer"
            description="We provide a suite of tools and services designed to give you a competitive edge in the agricultural market."
          />

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service) => (
              <article key={service.title} className="card card-hover flex flex-col overflow-hidden">
                <div className="relative h-40 w-full overflow-hidden">
                  <Image
                    src={service.image}
                    alt=""
                    width={400}
                    height={240}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-lg font-bold">{service.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">{service.body}</p>
                  <Link
                    href={service.href}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
                  >
                    {service.cta}
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- prices -- */}
      <section className="section bg-white">
        <div className="container-page">
          <SectionHeading
            eyebrow="Latest Verified Prices"
            title="Latest Price Observations"
            description="The most recent published observations across all markets, newest first. Each one shows the market it came from and when it was collected."
            action={
              <Link
                href="/prices"
                className="inline-flex rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
              >
                See all prices
              </Link>
            }
          />

          <div className="mt-10">
            <DataCoverageNotice
              latestCollectedAt={latestCollectedAt}
              observationCount={observations.length}
            />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {observations
              .slice()
              .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt))
              .slice(0, 8)
              .map((observation) => (
                <article key={observation.id} className="card flex flex-col p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                    {observation.commodityName}
                  </p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-ink-950">
                    {formatMoney(observation.normalizedAmount ?? observation.reportedAmount, {
                      currency: observation.currencyCode,
                    })}
                  </p>
                  <p className="mt-1 text-sm text-ink-600">
                    {observation.marketName}, {observation.stateName}
                  </p>
                  <p className="mt-auto pt-3 text-xs text-ink-500">
                    Collected {new Date(observation.collectedAt).toISOString().slice(0, 10)}
                    {observation.unitIsSpecific === false ? ' · unit not recorded' : ''}
                  </p>
                </article>
              ))}
          </div>

          {observations.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="No price observations are published yet"
                description="The catalogue is ready but no observation has been collected and verified. Browse the commodity and market directories in the meantime."
                action={
                  <Link
                    href="/markets"
                    className="mt-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
                  >
                    Browse markets
                  </Link>
                }
              />
            </div>
          ) : null}
        </div>
      </section>

      {/* -------------------------------------------------------- features -- */}
      <section className="section bg-ink-50">
        <div className="container-page">
          <SectionHeading
            eyebrow="Our Features"
            title="Why Choose Pluck Live?"
            description="Our platform is built on careful data collection, not guesswork — and on showing you where every number came from."
          />

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="card p-5">
                <h3 className="text-base font-bold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{feature.body}</p>
                <Link
                  href={feature.href}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
                >
                  {feature.cta}
                  <span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- offers -- */}
      <section className="section bg-white">
        <div className="container-page">
          <SectionHeading
            eyebrow="Our Offer"
            title="Benefits We Offer"
            description="We provide tangible benefits to different stakeholders in the agricultural value chain."
          />

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {OFFERS.map((offer) => (
              <article key={offer.title} className="card card-hover overflow-hidden">
                <div className="relative h-44 w-full overflow-hidden">
                  <Image
                    src={offer.image}
                    alt=""
                    width={320}
                    height={240}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-5">
                  <h3 className="text-base font-bold leading-snug">{offer.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{offer.body}</p>
                  <Link
                    href={offer.href}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
                  >
                    {offer.cta}
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ commodity -- */}
      {withData.length > 0 ? (
        <section className="section bg-ink-50">
          <div className="container-page">
            <SectionHeading
              eyebrow="Featured Commodities"
              title="Commodities With Published Prices"
              description="These commodities currently have published price observations."
              action={
                <Link
                  href="/commodities"
                  className="inline-flex rounded-full border border-ink-300 px-5 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-400 hover:text-brand-800"
                >
                  All commodities
                </Link>
              }
            />
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {withData.slice(0, 6).map((commodity) => (
                <CommodityCard key={commodity.id} commodity={commodity} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* --------------------------------------------------------- markets -- */}
      {marketsWithPrices.length > 0 ? (
        <section className="section bg-white">
          <div className="container-page">
            <SectionHeading
              eyebrow="Market Coverage"
              title="Markets With Published Prices"
              description="A market appears here only once it has at least one published price observation."
              action={
                <Link
                  href="/markets"
                  className="inline-flex rounded-full border border-ink-300 px-5 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-400 hover:text-brand-800"
                >
                  All markets
                </Link>
              }
            />
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {marketsWithPrices.slice(0, 6).map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* -------------------------------------------------------- insights -- */}
      <section className="section bg-ink-50">
        <div className="container-page">
          <SectionHeading
            eyebrow="Our Blog & News"
            title="Latest Agricultural Insights"
            description="Analysis on the forces moving Nigerian agricultural markets."
            action={
              <Link
                href="/insights"
                className="inline-flex rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
              >
                All insights
              </Link>
            }
          />

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <article className="card card-hover overflow-hidden md:col-span-2">
              <div className="relative h-52 w-full overflow-hidden">
                <Image
                  src="/img/blog-1.jpg"
                  alt=""
                  width={800}
                  height={400}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  Market Analysis
                </p>
                <h3 className="mt-2 text-xl font-bold">
                  The Impact of Fuel Prices on Food Transportation
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  A deep dive into how fluctuating fuel costs affect the price of food items across
                  Nigeria, and what it means for farmgate and wholesale prices.
                </p>
                <Link
                  href="/insights"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
                >
                  Read the analysis
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>

            <div className="card flex flex-col justify-between p-6">
              <div>
                <h3 className="text-lg font-bold">How we verify a price</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-600">
                  A field agent submits an observation with the commodity, market, unit, price type
                  and collection time. A verification officer reviews it against the market&rsquo;s
                  recent history and any evidence supplied. Only then is it published — and the
                  verification time travels with it.
                </p>
              </div>
              <Link
                href="/about"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                Read our methodology
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ faq -- */}
      <section className="section bg-white">
        <div className="container-page">
          <SectionHeading
            eyebrow="FAQs"
            title="Your Questions Answered"
            description="Have questions? We have answers. If you cannot find what you are looking for, please contact us."
          />

          <div className="mx-auto mt-10 max-w-3xl space-y-3">
            {FAQS.map((faq) => (
              <details key={faq.question} className="card group overflow-hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left">
                  <span className="font-semibold text-ink-900">{faq.question}</span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-brand-600 transition-transform group-open:rotate-45"
                  >
                    ＋
                  </span>
                </summary>
                <div className="border-t border-ink-100 px-5 py-4 text-sm leading-relaxed text-ink-600">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-ink-600">
            Have a different question?{' '}
            <Link href="/faq" className="font-semibold text-brand-700 hover:text-brand-800">
              See all FAQs
            </Link>{' '}
            or{' '}
            <Link href="/contact" className="font-semibold text-brand-700 hover:text-brand-800">
              contact our team
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------ cta -- */}
      <section className="bg-brand-900 py-16">
        <div className="container-page grid items-center gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Need price data for your business?
            </h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-brand-100">
              Use the free price directory, or talk to us about API access, scheduled exports,
              market reports and custom research for your supply chain.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link
              href="/pricing"
              className="rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-brand-950 transition-colors hover:bg-brand-400"
            >
              See premium plans
            </Link>
            <Link
              href="/api-docs"
              className="rounded-full border border-white/40 px-6 py-3 text-sm font-bold text-white transition-colors hover:border-white hover:bg-white/10"
            >
              Read the API docs
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-white/40 px-6 py-3 text-sm font-bold text-white transition-colors hover:border-white hover:bg-white/10"
            >
              Contact sales
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
