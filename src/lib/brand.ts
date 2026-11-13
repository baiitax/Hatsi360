/**
 * Hatsi360 brand configuration.
 *
 * Every user-facing name, strapline, contact detail and navigation entry in
 * the product resolves through this file. Nothing else hard-codes the product
 * name, so a brand change is a change in one place.
 *
 * The relationship with Pluck Agro is deliberate and subordinate: Hatsi360 is
 * the product; Pluck Agro is the endorsement.
 */

/* -------------------------------------------------------------- identity -- */

export const BRAND = {
  /** The product name. Never a legacy name in customer-facing copy. */
  name: 'Hatsi360',
  /** The product category — what the product is. */
  category: 'Agricultural Market Intelligence',
  /** The category line shown under the wordmark. */
  descriptor: 'Agricultural Market Intelligence',
  /** The longer descriptor used on brand assets and in partner material. */
  commodityDescriptor: 'Agricultural Commodity Intelligence',
  /** The strapline. */
  tagline: 'Know the harvest. Understand the market. Trade with confidence.',
  /** The corporate endorsement. Subordinate to the product brand. */
  endorsement: 'Powered by Pluck Agro',
  /**
   * The ownership statement. The wording is deliberately non-specific about
   * legal structure: `docs/HATSI360_TRANSFORMATION_AUDIT.md` records that the
   * exact legal language must be confirmed by authorised company information
   * before publication.
   */
  ownershipStatement:
    'Hatsi360 is an independent agricultural market intelligence platform powered by Pluck Agro.',
  /** The product's own name for its main surfaces. */
  surfaces: {
    publicSite: 'Hatsi360',
    portal: 'Hatsi360 Access Portal',
    fieldApp: 'Hatsi360 Field',
    controlCentre: 'Hatsi360 Intelligence Control Centre',
    customerWorkspace: 'Hatsi360 Customer Workspace',
    reporting: 'Hatsi360 Market Intelligence',
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

/**
 * The contact details of the operating business.
 *
 * Every one of these is reproduced exactly as the legacy site publishes it,
 * because they are the only contact details that can be verified. Nothing
 * here is invented and nothing here assumes a Hatsi360 domain.
 *
 * The mailbox and the number still carry the previous domain and brand. They
 * are replaced only when a confirmed Hatsi360 domain exists, which is tracked
 * as an open item in `docs/HATSI360_TRANSFORMATION_AUDIT.md`.
 */
export const CONTACT = {
  /** Published on every legacy page, in the header and the footer. */
  phone: '+234 801 234 5678',
  phoneHref: 'tel:+2348012345678',
  /**
   * The mailbox published by the legacy site. It is the only address that can
   * be verified, so it is used unchanged. It still carries the previous
   * domain; replacing it requires a confirmed Hatsi360 domain and is tracked
   * as an open item in `docs/HATSI360_TRANSFORMATION_AUDIT.md`.
   */
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
  /** A one-line explanation used in the footer and the mobile drawer. */
  description?: string;
  /**
   * The short form of the label, used in the desktop navigation bar where
   * every item has to fit on one line. The full label is kept for the mobile
   * drawer, the footer, the page metadata and search engines.
   */
  short?: string;
}

export const PRIMARY_NAV: NavLink[] = [
  {
    href: '/trade',
    label: 'Trade Intelligence',
    short: 'Trade',
    description: 'Market terminal, price movement and trading opportunities',
  },
  { href: '/commodities', label: 'Commodities', description: 'The commodity catalogue' },
  {
    href: '/prices',
    label: 'Market Prices',
    short: 'Prices',
    description: 'Current eligible price observations',
  },
  { href: '/markets', label: 'Markets', description: 'Markets under coverage' },
  {
    href: '/compare',
    label: 'Compare Prices',
    short: 'Compare',
    description: 'Multi-market comparison',
  },
  {
    href: '/insights',
    label: 'Market Insights',
    short: 'Insights',
    description: 'Market insights and analysis',
  },
  { href: '/reports', label: 'Reports', description: 'Published market intelligence' },
  {
    href: '/solutions',
    label: 'Solutions',
    short: 'Solutions',
    description: 'What each kind of customer does with the data',
  },
  { href: '/about', label: 'About', description: 'The platform and its methodology' },
];

export const SECONDARY_NAV: NavLink[] = [
  { href: '/coverage', label: 'Coverage', description: 'Where we collect, and what that means' },
  { href: '/methodology', label: 'Methodology', description: 'How a price becomes a published price' },
  { href: '/pricing', label: 'Plans & Pricing', description: 'Access tiers for professional data' },
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
 * The Hatsi360 palette, in one place, so the design system and the brand
 * documentation cannot drift apart. The values here are the same ones the
 * Tailwind theme exposes as `brand-*`, `leaf-*`, `harvest-*`, `sand-*`,
 * `earth-*` and `ink-*`.
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
    name: 'Deep Harvest Green',
    hex: '#123B2A',
    role: 'Primary brand surface — navigation, hero panels, the mark',
    contrastOnWhite: 12.46,
    textSafe: true,
  },
  {
    name: 'Forest Green',
    hex: '#174D35',
    role: 'Primary action colour, links, focus rings',
    contrastOnWhite: 9.77,
    textSafe: true,
  },
  {
    name: 'Agricultural Green',
    hex: '#26734B',
    role: 'Accent and body accent — links on white, chart series',
    contrastOnWhite: 5.78,
    textSafe: true,
  },
  {
    name: 'Fresh Growth Green',
    hex: '#5B9A57',
    role: 'Supporting accent — positive movement, highlights',
    contrastOnWhite: 3.38,
    textSafe: false,
  },
  {
    name: 'Grain Gold',
    hex: '#D5A441',
    role: 'Secondary accent — the mark, report marks, selected states',
    contrastOnWhite: 2.28,
    textSafe: false,
  },
  {
    name: 'Harvest Amber',
    hex: '#E5B95F',
    role: 'Signal colour on dark surfaces — market pulse, chart highlight',
    contrastOnWhite: 1.84,
    textSafe: false,
  },
  {
    name: 'Wheat Beige',
    hex: '#E9D8B5',
    role: 'Light grain tone on dark surfaces, category accents',
    contrastOnWhite: 1.4,
    textSafe: false,
  },
  {
    name: 'Natural Sand',
    hex: '#F4EFE4',
    role: 'Warm editorial panel background',
    contrastOnWhite: 1.15,
    textSafe: false,
  },
  {
    name: 'Charcoal',
    hex: '#202923',
    role: 'Body typography',
    contrastOnWhite: 14.97,
    textSafe: true,
  },
  {
    name: 'Deep Slate',
    hex: '#34423A',
    role: 'Secondary headings, dense UI text',
    contrastOnWhite: 10.57,
    textSafe: true,
  },
  {
    name: 'Muted Grey',
    hex: '#718078',
    role: 'Muted graphic tone — large text and rules only',
    contrastOnWhite: 4.15,
    textSafe: false,
  },
  {
    name: 'Soft Background',
    hex: '#F7F8F5',
    role: 'Page background',
    contrastOnWhite: null,
    textSafe: false,
  },
  {
    name: 'White',
    hex: '#ffffff',
    role: 'Cards and analytical surfaces',
    contrastOnWhite: null,
    textSafe: false,
  },
  {
    name: 'Border',
    hex: '#E3E9E2',
    role: 'Hairline borders and table rules',
    contrastOnWhite: null,
    textSafe: false,
  },
  {
    name: 'Success',
    hex: '#228B55',
    role: 'Status — verified, published, positive movement',
    contrastOnWhite: 4.29,
    textSafe: false,
  },
  {
    name: 'Warning',
    hex: '#D69E2E',
    role: 'Status — stale data, pending review',
    contrastOnWhite: 2.39,
    textSafe: false,
  },
  {
    name: 'Error',
    hex: '#C84B45',
    role: 'Status — rejected, failed, negative movement',
    contrastOnWhite: 4.62,
    textSafe: true,
  },
  {
    name: 'Information',
    hex: '#3478B8',
    role: 'Status — informational notices',
    contrastOnWhite: 4.64,
    textSafe: true,
  },
];

/**
 * The design tokens that the Tailwind theme exposes. The values are mirrored
 * in `src/app/globals.css`; `tests/brand/brand.test.ts` asserts that the two
 * files agree, so a token cannot change in one place only.
 */
export const DESIGN_TOKENS: Record<string, string> = {
  'brand-50': '#F1F7F0',
  'brand-100': '#E1EFE0',
  'brand-200': '#C2DEC1',
  'brand-300': '#9BC798',
  'brand-400': '#7CB277',
  'brand-500': '#2F8257',
  'brand-600': '#26734B',
  'brand-700': '#174D35',
  'brand-800': '#123B2A',
  'brand-900': '#0E2C1F',
  'brand-950': '#071A12',
  'leaf-100': '#E6F1E4',
  'leaf-200': '#C9E2C5',
  'leaf-300': '#9BC798',
  'leaf-400': '#7CB277',
  'leaf-500': '#5B9A57',
  'leaf-600': '#467C43',
  'leaf-700': '#376136',
  'harvest-100': '#FAF1DC',
  'harvest-200': '#F3DFB2',
  'harvest-300': '#E9C97E',
  'harvest-400': '#E5B95F',
  'harvest-500': '#D5A441',
  'harvest-600': '#B98B2E',
  'harvest-700': '#96702A',
  'sand-50': '#FBF8F1',
  'sand-100': '#F4EFE4',
  'sand-200': '#E9D8B5',
  'sand-300': '#DCC79A',
  'sand-400': '#CBB078',
  'sand-500': '#B0945F',
  'sand-600': '#8B7548',
  'sand-700': '#6B5A36',
  'earth-100': '#EDE7DE',
  'earth-200': '#D9CDBC',
  'earth-300': '#BFAF9A',
  'earth-400': '#A28F78',
  'earth-500': '#85735C',
  'earth-600': '#675844',
  'earth-700': '#4C4132',
  'ink-50': '#F7F8F5',
  'ink-100': '#EFF2EE',
  'ink-200': '#E3E9E2',
  'ink-300': '#CBD5CD',
  'ink-400': '#68756E',
  'ink-450': '#718078',
  'ink-500': '#5A6760',
  'ink-600': '#465149',
  'ink-700': '#3A443D',
  'ink-800': '#34423A',
  'ink-900': '#202923',
  'ink-950': '#121815',
  'success-500': '#228B55',
  'success-700': '#1C6E45',
  'warning-500': '#D69E2E',
  'warning-700': '#8A6520',
  'error-500': '#C84B45',
  'error-700': '#A63E39',
  'info-500': '#3478B8',
  'info-700': '#2C628F',
};

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
  name: BRAND.name,
  legalName: BRAND.name,
  descriptor: BRAND.descriptor,
  endorsement: BRAND.endorsement,
  ownershipStatement: BRAND.ownershipStatement,
  url: '/',
  logo: '/brand/hatsi360-logo-horizontal.png',
  /** The mark on its own, for icon and avatar use. */
  mark: '/brand/hatsi360-mark.png',
  email: CONTACT.email,
  telephone: CONTACT.phone,
  areaServed: 'Nigeria',
  foundingPlace: 'Kano, Nigeria',
} as const;
