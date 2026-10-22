import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/ui/PageHero';
import { ForgotPasswordForm } from '@/components/forms/AuthForms';

export const metadata: Metadata = {
  title: 'Reset your password',
  description: 'Request a password reset link for your Pluck Live account.',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <>
      <PageHero
        eyebrow="Account recovery"
        title="Reset your password"
        lede="Enter the email address on your account and we will send you a reset link."
        breadcrumbs={[{ label: 'Forgot password' }]}
      />
      <div className="section">
        <div className="container-page max-w-md">
          <div className="card p-6 sm:p-8">
            <ForgotPasswordForm />
          </div>
          <p className="mt-6 text-center text-sm text-ink-600">
            <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
