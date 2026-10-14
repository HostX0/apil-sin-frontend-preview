import { type CaseStatus } from './enums';

/**
 * Case status state machine — Phase 0 §0.4, enforced server-side.
 *
 * The rule this encodes: the UI hiding a button is not enforcement. Every
 * transition is validated in the API, and an illegal one returns 422 with an
 * Arabic explanation. The status column is a projection of CaseStatusHistory,
 * never edited directly.
 */

/** Data a transition may demand before it is allowed to proceed. */
export type TransitionRequirement =
  | 'EFFECTIVE_DATE'
  | 'REASON'
  | 'NEXT_HEARING_DATE'
  | 'EXPECTED_JUDGMENT_DATE'
  | 'JUDGMENT_DATE'
  | 'JUDGMENT_RECORD'
  | 'DECISION_DATE'
  | 'DECISION_RECORD'
  | 'APPELLATE_DECISION_DATE';

/** A permission key that gates an unusual (backwards) transition. */
export type TransitionGuardPermission = 'case:status.change' | 'case:archive';

export interface CaseTransition {
  readonly from: CaseStatus;
  readonly to: CaseStatus;
  /** Arabic name of the event that causes this move — shown in the status picker. */
  readonly triggerAr: string;
  readonly requires: readonly TransitionRequirement[];
  /** Extra permission on top of `case:status.change`, for reversing transitions. */
  readonly guardedBy?: TransitionGuardPermission;
  /** Non-blocking checks surfaced to the user before confirming. */
  readonly warnings?: readonly ('OUTSTANDING_BALANCE' | 'OPEN_HEARINGS' | 'OPEN_TASKS')[];
}

export const CASE_TRANSITIONS: readonly CaseTransition[] = [
  // ── من التبليغ ────────────────────────────────────────────────────────────
  {
    from: 'NOTIFICATION',
    to: 'HEARING',
    triggerAr: 'حصول التبليغ وبدء المرافعة',
    requires: ['EFFECTIVE_DATE'],
  },
  {
    from: 'NOTIFICATION',
    to: 'CLOSED',
    triggerAr: 'سحب الدعوى أو الصلح',
    requires: ['EFFECTIVE_DATE', 'REASON'],
    warnings: ['OUTSTANDING_BALANCE', 'OPEN_TASKS'],
  },

  // ── من المرافعة ───────────────────────────────────────────────────────────
  {
    from: 'HEARING',
    to: 'HEARING',
    triggerAr: 'تأجيل الجلسة',
    requires: ['NEXT_HEARING_DATE'],
  },
  {
    from: 'HEARING',
    to: 'JUDGMENT_RESERVED',
    triggerAr: 'حجز الدعوى للحكم',
    requires: ['EXPECTED_JUDGMENT_DATE'],
  },
  {
    from: 'HEARING',
    to: 'CLOSED',
    triggerAr: 'ترك الدعوى أو ردّها أو الصلح',
    requires: ['EFFECTIVE_DATE', 'REASON'],
    warnings: ['OUTSTANDING_BALANCE', 'OPEN_HEARINGS', 'OPEN_TASKS'],
  },

  // ── من حجز الدعوى للحكم ───────────────────────────────────────────────────
  {
    from: 'JUDGMENT_RESERVED',
    to: 'HEARING',
    triggerAr: 'إعادة فتح باب المرافعة',
    requires: ['EFFECTIVE_DATE', 'REASON'],
  },
  {
    from: 'JUDGMENT_RESERVED',
    to: 'APPEAL',
    triggerAr: 'صدور الحكم والطعن استئنافاً',
    // `effectiveAt` is the persisted legal date of the judgment/transition.
    // Asking for a second judgmentDate and then discarding it created two
    // competing dates for the same fact.
    requires: ['EFFECTIVE_DATE', 'JUDGMENT_RECORD'],
  },
  {
    from: 'JUDGMENT_RESERVED',
    to: 'ENFORCEMENT',
    triggerAr: 'اكتساب الحكم الدرجة القطعية',
    requires: ['EFFECTIVE_DATE', 'JUDGMENT_RECORD'],
  },
  {
    from: 'JUDGMENT_RESERVED',
    to: 'CLOSED',
    triggerAr: 'صدور الحكم دون طعن',
    requires: ['EFFECTIVE_DATE', 'JUDGMENT_RECORD'],
    warnings: ['OUTSTANDING_BALANCE'],
  },

  // ── من الاستئناف ──────────────────────────────────────────────────────────
  {
    from: 'APPEAL',
    to: 'CASSATION',
    triggerAr: 'الطعن تمييزاً',
    requires: ['EFFECTIVE_DATE'],
  },
  {
    from: 'APPEAL',
    to: 'HEARING',
    triggerAr: 'نقض الحكم وإعادة الدعوى',
    requires: ['EFFECTIVE_DATE', 'DECISION_RECORD'],
  },
  {
    from: 'APPEAL',
    to: 'ENFORCEMENT',
    triggerAr: 'حسم الاستئناف والمباشرة بالتنفيذ',
    requires: ['EFFECTIVE_DATE'],
  },
  {
    from: 'APPEAL',
    to: 'CLOSED',
    triggerAr: 'حسم الاستئناف دون طعن',
    requires: ['EFFECTIVE_DATE', 'DECISION_RECORD'],
    warnings: ['OUTSTANDING_BALANCE'],
  },

  // ── من التمييز ────────────────────────────────────────────────────────────
  {
    from: 'CASSATION',
    to: 'HEARING',
    triggerAr: 'نقض الحكم وإعادة الدعوى',
    requires: ['EFFECTIVE_DATE', 'DECISION_RECORD'],
  },
  {
    from: 'CASSATION',
    to: 'ENFORCEMENT',
    triggerAr: 'تصديق الحكم والمباشرة بالتنفيذ',
    requires: ['EFFECTIVE_DATE'],
  },
  {
    from: 'CASSATION',
    to: 'CLOSED',
    triggerAr: 'تصديق الحكم وانتهاء الدعوى',
    requires: ['EFFECTIVE_DATE', 'DECISION_RECORD'],
    warnings: ['OUTSTANDING_BALANCE'],
  },

  // ── من التنفيذ ────────────────────────────────────────────────────────────
  {
    from: 'ENFORCEMENT',
    to: 'CLOSED',
    triggerAr: 'استيفاء الحق أو حفظ الإضبارة',
    requires: ['EFFECTIVE_DATE', 'REASON'],
    warnings: ['OUTSTANDING_BALANCE'],
  },

  // ── الإغلاق والأرشفة ──────────────────────────────────────────────────────
  {
    from: 'CLOSED',
    to: 'ARCHIVED',
    triggerAr: 'أرشفة الدعوى',
    requires: [],
    guardedBy: 'case:archive',
  },
  {
    from: 'CLOSED',
    to: 'HEARING',
    triggerAr: 'تجديد الدعوى',
    requires: ['EFFECTIVE_DATE', 'REASON'],
    guardedBy: 'case:status.change',
  },
  {
    from: 'ARCHIVED',
    to: 'CLOSED',
    triggerAr: 'إخراج الدعوى من الأرشيف',
    requires: ['REASON'],
    guardedBy: 'case:archive',
  },
];

/** Fast lookup: `TRANSITION_INDEX['HEARING']['CLOSED']`. */
const TRANSITION_INDEX: Partial<Record<CaseStatus, Partial<Record<CaseStatus, CaseTransition>>>> =
  (() => {
    const index: Partial<Record<CaseStatus, Partial<Record<CaseStatus, CaseTransition>>>> = {};
    for (const transition of CASE_TRANSITIONS) {
      const byTarget = (index[transition.from] ??= {});
      byTarget[transition.to] = transition;
    }
    return index;
  })();

export function findTransition(from: CaseStatus, to: CaseStatus): CaseTransition | undefined {
  return TRANSITION_INDEX[from]?.[to];
}

export function isTransitionAllowed(from: CaseStatus, to: CaseStatus): boolean {
  return findTransition(from, to) !== undefined;
}

/** Every status reachable from `from`, for rendering the status picker. */
export function allowedTargets(from: CaseStatus): CaseTransition[] {
  return Object.values(TRANSITION_INDEX[from] ?? {});
}

/** Arabic message used when the API rejects an illegal transition (422). */
export function illegalTransitionMessageAr(fromAr: string, toAr: string): string {
  return `لا يمكن نقل الدعوى من حالة «${fromAr}» إلى حالة «${toAr}» مباشرة.`;
}
