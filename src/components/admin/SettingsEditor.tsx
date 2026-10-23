'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveSetting, type OperationState } from '@/lib/operations/actions';

/**
 * Edit one system setting.
 *
 * Values are stored as JSON when they parse and as plain text otherwise.
 * Secrets are never stored here: the integration section records only whether
 * a provider is configured, never the credential itself.
 */
export function SettingsEditor({
  settingKey,
  label,
  description,
  value,
  type = 'text',
}: {
  settingKey: string;
  label: string;
  description?: string;
  value: string;
  type?: 'text' | 'number' | 'boolean' | 'textarea';
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(value);
  const [result, setResult] = useState<OperationState | null>(null);

  const save = () => {
    startTransition(async () => {
      const outcome = await saveSetting(settingKey, draft, description);
      setResult(outcome);
      if (outcome.ok) router.refresh();
    });
  };

  return (
    <div className="border-b border-ink-100 py-3 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[14rem] flex-1">
          <label htmlFor={`setting-${settingKey}`} className="block text-sm font-semibold text-ink-800">
            {label}
          </label>
          {description ? (
            <p className="mt-0.5 text-xs text-ink-500">{description}</p>
          ) : null}
        </div>

        <div className="flex min-w-[16rem] flex-1 items-center gap-2">
          {type === 'boolean' ? (
            <select
              id={`setting-${settingKey}`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : type === 'textarea' ? (
            <textarea
              id={`setting-${settingKey}`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          ) : (
            <input
              id={`setting-${settingKey}`}
              type={type}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          )}

          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-lg bg-ink-900 px-3 py-2 text-xs font-semibold text-white hover:bg-black disabled:opacity-60"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {result ? (
        <p
          role="status"
          className={`mt-2 text-xs ${result.ok ? 'text-emerald-700' : 'text-red-700'}`}
        >
          {result.message}
        </p>
      ) : null}
    </div>
  );
}
