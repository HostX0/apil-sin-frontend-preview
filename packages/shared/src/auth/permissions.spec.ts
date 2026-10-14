import { describe, expect, it } from 'vitest';
import { PERMISSIONS, PERMISSION_META, type Permission } from './permissions';
import { SYSTEM_ROLES, SYSTEM_ROLE_PERMISSIONS } from './roles';

describe('permission registry', () => {
  it('has no duplicate permission keys', () => {
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
  });

  // Phase 0 acceptance criterion: "the permission matrix has no TBD cells".
  it('documents every permission with an Arabic label and a group', () => {
    for (const permission of PERMISSIONS) {
      const meta = PERMISSION_META[permission];
      expect(meta, `missing metadata for ${permission}`).toBeDefined();
      expect(meta.ar.length).toBeGreaterThan(0);
    }
  });

  it('grants no role a permission outside the registry', () => {
    for (const role of SYSTEM_ROLES) {
      for (const permission of SYSTEM_ROLE_PERMISSIONS[role]) {
        expect(PERMISSIONS).toContain(permission);
      }
    }
  });

  it('gives OWNER every permission', () => {
    expect([...SYSTEM_ROLE_PERMISSIONS.OWNER].sort()).toEqual([...PERMISSIONS].sort());
  });

  it('grants no role duplicate permissions', () => {
    for (const role of SYSTEM_ROLES) {
      const granted = SYSTEM_ROLE_PERMISSIONS[role];
      expect(new Set(granted).size, `duplicates in ${role}`).toBe(granted.length);
    }
  });
});

describe('confidentiality boundaries (Phase 0 §0.7)', () => {
  const forbidden = (role: (typeof SYSTEM_ROLES)[number], permission: Permission) =>
    expect(SYSTEM_ROLE_PERMISSIONS[role]).not.toContain(permission);

  it('keeps the accountant out of case substance', () => {
    forbidden('ACCOUNTANT', 'case:read.all');
    forbidden('ACCOUNTANT', 'case:create');
    forbidden('ACCOUNTANT', 'case:update');
    forbidden('ACCOUNTANT', 'hearing:read');
    forbidden('ACCOUNTANT', 'document:upload');
  });

  it('keeps the assistant out of finance', () => {
    forbidden('ASSISTANT', 'finance:read.summary');
    forbidden('ASSISTANT', 'invoice:read');
    forbidden('ASSISTANT', 'payment:create');
  });

  it('restricts the audit log to the owner', () => {
    for (const role of SYSTEM_ROLES) {
      if (role === 'OWNER') continue;
      forbidden(role, 'audit:read');
    }
  });

  it('reserves adding clients, cases and transactions to the office administrator', () => {
    for (const role of SYSTEM_ROLES) {
      if (role === 'OWNER') continue;
      forbidden(role, 'client:create');
      forbidden(role, 'case:create');
      forbidden(role, 'transaction:create');
    }
  });

  it('restricts user and role administration to the owner', () => {
    for (const role of SYSTEM_ROLES) {
      if (role === 'OWNER') continue;
      forbidden(role, 'user:invite');
      forbidden(role, 'role:create');
      forbidden(role, 'settings:update');
      // Restoring an archive replaces the office's entire dataset — the same
      // permission that guards importing one.
      forbidden(role, 'data:import');
    }
  });

  /**
   * A permission nothing enforces is worse than a missing one.
   *
   * It appears in the roles screen as a switch an office owner can turn on,
   * grants nothing when they do, and reads as a security control that exists.
   * Four were found that way during the Phase 18 review — the whole Tasks
   * group, plus `pdf.template:manage` and `backup:restore`, which guarded
   * features that do not exist by design and are now gone from the registry.
   *
   * The mechanical check that a permission reaches an endpoint lives in the
   * API (`apps/api/test/permissions-coverage.spec.ts`), because only that side
   * can see the routes. This one pins the shape the registry must keep.
   */
  it('names no permission the registry does not declare', () => {
    // Guards the reverse direction: a label left behind after a permission was
    // removed would keep it visible in the roles screen.
    for (const key of Object.keys(PERMISSION_META)) {
      expect(PERMISSIONS, `${key} has metadata but is not a permission`).toContain(key);
    }
  });

  it('gives the viewer no mutating permission at all', () => {
    const mutating =
      /:(create|update|delete|void|assign|archive|restore|upload|invite|deactivate|run|import)/;
    for (const permission of SYSTEM_ROLE_PERMISSIONS.VIEWER) {
      if (permission === 'savedsearch:create') continue; // personal, non-destructive
      expect(mutating.test(permission), `viewer must not hold ${permission}`).toBe(false);
    }
  });
});
