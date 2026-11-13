import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PortalFrame } from '@/components/site/PortalFrame';
import { SignUpForm } from '@/components/forms/AuthForms';
import { getSession } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Create an account',
  description: 'Create a Hatsi360 account to save commodities, set price alerts and request API access.',
  robots: { index: false, follow: false },
};

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect('/dashboard');

  return (
    <PortalFrame
      title="Create your Hatsi360 account"
      lede="The price directory is free to browse without an account. An account lets you save commodities and markets, set price alerts and request API access."
      footer={
        <>
          By creating an account you agree to our{' '}
          <Link href="/terms" className="font-semibold text-brand-700 underline">
            terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="font-semibold text-brand-700 underline">
            privacy policy
          </Link>
          .
        </>
      }
    >
      <SignUpForm />
    </PortalFrame>
  );
}
