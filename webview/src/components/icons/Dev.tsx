import type { SVGProps } from 'react';

/**
 * Dev mode icon — </> chip.
 *
 * A rounded rectangle "chip" outline with a `</>` glyph centered inside.
 * Used in mode chips, the chat composer, and the mode switcher.
 *
 * Theming: applies `currentColor`. Apply a Tailwind color utility at the
 * parent (e.g. `text-mode-dev`) to recolor the stroke.
 *
 * @example
 *   <DevIcon className="text-mode-dev" />          // cyan
 *   <DevIcon className="text-mode-dev" width={16} />  // 16px chip
 */
export function DevIcon(props: SVGProps<SVGSVGElement>) {
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
      {/* Chip frame */}
      <rect x="3" y="6" width="18" height="12" rx="2.5" />
      {/* < bracket */}
      <polyline points="9.5 9.5 7 12 9.5 14.5" />
      {/* / slash */}
      <line x1="12.5" y1="15.5" x2="15.5" y2="8.5" />
      {/* > bracket */}
      <polyline points="14.5 9.5 17 12 14.5 14.5" />
    </svg>
  );
}