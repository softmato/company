/**
 * Words and badge tones for project states, shared by the portal and admin.
 *
 * Pure — client components import it.
 */
import type { BadgeTone } from '@/components/ui/badge';

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'cancelled';
export type StageStatus = 'upcoming' | 'in_progress' | 'done';
export type DeliverableStatus =
  'in_progress' | 'in_review' | 'approved' | 'changes_requested';

export const PROJECT_STATUSES: ProjectStatus[] = [
  'active',
  'on_hold',
  'completed',
  'cancelled',
];
export const STAGE_STATUSES: StageStatus[] = [
  'upcoming',
  'in_progress',
  'done',
];
export const DELIVERABLE_STATUSES: DeliverableStatus[] = [
  'in_progress',
  'in_review',
  'approved',
  'changes_requested',
];

export const PROJECT_LABEL: Record<ProjectStatus, string> = {
  active: 'In progress',
  on_hold: 'On hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const PROJECT_TONE: Record<ProjectStatus, BadgeTone> = {
  active: 'primary',
  on_hold: 'neutral',
  completed: 'credit',
  cancelled: 'quiet',
};

export const STAGE_LABEL: Record<StageStatus, string> = {
  upcoming: 'Upcoming',
  in_progress: 'In progress',
  done: 'Done',
};

export const DELIVERABLE_LABEL: Record<DeliverableStatus, string> = {
  in_progress: 'Being made',
  in_review: 'Ready for your review',
  approved: 'Approved',
  changes_requested: 'Changes requested',
};

/** The admin reads the same states from the other side of the table. */
export const DELIVERABLE_ADMIN_LABEL: Record<DeliverableStatus, string> = {
  in_progress: 'In progress',
  in_review: 'With client for review',
  approved: 'Approved by client',
  changes_requested: 'Client asked for changes',
};
