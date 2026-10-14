import { PERMISSIONS, type Permission } from './permissions';

/**
 * Seed roles — Phase 0 §0.7. Seeded per office at creation; the office may then
 * edit them or add its own (Phase 14) without any code change.
 *
 * Two boundaries encoded here are deliberate and must not be "helpfully" relaxed:
 *   1. ACCOUNTANT sees money but not case substance or the document library.
 *      This is a client-confidentiality boundary, not a convenience setting.
 *   2. Only OWNER reads the audit log. An audit log the audited can read and
 *      curate is worthless.
 */

export const SYSTEM_ROLES = ['OWNER', 'LAWYER', 'ASSISTANT', 'ACCOUNTANT', 'VIEWER'] as const;
export type SystemRoleKey = (typeof SYSTEM_ROLES)[number];

export const SYSTEM_ROLE_AR: Record<SystemRoleKey, string> = {
  OWNER: 'مالك المكتب',
  LAWYER: 'محامٍ',
  ASSISTANT: 'معاون / كاتب',
  ACCOUNTANT: 'محاسب',
  VIEWER: 'مطالع',
};

export const SYSTEM_ROLE_DESCRIPTION_AR: Record<SystemRoleKey, string> = {
  OWNER: 'صلاحيات كاملة على المكتب، بما فيها المستخدمون وسجل التدقيق والنسخ الاحتياطية.',
  LAWYER: 'متابعة الدعاوى والمعاملات والجلسات والمستندات والمالية، دون إضافة دعاوى أو موكّلين.',
  ASSISTANT:
    'متابعة الدعاوى والمعاملات والمواعيد والمستندات، دون إضافة دعاوى أو موكّلين أو الاطلاع على المالية.',
  ACCOUNTANT:
    'الاطلاع على المالية وإصدار الوصولات، دون الاطلاع على تفاصيل الدعاوى أو مكتبة المستندات.',
  VIEWER: 'اطّلاع فقط، دون أي تعديل.',
};

/** OWNER holds every permission by definition — computed, never hand-listed. */
const OWNER_PERMISSIONS: readonly Permission[] = PERMISSIONS;

const LAWYER_PERMISSIONS: readonly Permission[] = [
  'transaction:read',
  'transaction:update',
  'whatsapp:read',
  'whatsapp:send',
  'client:read.all',
  'client:update',
  'case:read.all',
  'case:read.own',
  'case:update',
  'case:status.change',
  'case:archive',
  'poa:read',
  'poa:create',
  'poa:update',
  'hearing:read',
  'hearing:create',
  'hearing:update',
  'hearing:outcome.record',
  'event:read.all',
  'event:read.own',
  'event:create',
  'event:update',
  'event:delete',
  'task:read',
  'task:create',
  'task:update',
  'task:complete',
  'task:delete',
  'document:read',
  'document:download',
  'document:upload',
  'document:update',
  'document:delete',
  'document:restore',
  'finance:read.summary',
  'feeagreement:read',
  'feeagreement:create',
  'feeagreement:update',
  'invoice:read',
  'invoice:create',
  'payment:read',
  'payment:create',
  'expense:read',
  'expense:create',
  'expense:update',
  'expense:delete',
  'pdf:generate',
  'search:global',
  'savedsearch:create',
  'savedsearch:share',
  'monitor:read',
  'office:read',
  'user:read',
];

const ASSISTANT_PERMISSIONS: readonly Permission[] = [
  'transaction:read',
  'whatsapp:read',
  'whatsapp:send',
  'client:read.all',
  'client:update',
  'case:read.all',
  'case:read.own',
  'case:update',
  'poa:read',
  'poa:create',
  'poa:update',
  'hearing:read',
  'hearing:create',
  'hearing:update',
  'event:read.all',
  'event:read.own',
  'event:create',
  'event:update',
  'event:delete',
  'task:read',
  'task:create',
  'task:update',
  'task:complete',
  'task:delete',
  'document:read',
  'document:download',
  'document:upload',
  'document:update',
  'pdf:generate',
  'search:global',
  'savedsearch:create',
  'office:read',
];

/**
 * Financial role only. Clients are visible because every invoice/payment is
 * client-owned; case substance, document contents and legal watchlists are not.
 * The old bundle contradicted the confidentiality contract above by granting
 * `case:read.own`, document-library access and monitoring.
 */
const ACCOUNTANT_PERMISSIONS: readonly Permission[] = [
  'client:read.all',
  'finance:read.summary',
  'feeagreement:read',
  'feeagreement:create',
  'feeagreement:update',
  'invoice:read',
  'invoice:create',
  'invoice:void',
  'payment:read',
  'payment:create',
  'expense:read',
  'expense:create',
  'expense:update',
  'expense:delete',
  'finance:export',
  'pdf:generate',
  'search:global',
  'savedsearch:create',
  'office:read',
];

const VIEWER_PERMISSIONS: readonly Permission[] = [
  'transaction:read',
  'client:read.all',
  'case:read.all',
  'case:read.own',
  'poa:read',
  'hearing:read',
  'event:read.all',
  'event:read.own',
  'task:read',
  'document:read',
  'document:download',
  'pdf:generate',
  'search:global',
  'savedsearch:create',
  'office:read',
];

export const SYSTEM_ROLE_PERMISSIONS: Record<SystemRoleKey, readonly Permission[]> = {
  OWNER: OWNER_PERMISSIONS,
  LAWYER: LAWYER_PERMISSIONS,
  ASSISTANT: ASSISTANT_PERMISSIONS,
  ACCOUNTANT: ACCOUNTANT_PERMISSIONS,
  VIEWER: VIEWER_PERMISSIONS,
};

export function roleHasPermission(role: SystemRoleKey, permission: Permission): boolean {
  return SYSTEM_ROLE_PERMISSIONS[role].includes(permission);
}
