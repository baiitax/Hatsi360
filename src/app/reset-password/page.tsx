import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/ui/PageHero';

export const metadata: Metadata = {
  title: 'Choose a new password',
  description: 'Set a new password for your Pluck Live account.',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <>
      <PageHero
        eyebrow="Account recovery"
        title="Choose a new password"
        lede="Open this page from the link in your reset email so we can verify the request."
        breadcrumbs={[{ label: 'Reset password' }]}
      />
      <div className="section">
        <div className="container-page max-w-md">
          <div className="card p-6 sm:p-8">
            <p className="text-sm leading-relaxed text-ink-600">
              Password reset is handled by our authentication provider. Open the link in the reset
              email on this device and you will be returned here to set a new password.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-ink-600">
              If the link has expired, request a new one from the{' '}
              <Link href="/forgot-password" className="font-semibold text-brand-700 underline">
                forgot password
              </Link>{' '}
              page.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
