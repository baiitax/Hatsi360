import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PageHero } from '@/components/ui/PageHero';
import { SignUpForm } from '@/components/forms/AuthForms';
import { getSession } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Create an account',
  description: 'Create a Pluck Live account to save commodities, set price alerts and request API access.',
  robots: { index: false, follow: false },
};

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect('/dashboard');

  return (
    <>
      <PageHero
        eyebrow="Get started"
        title="Create your Pluck Live account"
        lede="The price directory is free to browse without an account. An account lets you save commodities and markets, set price alerts and request API access."
        breadcrumbs={[{ label: 'Register' }]}
      />
      <div className="section">
        <div className="container-page max-w-md">
          <div className="card p-6 sm:p-8">
            <SignUpForm />
          </div>
          <p className="mt-6 text-center text-sm text-ink-600">
            By creating an account you agree to our{' '}
            <Link href="/terms" className="font-semibold text-brand-700 underline">
              terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="font-semibold text-brand-700 underline">
              privacy policy
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}
