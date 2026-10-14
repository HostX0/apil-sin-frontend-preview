import { describe, expect, it } from 'vitest';
import { uiFieldErrors, uiSystemText } from './ui-english';

describe('English interface messages', () => {
  it('keeps validation keys and missing values without mutating the original errors', () => {
    const errors = { title: ['اسم مطلوب.'], totalAmount: undefined };
    const translated = uiFieldErrors(errors);
    expect(Object.keys(translated)).toEqual(Object.keys(errors));
    expect(translated.totalAmount).toBeUndefined();
    expect(translated.title[0]).toMatch(/is required\.$/);
    expect(errors.title).toEqual(['اسم مطلوب.']);
  });

  it('localizes generated notification prefixes while preserving Arabic office data', () => {
    expect(uiSystemText('مهمة مستحقة غداً: مراجعة ملف أحمد علي')).toBe(
      'Task due tomorrow: مراجعة ملف أحمد علي',
    );
    expect(uiSystemText('إنشاء مكتب «المكتب القانوني»')).toBe('Office created: “المكتب القانوني”');
    expect(uiSystemText('الوكالة رقم ١٢٣/٢٠٢٦ تنتهي قريباً. جدّدها قبل الجلسة القادمة.')).toBe(
      'Power of attorney ١٢٣/٢٠٢٦ expires soon. Renew it before the next hearing.',
    );
  });

  it('retains unrecognised office text and translates only the generated reminder date', () => {
    const custom = 'متابعة أحمد في المحكمة يوم الأحد';
    expect(uiSystemText(custom)).toBe(custom);
    expect(uiSystemText('لديك جلسة قادمة. تاريخ التذكير: الأربعاء ١٤ تشرين الأول ٢٠٢٦')).toBe(
      'You have an upcoming hearing. Reminder date: Wednesday 14 October 2026',
    );
  });
});
