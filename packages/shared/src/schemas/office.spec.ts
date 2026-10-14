import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OFFICE_SETTINGS,
  applySettingsPatch,
  caseNumberTemplateSchema,
  formatReceiptNumber,
  officeSettingsPatchSchema,
  officeSettingsSchema,
} from './office';

describe('office settings registry', () => {
  describe('reading is total', () => {
    it('parses an empty object into a complete settings object', () => {
      const settings = officeSettingsSchema.parse({});

      expect(settings.general.inactiveCaseDays).toBe(60);
      expect(settings.caseNumber.template).toBe('{serial}/{typeCode}/{year}');
      expect(settings.printing.paperSize).toBe('A4');
      expect(settings.finance.receiptNumberWidth).toBe(6);
      expect(settings.localization.showHijri).toBe(true);
      expect(settings.notifications.digestEnabled).toBe(false);
    });

    it('fills a missing section without touching the sections that are present', () => {
      // This is the forward-compatibility property: an office stored before a
      // section existed keeps its own values and gains the new defaults.
      const settings = officeSettingsSchema.parse({ printing: { paperSize: 'LETTER' } });

      expect(settings.printing.paperSize).toBe('LETTER');
      expect(settings.printing.showLogo).toBe(true);
      expect(settings.finance).toEqual(DEFAULT_OFFICE_SETTINGS.finance);
    });

    it('fills a missing field inside a section that is present', () => {
      const settings = officeSettingsSchema.parse({ finance: { receiptPrefix: 'و-' } });

      expect(settings.finance.receiptPrefix).toBe('و-');
      expect(settings.finance.receiptNumberWidth).toBe(6);
    });
  });

  describe('case-number template', () => {
    it('accepts the default and a year-first arrangement', () => {
      expect(caseNumberTemplateSchema.safeParse('{serial}/{typeCode}/{year}').success).toBe(true);
      expect(caseNumberTemplateSchema.safeParse('{year}/{typeCode}/{serial}').success).toBe(true);
      expect(caseNumberTemplateSchema.safeParse('{serial} - {typeCode} - {year}').success).toBe(
        true,
      );
    });

    it.each([
      ['{serial}/{year}', 'missing typeCode'],
      ['{typeCode}/{year}', 'missing serial'],
      ['{serial}/{typeCode}', 'missing year'],
      ['رقم الدعوى', 'no tokens at all'],
    ])('rejects %s (%s)', (template) => {
      expect(caseNumberTemplateSchema.safeParse(template).success).toBe(false);
    });
  });

  describe('receipt numbering', () => {
    it('zero-pads to the configured width', () => {
      expect(formatReceiptNumber(7, { receiptPrefix: '', receiptNumberWidth: 6 })).toBe('000007');
    });

    it('applies the office prefix', () => {
      expect(formatReceiptNumber(123, { receiptPrefix: 'و-', receiptNumberWidth: 6 })).toBe(
        'و-000123',
      );
    });

    it('never truncates a number that outgrows the width', () => {
      // A receipt book that has passed its padding width must keep printing the
      // real number; silently dropping a digit would forge a duplicate.
      expect(formatReceiptNumber(1_234_567, { receiptPrefix: '', receiptNumberWidth: 4 })).toBe(
        '1234567',
      );
    });

    it('sorts as text in issue order within a width', () => {
      const format = { receiptPrefix: '', receiptNumberWidth: 6 };
      const rendered = [3, 20, 100, 7].map((n) => formatReceiptNumber(n, format));

      expect([...rendered].sort()).toEqual(rendered.slice().sort((a, b) => Number(a) - Number(b)));
    });
  });

  describe('patching', () => {
    it('merges one field without blanking its siblings', () => {
      const next = applySettingsPatch(DEFAULT_OFFICE_SETTINGS, {
        printing: { showStamp: false },
      });

      expect(next.printing.showStamp).toBe(false);
      expect(next.printing.showLogo).toBe(true);
      expect(next.printing.paperSize).toBe('A4');
    });

    it('leaves untouched sections exactly as they were', () => {
      const current = applySettingsPatch(DEFAULT_OFFICE_SETTINGS, {
        finance: { receiptPrefix: 'و-' },
      });

      const next = applySettingsPatch(current, { general: { inactiveCaseDays: 90 } });

      expect(next.general.inactiveCaseDays).toBe(90);
      expect(next.finance.receiptPrefix).toBe('و-');
    });

    it('replaces an array rather than concatenating it', () => {
      // The reason `applySettingsPatch` is not a generic deep merge: a client
      // sending two type codes means "these two", not "add these two".
      const current = applySettingsPatch(DEFAULT_OFFICE_SETTINGS, {
        caseNumber: { typeCodes: [{ code: 'ب', ar: 'بداءة' }] },
      });

      const next = applySettingsPatch(current, {
        caseNumber: { typeCodes: [{ code: 'ج', ar: 'جنايات' }] },
      });

      expect(next.caseNumber.typeCodes).toEqual([{ code: 'ج', ar: 'جنايات' }]);
    });

    it('re-validates, so a patch cannot produce an invalid settings object', () => {
      expect(() =>
        applySettingsPatch(DEFAULT_OFFICE_SETTINGS, {
          general: { inactiveCaseDays: 5000 },
        }),
      ).toThrow();
    });

    it('rejects a template that drops a component', () => {
      expect(() =>
        applySettingsPatch(DEFAULT_OFFICE_SETTINGS, {
          caseNumber: { template: '{year}' },
        }),
      ).toThrow();
    });

    it('rejects an empty patch at the edge', () => {
      expect(officeSettingsPatchSchema.safeParse({}).success).toBe(false);
    });

    it('accepts a whole settings object as a patch', () => {
      // The settings screen sends its full draft; every section is optional and
      // present, which must be a no-op for anything the user did not touch.
      const parsed = officeSettingsPatchSchema.safeParse(DEFAULT_OFFICE_SETTINGS);
      expect(parsed.success).toBe(true);

      if (parsed.success) {
        expect(applySettingsPatch(DEFAULT_OFFICE_SETTINGS, parsed.data)).toEqual(
          DEFAULT_OFFICE_SETTINGS,
        );
      }
    });
  });
});
