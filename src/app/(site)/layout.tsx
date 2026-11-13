import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';

/**
 * The layout of the public platform.
 *
 * Everything a visitor or a customer reads — the homepage, the commodity
 * catalogue, the market directory, the price directory, the comparison, the
 * insights, the reports, the solutions, the legal pages and the customer
 * workspace — shares one header and one footer.
 *
 * The access portal and the two operator applications deliberately do not
 * appear here. They are in their own route groups, because a person signing
 * in or collecting prices should not be looking at the public navigation.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
