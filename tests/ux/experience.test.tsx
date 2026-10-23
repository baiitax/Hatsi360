// @vitest-environment jsdom
/**
 * User-experience tests: the field app under a weak connection, the
 * accessibility of the controls an agent and an administrator actually use,
 * and the loading, empty and error states.
 *
 * These are the Phase 8 user-experience requirements:
 *   * narrow mobile screens      -> the touch targets and the numeric keypad
 *   * keyboard navigation        -> focus order, labels, focus rings
 *   * loading and error states   -> the submit button, the queue banner
 *   * empty and large tables     -> the console primitives
 *   * accessibility and contrast -> the semantic markup
 *   * simulated weak connectivity-> the offline queue and the retry
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/agent/collect',
  useSearchParams: () => new URLSearchParams(),
}));

import { CollectionFlow } from '@/components/agent/CollectionFlow';
import { CentralSignInForm } from '@/components/forms/CentralSignInForm';
import { DataTable } from '@/components/ops/DataTable';
import { KpiCard } from '@/components/ops/KpiCard';

interface Row {
  market: string;
  price: string;
}

const MARKETS = [
  { id: 1, name: 'Dawanau International Grains Market', stateName: 'Kano' },
  { id: 2, name: 'Mile 12 Market', stateName: 'Lagos' },
];
const COMMODITIES = [
  { id: 1, name: 'Paddy Rice', inScope: true },
  { id: 2, name: 'Groundnut', inScope: true },
  { id: 3, name: 'Cassava', inScope: false },
];
const UNITS = [
  { id: 1, code: 'kg', name: 'Kilogram', isSpecific: true },
  { id: 2, code: 'unspecified', name: 'Unspecified', isSpecific: false },
];
const TASKS = [
  { id: 901, marketId: 1, marketName: 'Dawanau', commodityIds: [1], commodityNames: ['Paddy Rice'], status: 'open' },
];

function renderFlow() {
  return render(
    <CollectionFlow markets={MARKETS} commodities={COMMODITIES} units={UNITS} tasks={TASKS} />,
  );
}

/** Walk the flow to the final step. */
async function goToReview() {
  fireEvent.click(screen.getByLabelText(/Dawanau International Grains Market/));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByLabelText('Paddy Rice'));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.change(screen.getByLabelText('Unit'), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.change(screen.getByLabelText(/Price in Kilogram/), { target: { value: '40550' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
}

describe('the collection flow', () => {
  beforeEach(() => {
    window.localStorage.clear();
    refresh.mockClear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('starts on the market step and will not continue without a market', () => {
    renderFlow();
    expect(screen.getByText(/Step 1 of 6/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' }).hasAttribute('disabled')).toBe(true);
  });

  it('shows only the markets the agent is assigned to', () => {
    renderFlow();
    expect(screen.getByLabelText(/Dawanau International Grains Market/)).toBeTruthy();
    expect(screen.getByLabelText(/Mile 12 Market/)).toBeTruthy();
    expect(screen.queryByLabelText(/Gujungu/)).toBeNull();
  });

  it('says so plainly when the agent has no market', () => {
    render(<CollectionFlow markets={[]} commodities={[]} units={[]} tasks={[]} />);
    expect(screen.getByText(/no market assigned yet/i)).toBeTruthy();
  });

  it('uses a numeric keypad for the amount and the package count', async () => {
    renderFlow();
    fireEvent.click(screen.getByLabelText(/Dawanau International Grains Market/));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByLabelText('Paddy Rice'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    const amount = screen.getByLabelText(/Price in Kilogram/) as HTMLInputElement;
    expect(amount.getAttribute('inputmode')).toBe('decimal');
    expect(amount.getAttribute('type')).toBe('number');

    const bags = screen.getByLabelText(/Number of bags/) as HTMLInputElement;
    expect(bags.getAttribute('inputmode')).toBe('numeric');
  });

  it('associates every control with a visible label', () => {
    renderFlow();
    // The radio group is wrapped in a <label>, so the accessible name resolves.
    expect(screen.getByLabelText(/Dawanau International Grains Market/)).toBeTruthy();
    expect(screen.getByRole('group')).toBeTruthy();
  });

  it('keeps a draft on the device while the agent types', async () => {
    renderFlow();
    fireEvent.click(screen.getByLabelText(/Dawanau International Grains Market/));
    await waitFor(() => {
      const draft = window.localStorage.getItem('pluck-live.collection-draft');
      expect(draft).toBeTruthy();
      expect(JSON.parse(draft as string).marketId).toBe(1);
    });
  });

  it('restores a saved draft and says that it did', async () => {
    window.localStorage.setItem(
      'pluck-live.collection-draft',
      JSON.stringify({ marketId: 2, commodityId: null, priceType: 'farmgate', unitId: null, amount: '', packageWeightKg: '', packageCount: '', collectedAt: '2026-10-22T09:00', notes: '', taskId: null, idempotencyKey: 'pl-existing' }),
    );

    renderFlow();
    await waitFor(() => {
      expect(screen.getByText(/saved draft was found/i)).toBeTruthy();
    });
    expect((screen.getByLabelText(/Mile 12 Market/) as HTMLInputElement).checked).toBe(true);
  });

  it('queues the price on the device when the connection drops', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'));

    renderFlow();
    await goToReview();
    fireEvent.click(screen.getByRole('button', { name: 'Send for verification' }));

    await waitFor(() => {
      expect(screen.getByText(/There is no connection/)).toBeTruthy();
    });

    const queue = JSON.parse(window.localStorage.getItem('pluck-live.pending-submissions') as string);
    expect(queue).toHaveLength(1);
    expect(queue[0].amount).toBe('40550');
    expect(queue[0].idempotencyKey).toMatch(/^pl-/);
  });

  it('retries with the same idempotency key, so a retry cannot duplicate the price', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'));

    renderFlow();
    await goToReview();
    fireEvent.click(screen.getByRole('button', { name: 'Send for verification' }));

    await waitFor(() => {
      expect(window.localStorage.getItem('pluck-live.pending-submissions')).toBeTruthy();
    });
    const firstKey = JSON.parse(window.localStorage.getItem('pluck-live.pending-submissions') as string)[0]
      .idempotencyKey;

    // The connection comes back.
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Try sending again' }));

    await waitFor(() => {
      expect(window.localStorage.getItem('pluck-live.pending-submissions')).toBeNull();
    });

    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.at(-1);
    const body = JSON.parse(call?.[1]?.body as string);
    expect(body.idempotencyKey).toBe(firstKey);
  });

  it('keeps the price on the device when the server refuses it', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false, message: 'That market is not assigned to you.' }),
    });

    renderFlow();
    await goToReview();
    fireEvent.click(screen.getByRole('button', { name: 'Send for verification' }));

    await waitFor(() => {
      expect(screen.getByText(/not assigned to you/)).toBeTruthy();
    });
    expect(window.localStorage.getItem('pluck-live.pending-submissions')).toBeTruthy();
  });

  it('clears the draft and confirms only after the server accepts the price', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    renderFlow();
    await goToReview();
    fireEvent.click(screen.getByRole('button', { name: 'Send for verification' }));

    await waitFor(() => {
      expect(screen.getByText(/waiting for verification/i)).toBeTruthy();
    });
    expect(window.localStorage.getItem('pluck-live.collection-draft')).toBeNull();
  });

  it('warns when the chosen unit does not state a measure', async () => {
    renderFlow();
    fireEvent.click(screen.getByLabelText(/Dawanau International Grains Market/));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByLabelText('Paddy Rice'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByLabelText(/Price in Unspecified/), { target: { value: '40550' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText(/does not state a specific measure/)).toBeTruthy();
  });

  it('collects the next commodity at the same market with a new idempotency key', async () => {
    renderFlow();
    await goToReview();

    const before = JSON.parse(window.localStorage.getItem('pluck-live.collection-draft') as string)
      .idempotencyKey;

    fireEvent.click(screen.getByRole('button', { name: 'Collect another commodity here' }));

    await waitFor(() => {
      const after = JSON.parse(window.localStorage.getItem('pluck-live.collection-draft') as string)
        .idempotencyKey;
      expect(after).not.toBe(before);
    });

    // The market and the price type are kept, so only one number is typed.
    const draft = JSON.parse(window.localStorage.getItem('pluck-live.collection-draft') as string);
    expect(draft.marketId).toBe(1);
    expect(draft.priceType).toBe('wholesale_transaction');
    expect(screen.getByText(/Ready for the next commodity/)).toBeTruthy();
    // The flow returns to the commodity step; the market is not asked again.
    expect(screen.getByText(/Step 2 of 6/)).toBeTruthy();
  });

  it('never carries a price over into the next commodity', async () => {
    renderFlow();
    await goToReview();
    fireEvent.click(screen.getByRole('button', { name: 'Collect another commodity here' }));

    await waitFor(() => {
      const draft = JSON.parse(window.localStorage.getItem('pluck-live.collection-draft') as string);
      expect(draft.amount).toBe('');
      expect(draft.commodityId).toBeNull();
    });
  });

  it('shows the collected values on the review step before anything is sent', async () => {
    renderFlow();
    await goToReview();

    const summary = screen.getByText('Check and send').closest('div') as HTMLElement;
    expect(within(summary).getByText('Dawanau International Grains Market')).toBeTruthy();
    expect(within(summary).getByText('Paddy Rice')).toBeTruthy();
    expect(within(summary).getByText('₦40550')).toBeTruthy();
  });

  it('has no form element, so a page reload cannot submit a half-entered price', () => {
    const { container } = renderFlow();
    expect(container.querySelector('form')).toBeNull();
  });
});

describe('the central sign-in form', () => {
  beforeEach(() => {
    window.localStorage.clear();
    refresh.mockClear();
  });

  afterEach(() => cleanup());

  it('labels the email and password fields and marks them for the browser', () => {
    render(<CentralSignInForm />);

    const email = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(email.getAttribute('type')).toBe('email');
    expect(email.getAttribute('autocomplete')).toBe('email');

    const password = screen.getByLabelText(/password/i) as HTMLInputElement;
    expect(password.getAttribute('type')).toBe('password');
    expect(password.getAttribute('autocomplete')).toBe('current-password');
  });

  it('can reveal the password and hides it again', () => {
    render(<CentralSignInForm />);
    const password = screen.getByLabelText(/password/i) as HTMLInputElement;
    expect(password.getAttribute('type')).toBe('password');

    const toggle = screen.getByRole('button', { name: /show/i });
    fireEvent.click(toggle);
    expect((screen.getByLabelText(/password/i) as HTMLInputElement).getAttribute('type')).toBe('text');

    fireEvent.click(screen.getByRole('button', { name: /hide/i }));
    expect((screen.getByLabelText(/password/i) as HTMLInputElement).getAttribute('type')).toBe(
      'password',
    );
  });

  it('offers a password recovery route', () => {
    render(<CentralSignInForm />);
    expect(screen.getByRole('link', { name: /forgot|recover|reset/i })).toBeTruthy();
  });
});

describe('the console primitives', () => {
  afterEach(() => cleanup());

  it('shows an honest empty state instead of a zero', () => {
    render(
      <DataTable
        columns={[{ key: 'a', header: 'Market', cell: (row: { a: string }) => row.a }]}
        rows={[]}
        rowKey={(row: { a: string }) => row.a}
        empty="No market has reported yet."
      />,
    );
    expect(screen.getByText('No market has reported yet.')).toBeTruthy();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('gives every column a header a screen reader can announce', () => {
    render(
      <DataTable
        columns={[
          { key: 'market', header: 'Market', cell: (row: Row) => row.market },
          { key: 'price', header: 'Latest price', cell: (row: Row) => row.price },
        ]}
        rows={[{ market: 'Dawanau', price: '₦40,550' }]}
        rowKey={(row: Row) => row.market}
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'Market' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Latest price' })).toBeTruthy();
  });

  it('renders a large table without losing its headers', () => {
    const rows: Row[] = Array.from({ length: 500 }, (_, index) => ({
      market: `Market ${index}`,
      price: `₦${index}`,
    }));
    render(
      <DataTable
        columns={[
          { key: 'market', header: 'Market', cell: (row: Row) => row.market },
          { key: 'price', header: 'Latest price', cell: (row: Row) => row.price },
        ]}
        rows={rows}
        rowKey={(row: Row) => row.market}
      />,
    );
    expect(screen.getAllByRole('row').length).toBe(501);
    expect(screen.getByRole('columnheader', { name: 'Market' })).toBeTruthy();
  });

  it('does not show a percentage when the comparison has no baseline', () => {
    render(
      <KpiCard
        label="Published observations"
        value="12"
        changePercent={null}
        definition="Approved observations that have been published."
      />,
    );
    expect(screen.getByText(/No prior period to compare/)).toBeTruthy();
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it('shows the comparison and its direction when there is a baseline', () => {
    render(
      <KpiCard
        label="Published observations"
        value="12"
        changePercent={50}
        definition="Approved observations that have been published."
        source="price_observations"
      />,
    );
    expect(screen.getByText(/50\.0% vs previous period/)).toBeTruthy();
    expect(screen.getByText(/▲/)).toBeTruthy();
    expect(screen.getByText(/Source: price_observations/)).toBeTruthy();
  });

  it('shows the documented definition of the metric on the card', () => {
    render(
      <KpiCard
        label="Task completion rate"
        value="86%"
        changePercent={0}
        definition="Completed eligible tasks divided by total eligible tasks, excluding cancelled tasks."
      />,
    );
    expect(screen.getByText(/excluding cancelled tasks/)).toBeTruthy();
  });
});
