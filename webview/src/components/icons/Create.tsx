import type { SVGProps } from 'react';

/**
 * Create mode icon — ✨ spark (4-pointed sparkle).
 *
 * A 4-pointed sparkle with concave curves between the points, evoking the
 * `✨` glyph. Used in mode chips for the "Create" (generative) chat mode.
 *
 * Theming: applies `currentColor`. Apply a Tailwind color utility at the
 * parent (e.g. `text-mode-create`) to recolor the stroke.
 *
 * @example
 *   <CreateIcon className="text-mode-create" />  // magenta
 */
export function CreateIcon(props: SVGProps<SVGSVGElement>) {
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
      {/* 4-point sparkle: M to top point → C (control points pinched
          toward center) → curve to right point → C → bottom → C → left → C → close */}
      <path d="M12 3 C 13 9 15 11 21 12 C 15 13 13 15 12 21 C 11 15 9 13 3 12 C 9 11 11 9 12 3 Z" />
    </svg>
  );
}