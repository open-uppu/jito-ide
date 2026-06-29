import type { SVGProps } from 'react';

/**
 * Audit mode icon — 🛡 shield with horizontal scan lines.
 *
 * A shield outline representing protection/verification, crossed by three
 * horizontal scan lines (the "scanner" metaphor for security/audit
 * review). Used in mode chips for the "Audit" chat mode.
 *
 * Theming: applies `currentColor`. Apply a Tailwind color utility at the
 * parent (e.g. `text-mode-audit`) to recolor the stroke.
 *
 * @example
 *   <AuditIcon className="text-mode-audit" />  // orange
 */
export function AuditIcon(props: SVGProps<SVGSVGElement>) {
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
      {/* Shield outline: top apex → right shoulder → right side curves
          down to bottom point → mirrored left side → close */}
      <path d="M12 3 L20 6 L20 12 C20 16.5 16.5 19.5 12 21 C7.5 19.5 4 16.5 4 12 L4 6 Z" />
      {/* Scan lines (3 horizontal stripes, shorter at the bottom to follow
          the shield's taper) */}
      <line x1="6.5" y1="11" x2="17.5" y2="11" />
      <line x1="6.5" y1="14" x2="17.5" y2="14" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}