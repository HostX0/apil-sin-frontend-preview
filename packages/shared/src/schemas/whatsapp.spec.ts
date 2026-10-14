import { describe, expect, it } from 'vitest';
import {
  createWhatsAppMessageSchema,
  putWhatsAppAutomationSchema,
  presignWhatsAppWelcomeImageSchema,
  whatsAppAutomationEventSchema,
  WHATSAPP_AUTOMATION_DEFINITIONS,
  WHATSAPP_MAX_ATTACHMENT_BYTES,
  WHATSAPP_WELCOME_IMAGE_IDS,
} from './whatsapp';
import { createClientSchema } from './client';

const recipientId = '22222222-2222-4222-8222-222222222222';
const requestId = '33333333-3333-4333-8333-333333333333';
const attachment = {
  objectKey: 'office/whatsapp/notice.pdf',
  fileName: 'تبليغ محكمة.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
};

const message = { recipientType: 'client', recipientId, requestId, body: 'موعد مراجعة المكتب' };

describe('WhatsApp message validation', () => {
  it('accepts a saved client or lawyer and trims the message', () => {
    for (const recipientType of ['client', 'lawyer']) {
      const parsed = createWhatsAppMessageSchema.parse({
        ...message,
        recipientType,
        body: '  موعد مراجعة المكتب  ',
      });
      expect(parsed.body).toBe('موعد مراجعة المكتب');
    }
  });

  it('does not queue a blank message without a real attachment', () => {
    expect(createWhatsAppMessageSchema.safeParse({ ...message, body: ' \n ' }).success).toBe(false);
    expect(
      createWhatsAppMessageSchema.safeParse({ ...message, body: '', attachment: {} }).success,
    ).toBe(false);
  });

  it('allows sending a document without a text caption', () => {
    const parsed = createWhatsAppMessageSchema.parse({
      recipientType: 'lawyer',
      recipientId,
      requestId,
      attachment,
    });
    expect(parsed.body).toBe('');
    expect(parsed.attachment?.fileName).toBe('تبليغ محكمة.pdf');
  });

  it('rejects unsupported attachments and files above the upload limit', () => {
    expect(
      createWhatsAppMessageSchema.safeParse({
        ...message,
        attachment: { ...attachment, mimeType: 'text/html' },
      }).success,
    ).toBe(false);
    expect(
      createWhatsAppMessageSchema.safeParse({
        ...message,
        attachment: { ...attachment, sizeBytes: WHATSAPP_MAX_ATTACHMENT_BYTES + 1 },
      }).success,
    ).toBe(false);
    expect(
      createWhatsAppMessageSchema.safeParse({
        ...message,
        attachment: { ...attachment, sizeBytes: 0 },
      }).success,
    ).toBe(false);
  });

  it('requires stable recipient and request identifiers for safe retries', () => {
    expect(createWhatsAppMessageSchema.safeParse({ ...message, requestId: '' }).success).toBe(
      false,
    );
    expect(
      createWhatsAppMessageSchema.safeParse({ ...message, recipientId: 'arbitrary phone number' })
        .success,
    ).toBe(false);
  });
});

describe('WhatsApp automatic-template contracts', () => {
  it('accepts an independent boolean attachment switch without clearing selected artwork', () => {
    const values = { body: 'مرحباً', enabled: true, version: 1, welcomeImageId: 'welcome-1' };
    expect(
      putWhatsAppAutomationSchema.parse({ ...values, welcomeImageEnabled: false }),
    ).toMatchObject({ welcomeImageId: 'welcome-1', welcomeImageEnabled: false });
    expect(putWhatsAppAutomationSchema.parse(values)).not.toHaveProperty('welcomeImageEnabled');
    for (const welcomeImageEnabled of ['false', 0, null]) {
      expect(
        putWhatsAppAutomationSchema.safeParse({ ...values, welcomeImageEnabled }).success,
      ).toBe(false);
    }
  });
  it('accepts a custom image or bundled image but rejects selecting both', () => {
    const welcomeUpload = { ...attachment, fileName: 'ترحيب.png', mimeType: 'image/png' };
    const values = { body: 'مرحباً', enabled: true, version: 1 };
    expect(
      putWhatsAppAutomationSchema.parse({ ...values, welcomeImageId: null, welcomeUpload })
        .welcomeUpload,
    ).toEqual(welcomeUpload);
    expect(
      putWhatsAppAutomationSchema.safeParse({
        ...values,
        welcomeImageId: 'welcome-1',
        welcomeUpload,
      }).success,
    ).toBe(false);
    expect(
      putWhatsAppAutomationSchema.parse({ ...values, welcomeImageId: null, welcomeUpload: null }),
    ).toMatchObject({ welcomeImageId: null, welcomeUpload: null });
    for (const mimeType of ['application/pdf', 'image/svg+xml', 'image/gif', 'image/webp']) {
      expect(
        presignWhatsAppWelcomeImageSchema.safeParse({
          fileName: 'image.png',
          mimeType,
          sizeBytes: 1024,
        }).success,
      ).toBe(false);
      expect(
        putWhatsAppAutomationSchema.safeParse({
          ...values,
          welcomeUpload: { ...welcomeUpload, mimeType },
        }).success,
      ).toBe(false);
    }
    expect(
      presignWhatsAppWelcomeImageSchema.safeParse({
        fileName: 'image.png',
        mimeType: 'image/png',
        sizeBytes: WHATSAPP_MAX_ATTACHMENT_BYTES + 1,
      }).success,
    ).toBe(false);
  });
  it('accepts only bundled welcome image IDs or an explicit text-only setting', () => {
    for (const welcomeImageId of [...WHATSAPP_WELCOME_IMAGE_IDS, null]) {
      expect(
        putWhatsAppAutomationSchema.parse({
          body: 'مرحباً',
          enabled: true,
          version: 0,
          welcomeImageId,
        }).welcomeImageId,
      ).toBe(welcomeImageId);
    }
    for (const welcomeImageId of [
      'https://example.com/welcome.png',
      '../secret',
      'welcome-4',
      false,
      {},
    ]) {
      expect(
        putWhatsAppAutomationSchema.safeParse({
          body: 'مرحباً',
          enabled: true,
          version: 0,
          welcomeImageId,
        }).success,
      ).toBe(false);
    }
  });
  it('keeps the create-client image choice optional and accepts an explicit opt-out', () => {
    const client = { fullName: 'محمد علي', mobile: '+9647701234567' };
    expect(createClientSchema.parse(client).includeWelcomeImage).toBeUndefined();
    expect(
      createClientSchema.parse({ ...client, includeWelcomeImage: false }).includeWelcomeImage,
    ).toBe(false);
    expect(createClientSchema.safeParse({ ...client, includeWelcomeImage: 'false' }).success).toBe(
      false,
    );
  });
  it('accepts all supported business events and refuses arbitrary event names', () => {
    for (const eventKey of [
      'client.created',
      'lawyer.created',
      'case.document.updated',
      'transaction.updated',
      'transaction.document.updated',
    ]) {
      expect(whatsAppAutomationEventSchema.parse(eventKey)).toBe(eventKey);
    }
    for (const eventKey of ['case.created', 'client.deleted', '../connection/connect', '']) {
      expect(whatsAppAutomationEventSchema.safeParse(eventKey).success).toBe(false);
    }
  });

  it('accepts the first virtual template version and preserves an explicit off switch', () => {
    expect(
      putWhatsAppAutomationSchema.parse({
        body: '  أهلاً {اسم_المستلم}\nفي {اسم_الشركة}  ',
        enabled: false,
        version: 0,
      }),
    ).toEqual({
      body: 'أهلاً {اسم_المستلم}\nفي {اسم_الشركة}',
      enabled: false,
      version: 0,
    });
  });

  it('requires explicit enable and version values to avoid unintended activation or overwrites', () => {
    const valid = { body: 'مرحباً', enabled: true, version: 1 };
    for (const version of [undefined, -1, 1.5, '1', Number.POSITIVE_INFINITY]) {
      expect(putWhatsAppAutomationSchema.safeParse({ ...valid, version }).success).toBe(false);
    }
    for (const enabled of [undefined, 'true', 1]) {
      expect(putWhatsAppAutomationSchema.safeParse({ ...valid, enabled }).success).toBe(false);
    }
  });

  it('rejects blank or oversized template text and accepts the exact maximum', () => {
    const values = { enabled: true, version: 0 };
    expect(putWhatsAppAutomationSchema.safeParse({ ...values, body: ' \n ' }).success).toBe(false);
    expect(
      putWhatsAppAutomationSchema.safeParse({ ...values, body: 'أ'.repeat(2001) }).success,
    ).toBe(false);
    expect(
      putWhatsAppAutomationSchema.parse({ ...values, body: 'أ'.repeat(2000) }).body.length,
    ).toBe(2000);
  });

  it('keeps new event templates opt-in and routes lawyer welcome only to the added lawyer', () => {
    expect(
      Object.entries(WHATSAPP_AUTOMATION_DEFINITIONS)
        .filter(([, definition]) => definition.defaultEnabled)
        .map(([eventKey]) => eventKey),
    ).toEqual(['client.created']);
    expect(WHATSAPP_AUTOMATION_DEFINITIONS['lawyer.created'].recipientType).toBe('lawyer');
    for (const eventKey of [
      'client.created',
      'case.document.updated',
      'transaction.updated',
      'transaction.document.updated',
    ] as const) {
      expect(WHATSAPP_AUTOMATION_DEFINITIONS[eventKey].recipientType).toBe('client');
    }
  });

  it('all default texts use fields available in their event editor', () => {
    for (const definition of Object.values(WHATSAPP_AUTOMATION_DEFINITIONS)) {
      expect(
        putWhatsAppAutomationSchema.safeParse({
          body: definition.defaultBody,
          enabled: definition.defaultEnabled,
          version: 0,
        }).success,
      ).toBe(true);
      const tokens = Array.from(
        definition.defaultBody.matchAll(/\{([^{}]+)\}/g),
        (match) => match[1],
      );
      expect(
        tokens.every((token) => definition.variables.some((variable) => variable === token)),
      ).toBe(true);
    }
  });
});
