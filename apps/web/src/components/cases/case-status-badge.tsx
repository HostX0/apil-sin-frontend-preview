import { CASE_STATUS_AR, type CaseStatus } from '@/lib/ui-shared';
import { Badge, type BadgeProps } from '@muhami/ui';

/**
 * One mapping from case status to visual tone, used everywhere a status is
 * shown. Defined once so the list, the case file and any future report cannot
 * colour the same status differently.
 */
const STATUS_TONE: Record<CaseStatus, NonNullable<BadgeProps['tone']>> = {
  NOTIFICATION: 'info',
  HEARING: 'brand',
  JUDGMENT_RESERVED: 'warning',
  APPEAL: 'warning',
  CASSATION: 'warning',
  ENFORCEMENT: 'success',
  CLOSED: 'neutral',
  ARCHIVED: 'neutral',
};

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]} dot>
      {CASE_STATUS_AR[status]}
    </Badge>
  );
}

export function caseStatusTone(status: CaseStatus): NonNullable<BadgeProps['tone']> {
  return STATUS_TONE[status];
}
