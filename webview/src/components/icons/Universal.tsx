import type { SVGProps } from 'react';

/**
 * Universal mode icon — ◯ ring (single circle outline).
 *
 * A simple ring evoking "all-encompassing" / "universal" (◯). Used in
 * mode chips for the "Universal" (catch-all) chat mode.
 *
 * Theming: applies `currentColor`. Apply a Tailwind color utility at the
 * parent (e.g. `text-mode-universal`) to recolor the stroke.
 *
 * @example
 *   <UniversalIcon className="text-mode-universal" />  // cyan
 */
export function UniversalIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="8.5" />
    </svg>
  );
}