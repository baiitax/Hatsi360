// A no-op stand-in for the `server-only` package.
//
// The real package throws when a module marked server-only is imported into a
// client bundle. That guard is still in force in the Next.js build; this stub
// only exists so Vitest can import server modules in a Node test environment.
export {};
