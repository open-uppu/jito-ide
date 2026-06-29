/**
 * Mode icons — barrel export.
 *
 * Five stroke-only SVG React components, one per chat mode. All use
 * `currentColor` so they recolor with the parent's text color (apply a
 * Tailwind utility like `text-mode-dev` to set the mode tint).
 *
 *   DevIcon       — </> chip         (cyan, mode = dev)
 *   ReasonIcon    — φ node-graph     (purple, mode = reason)
 *   CreateIcon    — ✨ spark         (magenta, mode = create)
 *   AuditIcon     — 🛡 + scan lines  (orange, mode = audit)
 *   UniversalIcon — ◯ ring          (cyan, mode = universal)
 *
 * Usage:
 *   import { DevIcon, ModeIcons } from '@/components/icons';
 *
 *   // Direct import (preferred when the mode is known at compile time):
 *   <DevIcon className="text-mode-dev" />
 *
 *   // Map lookup (preferred when the mode comes from data):
 *   <ModeIcons[mode] className={\`text-mode-${mode}\`} />
 */
import type { ComponentType, SVGProps } from 'react';

import { DevIcon } from './Dev';
import { ReasonIcon } from './Reason';
import { CreateIcon } from './Create';
import { AuditIcon } from './Audit';
import { UniversalIcon } from './Universal';

export { DevIcon } from './Dev';
export { ReasonIcon } from './Reason';
export { CreateIcon } from './Create';
export { AuditIcon } from './Audit';
export { UniversalIcon } from './Universal';

/** Union of the five chat modes (mirrors `JitoMode` in `../types`). */
export type ModeIconKey = 'dev' | 'reason' | 'create' | 'audit' | 'universal';

/**
 * Map from `JitoMode` to its icon component. Use this when the mode is
 * known only at runtime (e.g. from message metadata).
 *
 * @example
 *   const Icon = ModeIcons[msg.mode];
 *   return <Icon className={\`text-mode-${msg.mode}\`} />;
 */
export const ModeIcons = {
  dev: DevIcon,
  reason: ReasonIcon,
  create: CreateIcon,
  audit: AuditIcon,
  universal: UniversalIcon,
} as const satisfies Record<ModeIconKey, ComponentType<SVGProps<SVGSVGElement>>>;