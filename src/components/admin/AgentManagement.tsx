'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  provisionAgent,
  setAgentStatus,
  setMarketAssignment,
  type OperationState,
} from '@/lib/operations/actions';

/**
 * Agent management controls.
 *
 * Provisioning happens on the server with the service role: the browser never
 * holds a privileged key, and it cannot choose the role it creates — the
 * database function decides that the account becomes an agent.
 */

export function ProvisionAgentForm({ markets }: { markets: { id: number; name: string }[] }) {
  const [state, formAction, pending] = useActionState<OperationState, FormData>(
    provisionAgent,
    { ok: false, message: '' },
  );
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800"
      >
        {open ? 'Close' : 'Provision a market agent'}
      </button>

      {open ? (
        <form action={formAction} className="mt-4 grid gap-3 rounded-xl border border-ink-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.message ? (
            <p
              role="status"
              className={`sm:col-span-2 lg:col-span-3 rounded-lg border px-3 py-2 text-xs font-medium ${
                state.ok
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {state.message}
            </p>
          ) : null}

          <div>
            <label htmlFor="fullName" className="mb-1 block text-xs font-semibold text-ink-700">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              required
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            {state.fieldErrors?.fullName ? (
              <p className="mt-1 text-xs text-red-700">{state.fieldErrors.fullName}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-semibold text-ink-700">
              Work email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            {state.fieldErrors?.email ? (
              <p className="mt-1 text-xs text-red-700">{state.fieldErrors.email}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="phone" className="mb-1 block text-xs font-semibold text-ink-700">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              inputMode="tel"
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label htmlFor="employeeCode" className="mb-1 block text-xs font-semibold text-ink-700">
              Employee code
            </label>
            <input
              id="employeeCode"
              name="employeeCode"
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label htmlFor="region" className="mb-1 block text-xs font-semibold text-ink-700">
              Region
            </label>
            <input
              id="region"
              name="region"
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label htmlFor="temporaryPassword" className="mb-1 block text-xs font-semibold text-ink-700">
              Temporary password
            </label>
            <input
              id="temporaryPassword"
              name="temporaryPassword"
              type="text"
              required
              minLength={8}
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <p className="mt-1 text-[11px] text-ink-500">
              Share it securely. The agent is asked to change it after signing in.
            </p>
          </div>

          <fieldset className="sm:col-span-2 lg:col-span-3">
            <legend className="mb-1 text-xs font-semibold text-ink-700">Assigned markets</legend>
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {markets.map((market) => (
                <label key={market.id} className="flex items-center gap-2 text-xs text-ink-700">
                  <input
                    type="checkbox"
                    name="marketIds"
                    value={market.id}
                    className="size-4 rounded border-ink-300"
                  />
                  {market.name}
                </label>
              ))}
              {markets.length === 0 ? (
                <p className="text-xs text-ink-500">No active markets are available.</p>
              ) : null}
            </div>
          </fieldset>

          <div className="sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
            >
              {pending ? 'Creating…' : 'Create the agent account'}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

export function AgentStatusControl({
  agentId,
  agentName,
  status,
}: {
  agentId: string;
  agentName: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const change = (next: 'active' | 'suspended' | 'deactivated') => {
    if (reason.trim().length < 3) {
      setMessage('Give a reason of at least 3 characters. It is recorded in the audit trail.');
      return;
    }
    startTransition(async () => {
      const result = await setAgentStatus(agentId, next, reason);
      setMessage(result.message);
      if (result.ok) {
        setReason('');
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {status !== 'active' ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => change('active')}
            className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
          >
            Reactivate
          </button>
        ) : null}
        {status !== 'suspended' ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => change('suspended')}
            className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
          >
            Suspend
          </button>
        ) : null}
        {status !== 'deactivated' ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => change('deactivated')}
            className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-800 hover:bg-red-100 disabled:opacity-60"
          >
            Deactivate
          </button>
        ) : null}
      </div>

      <input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Reason (recorded in the audit trail)"
        aria-label={`Reason for changing ${agentName}'s account status`}
        className="w-full rounded-md border border-ink-200 px-2 py-1 text-[11px] outline-none focus:border-brand-500"
      />

      {message ? <p className="text-[11px] text-ink-600">{message}</p> : null}
    </div>
  );
}

export function AssignmentControl({
  agentId,
  agentName,
  markets,
  assignedMarketIds,
}: {
  agentId: string;
  agentName: string;
  markets: { id: number; name: string }[];
  assignedMarketIds: number[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const toggle = (marketId: number, active: boolean) => {
    startTransition(async () => {
      const result = await setMarketAssignment(agentId, marketId, active, 'Changed from the console.');
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <ul className="space-y-1">
        {markets.map((market) => {
          const assigned = assignedMarketIds.includes(market.id);
          return (
            <li key={market.id} className="flex items-center justify-between gap-2">
              <span className="text-xs text-ink-700">{market.name}</span>
              <button
                type="button"
                disabled={pending}
                onClick={() => toggle(market.id, !assigned)}
                className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold disabled:opacity-60 ${
                  assigned
                    ? 'border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100'
                    : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-100'
                }`}
              >
                {assigned ? 'Assigned' : 'Assign'}
              </button>
            </li>
          );
        })}
      </ul>
      {message ? <p className="text-[11px] text-ink-600">{message}</p> : null}
    </div>
  );
}
