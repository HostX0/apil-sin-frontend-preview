/**
 * Permission registry — Phase 0 §0.7 made executable.
 *
 * Permissions are data, roles are bundles of permissions. This is what lets
 * Phase 14 offer custom roles with zero code change, and what makes the
 * "no TBD cells" acceptance criterion machine-checkable (see permissions.spec.ts).
 */

export const PERMISSIONS = [
  // Clients
  'client:read.all',
  'client:create',
  'client:update',
  'client:delete',
  'client:export',

  // WhatsApp
  'whatsapp:read',
  'whatsapp:send',
  'whatsapp:connect',
  'whatsapp:templates.manage',

  // Cases
  'case:read.all',
  'case:read.own',
  'case:create',
  'case:update',
  'case:status.change',
  'case:assign',
  'case:archive',
  'case:delete',
  'case:export',

  // Independent transactions
  'transaction:read',
  'transaction:create',
  'transaction:update',
  'transaction:delete',

  // Power of attorney
  'poa:read',
  'poa:create',
  'poa:update',
  'poa:delete',

  // Hearings
  'hearing:read',
  'hearing:create',
  'hearing:update',
  'hearing:outcome.record',
  'hearing:delete',

  // Calendar
  'event:read.all',
  'event:read.own',
  'event:create',
  'event:update',
  'event:delete',

  // Tasks
  'task:read',
  'task:create',
  'task:update',
  'task:complete',
  'task:delete',

  // Documents
  'document:read',
  'document:download',
  'document:upload',
  'document:update',
  'document:delete',
  'document:restore',

  // Finance
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

  // PDF
  //
  // There is no `pdf.template:manage`. Print templates are code, not data
  // (ADR-007) — they carry the bidi isolation and font handling that make
  // Arabic render correctly, and an office editing them through a settings
  // screen would be editing the thing that keeps its documents legible. What an
  // office *can* change — logo, stamp, signature, paper size, footer note — is
  // covered by `office.branding:update` and `settings:update`.
  'pdf:generate',

  // Search
  'search:global',
  'savedsearch:create',
  'savedsearch:share',

  // Monitoring
  'monitor:read',

  // Office
  'office:read',
  'office:update',
  'office.branding:update',
  'settings:read',
  'settings:update',

  // Users & roles
  'user:read',
  'user:invite',
  'user:update',
  'user:deactivate',
  'role:read',
  'role:create',
  'role:update',
  'role:delete',

  // Audit
  'audit:read',

  // Data
  //
  // Restoring is `data:import` — there is no separate `backup:restore`. A
  // backup and an export are the same archive format (Phase 17), so restoring
  // one and importing the other are the same operation, and two permissions
  // over one action is a matrix cell that lies.
  'backup:run',
  'data:import',
  'data:export.full',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_SET: ReadonlySet<string> = new Set(PERMISSIONS);

export function isPermission(value: string): value is Permission {
  return PERMISSION_SET.has(value);
}

/** Grouping drives the Settings → Roles screen in Phase 14. */
export const PERMISSION_GROUPS = [
  'CLIENTS',
  'CASES',
  'CALENDAR',
  'DOCUMENTS',
  'FINANCE',
  'REPORTS',
  'ADMINISTRATION',
] as const;
export type PermissionGroup = (typeof PERMISSION_GROUPS)[number];

export const PERMISSION_GROUP_AR: Record<PermissionGroup, string> = {
  CLIENTS: 'الموكّلون',
  CASES: 'الدعاوى',
  CALENDAR: 'التقويم والمهام',
  DOCUMENTS: 'المستندات',
  FINANCE: 'المالية',
  REPORTS: 'التقارير والبحث',
  ADMINISTRATION: 'إدارة المكتب',
};

interface PermissionMeta {
  readonly ar: string;
  readonly group: PermissionGroup;
}

export const PERMISSION_META: Record<Permission, PermissionMeta> = {
  'whatsapp:read': { ar: 'عرض رسائل واتساب', group: 'CLIENTS' },
  'whatsapp:send': { ar: 'إرسال رسائل واتساب للموكّلين', group: 'CLIENTS' },
  'whatsapp:connect': { ar: 'ربط رقم واتساب المكتب', group: 'ADMINISTRATION' },
  'whatsapp:templates.manage': {
    ar: 'إدارة قوالب رسائل واتساب التلقائية',
    group: 'ADMINISTRATION',
  },
  'client:read.all': { ar: 'عرض جميع الموكّلين', group: 'CLIENTS' },
  'client:create': { ar: 'إضافة موكّل', group: 'CLIENTS' },
  'client:update': { ar: 'تعديل موكّل', group: 'CLIENTS' },
  'client:delete': { ar: 'حذف موكّل', group: 'CLIENTS' },
  'client:export': { ar: 'تصدير الموكّلين', group: 'CLIENTS' },

  'case:read.all': { ar: 'عرض جميع الدعاوى', group: 'CASES' },
  'case:read.own': { ar: 'عرض الدعاوى المكلّف بها', group: 'CASES' },
  'case:create': { ar: 'إضافة دعوى', group: 'CASES' },
  'case:update': { ar: 'تعديل دعوى', group: 'CASES' },
  'case:status.change': { ar: 'تغيير حالة الدعوى', group: 'CASES' },
  'case:assign': { ar: 'تكليف محامٍ بالدعوى', group: 'CASES' },
  'case:archive': { ar: 'أرشفة الدعوى وإخراجها', group: 'CASES' },
  'case:delete': { ar: 'حذف دعوى', group: 'CASES' },
  'case:export': { ar: 'تصدير الدعاوى', group: 'CASES' },

  'transaction:read': { ar: 'عرض المعاملات', group: 'CASES' },
  'transaction:create': { ar: 'إضافة معاملة', group: 'CASES' },
  'transaction:update': { ar: 'تحديث المعاملات المكلّف بها', group: 'CASES' },
  'transaction:delete': { ar: 'حذف معاملة', group: 'CASES' },

  'poa:read': { ar: 'عرض الوكالات', group: 'CASES' },
  'poa:create': { ar: 'إضافة وكالة', group: 'CASES' },
  'poa:update': { ar: 'تعديل وكالة', group: 'CASES' },
  'poa:delete': { ar: 'حذف وكالة', group: 'CASES' },

  'hearing:read': { ar: 'عرض الجلسات', group: 'CALENDAR' },
  'hearing:create': { ar: 'إضافة جلسة', group: 'CALENDAR' },
  'hearing:update': { ar: 'تعديل جلسة', group: 'CALENDAR' },
  'hearing:outcome.record': { ar: 'تثبيت قرار الجلسة', group: 'CALENDAR' },
  'hearing:delete': { ar: 'حذف جلسة', group: 'CALENDAR' },

  'event:read.all': { ar: 'عرض تقويم المكتب', group: 'CALENDAR' },
  'event:read.own': { ar: 'عرض التقويم الشخصي', group: 'CALENDAR' },
  'event:create': { ar: 'إضافة حدث', group: 'CALENDAR' },
  'event:update': { ar: 'تعديل حدث', group: 'CALENDAR' },
  'event:delete': { ar: 'حذف حدث', group: 'CALENDAR' },

  'task:read': { ar: 'عرض المهام', group: 'CALENDAR' },
  'task:create': { ar: 'إضافة مهمة', group: 'CALENDAR' },
  'task:update': { ar: 'تعديل مهمة', group: 'CALENDAR' },
  'task:complete': { ar: 'إنجاز مهمة', group: 'CALENDAR' },
  'task:delete': { ar: 'حذف مهمة', group: 'CALENDAR' },

  'document:read': { ar: 'عرض المستندات', group: 'DOCUMENTS' },
  'document:download': { ar: 'تنزيل المستندات', group: 'DOCUMENTS' },
  'document:upload': { ar: 'رفع مستند', group: 'DOCUMENTS' },
  'document:update': { ar: 'تعديل بيانات مستند', group: 'DOCUMENTS' },
  'document:delete': { ar: 'حذف مستند', group: 'DOCUMENTS' },
  'document:restore': { ar: 'استرجاع مستند محذوف', group: 'DOCUMENTS' },

  'finance:read.summary': { ar: 'عرض الملخص المالي', group: 'FINANCE' },
  'feeagreement:read': { ar: 'عرض عقود الأتعاب', group: 'FINANCE' },
  'feeagreement:create': { ar: 'إضافة عقد أتعاب', group: 'FINANCE' },
  'feeagreement:update': { ar: 'تعديل عقد أتعاب', group: 'FINANCE' },
  'invoice:read': { ar: 'عرض الوصولات', group: 'FINANCE' },
  'invoice:create': { ar: 'إصدار وصل قبض', group: 'FINANCE' },
  'invoice:void': { ar: 'إلغاء وصل قبض', group: 'FINANCE' },
  'payment:read': { ar: 'عرض الدفعات', group: 'FINANCE' },
  'payment:create': { ar: 'تسجيل دفعة', group: 'FINANCE' },
  'expense:read': { ar: 'عرض المصروفات', group: 'FINANCE' },
  'expense:create': { ar: 'تسجيل مصروف', group: 'FINANCE' },
  'expense:update': { ar: 'تعديل مصروف', group: 'FINANCE' },
  'expense:delete': { ar: 'حذف مصروف', group: 'FINANCE' },
  'finance:export': { ar: 'تصدير البيانات المالية', group: 'FINANCE' },

  'pdf:generate': { ar: 'توليد ملفات PDF', group: 'REPORTS' },

  'search:global': { ar: 'البحث الشامل', group: 'REPORTS' },
  'savedsearch:create': { ar: 'حفظ عمليات البحث', group: 'REPORTS' },
  'savedsearch:share': { ar: 'مشاركة البحث مع المكتب', group: 'REPORTS' },

  'monitor:read': { ar: 'عرض لوحات المتابعة', group: 'REPORTS' },

  'office:read': { ar: 'عرض بيانات المكتب', group: 'ADMINISTRATION' },
  'office:update': { ar: 'تعديل بيانات المكتب', group: 'ADMINISTRATION' },
  'office.branding:update': { ar: 'تعديل الشعار والختم والتوقيع', group: 'ADMINISTRATION' },
  'settings:read': { ar: 'عرض الإعدادات', group: 'ADMINISTRATION' },
  'settings:update': { ar: 'تعديل الإعدادات', group: 'ADMINISTRATION' },

  'user:read': { ar: 'عرض المستخدمين', group: 'ADMINISTRATION' },
  'user:invite': { ar: 'دعوة مستخدم', group: 'ADMINISTRATION' },
  'user:update': { ar: 'تعديل مستخدم', group: 'ADMINISTRATION' },
  'user:deactivate': { ar: 'إيقاف مستخدم', group: 'ADMINISTRATION' },
  'role:read': { ar: 'عرض الأدوار', group: 'ADMINISTRATION' },
  'role:create': { ar: 'إنشاء دور', group: 'ADMINISTRATION' },
  'role:update': { ar: 'تعديل دور', group: 'ADMINISTRATION' },
  'role:delete': { ar: 'حذف دور', group: 'ADMINISTRATION' },

  'audit:read': { ar: 'عرض سجل التدقيق', group: 'ADMINISTRATION' },

  'backup:run': { ar: 'تنفيذ نسخة احتياطية', group: 'ADMINISTRATION' },
  'data:import': { ar: 'استيراد البيانات', group: 'ADMINISTRATION' },
  'data:export.full': { ar: 'تصدير كامل بيانات المكتب', group: 'ADMINISTRATION' },
};
