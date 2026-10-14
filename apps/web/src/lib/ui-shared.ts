/** Frontend display localization. Domain identifiers, validators and office records stay shared and unchanged. */
import * as shared from '@muhami/shared';
import { uiEnglish } from './ui-english';
export * from '@muhami/shared';
export const APP_NAME_AR = 'DevsHub';
export const APP_SHORT_NAME_AR = 'DevsHub';
export const APP_NAME_EN = 'DevsHub';
export const APP_SLUG = 'devshub';
export const APP_TAGLINE_AR = 'Legal Office Management';
export const APP_TITLE_AR = APP_NAME_AR + ' — ' + APP_TAGLINE_AR;
export const APP_DESCRIPTION_AR =
  'One workspace for cases, clients, lawyers, documents, finance and communication.';
export const APP_LOCALE = 'en-GB';

function labels<T extends Record<string, string>>(source: T): T {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, uiEnglish(value)]),
  ) as T;
}
export const ERROR_MESSAGE_AR = labels(shared.ERROR_MESSAGE_AR);
export const PERMISSION_GROUP_AR = labels(shared.PERMISSION_GROUP_AR);
export const SYSTEM_ROLE_AR = labels(shared.SYSTEM_ROLE_AR);
export const SYSTEM_ROLE_DESCRIPTION_AR = labels(shared.SYSTEM_ROLE_DESCRIPTION_AR);
export const CASE_TYPE_AR = labels(shared.CASE_TYPE_AR);
export const CASE_STATUS_AR: typeof shared.CASE_STATUS_AR = {
  ...labels(shared.CASE_STATUS_AR),
  NOTIFICATION: 'Service of process',
};
export const COURT_TYPE_AR = labels(shared.COURT_TYPE_AR);
export const JURISDICTION_AR = labels(shared.JURISDICTION_AR);
export const PARTY_ROLE_AR = labels(shared.PARTY_ROLE_AR);
export const CLIENT_KIND_AR = labels(shared.CLIENT_KIND_AR);
export const EVENT_TYPE_AR = labels(shared.EVENT_TYPE_AR);
export const HEARING_STATUS_AR = labels(shared.HEARING_STATUS_AR);
export const HEARING_OUTCOME_AR = labels(shared.HEARING_OUTCOME_AR);
export const POA_TYPE_AR = labels(shared.POA_TYPE_AR);
export const DOCUMENT_TYPE_AR = labels(shared.DOCUMENT_TYPE_AR);
export const FEE_MODEL_AR = labels(shared.FEE_MODEL_AR);
export const INVOICE_STATUS_AR = labels(shared.INVOICE_STATUS_AR);
export const PAYMENT_METHOD_AR = labels(shared.PAYMENT_METHOD_AR);
export const EXPENSE_CATEGORY_AR = labels(shared.EXPENSE_CATEGORY_AR);
export const TASK_STATUS_AR = labels(shared.TASK_STATUS_AR);
export const USER_STATUS_AR = labels(shared.USER_STATUS_AR);
export const CURRENCY_LABEL_AR = labels(shared.CURRENCY_LABEL_AR);
export const AUDIT_ACTION_AR = labels(shared.AUDIT_ACTION_AR);
export const AUDIT_ENTITY_AR = labels(shared.AUDIT_ENTITY_AR);
export const RECURRENCE_RULE_AR = labels(shared.RECURRENCE_RULE_AR);
export const EVENT_SOURCE_AR = labels(shared.EVENT_SOURCE_AR);
export const TRANSITION_WARNING_AR = labels(shared.TRANSITION_WARNING_AR);
export const TRANSITION_REQUIREMENT_AR = labels(shared.TRANSITION_REQUIREMENT_AR);
export const CASE_SORT_AR = labels(shared.CASE_SORT_AR);
export const CLIENT_SORT_AR = labels(shared.CLIENT_SORT_AR);
export const MIME_LABEL_AR = labels(shared.MIME_LABEL_AR);
export const DOCUMENT_SORT_AR = labels(shared.DOCUMENT_SORT_AR);
export const WATCHLIST_AR = labels(shared.WATCHLIST_AR);
export const WATCHLIST_DESCRIPTION_AR = labels(shared.WATCHLIST_DESCRIPTION_AR);
export const NOTIFICATION_KIND_AR = labels(shared.NOTIFICATION_KIND_AR);
export const NOTIFICATION_CHANNEL_AR = labels(shared.NOTIFICATION_CHANNEL_AR);
export const BRANDING_ASSET_AR = labels(shared.BRANDING_ASSET_AR);
export const BRANDING_ASSET_HINT_AR = labels(shared.BRANDING_ASSET_HINT_AR);
export const NUMERAL_STYLE_AR = labels(shared.NUMERAL_STYLE_AR);
export const DENSITY_AR = labels(shared.DENSITY_AR);
export const EXPORT_FORMAT_AR = labels(shared.EXPORT_FORMAT_AR);
export const EXPORT_FORMAT_HINT_AR = labels(shared.EXPORT_FORMAT_HINT_AR);
export const IMPORT_MODE_AR = labels(shared.IMPORT_MODE_AR);
export const ARCHIVE_TABLE_AR = labels(shared.ARCHIVE_TABLE_AR);
export const SEARCH_GROUP_AR = labels(shared.SEARCH_GROUP_AR);
export const SAVED_SEARCH_SCOPE_AR = labels(shared.SAVED_SEARCH_SCOPE_AR);
export const OUTBOX_STATUS_AR = labels(shared.OUTBOX_STATUS_AR);
export const TRANSACTION_STATUS_AR = labels(shared.TRANSACTION_STATUS_AR);
export const WHATSAPP_MESSAGE_STATUS_AR = labels(shared.WHATSAPP_MESSAGE_STATUS_AR);
export const PRIORITY_AR: typeof shared.PRIORITY_AR = {
  NORMAL: 'Normal',
  IMPORTANT: 'Important',
  URGENT: 'Urgent',
};
export const WEEKDAY_AR = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
export const WEEKDAY_SHORT_AR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTH_AR = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
export const HIJRI_MONTH_AR = [
  'Muharram',
  'Safar',
  'Rabi I',
  'Rabi II',
  'Jumada I',
  'Jumada II',
  'Rajab',
  'Shaaban',
  'Ramadan',
  'Shawwal',
  'Dhu al-Qidah',
  'Dhu al-Hijjah',
];
export const CASE_TYPE_CODES = shared.CASE_TYPE_CODES.map((item) => ({
  ...item,
  ar: uiEnglish(item.ar),
}));
export const PERMISSION_META = Object.fromEntries(
  Object.entries(shared.PERMISSION_META).map(([key, value]) => [
    key,
    { ...value, ar: uiEnglish(value.ar) },
  ]),
) as typeof shared.PERMISSION_META;
export const WHATSAPP_AUTOMATION_DEFINITIONS = Object.fromEntries(
  Object.entries(shared.WHATSAPP_AUTOMATION_DEFINITIONS).map(([key, value]) => [
    key,
    { ...value, title: uiEnglish(value.title), description: uiEnglish(value.description) },
  ]),
) as typeof shared.WHATSAPP_AUTOMATION_DEFINITIONS;
export const WHATSAPP_WELCOME_IMAGES = shared.WHATSAPP_WELCOME_IMAGES.map((image) => ({
  ...image,
  label: uiEnglish(image.label),
}));
export const WHATSAPP_VARIABLE_LABELS: Record<shared.WhatsAppAutomationVariable, string> = {
  اسم_المستلم: 'Recipient name',
  اسم_الشركة: 'Company name',
  رقم_الدعوى: 'Case number',
  عنوان_الدعوى: 'Case subject',
  اسم_الملف: 'File name',
  نوع_المعاملة: 'Transaction type',
  حالة_المعاملة: 'Transaction status',
  الدائرة: 'Department',
};
export function formatLongDateAr(instant: Date): string {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: shared.APP_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(instant);
}
export function formatHijriDate(instant: Date): string {
  try {
    return new Intl.DateTimeFormat('en-GB-u-ca-islamic-umalqura', {
      timeZone: shared.APP_TIMEZONE,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(instant);
  } catch {
    return '';
  }
}
export function formatHijriShort(instant: Date): string {
  try {
    return new Intl.DateTimeFormat('en-GB-u-ca-islamic-umalqura', {
      timeZone: shared.APP_TIMEZONE,
      day: 'numeric',
      month: 'long',
    }).format(instant);
  } catch {
    return '';
  }
}
export function formatMoney(...args: Parameters<typeof shared.formatMoney>): string {
  return shared.formatMoney(...args).replace(/د\.ع$/, 'IQD');
}
export function formatFileSize(bytes: number | string): string {
  const value = typeof bytes === 'string' ? Number.parseInt(bytes, 10) : bytes;
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const size = value / Math.pow(1024, exponent);
  return `${exponent === 0 ? size : size.toFixed(1)} ${units[exponent]}`;
}
