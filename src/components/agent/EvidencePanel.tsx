'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  uploadFieldEvidence,
  removeFieldEvidence,
  evidenceUrl,
} from '@/lib/operations/field-actions';
import { HatsiSpinner } from '@/components/loading/HatsiActionLoader';

export interface EvidenceItem {
  id: number;
  fileName: string;
  caption: string | null;
  byteSize: number;
  contentType: string;
}

/**
 * The evidence attached to one price.
 *
 * The file goes to a private bucket and is read through a signed link that
 * expires. There is no public URL and no way to guess one: the link is
 * produced by the database, which checks who is asking.
 *
 * A photograph of the price board, the weighing scale or the grain itself is
 * worth more than a paragraph of description, so the camera is one tap away
 * on a phone.
 */
export function EvidencePanel({
  observationId,
  evidence,
  canEdit,
}: {
  observationId: string;
  evidence: EvidenceItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [opening, setOpening] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setMessage(null);
    startTransition(async () => {
      const result = await uploadFieldEvidence(observationId, file);
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) router.refresh();
    });
  };

  const onRemove = (evidenceId: number) => {
    setMessage(null);
    startTransition(async () => {
      const result = await removeFieldEvidence(evidenceId);
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) router.refresh();
    });
  };

  const onOpen = (evidenceId: number) => {
    setOpening(evidenceId);
    startTransition(async () => {
      const url = await evidenceUrl(evidenceId);
      setOpening(null);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        setMessage({
          ok: false,
          text: 'That file could not be opened. It may have been removed.',
        });
      }
    });
  };

  return (
    <div className="space-y-3">
      {evidence.length > 0 ? (
        <ul className="space-y-2">
          {evidence.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-900">{item.fileName}</p>
                <p className="mt-0.5 text-[11px] text-ink-500">
                  {Math.max(1, Math.round(item.byteSize / 1024))} KB
                  {item.contentType.startsWith('image/') ? ' · photograph' : ' · document'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => onOpen(item.id)}
                  disabled={pending || opening === item.id}
                  className="text-[11px] font-bold text-brand-700 underline underline-offset-2 disabled:opacity-60"
                >
                  {opening === item.id ? 'Opening…' : 'Open'}
                </button>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    disabled={pending}
                    className="text-[11px] font-bold text-ink-500 underline underline-offset-2 disabled:opacity-60"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-ink-500">
          No evidence attached. A photograph of the price board or the weighing scale helps the
          reviewer judge the record.
        </p>
      )}

      {canEdit ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={pending}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {pending ? <HatsiSpinner /> : null}
            Take a photograph
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={pending}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-bold text-ink-800 disabled:opacity-60"
          >
            Choose a file
          </button>

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => {
              onFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            className="sr-only"
            onChange={(event) => {
              onFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </div>
      ) : null}

      {message ? (
        <p
          role="status"
          className={`text-xs font-semibold ${message.ok ? 'text-brand-700' : 'text-error-700'}`}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
