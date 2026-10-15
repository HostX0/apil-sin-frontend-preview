import { z } from 'zod';
import { requiredText, uuidSchema } from './common';

export const WHATSAPP_WELCOME_MESSAGE =
  'Welcome to DevsHub. Thank you for choosing our legal office. We are here to help you follow your case.';

export const WHATSAPP_WELCOME_IMAGE_IDS = ['welcome-1', 'welcome-2', 'welcome-3'] as const;
export type WhatsAppWelcomeImageId = (typeof WHATSAPP_WELCOME_IMAGE_IDS)[number];
export const WHATSAPP_DEFAULT_WELCOME_IMAGE_ID: WhatsAppWelcomeImageId = 'welcome-1';
export const WHATSAPP_WELCOME_IMAGES: ReadonlyArray<{
  id: WhatsAppWelcomeImageId;
  label: string;
  src: string;
}> = [
  { id: 'welcome-1', label: 'Midnight', src: '/images/welcome/devshub-welcome-1.svg' },
  { id: 'welcome-2', label: 'Paper', src: '/images/welcome/devshub-welcome-2.svg' },
  { id: 'welcome-3', label: 'Indigo', src: '/images/welcome/devshub-welcome-3.svg' },
];
export const whatsAppWelcomeImageIdSchema = z.enum(WHATSAPP_WELCOME_IMAGE_IDS);

export const WHATSAPP_RECIPIENT_TYPES = ['client', 'lawyer'] as const;
export type WhatsAppRecipientType = (typeof WHATSAPP_RECIPIENT_TYPES)[number];
export const WHATSAPP_AUTOMATION_EVENTS = [
  'client.created',
  'lawyer.created',
  'case.document.updated',
  'transaction.updated',
  'transaction.document.updated',
] as const;
export type WhatsAppAutomationEvent = (typeof WHATSAPP_AUTOMATION_EVENTS)[number];
export type WhatsAppAutomationVariable =
  | 'اسم_المستلم'
  | 'اسم_الشركة'
  | 'رقم_الدعوى'
  | 'عنوان_الدعوى'
  | 'اسم_الملف'
  | 'نوع_المعاملة'
  | 'حالة_المعاملة'
  | 'الدائرة';
export const WHATSAPP_AUTOMATION_DEFINITIONS: Record<
  WhatsAppAutomationEvent,
  {
    title: string;
    description: string;
    recipientType: WhatsAppRecipientType;
    variables: WhatsAppAutomationVariable[];
    defaultBody: string;
    defaultEnabled: boolean;
  }
> = {
  'client.created': {
    title: 'عند إضافة موكل',
    description: 'رسالة ترحيب إلى الموكل الجديد.',
    recipientType: 'client',
    variables: ['اسم_المستلم', 'اسم_الشركة'],
    defaultBody: WHATSAPP_WELCOME_MESSAGE,
    defaultEnabled: true,
  },
  'lawyer.created': {
    title: 'عند إضافة محامٍ',
    description: 'رسالة ترحيب إلى المحامي الجديد.',
    recipientType: 'lawyer',
    variables: ['اسم_المستلم', 'اسم_الشركة'],
    defaultBody: 'أهلاً وسهلاً بك {اسم_المستلم} في {اسم_الشركة}.',
    defaultEnabled: false,
  },
  'case.document.updated': {
    title: 'عند تحديث أوراق دعوى',
    description: 'إشعار إلى موكل الدعوى عند إضافة مستند أو تحديثه.',
    recipientType: 'client',
    variables: ['اسم_المستلم', 'اسم_الشركة', 'رقم_الدعوى', 'عنوان_الدعوى', 'اسم_الملف'],
    defaultBody:
      'أهلاً {اسم_المستلم}، يوجد تحديث على أوراق الدعوى {رقم_الدعوى}: {اسم_الملف}. {اسم_الشركة}',
    defaultEnabled: false,
  },
  'transaction.updated': {
    title: 'عند تحديث معاملة',
    description: 'إشعار إلى صاحب المعاملة عند تعديل تفاصيلها أو حالتها.',
    recipientType: 'client',
    variables: ['اسم_المستلم', 'اسم_الشركة', 'نوع_المعاملة', 'حالة_المعاملة', 'الدائرة'],
    defaultBody:
      'أهلاً {اسم_المستلم}، يوجد تحديث بخصوص معاملتك: {نوع_المعاملة}. الحالة: {حالة_المعاملة}. {اسم_الشركة}',
    defaultEnabled: false,
  },
  'transaction.document.updated': {
    title: 'عند تحديث أوراق معاملة',
    description: 'إشعار إلى صاحب المعاملة عند إضافة مستند أو تحديثه.',
    recipientType: 'client',
    variables: [
      'اسم_المستلم',
      'اسم_الشركة',
      'نوع_المعاملة',
      'حالة_المعاملة',
      'الدائرة',
      'اسم_الملف',
    ],
    defaultBody:
      'أهلاً {اسم_المستلم}، يوجد تحديث على أوراق معاملتك {نوع_المعاملة}: {اسم_الملف}. {اسم_الشركة}',
    defaultEnabled: false,
  },
};
export const whatsAppAutomationEventSchema = z.enum(WHATSAPP_AUTOMATION_EVENTS);
export const WHATSAPP_ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;
export const WHATSAPP_MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const presignWhatsAppAttachmentSchema = z.object({
  fileName: requiredText('اسم الملف', 255),
  mimeType: z.enum(WHATSAPP_ATTACHMENT_MIME_TYPES),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(WHATSAPP_MAX_ATTACHMENT_BYTES, 'الحد الأقصى للملف ١٠ ميغابايت.'),
});
export type PresignWhatsAppAttachmentInput = z.infer<typeof presignWhatsAppAttachmentSchema>;
export const whatsAppAttachmentSchema = presignWhatsAppAttachmentSchema.extend({
  objectKey: requiredText('الملف', 512),
});
export type WhatsAppAttachment = z.infer<typeof whatsAppAttachmentSchema>;

export const presignWhatsAppWelcomeImageSchema = presignWhatsAppAttachmentSchema.extend({
  mimeType: z.enum(['image/png', 'image/jpeg']),
});
export type PresignWhatsAppWelcomeImageInput = z.infer<typeof presignWhatsAppWelcomeImageSchema>;
export const whatsAppWelcomeUploadSchema = presignWhatsAppWelcomeImageSchema.extend({
  objectKey: requiredText('الصورة', 512),
});
export type WhatsAppWelcomeUpload = z.infer<typeof whatsAppWelcomeUploadSchema>;

export const putWhatsAppAutomationSchema = z
  .object({
    body: requiredText('نص الرسالة', 2000),
    enabled: z.boolean(),
    version: z.number().int().min(0),
    welcomeImageEnabled: z.boolean().optional(),
    welcomeImageId: whatsAppWelcomeImageIdSchema.nullable().optional(),
    welcomeUpload: whatsAppWelcomeUploadSchema.nullable().optional(),
  })
  .refine((input) => !(input.welcomeImageId && input.welcomeUpload), {
    path: ['welcomeUpload'],
    message: 'اختر صورة واحدة للترحيب: من التصاميم أو من جهازك.',
  });
export type PutWhatsAppAutomationInput = z.infer<typeof putWhatsAppAutomationSchema>;
export interface WhatsAppAutomationTemplate {
  id: string | null;
  eventKey: WhatsAppAutomationEvent;
  enabled: boolean;
  body: string;
  version: number;
  welcomeImageEnabled: boolean;
  welcomeImageId: WhatsAppWelcomeImageId | null;
  welcomeUpload: WhatsAppWelcomeUpload | null;
}

export const createWhatsAppMessageSchema = z
  .object({
    recipientType: z.enum(WHATSAPP_RECIPIENT_TYPES),
    recipientId: uuidSchema,
    body: z.string().trim().max(2000, 'الرسالة تتجاوز الحد المسموح (٢٠٠٠ حرف).').default(''),
    requestId: uuidSchema,
    attachment: whatsAppAttachmentSchema.optional(),
  })
  .refine((value) => Boolean(value.body || value.attachment), {
    message: 'اكتب رسالة أو اختر مرفقاً للإرسال.',
    path: ['body'],
  });
export type CreateWhatsAppMessageInput = z.infer<typeof createWhatsAppMessageSchema>;

export const listWhatsAppMessagesSchema = z.object({
  recipientType: z.enum(WHATSAPP_RECIPIENT_TYPES).optional(),
  recipientId: uuidSchema.optional(),
});
export type ListWhatsAppMessagesQuery = z.infer<typeof listWhatsAppMessagesSchema>;

export const WHATSAPP_MESSAGE_STATUSES = [
  'queued',
  'in_flight',
  'accepted',
  'delivered',
  'read',
  'failed',
  'uncertain',
  'expired',
  'cancelled',
  'skipped',
] as const;
export type WhatsAppMessageStatus = (typeof WHATSAPP_MESSAGE_STATUSES)[number];

export const WHATSAPP_MESSAGE_STATUS_AR: Record<WhatsAppMessageStatus, string> = {
  queued: 'بانتظار الإرسال',
  in_flight: 'جارٍ الإرسال',
  accepted: 'قُبلت لدى خدمة الإرسال',
  delivered: 'وصلت إلى المستلم',
  read: 'قرأها المستلم',
  failed: 'تعذّر الإرسال',
  uncertain: 'نتيجة الإرسال غير مؤكدة',
  expired: 'انتهت مهلة الإرسال',
  cancelled: 'أُلغيت',
  skipped: 'لم تُرسل',
};

export interface WhatsAppMessageItem {
  id: string;
  recipientType: WhatsAppRecipientType;
  recipientId: string;
  recipientName: string;
  phone: string;
  body: string;
  kind: 'welcome' | 'custom' | 'automatic';
  eventKey?: WhatsAppAutomationEvent | null;
  automationVersion?: number | null;
  status: WhatsAppMessageStatus;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  attachmentFileName: string | null;
  welcomeImageId?: WhatsAppWelcomeImageId | null;
}

export interface WhatsAppConnection {
  configured: boolean;
  status: string;
  phone: string | null;
}

export interface WhatsAppQr {
  qrCode: string | null;
  status: string;
}

export interface WhatsAppAttachmentTicket {
  objectKey: string;
  uploadUrl: string;
  headers: Record<string, string>;
}
