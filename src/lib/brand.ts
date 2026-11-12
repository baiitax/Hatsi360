/**
 * GonaPulse brand configuration.
 *
 * Every user-facing name, strapline, contact detail and navigation entry in
 * the product resolves through this file. Nothing else hard-codes the product
 * name, so a brand change is a change in one place.
 *
 * The relationship with Pluck Agro is deliberate and subordinate: GonaPulse is
 * the product; Pluck Agro is the endorsement.
 */

/* -------------------------------------------------------------- identity -- */

export const BRAND = {
  /** The product name. Never "Pluck Live" in customer-facing copy. */
  name: 'GonaPulse',
  /** The category line shown under the wordmark. */
  descriptor: 'Agricultural Market Intelligence',
  /** The strapline. */
  tagline: 'Know the market. Move with confidence.',
  /** The corporate endorsement. Subordinate to the product brand. */
  endorsement: 'Powered by Pluck Agro',
  /**
   * The ownership statement. The wording is deliberately non-specific about
   * legal structure: `docs/GONAPULSE_TRANSFORMATION_AUDIT.md` §4 records that
   * the exact legal language must be confirmed by authorised company
   * information before publication.
   */
  ownershipStatement:
    'GonaPulse is an independent agricultural market intelligence platform powered by Pluck Agro.',
  /** The product's own name for its main surfaces. */
  surfaces: {
    publicSite: 'GonaPulse',
    portal: 'GonaPulse Access Portal',
    fieldApp: 'GonaPulse Field App',
    controlCentre: 'GonaPulse Intelligence Control Centre',
    customerWorkspace: 'GonaPulse Customer Workspace',
    reporting: 'GonaPulse Market Intelligence',
  },
  /** The operating market, stated plainly rather than implied. */
  operatingMarket: 'Northern Nigeria',
  /** The sector the platform covers. */
  sector: 'Agricultural commodities',
  /** The expansion ambition. A plan, never a claim of coverage. */
  expansion: 'Nationwide Nigeria, followed by other African agricultural markets.',
  locale: 'en-NG',
} as const;

/* --------------------------------------------------------------- contact -- */

export const CONTACT = {
  phone: '+234 801 234 5678',
  phoneHref: 'tel:+2348012345678',
  email: 'info@agripricelive.com',
  emailHref: 'mailto:info@agripricelive.com',
  /**
   * The postal address published by the legacy site. It is reproduced because
   * it is the only address we can verify; it must be confirmed before it is
   * used on an invoice or a contract.
   */
  address: {
    line1: 'No 7 Kwanar Zainawa, Tokarawa Industrial Estate',
    city: 'Kano',
    country: 'Nigeria',
  },
} as const;

/* ------------------------------------------------------------ navigation -- */

export interface NavLink {
  href: string;
  label: string;
  /** A one-line explanation used by the footer and the mobile drawer. */
  description?: string;
}

export const PRIMARY_NAV: NavLink[] = [
  { href: '/prices', label: 'Prices', description: 'Current eligible price observations' },
  { href: '/commodities', label: 'Commodities', description: 'The commodity catalogue' },
  { href: '/markets', label: 'Markets', description: 'Markets under coverage' },
  { href: '/compare', label: 'Compare', description: 'Multi-market comparison' },
  { href: '/insights', label: 'Insights', description: 'Market insights and analysis' },
  { href: '/reports', label: 'Reports', description: 'Published market intelligence' },
  { href: '/about', label: 'About', description: 'The platform and its methodology' },
];

export const SECONDARY_NAV: NavLink[] = [
  { href: '/coverage', label: 'Coverage', description: 'Where we collect, and what that means' },
  { href: '/methodology', label: 'Methodology', description: 'How a price becomes a published price' },
  { href: '/pricing', label: 'Intelligence plans', description: 'Access tiers for professional data' },
  { href: '/api-docs', label: 'API', description: 'Programmatic market data access' },
  { href: '/faq', label: 'FAQs', description: 'Common questions' },
  { href: '/contact', label: 'Contact', description: 'Business enquiries and support' },
];

export const LEGAL_NAV: NavLink[] = [
  { href: '/privacy', label: 'Privacy policy' },
  { href: '/terms', label: 'Terms of service' },
  { href: '/disclaimer', label: 'Price data disclaimer' },
  { href: '/api-policy', label: 'API usage policy' },
  { href: '/cookies', label: 'Cookie policy' },
];

/* ----------------------------------------------------------------- tier -- */

/**
 * The commercial architecture. These are **proposed tiers**, not claims about
 * paid features that exist today. Nothing in the product presents them as
 * active until a payment provider and commercial terms are configured.
 */
export interface IntelligenceTier {
  id: 'public' | 'professional' | 'enterprise';
  name: string;
  summary: string;
  features: string[];
  /** The entitlement key checked in the database and in the server logic. */
  entitlement: string | null;
  /** True only for the tier that is live today. */
  available: boolean;
}

export const INTELLIGENCE_TIERS: IntelligenceTier[] = [
  {
    id: 'public',
    name: 'Public access',
    summary:
      'Everything needed to see what a market is paying today, at no cost and without registration.',
    features: [
      'Public commodity catalogue',
      'Eligible current prices',
      'Selected market comparisons',
      'Selected historical information',
      'Public insights and market reports',
    ],
    entitlement: null,
    available: true,
  },
  {
    id: 'professional',
    name: 'Professional intelligence',
    summary:
      'For traders, aggregators and processors who work the market every day and need the record behind the price.',
    features: [
      'Extended historical data',
      'Advanced multi-market comparisons',
      'Saved market watchlists',
      'Price alerts',
      'Downloadable market reports',
      'Market analysis dashboards',
      'CSV exports',
    ],
    entitlement: 'reports',
    available: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise intelligence',
    summary:
      'For institutions and data teams that need the raw record, not the summary.',
    features: [
      'Advanced market datasets',
      'API access with scoped keys',
      'Custom report requests',
      'Historical bulk exports',
      'Business intelligence support',
      'Custom market coverage enquiries',
      'Institutional data services',
    ],
    entitlement: 'api',
    available: false,
  },
];

/* --------------------------------------------------------------- palette -- */

/**
 * The GonaPulse palette, in one place, so the design system and the brand
 * documentation cannot drift apart. The values here are the same ones the
 * Tailwind theme exposes as `brand-*`, `leaf-*`, `harvest-*` and `earth-*`.
 *
 * `contrastOnWhite` records the measured contrast ratio against white for the
 * colours that are allowed to carry text. `tests/brand/brand.test.ts` asserts
 * the ratios, so a palette change that breaks accessibility fails the build.
 */
export interface BrandColour {
  name: string;
  hex: string;
  role: string;
  /** Measured contrast against white. Null means "graphics only". */
  contrastOnWhite: number | null;
  /** True when the colour may be used for body text on white. */
  textSafe: boolean;
}

export const PALETTE: BrandColour[] = [
  {
    name: 'Deep field',
    hex: '#0d2c1b',
    role: 'Primary brand — headers, primary buttons, the mark',
    contrastOnWhite: 15.1,
    textSafe: true,
  },
  {
    name: 'Harvest',
    hex: '#17512f',
    role: 'Primary action colour, links, focus rings',
    contrastOnWhite: 9.3,
    textSafe: true,
  },
  {
    name: 'Leaf',
    hex: '#2a8a4e',
    role: 'Supporting accent — verified states, chart series',
    contrastOnWhite: 4.3,
    textSafe: false,
  },
  {
    name: 'Fresh leaf',
    hex: '#34b877',
    role: 'Secondary accent — positive deltas, highlights',
    contrastOnWhite: 2.5,
    textSafe: false,
  },
  {
    name: 'Harvest gold',
    hex: '#c4841e',
    role: 'Secondary accent — alerts, highlights, report marks',
    contrastOnWhite: 3.2,
    textSafe: false,
  },
  {
    name: 'Deep gold',
    hex: '#8f6216',
    role: 'Gold used as text on light backgrounds',
    contrastOnWhite: 5.4,
    textSafe: true,
  },
  {
    name: 'Earth',
    hex: '#8a6a4f',
    role: 'Muted data-visualisation series, secondary text',
    contrastOnWhite: 4.9,
    textSafe: true,
  },
  {
    name: 'Charcoal',
    hex: '#1e2420',
    role: 'Body typography',
    contrastOnWhite: 15.8,
    textSafe: true,
  },
  {
    name: 'Canvas',
    hex: '#faf9f6',
    role: 'Page background — a warm off-white',
    contrastOnWhite: null,
    textSafe: false,
  },
  {
    name: 'Paper',
    hex: '#ffffff',
    role: 'Cards and surfaces',
    contrastOnWhite: null,
    textSafe: false,
  },
];

/* --------------------------------------------------------------- helpers -- */

/** The site name used in a page title. */
export function pageTitle(title: string): string {
  return `${title} | ${BRAND.name}`;
}

/**
 * The short description used in metadata and in link previews. It states what
 * the product is, never what it claims to be the largest of.
 */
export function pageDescription(description: string): string {
  return description;
}

/** The organisation behind the product, for structured data. */
export const ORGANISATION = {
  name: 'GonaPulse',
  legalName: 'GonaPulse',
  descriptor: BRAND.descriptor,
  endorsement: BRAND.endorsement,
  ownershipStatement: BRAND.ownershipStatement,
  url: '/',
  logo: '/brand/gonapulse-logo-horizontal.svg',
  email: CONTACT.email,
  telephone: CONTACT.phone,
  areaServed: 'Nigeria',
  foundingPlace: 'Kano, Nigeria',
} as const;
