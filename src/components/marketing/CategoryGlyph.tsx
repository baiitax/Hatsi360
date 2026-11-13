/**
 * Category glyphs.
 *
 * Original line artwork, one per commodity category, drawn on a 48 x 48 grid.
 * They are deliberately geometric and monochrome: the identity is carried by
 * the data, not by illustration. No third-party clip art is used anywhere in
 * the product.
 */
export function CategoryGlyph({
  slug,
  className = '',
  size = 32,
}: {
  slug: string;
  className?: string;
  size?: number;
}) {
  const common = {
    viewBox: '0 0 48 48',
    width: size,
    height: size,
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className,
  };

  switch (slug) {
    /* A cereal ear: a stem with paired grains. */
    case 'grains-cereals':
      return (
        <svg {...common}>
          <path d="M24 42V18" />
          <path d="M24 20c-4-1-6-4-6-8 4 0 6 3 6 8Z" />
          <path d="M24 20c4-1 6-4 6-8-4 0-6 3-6 8Z" />
          <path d="M24 28c-4-1-6-4-6-8 4 0 6 3 6 8Z" />
          <path d="M24 28c4-1 6-4 6-8-4 0-6 3-6 8Z" />
          <path d="M24 36c-4-1-6-4-6-8 4 0 6 3 6 8Z" />
          <path d="M24 36c4-1 6-4 6-8-4 0-6 3-6 8Z" />
        </svg>
      );

    /* An oilseed head: a ring of seeds. */
    case 'oilseeds':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="13" />
          <circle cx="24" cy="18" r="2.6" />
          <circle cx="29.3" cy="21" r="2.6" />
          <circle cx="29.3" cy="27" r="2.6" />
          <circle cx="24" cy="30" r="2.6" />
          <circle cx="18.7" cy="27" r="2.6" />
          <circle cx="18.7" cy="21" r="2.6" />
        </svg>
      );

    /* Two legume pods. */
    case 'pulses-legumes':
      return (
        <svg {...common}>
          <path d="M13 12c8 2 12 8 12 16 0 4-2 7-5 8-3-4-6-9-9-12-3-3-4-7-3-11Z" />
          <path d="M35 18c-7 1-11 6-12 13-.4 4 1 7 4 8 3-4 7-8 10-10 3-3 4-7 3-11Z" />
          <circle cx="20" cy="22" r="1.5" />
          <circle cx="22" cy="28" r="1.5" />
          <circle cx="29" cy="25" r="1.5" />
          <circle cx="27" cy="31" r="1.5" />
        </svg>
      );

    /* A root or tuber. */
    case 'roots-tubers':
      return (
        <svg {...common}>
          <path d="M24 12c8 0 13 5 13 12s-5 12-13 12-13-5-13-12 5-12 13-12Z" />
          <path d="M24 12v24" />
          <path d="M18 20h12M16 28h16M20 35h8" />
        </svg>
      );

    /* A fruit with a calyx. */
    case 'fruits-vegetables':
      return (
        <svg {...common}>
          <circle cx="24" cy="27" r="12" />
          <path d="M24 15V9" />
          <path d="M24 11c4-3 8-2 9-1-1 3-5 4-9 3Z" />
        </svg>
      );

    /* A sprig of herbs. */
    case 'spices-herbs':
      return (
        <svg {...common}>
          <path d="M12 38C18 30 26 22 36 12" />
          <path d="M20 30c-5 0-8-3-8-7 5 0 8 3 8 7Z" />
          <path d="M26 24c-5-1-7-4-7-8 5 0 7 4 7 8Z" />
          <path d="M30 20c0-5 3-8 7-8 0 5-3 8-7 8Z" />
        </svg>
      );

    /* A tree crop. */
    case 'tree-crops':
      return (
        <svg {...common}>
          <circle cx="24" cy="20" r="11" />
          <path d="M24 31v12" />
          <path d="M24 37c-3 0-5-2-5-5 3 0 5 2 5 5Z" />
          <path d="M24 37c3 0 5-2 5-5-3 0-5 2-5 5Z" />
        </svg>
      );

    /* Livestock: a horned head. */
    case 'livestock-poultry':
      return (
        <svg {...common}>
          <path d="M24 18c7 0 11 5 11 11s-5 13-11 13-11-7-11-13 4-11 11-11Z" />
          <path d="M13 20c-4-1-6-4-6-8 4 1 6 3 7 6" />
          <path d="M35 20c4-1 6-4 6-8-4 1-6 3-7 6" />
          <circle cx="20" cy="27" r="1.6" />
          <circle cx="28" cy="27" r="1.6" />
        </svg>
      );

    /* Animal products: a bottle and an egg. */
    case 'animal-products':
      return (
        <svg {...common}>
          <path d="M14 14h8v5l4 6v11a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V25l4-6Z" />
          <path d="M34 16c4 0 7 5 7 10s-3 8-7 8-7-3-7-8 3-10 7-10Z" />
        </svg>
      );

    /* Processed output: a processing block. */
    case 'processed-agricultural':
      return (
        <svg {...common}>
          <path d="M10 38V22l10 6V22l10 6V14h8v24Z" />
          <path d="M10 38h28" />
          <path d="M33 14V8h5v10" />
        </svg>
      );

    /* Export: a shipping container. */
    case 'export-commodities':
    case 'cash-crops':
      return (
        <svg {...common}>
          <rect x="8" y="16" width="32" height="18" rx="2" />
          <path d="M14 16v18M20 16v18M26 16v18M32 16v18" />
          <path d="M8 25h32" />
        </svg>
      );

    /* By-products: a circular flow. */
    case 'agricultural-by-products':
      return (
        <svg {...common}>
          <path d="M37 24a13 13 0 1 1-4-9.5" />
          <path d="M33 8v7h-7" />
          <circle cx="24" cy="24" r="3.5" />
        </svg>
      );

    /* Everything else. */
    default:
      return (
        <svg {...common}>
          <circle cx="24" cy="16" r="4" />
          <circle cx="16" cy="32" r="4" />
          <circle cx="32" cy="32" r="4" />
        </svg>
      );
  }
}
