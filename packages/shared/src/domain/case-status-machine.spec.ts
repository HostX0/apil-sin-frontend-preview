import { describe, expect, it } from 'vitest';
import { CASE_STATUSES, type CaseStatus } from './enums';
import {
  CASE_TRANSITIONS,
  allowedTargets,
  findTransition,
  isTransitionAllowed,
} from './case-status-machine';

/**
 * The state machine is the product's legal semantics in code. These tests exist
 * to make a careless edit fail loudly rather than quietly permitting a
 * transition Iraqi procedure does not.
 */

describe('transition table integrity', () => {
  it('references only declared statuses', () => {
    for (const transition of CASE_TRANSITIONS) {
      expect(CASE_STATUSES).toContain(transition.from);
      expect(CASE_STATUSES).toContain(transition.to);
    }
  });

  it('has no duplicate from→to pairs', () => {
    const pairs = CASE_TRANSITIONS.map((t) => `${t.from}->${t.to}`);
    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it('gives every transition an Arabic trigger', () => {
    for (const transition of CASE_TRANSITIONS) {
      expect(transition.triggerAr.length).toBeGreaterThan(0);
    }
  });

  it('leaves no status unreachable except the entry state', () => {
    const reachable = new Set(CASE_TRANSITIONS.map((t) => t.to));
    for (const status of CASE_STATUSES) {
      if (status === 'NOTIFICATION') continue; // where every case begins
      expect(reachable.has(status), `${status} is unreachable`).toBe(true);
    }
  });
});

describe('legal transitions', () => {
  const legal: Array<[CaseStatus, CaseStatus]> = [
    ['NOTIFICATION', 'HEARING'],
    ['HEARING', 'HEARING'], // adjournment
    ['HEARING', 'JUDGMENT_RESERVED'],
    ['JUDGMENT_RESERVED', 'APPEAL'],
    ['JUDGMENT_RESERVED', 'ENFORCEMENT'],
    ['APPEAL', 'CASSATION'],
    ['APPEAL', 'HEARING'], // remand
    ['CASSATION', 'HEARING'], // cassation quashes and remands
    ['CASSATION', 'ENFORCEMENT'],
    ['ENFORCEMENT', 'CLOSED'],
    ['CLOSED', 'ARCHIVED'],
    ['ARCHIVED', 'CLOSED'],
  ];

  it.each(legal)('allows %s → %s', (from, to) => {
    expect(isTransitionAllowed(from, to)).toBe(true);
  });
});

describe('illegal transitions', () => {
  const illegal: Array<[CaseStatus, CaseStatus]> = [
    ['NOTIFICATION', 'ENFORCEMENT'], // cannot enforce a case never heard
    ['NOTIFICATION', 'APPEAL'], // nothing to appeal yet
    ['NOTIFICATION', 'CASSATION'],
    ['HEARING', 'APPEAL'], // must pass through judgment first
    ['HEARING', 'CASSATION'],
    ['HEARING', 'ARCHIVED'], // archive only from closed
    ['JUDGMENT_RESERVED', 'CASSATION'], // appeal precedes cassation
    ['ENFORCEMENT', 'APPEAL'],
    ['ARCHIVED', 'HEARING'], // must be un-archived first
    ['CLOSED', 'ENFORCEMENT'],
  ];

  it.each(illegal)('rejects %s → %s', (from, to) => {
    expect(isTransitionAllowed(from, to)).toBe(false);
  });
});

describe('guards and requirements', () => {
  it('guards reopening a closed case behind an explicit permission', () => {
    const transition = findTransition('CLOSED', 'HEARING');
    expect(transition?.guardedBy).toBe('case:status.change');
    expect(transition?.requires).toContain('REASON');
  });

  it('guards archiving and un-archiving behind case:archive', () => {
    expect(findTransition('CLOSED', 'ARCHIVED')?.guardedBy).toBe('case:archive');
    expect(findTransition('ARCHIVED', 'CLOSED')?.guardedBy).toBe('case:archive');
  });

  it('demands a next hearing date when adjourning', () => {
    expect(findTransition('HEARING', 'HEARING')?.requires).toContain('NEXT_HEARING_DATE');
  });

  it('demands a judgment record before enforcement', () => {
    expect(findTransition('JUDGMENT_RESERVED', 'ENFORCEMENT')?.requires).toContain(
      'JUDGMENT_RECORD',
    );
  });

  /**
   * `ARCHIVED → CLOSED` also lands on CLOSED, but it is un-archiving rather
   * than closing: the case was already concluded and its justification was
   * recorded then. Both tests below exclude it deliberately.
   */
  const closingTransitions = CASE_TRANSITIONS.filter(
    (transition) => transition.to === 'CLOSED' && transition.from !== 'ARCHIVED',
  );

  it('demands a reason for every transition that closes a case', () => {
    for (const transition of closingTransitions) {
      // Judgment-issued closures cite their immutable legal record instead of prose.
      const documented =
        transition.requires.includes('REASON') ||
        transition.requires.includes('JUDGMENT_RECORD') ||
        transition.requires.includes('DECISION_RECORD');
      expect(documented, `${transition.from} → CLOSED records no justification`).toBe(true);
    }
  });

  it('warns about an outstanding balance on every closing transition', () => {
    for (const transition of closingTransitions) {
      expect(
        transition.warnings ?? [],
        `${transition.from} → CLOSED does not warn about unpaid fees`,
      ).toContain('OUTSTANDING_BALANCE');
    }
  });

  it('does not treat un-archiving as a closure', () => {
    const unarchive = findTransition('ARCHIVED', 'CLOSED');
    expect(unarchive?.warnings ?? []).toEqual([]);
  });
});

describe('allowedTargets', () => {
  it('lists every destination reachable from a status', () => {
    const targets = allowedTargets('JUDGMENT_RESERVED')
      .map((t) => t.to)
      .sort();
    expect(targets).toEqual(['APPEAL', 'CLOSED', 'ENFORCEMENT', 'HEARING']);
  });

  it('returns nothing for a status with no exits', () => {
    // Every status currently has at least one exit; this guards a future edit
    // that accidentally strands one.
    for (const status of CASE_STATUSES) {
      expect(allowedTargets(status).length, `${status} is a dead end`).toBeGreaterThan(0);
    }
  });
});
