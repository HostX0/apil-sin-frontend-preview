/**
 * Error contract — RFC 7807 problem details, extended with two fields the
 * product needs (Phase 3 API conventions):
 *
 *   `code`      a stable machine identifier the client switches on
 *   `messageAr` the Arabic sentence shown to the user
 *
 * `title`/`detail` stay English for logs and for developers. The client never
 * shows them; the user never sees an untranslated string.
 */

export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'TOKEN_EXPIRED',
  'TOKEN_REUSE_DETECTED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'VERSION_CONFLICT',
  'DUPLICATE',
  'ILLEGAL_STATUS_TRANSITION',
  'TRANSITION_REQUIREMENT_MISSING',
  'IMMUTABLE_RECORD',
  'RATE_LIMITED',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code: ErrorCode;
  messageAr: string;
  /** Field-level messages, keyed by dotted path. Arabic. */
  errors?: Record<string, string[]>;
  /** Correlation id — quoted in the UI so a user can report a specific failure. */
  traceId?: string;
}

export const ERROR_MESSAGE_AR: Record<ErrorCode, string> = {
  VALIDATION_FAILED: 'البيانات المُدخلة غير صحيحة. يرجى مراجعة الحقول المحددة.',
  UNAUTHENTICATED: 'يجب تسجيل الدخول للمتابعة.',
  TOKEN_EXPIRED: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً.',
  TOKEN_REUSE_DETECTED: 'تم اكتشاف استخدام غير آمن للجلسة، وتم إنهاء جميع الجلسات لحمايتك.',
  FORBIDDEN: 'لا تملك صلاحية تنفيذ هذا الإجراء.',
  NOT_FOUND: 'العنصر المطلوب غير موجود.',
  CONFLICT: 'تعارض في البيانات، لا يمكن إتمام العملية.',
  VERSION_CONFLICT: 'تم تعديل هذا السجل من مستخدم آخر. يرجى تحديث الصفحة وإعادة المحاولة.',
  DUPLICATE: 'يوجد سجل مطابق مسبقاً.',
  ILLEGAL_STATUS_TRANSITION: 'لا يمكن الانتقال إلى هذه الحالة من الحالة الحالية.',
  TRANSITION_REQUIREMENT_MISSING: 'تنقص بيانات مطلوبة لإتمام تغيير الحالة.',
  IMMUTABLE_RECORD: 'لا يمكن تعديل هذا السجل بعد إصداره. استخدم سند تصحيح بدلاً من ذلك.',
  RATE_LIMITED: 'عدد المحاولات كبير. يرجى الانتظار قليلاً ثم إعادة المحاولة.',
  PAYLOAD_TOO_LARGE: 'حجم الملف أكبر من الحد المسموح.',
  UNSUPPORTED_MEDIA_TYPE: 'نوع الملف غير مدعوم.',
  INTERNAL_ERROR: 'حدث خطأ غير متوقع. تم تسجيل المشكلة وسيتم معالجتها.',
  SERVICE_UNAVAILABLE: 'الخدمة غير متاحة مؤقتاً. يرجى المحاولة بعد قليل.',
};

export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 422,
  UNAUTHENTICATED: 401,
  TOKEN_EXPIRED: 401,
  TOKEN_REUSE_DETECTED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VERSION_CONFLICT: 409,
  DUPLICATE: 409,
  ILLEGAL_STATUS_TRANSITION: 422,
  TRANSITION_REQUIREMENT_MISSING: 422,
  IMMUTABLE_RECORD: 409,
  RATE_LIMITED: 429,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};
