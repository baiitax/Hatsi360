import type { Metadata } from 'next';
import Link from 'next/link';
import { FieldCard, FieldNote, FieldSection } from '@/components/agent/FieldUi';

export const metadata: Metadata = {
  title: 'Help — Field collection',
  robots: { index: false, follow: false },
};

const STEPS = [
  {
    title: 'Start from your assignment',
    body: 'Open Home to see what is due today, or Assignments for the full list. An assignment tells you which market to visit, which commodities to cover and by when.',
  },
  {
    title: 'Confirm the market',
    body: 'The collection flow opens on the market your assignment names. Check you are in the right place before you start entering prices.',
  },
  {
    title: 'Record the price as it was quoted',
    body: 'Choose the commodity, the price type and the unit the price was given in, then type the amount. The unit matters: a price per bag is not a price per kilogram, and the platform never converts between them for you.',
  },
  {
    title: 'Add what you saw',
    body: 'Availability, demand and price direction tell a reviewer what the number meant. A photograph of the price board or the weighing scale is worth more than a paragraph.',
  },
  {
    title: 'Save, then submit',
    body: 'Save Draft keeps the price on the server without sending it for review. Add Observation adds it to the session. Submit collection sends the whole session to the office once you confirm.',
  },
  {
    title: 'Answer a correction',
    body: 'If a reviewer asks for a change, it appears in Corrections with their reason. Your original values are kept; the correction is added on top with your explanation.',
  },
];

const FAQ = [
  {
    question: 'My phone lost signal. What happens to what I typed?',
    answer:
      'A draft saved on the device stays on the device and is queued. When the signal returns, the app offers to send it. Each queued price carries its own key, so sending it twice cannot create two prices.',
  },
  {
    question: 'Why can I not record a price at a market I know?',
    answer:
      'Only the markets assigned to you can be collected at. The app will not offer a market that is outside your coverage, and the database refuses the record even if the request is made by hand.',
  },
  {
    question: 'A price was approved and I think it is wrong. What do I do?',
    answer:
      'You cannot edit an approved record from the field app. Ask your supervisor; a correction made in the office keeps the original record and its history, which is what makes the published price trustworthy.',
  },
  {
    question: 'What does "awaiting review" mean?',
    answer:
      'Your price has been sent to the office and a reviewer has not decided on it yet. It is not approved, and the app will not say it is.',
  },
  {
    question: 'Do I need a photograph every time?',
    answer:
      'Only where the schedule for that market asks for evidence. When it does, the app tells you before you submit.',
  },
];

/**
 * The agent's help.
 *
 * Written for the moment an agent is standing in a market with one hand on
 * the phone: short, practical and specific. It is a page in the app rather
 * than a document to read elsewhere, because that is where it is needed.
 */
export default function AgentHelpPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-ink-950">Help</h1>
        <p className="mt-0.5 text-sm text-ink-500">
          How the collection flow works, and what to do when something is wrong.
        </p>
      </header>

      <FieldNote tone="info">
        The fastest path: <strong>Home → Start collection → pick the commodity → type the price → Add
        observation</strong>. Everything else on this page explains what happens next.
      </FieldNote>

      <FieldSection title="The collection flow">
        <ol className="space-y-2">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <FieldCard>
                <p className="text-sm font-bold text-ink-900">
                  <span className="mr-1.5 inline-flex size-5 items-center justify-center rounded-full bg-brand-700 text-[11px] font-bold text-white">
                    {index + 1}
                  </span>
                  {step.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-600">{step.body}</p>
              </FieldCard>
            </li>
          ))}
        </ol>
      </FieldSection>

      <FieldSection title="Common questions">
        <ul className="space-y-2">
          {FAQ.map((item) => (
            <li key={item.question}>
              <FieldCard>
                <p className="text-sm font-bold text-ink-900">{item.question}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-600">{item.answer}</p>
              </FieldCard>
            </li>
          ))}
        </ul>
      </FieldSection>

      <FieldSection title="Still stuck?">
        <FieldCard>
          <p className="text-xs leading-relaxed text-ink-600">
            Tell your supervisor which market you were at and what you were trying to do. They can
            see your assignments, your tasks and the state of your prices from the Control Centre.
          </p>
          <Link
            href="/agent/home"
            className="mt-2 inline-block text-xs font-bold text-brand-700 underline underline-offset-2"
          >
            Back to home
          </Link>
        </FieldCard>
      </FieldSection>
    </div>
  );
}
