/**
 * Trade Intelligence navigation.
 *
 * Brief §3 asks for a concise menu with the terminal as the primary
 * destination. Seven destinations, in that order.
 *
 * Only destinations that exist are listed. Nothing here is a placeholder.
 */

export interface TradeNavItem {
  href: string;
  label: string;
  /** What the destination is for, shown as a tooltip. */
  description: string;
}

export const TRADE_NAV: TradeNavItem[] = [
  {
    href: '/trade',
    label: 'Overview',
    description: 'What is moving, and where the best prices are',
  },
  {
    href: '/trade/terminal',
    label: 'Terminal',
    description: 'Candlestick charts and market data for one commodity',
  },
  {
    href: '/trade/best-buy',
    label: 'Best buy',
    description: 'Where the lowest verified price was recorded',
  },
  {
    href: '/trade/best-sell',
    label: 'Best sell',
    description: 'Where the highest verified price was recorded',
  },
  {
    href: '/trade/fundamentals',
    description: 'Field-reported supply, demand and market conditions',
    label: 'Fundamentals',
  },
  {
    href: '/trade/watchlist',
    label: 'Watchlist',
    description: 'The commodities and markets you follow',
  },
  {
    href: '/trade/alerts',
    label: 'Alerts',
    description: 'Price thresholds and how you are notified',
  },
];
