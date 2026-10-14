import type { CalendarItem } from './calendar';

/**
 * Today dashboard — Phase 10.
 *
 * One endpoint, one round trip. The screen shows six things; fetching them
 * separately would mean six requests on the slowest connection a lawyer uses,
 * and six independent loading states on the screen they open first every day.
 *
 * The metric definitions are Phase 0 §0.5 verbatim. They are restated in the
 * service that computes them, so a future change has to disagree with the
 * specification out loud rather than by accident.
 */
export interface TodayMetrics {
  /** الدعاوى النشطة — status ∉ {CLOSED, ARCHIVED}, not soft-deleted. */
  activeCases: number;
  /**
   * جلسات هذا الأسبوع — the current week, Sunday 00:00 → Saturday 23:59
   * Asia/Baghdad, excluding cancelled sessions and archived cases.
   */
  weekHearings: number;
  /**
   * الأتعاب المستحقة — Σ(issued, non-void receipts) − Σ(payments), **excluding
   * archived cases**, as minor units.
   *
   * Deliberately narrower than the office ledger total on the finance page: an
   * archived case's unpaid fees are history, not something to chase today. The
   * two figures answer different questions and are labelled accordingly.
   */
  outstandingFees: string;
}

export interface TodayDashboard {
  metrics: TodayMetrics;
  /** Everything due today: hearings, events and dated tasks, already ordered. */
  schedule: CalendarItem[];
  /** Baghdad calendar day the payload was computed for. */
  todayKey: string;
  /** Sunday→Saturday bounds used for the week metric, for the calendar deep link. */
  weekRange: { from: string; to: string };
  /**
   * True when the office has no clients and no cases at all.
   *
   * Drives onboarding copy rather than three zeros: a brand-new office is not
   * an office with nothing outstanding, and showing it "0" teaches nothing.
   */
  isEmptyOffice: boolean;
}
