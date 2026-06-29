import type { SVGProps } from 'react';

/**
 * Reason mode icon — φ node-graph (3 connected nodes).
 *
 * A triangular graph of three small circles connected by edges, evoking
 * the flow of reasoning (φ = the golden ratio, also associated with
 * thought and inquiry). Used in mode chips for the "Reason" chat mode.
 *
 * Theming: applies `currentColor`. Apply a Tailwind color utility at the
 * parent (e.g. `text-mode-reason`) to recolor the stroke.
 *
 * @example
 *   <ReasonIcon className="text-mode-reason" />  // purple
 */
export function ReasonIcon(props: SVGProps<SVGSVGElement>) {
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
      {/* Edges (drawn first so nodes overlay them) */}
      <line x1="12" y1="4.5" x2="6" y2="17" />
      <line x1="12" y1="4.5" x2="18" y2="17" />
      <line x1="6" y1="17" x2="18" y2="17" />
      {/* Nodes */}
      <circle cx="12" cy="4.5" r="2.25" />
      <circle cx="6" cy="17" r="2.25" />
      <circle cx="18" cy="17" r="2.25" />
    </svg>
  );
}