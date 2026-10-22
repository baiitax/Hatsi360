import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PageHero } from '@/components/ui/PageHero';
import { SignInForm } from '@/components/forms/AuthForms';
import { getSession } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your Pluck Live account.',
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect('/dashboard');

  return (
    <>
      <PageHero
        eyebrow="Welcome back"
        title="Sign in to Pluck Live"
        lede="Access your saved commodities and markets, your price alerts, your reports and your API keys."
        breadcrumbs={[{ label: 'Sign in' }]}
      />
      <div className="section">
        <div className="container-page max-w-md">
          <div className="card p-6 sm:p-8">
            <SignInForm />
          </div>
          <p className="mt-6 text-center text-sm text-ink-600">
            Looking for public prices instead?{' '}
            <Link href="/prices" className="font-semibold text-brand-700 hover:text-brand-800">
              Browse the price directory
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
