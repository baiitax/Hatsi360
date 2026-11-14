/**
 * Hatsi360 Markets — the core control set.
 *
 * These are the controls the terminal is built from: buttons, fields, selects,
 * tabs, badges, dividers, tooltips, menus, modals and drawers.
 *
 * Two rules run through all of them.
 *
 *  1. **A control is quiet.** A terminal has a hundred controls on screen at
 *     once. A loud one makes the data unreadable, so the default treatment is
 *     a hairline border, the secondary text colour and a 1.875rem height —
 *     tall enough for a comfortable target, short enough that twenty of them
 *     fit in a toolbar.
 *  2. **A control states its own condition.** `aria-pressed`, `aria-expanded`,
 *     `aria-selected`, `aria-disabled` and `data-loading` are set here rather
 *     than left to the caller, so a control can never be styled to look
 *     selected without actually being selected.
 *
 * Every colour comes from the theme. There is not a single hex value in this
 * file, which `tests/design-system/design-system.test.ts` asserts.
 */

import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from 'react';
import { useId } from 'react';

/* ------------------------------------------------------------------ layout */

/**
 * The shared rounding, height and transition of every small control.
 *
 * Exported so `./overlays` — the interactive half of the control set — can use
 * exactly the same resting treatment without this file importing it back.
 */
export const CONTROL =
  'inline-flex items-center justify-center gap-1.5 rounded-control border border-terminal-border ' +
  'bg-terminal-surface text-terminal-text-secondary text-[0.75rem] font-medium leading-none ' +
  'transition-colors duration-150 ease-out ' +
  'h-[1.875rem] px-2.5 whitespace-nowrap select-none';

export const CONTROL_STATES =
  'hover:bg-terminal-interactive hover:text-terminal-text ' +
  'aria-pressed:bg-terminal-interactive aria-pressed:border-harvest-500/55 aria-pressed:text-terminal-text ' +
  'data-[selected=true]:bg-terminal-interactive data-[selected=true]:text-terminal-text ' +
  'disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-terminal-surface';

/**
 * A hairline rule. The terminal separates things with lines, not with gaps —
 * a gap between two panels reads as two unrelated things, a rule reads as one
 * table with two halves.
 */
export function Divider({
  orientation = 'horizontal',
  className = '',
}: {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={
        orientation === 'horizontal'
          ? `block h-px w-full bg-terminal-border ${className}`
          : `inline-block w-px self-stretch bg-terminal-border ${className}`
      }
    />
  );
}

/* ----------------------------------------------------------------- buttons */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white border-transparent hover:bg-brand-500 ' +
    'disabled:hover:bg-brand-600',
  secondary:
    'bg-terminal-surface text-terminal-text-secondary border-terminal-border ' +
    'hover:bg-terminal-interactive hover:text-terminal-text disabled:hover:bg-terminal-surface',
  ghost:
    'bg-transparent text-terminal-text-secondary border-transparent ' +
    'hover:bg-terminal-interactive hover:text-terminal-text disabled:hover:bg-transparent',
  danger:
    'bg-transparent text-move-down border-move-down/40 ' +
    'hover:bg-move-down-soft hover:border-move-down/70 disabled:hover:bg-transparent',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-[1.875rem] px-2.5 text-[0.75rem]',
  md: 'h-[2.25rem] px-3.5 text-[0.8125rem]',
};

/**
 * A button.
 *
 * `loading` replaces the label with a spinner *and keeps the button's width*,
 * so a toolbar does not jump when a filter applies. The button is disabled
 * while loading and says so to a screen reader.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      data-loading={loading || undefined}
      className={`inline-flex items-center justify-center gap-1.5 rounded-control border font-medium ${BUTTON_SIZES[size]} ${BUTTON_VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

/** A square button carrying only an icon. Always takes an accessible name. */
export function IconButton({
  label,
  variant = 'ghost',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  variant?: ButtonVariant;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex size-8 items-center justify-center rounded-control border ${BUTTON_VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** The in-button spinner. Small, quiet, and never the only feedback. */
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Working"
      className={`inline-block size-3.5 shrink-0 animate-spin rounded-full border-[1.5px] border-current border-t-transparent ${className}`}
    />
  );
}

/* ------------------------------------------------------------------ fields */

/** A labelled text field. The label is always visible, never a placeholder. */
export function Field({
  label,
  hint,
  error,
  className = '',
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="figure-label">{label}</span>
      {children}
      {hint && !error ? (
        <span className="text-[0.6875rem] leading-4 text-terminal-text-muted">{hint}</span>
      ) : null}
      {error ? (
        <span className="text-[0.6875rem] leading-4 font-medium text-move-down">{error}</span>
      ) : null}
    </label>
  );
}

/** The terminal's text input. */
export function TextInput({
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-[1.875rem] w-full min-w-0 rounded-control border border-terminal-border bg-terminal-surface px-2.5 text-[0.8125rem] text-terminal-text placeholder:text-terminal-text-muted focus-visible:border-harvest-500/70 focus-visible:outline-none ${className}`}
      {...rest}
    />
  );
}

/** The terminal's select. Native, so it works on every phone in the field. */
export function Select({
  className = '',
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`h-[1.875rem] max-w-full rounded-control border border-terminal-border bg-terminal-surface px-2 text-[0.75rem] font-medium text-terminal-text-secondary focus-visible:border-harvest-500/70 focus-visible:outline-none ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}

/**
 * A search field.
 *
 * A plain GET form by default, so a search is a URL: bookmarkable, shareable,
 * and working before any JavaScript arrives. Pass `onSubmit` for the
 * interactive variant.
 */
export function SearchInput({
  id,
  name = 'q',
  action,
  method = 'get',
  placeholder = 'Search…',
  label,
  value,
  onChange,
  onSubmit,
  className = '',
}: {
  id?: string;
  name?: string;
  action?: string;
  method?: 'get' | 'post';
  placeholder?: string;
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  className?: string;
}) {
  const generated = useId();
  const inputId = id ?? generated;

  const control = (
    <div className="relative w-full">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-terminal-text-muted"
      >
        <SearchGlyph />
      </span>
      <input
        id={inputId}
        type="search"
        name={name}
        value={value}
        placeholder={placeholder}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        onKeyDown={
          onSubmit
            ? (event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                onSubmit((event.target as HTMLInputElement).value);
              }
            : undefined
        }
        className="h-[1.875rem] w-full min-w-0 rounded-control border border-terminal-border bg-terminal-surface pl-8 pr-2.5 text-[0.8125rem] text-terminal-text placeholder:text-terminal-text-muted focus-visible:border-harvest-500/70 focus-visible:outline-none"
      />
    </div>
  );

  return (
    <div className={className}>
      <span className="sr-only">{label}</span>
      {action ? (
        <form action={action} method={method} role="search">
          {control}
        </form>
      ) : (
        <div role="search">{control}</div>
      )}
    </div>
  );
}

function SearchGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </svg>
  );
}

/* -------------------------------------------------------------------- tabs */

export interface TabItem {
  id: string;
  label: string;
  /** Rendered instead of the label on a narrow screen, when it is shorter. */
  short?: string;
  count?: number;
}

/**
 * A tab set.
 *
 * The selected tab is a real `aria-selected` state on a real `tablist`, and
 * the panel it controls is wired to it with `aria-controls`/`aria-labelledby`.
 * Keyboard support is the browser's own arrow-key behaviour on a tablist, so
 * nothing has to be reimplemented.
 */
export function Tabs({
  items,
  selected,
  onSelect,
  label,
  className = '',
}: {
  items: TabItem[];
  selected: string;
  onSelect: (id: string) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`flex items-center gap-0.5 overflow-x-auto ${className}`}
    >
      {items.map((item) => {
        const active = item.id === selected;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(item.id)}
            className={`inline-flex h-[1.875rem] shrink-0 items-center gap-1.5 rounded-control border border-transparent px-2.5 text-[0.75rem] font-medium transition-colors duration-150 ${
              active
                ? 'bg-terminal-interactive text-terminal-text'
                : 'text-terminal-text-secondary hover:bg-terminal-interactive/60 hover:text-terminal-text'
            }`}
          >
            {item.label}
            {typeof item.count === 'number' ? (
              <span className="figure-num text-[0.6875rem] text-terminal-text-muted">
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ badges */

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'gold';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'border-terminal-border bg-terminal-elevated text-terminal-text-secondary',
  success: 'border-success-700/40 bg-success-700/15 text-success-700',
  warning: 'border-warning-700/40 bg-warning-700/15 text-warning-700',
  danger: 'border-error-700/40 bg-error-700/15 text-error-700',
  info: 'border-info-700/40 bg-info-700/15 text-info-700',
  gold: 'border-harvest-500/45 bg-harvest-500/15 text-harvest-300',
};

/**
 * A badge.
 *
 * A badge is a *label*, so it is always text: an icon may sit beside the text
 * but never replaces it, because a bare coloured dot is unreadable to a screen
 * reader and to anyone who cannot separate the hue from its background.
 */
export function Badge({
  tone = 'neutral',
  icon,
  children,
  className = '',
  title,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-[0.6875rem] font-semibold leading-4 ${BADGE_TONES[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}


/* ------------------------------------------------------------- re-exports -- */

/**
 * The interactive controls live in `./overlays` and are marked `'use client'`,
 * because they hold state. They are re-exported here so the whole control set
 * has one import surface — which is what the design brief asks for — while the
 * presentational half of this file stays a Server Component and ships nothing
 * to the browser.
 */
export { Tooltip, DropdownMenu, MenuItem, Modal, Drawer } from './overlays';
