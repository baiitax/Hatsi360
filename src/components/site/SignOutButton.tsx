'use client';

import { useState, useTransition } from 'react';
import { signOut } from '@/lib/auth/actions';

export function SignOutButton({ className = '' }: { className?: string }) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={pending || busy}
      onClick={() => {
        setBusy(true);
        startTransition(async () => {
          await signOut();
        });
      }}
      className={`inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 disabled:opacity-60 ${className}`}
    >
      {pending || busy ? 'Signing out…' : 'Log Out'}
    </button>
  );
}
