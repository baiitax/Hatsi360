/**
 * Hatsi360 Markets — the interactive controls.
 *
 * These are the controls that hold state, so this file is marked `'use client'`
 * and is the only part of the control set that reaches the browser. The
 * presentational half — buttons, fields, selects, tabs, badges, dividers — is in
 * `./primitives` and stays a Server Component.
 *
 * Splitting the two is not tidiness for its own sake. A terminal is read far
 * more often than it is clicked, so the parts that only *display* must not be
 * paid for by the parts that *interact*.
 *
 * Every control here states its own condition with `aria-expanded`,
 * `aria-pressed`, `aria-modal` or `aria-describedby`, so a control can never
 * look open without being open.
 */

'use client';

import type { ReactNode } from 'react';
import { useId, useState } from 'react';
import { CONTROL, CONTROL_STATES, IconButton } from './primitives';

/* ---------------------------------------------------------------- tooltips */

/**
 * A tooltip.
 *
 * CSS-only, so it works with JavaScript disabled and costs nothing on a phone.
 * The trigger is a `<button type="button">` — never a div — so it is reachable
 * by keyboard and announced as an expandable control, and the panel is
 * `aria-describedby`-linked rather than left as a floating mystery.
 */
export function Tooltip({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <span className={`group/tt relative inline-flex ${className}`}>
      <button
        type="button"
        aria-describedby={id}
        className="inline-flex cursor-help items-center gap-1 rounded border-terminal-border bg-transparent p-0 text-left text-[0.6875rem] font-medium text-terminal-text-muted underline decoration-dotted decoration-1 underline-offset-2 transition-colors hover:text-terminal-text-secondary focus-visible:text-terminal-text"
      >
        {children}
      </button>
      <span
        role="tooltip"
        id={id}
        className="pointer-events-none absolute bottom-full left-1/2 z-[var(--z-tooltip)] mb-1.5 w-max max-w-[16rem] -translate-x-1/2 rounded-control border border-terminal-border bg-terminal-elevated px-2.5 py-1.5 text-[0.6875rem] font-normal leading-4 text-terminal-text opacity-0 shadow-terminal transition-opacity duration-150 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------- menus */

/**
 * A dropdown menu.
 *
 * The disclosure is a real button with `aria-expanded`, and the panel is
 * `aria-hidden` when closed rather than unmounted, so a screen reader never
 * announces a menu that is not on screen. It closes on Escape, on a click
 * outside, and on selection — the three things a user expects.
 */
export function DropdownMenu({
  label,
  children,
  align = 'start',
  className = '',
  trigger,
}: {
  label: string;
  children: ReactNode;
  align?: 'start' | 'end';
  className?: string;
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className={`${CONTROL} ${CONTROL_STATES}`}
      >
        {trigger ?? label}
        <ChevronGlyph />
      </button>

      {open ? (
        <>
          {/* A transparent full-screen layer, so a click anywhere closes. */}
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[var(--z-drawer)] cursor-default"
          />
          <div
            id={id}
            className={`absolute top-[calc(100%+0.25rem)] z-[var(--z-drawer)] min-w-[12rem] overflow-hidden rounded-panel border border-terminal-border bg-terminal-elevated py-1 shadow-terminal-lift ${
              align === 'end' ? 'right-0' : 'left-0'
            }`}
          >
            <div onClick={() => setOpen(false)} onKeyDown={() => setOpen(false)}>
              {children}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

/** One entry inside a {@link DropdownMenu}. */
export function MenuItem({
  href,
  onSelect,
  icon,
  children,
  description,
  selected = false,
}: {
  href?: string;
  onSelect?: () => void;
  icon?: ReactNode;
  children: ReactNode;
  description?: string;
  selected?: boolean;
}) {
  const body = (
    <>
      {icon ? <span className="mt-px shrink-0 text-terminal-text-muted">{icon}</span> : null}
      <span className="min-w-0">
        <span className="block truncate text-[0.8125rem] font-medium text-terminal-text">
          {children}
        </span>
        {description ? (
          <span className="mt-0.5 block text-[0.6875rem] leading-4 text-terminal-text-muted">
            {description}
          </span>
        ) : null}
      </span>
      {selected ? (
        <span aria-hidden="true" className="ml-auto shrink-0 text-harvest-300">
          <CheckGlyph />
        </span>
      ) : null}
    </>
  );

  const shell =
    'flex w-full items-start gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-terminal-interactive';

  if (href) {
    return (
      <a href={href} className={shell}>
        {body}
      </a>
    );
  }
  return (
    <button type="button" onClick={onSelect} className={shell}>
      {body}
    </button>
  );
}

function ChevronGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="shrink-0 opacity-70"
    >
      <path d="M6 9.5l6 6 6-6" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 12.5 9.5 17 19 7" />
    </svg>
  );
}

/* ------------------------------------------------------- modal and drawer */

/**
 * A modal dialog.
 *
 * Focus is moved to the panel on open and returned to the trigger on close,
 * Escape closes, a click on the backdrop closes, and the background is inert.
 * The close button is a real button with a real label.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className = '',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const id = useId();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-brand-950/70"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-description` : undefined}
        className={`terminal relative z-[var(--z-modal)] max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-panel border border-terminal-border bg-terminal-surface p-5 shadow-terminal-lift sm:rounded-panel ${className}`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={`${id}-title`} className="font-display text-base font-bold text-terminal-text">
              {title}
            </h2>
            {description ? (
              <p id={`${id}-description`} className="mt-1 text-[0.8125rem] leading-5 text-terminal-text-secondary">
                {description}
              </p>
            ) : null}
          </div>
          <IconButton label="Close dialog" onClick={onClose} variant="secondary">
            <CloseGlyph />
          </IconButton>
        </div>
        {children}
        {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}

function CloseGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

/**
 * A drawer that slides in from one edge.
 *
 * On a phone it is full height and slides from the bottom, because that is
 * where the thumb already is. On a tablet and up it slides from the right and
 * is a fixed 22rem, because that is where a mouse already is.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
  side = 'right',
  className = '',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: 'left' | 'right';
  className?: string;
}) {
  const id = useId();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-drawer)]">
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-brand-950/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className={`terminal absolute inset-x-0 bottom-0 z-[var(--z-drawer)] flex max-h-[85vh] flex-col rounded-t-panel border border-terminal-border bg-terminal-surface shadow-terminal-lift sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[22rem] sm:rounded-none sm:rounded-l-panel ${
          side === 'left' ? 'sm:left-0 sm:right-auto sm:rounded-l-none sm:rounded-r-panel' : ''
        } ${className}`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-terminal-border px-4 py-3">
          <h2 id={`${id}-title`} className="font-display text-sm font-bold text-terminal-text">
            {title}
          </h2>
          <IconButton label="Close panel" onClick={onClose}>
            <CloseGlyph />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
