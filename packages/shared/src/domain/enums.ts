/**
 * Domain enumerations — locked in Phase 0 §0.1.
 *
 * These values are contractual: they appear in the database, the API, the URL
 * query strings of saved searches, and printed PDFs. Adding a value is cheap;
 * renaming or removing one is a migration plus a data backfill. Do not change
 * without an approved phase.
 *
 * Every enum ships with its Arabic label map. The Arabic label is the binding
 * UI string — the English identifier exists only for code.
 */

// ── Case type — نوع الدعوى (9 values, Phase 0 locked) ────────────────────────
export const CASE_TYPES = [
  'CIVIL',
  'CRIMINAL',
  'PERSONAL_STATUS',
  'COMMERCIAL',
  'LABOR',
  'ADMINISTRATIVE',
  'ENFORCEMENT',
  'REAL_ESTATE',
  'OTHER',
] as const;
export type CaseType = (typeof CASE_TYPES)[number];

export const CASE_TYPE_AR: Record<CaseType, string> = {
  CIVIL: 'مدني',
  CRIMINAL: 'جزائي',
  PERSONAL_STATUS: 'أحوال شخصية',
  COMMERCIAL: 'تجاري',
  LABOR: 'عمل',
  ADMINISTRATIVE: 'إداري',
  ENFORCEMENT: 'تنفيذ',
  REAL_ESTATE: 'عقاري',
  OTHER: 'أخرى',
};

// ── Case status — حالة الدعوى (8 values, Phase 0 locked) ─────────────────────
// REC-01 (INTAKE / STAYED) was proposed and NOT approved. Do not add here.
export const CASE_STATUSES = [
  'NOTIFICATION',
  'HEARING',
  'JUDGMENT_RESERVED',
  'APPEAL',
  'CASSATION',
  'ENFORCEMENT',
  'CLOSED',
  'ARCHIVED',
] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const CASE_STATUS_AR: Record<CaseStatus, string> = {
  NOTIFICATION: 'تبليغ',
  HEARING: 'مرافعة',
  JUDGMENT_RESERVED: 'حجز للحكم',
  APPEAL: 'استئناف',
  CASSATION: 'تمييز',
  ENFORCEMENT: 'تنفيذ',
  CLOSED: 'مغلقة',
  ARCHIVED: 'مؤرشفة',
};

/**
 * "Active case" — the binding definition behind the dashboard metric
 * (Phase 0 §0.5). Every count of active cases in the system derives from this
 * constant; no module may re-define it locally.
 */
export const INACTIVE_CASE_STATUSES: readonly CaseStatus[] = ['CLOSED', 'ARCHIVED'];
export const ACTIVE_CASE_STATUSES: readonly CaseStatus[] = CASE_STATUSES.filter(
  (s) => !INACTIVE_CASE_STATUSES.includes(s),
);

// ── Court / forum type — نوع المحكمة ─────────────────────────────────────────
export const COURT_TYPES = [
  'FIRST_INSTANCE',
  'PERSONAL_STATUS',
  'PERSONAL_MATTERS',
  'INVESTIGATION',
  'FELONY',
  'MISDEMEANOR',
  'JUVENILE',
  'LABOR',
  'ADMINISTRATIVE',
  'APPEAL',
  'CASSATION',
  'FEDERAL_SUPREME',
  'ENFORCEMENT_DIR',
  'OTHER',
] as const;
export type CourtType = (typeof COURT_TYPES)[number];

export const COURT_TYPE_AR: Record<CourtType, string> = {
  FIRST_INSTANCE: 'محكمة البداءة',
  PERSONAL_STATUS: 'محكمة الأحوال الشخصية',
  PERSONAL_MATTERS: 'محكمة المواد الشخصية',
  INVESTIGATION: 'محكمة التحقيق',
  FELONY: 'محكمة الجنايات',
  MISDEMEANOR: 'محكمة الجنح',
  JUVENILE: 'محكمة الأحداث',
  LABOR: 'محكمة العمل',
  ADMINISTRATIVE: 'محكمة القضاء الإداري',
  APPEAL: 'محكمة الاستئناف',
  CASSATION: 'محكمة التمييز الاتحادية',
  FEDERAL_SUPREME: 'المحكمة الاتحادية العليا',
  ENFORCEMENT_DIR: 'مديرية التنفيذ',
  OTHER: 'جهة أخرى',
};

/** D-01: Kurdistan Region runs a parallel judiciary. One field now, no rework later. */
export const JURISDICTIONS = ['FEDERAL', 'KRI'] as const;
export type Jurisdiction = (typeof JURISDICTIONS)[number];

export const JURISDICTION_AR: Record<Jurisdiction, string> = {
  FEDERAL: 'الاتحادي',
  KRI: 'إقليم كردستان',
};

// ── The client's capacity in the case — صفة الموكّل ──────────────────────────
export const PARTY_ROLES = [
  'PLAINTIFF',
  'DEFENDANT',
  'COMPLAINANT',
  'ACCUSED',
  'EXECUTION_CREDITOR',
  'EXECUTION_DEBTOR',
  'THIRD_PARTY',
  'OTHER',
] as const;
export type PartyRole = (typeof PARTY_ROLES)[number];

export const PARTY_ROLE_AR: Record<PartyRole, string> = {
  PLAINTIFF: 'مدّعٍ',
  DEFENDANT: 'مدّعى عليه',
  COMPLAINANT: 'مشتكٍ',
  ACCUSED: 'متهم',
  EXECUTION_CREDITOR: 'طالب التنفيذ',
  EXECUTION_DEBTOR: 'المنفَّذ عليه',
  THIRD_PARTY: 'شخص ثالث',
  OTHER: 'أخرى',
};

/** Which side of the matter a party sits on. */
export const PARTY_SIDES = ['CLIENT', 'OPPONENT', 'OTHER'] as const;
export type PartySide = (typeof PARTY_SIDES)[number];

// ── Client kind — نوع الموكّل ────────────────────────────────────────────────
export const CLIENT_KINDS = ['INDIVIDUAL', 'COMPANY'] as const;
export type ClientKind = (typeof CLIENT_KINDS)[number];

export const CLIENT_KIND_AR: Record<ClientKind, string> = {
  INDIVIDUAL: 'شخص طبيعي',
  COMPANY: 'شخص معنوي',
};

// ── Calendar event type + colour contract (Phase 0 §0.9 / brief) ─────────────
export const EVENT_TYPES = [
  'HEARING',
  'APPOINTMENT',
  'DEADLINE',
  'REMINDER',
  'URGENT_TASK',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_AR: Record<EventType, string> = {
  HEARING: 'جلسة',
  APPOINTMENT: 'موعد',
  DEADLINE: 'موعد نهائي',
  REMINDER: 'تذكير',
  URGENT_TASK: 'مهمة عاجلة',
};

/**
 * The calendar colour contract, fixed by the brief. Semantic token names — the
 * design system (Phase 4) maps these to actual values for light and dark themes.
 * Never hardcode a hex here.
 */
export const EVENT_TYPE_COLOR_TOKEN: Record<EventType, string> = {
  HEARING: 'event-blue',
  APPOINTMENT: 'event-green',
  DEADLINE: 'event-orange',
  REMINDER: 'event-purple',
  URGENT_TASK: 'event-red',
};

/** Ordering for "Today's Schedule" when two items share a time (Phase 0 §0.5). */
export const EVENT_TYPE_PRIORITY: Record<EventType, number> = {
  HEARING: 0,
  DEADLINE: 1,
  APPOINTMENT: 2,
  URGENT_TASK: 3,
  REMINDER: 4,
};

// ── Hearing lifecycle — حالة الجلسة ──────────────────────────────────────────
export const HEARING_STATUSES = ['SCHEDULED', 'HELD', 'ADJOURNED', 'CANCELLED'] as const;
export type HearingStatus = (typeof HEARING_STATUSES)[number];

export const HEARING_STATUS_AR: Record<HearingStatus, string> = {
  SCHEDULED: 'مجدولة',
  HELD: 'منعقدة',
  ADJOURNED: 'مؤجلة',
  CANCELLED: 'ملغاة',
};

export const HEARING_OUTCOMES = [
  'HELD',
  'ADJOURNED',
  'RESERVED_FOR_JUDGMENT',
  'JUDGMENT_ISSUED',
] as const;
export type HearingOutcome = (typeof HEARING_OUTCOMES)[number];

export const HEARING_OUTCOME_AR: Record<HearingOutcome, string> = {
  HELD: 'انعقدت',
  ADJOURNED: 'تأجلت',
  RESERVED_FOR_JUDGMENT: 'حُجزت للحكم',
  JUDGMENT_ISSUED: 'صدر الحكم',
};

// ── Power of attorney — الوكالة ──────────────────────────────────────────────
export const POA_TYPES = ['GENERAL', 'SPECIFIC'] as const;
export type PoaType = (typeof POA_TYPES)[number];

export const POA_TYPE_AR: Record<PoaType, string> = {
  GENERAL: 'وكالة عامة',
  SPECIFIC: 'وكالة خاصة',
};

// ── Documents — المستندات ────────────────────────────────────────────────────
export const DOCUMENT_TYPES = [
  'POWER_OF_ATTORNEY',
  'CONTRACT',
  'COURT_DOCUMENT',
  'IMAGE',
  'PDF',
  'SCANNED',
  'OTHER',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_AR: Record<DocumentType, string> = {
  POWER_OF_ATTORNEY: 'وكالة',
  CONTRACT: 'عقد',
  COURT_DOCUMENT: 'مستند محكمة',
  IMAGE: 'صورة',
  PDF: 'ملف PDF',
  SCANNED: 'ملف ممسوح ضوئياً',
  OTHER: 'أخرى',
};

// ── Finance — المالية ────────────────────────────────────────────────────────
export const FEE_MODELS = ['FIXED', 'STAGED', 'PERCENTAGE'] as const;
export type FeeModel = (typeof FEE_MODELS)[number];

export const FEE_MODEL_AR: Record<FeeModel, string> = {
  FIXED: 'أتعاب مقطوعة',
  STAGED: 'أتعاب على مراحل',
  PERCENTAGE: 'نسبة مئوية',
};

export const INVOICE_STATUSES = ['ISSUED', 'VOIDED'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_AR: Record<InvoiceStatus, string> = {
  ISSUED: 'صادر',
  VOIDED: 'ملغى',
};

export const PAYMENT_METHODS = [
  'CASH',
  'ZAIN_CASH',
  'ASIA_HAWALA',
  'BANK_TRANSFER',
  'CHEQUE',
  'OTHER',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_AR: Record<PaymentMethod, string> = {
  CASH: 'نقداً',
  ZAIN_CASH: 'زين كاش',
  ASIA_HAWALA: 'آسيا حوالة',
  BANK_TRANSFER: 'حوالة مصرفية',
  CHEQUE: 'صك',
  OTHER: 'أخرى',
};

export const EXPENSE_CATEGORIES = [
  'COURT_FEE',
  'TRANSPORT',
  'EXPERT_FEE',
  'STAMPS',
  'COPYING',
  'OTHER',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_AR: Record<ExpenseCategory, string> = {
  COURT_FEE: 'رسوم قضائية',
  TRANSPORT: 'نقل ومواصلات',
  EXPERT_FEE: 'أتعاب خبير',
  STAMPS: 'طوابع',
  COPYING: 'استنساخ',
  OTHER: 'أخرى',
};

// ── Misc ─────────────────────────────────────────────────────────────────────
export const PRIORITIES = ['NORMAL', 'IMPORTANT', 'URGENT'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_AR: Record<Priority, string> = {
  NORMAL: 'عادية',
  IMPORTANT: 'مهمة',
  URGENT: 'عاجلة',
};

export const TASK_STATUSES = ['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_AR: Record<TaskStatus, string> = {
  OPEN: 'مفتوحة',
  IN_PROGRESS: 'قيد التنفيذ',
  DONE: 'منجزة',
  CANCELLED: 'ملغاة',
};

export const USER_STATUSES = ['ACTIVE', 'INVITED', 'SUSPENDED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const USER_STATUS_AR: Record<UserStatus, string> = {
  ACTIVE: 'نشط',
  INVITED: 'بانتظار القبول',
  SUSPENDED: 'موقوف',
};
