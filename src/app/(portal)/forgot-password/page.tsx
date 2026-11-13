import type { Metadata } from 'next';
import Link from 'next/link';
import { PortalFrame } from '@/components/site/PortalFrame';
import { ForgotPasswordForm } from '@/components/forms/AuthForms';

export const metadata: Metadata = {
  title: 'Reset your password',
  description: 'Request a password reset link for your Hatsi360 account.',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <PortalFrame
      title="Reset your password"
      lede="Enter the email address on your account and we will send you a reset link."
      footer={
        <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </PortalFrame>
  );
}
