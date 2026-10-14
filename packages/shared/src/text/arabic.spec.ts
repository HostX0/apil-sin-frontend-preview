import { describe, expect, it } from 'vitest';
import { containsArabic, foldArabicDigits, normalizeArabic, toArabicDigits } from './arabic';

describe('normalizeArabic', () => {
  it('folds every hamza form of alef to bare alef', () => {
    const variants = ['أحمد', 'احمد', 'إحمد', 'آحمد', 'ٱحمد'];
    const normalized = variants.map(normalizeArabic);
    expect(new Set(normalized).size).toBe(1);
    expect(normalized[0]).toBe('احمد');
  });

  it('folds taa marbuta and alef maksura', () => {
    expect(normalizeArabic('فاطمة')).toBe(normalizeArabic('فاطمه'));
    expect(normalizeArabic('مصطفى')).toBe(normalizeArabic('مصطفي'));
  });

  it('folds waw and yaa hamza carriers', () => {
    expect(normalizeArabic('مؤمن')).toBe(normalizeArabic('مومن'));
    expect(normalizeArabic('قائم')).toBe(normalizeArabic('قايم'));
  });

  it('strips tashkeel', () => {
    expect(normalizeArabic('مُحَمَّد')).toBe(normalizeArabic('محمد'));
  });

  it('strips tatweel', () => {
    expect(normalizeArabic('محـــمد')).toBe('محمد');
  });

  it('strips zero-width and bidi control characters pasted from documents', () => {
    expect(normalizeArabic('‏محمد‎')).toBe('محمد');
    expect(normalizeArabic('عبد‌الله')).toBe('عبدالله');
  });

  it('folds Persian/Urdu look-alike letters', () => {
    expect(normalizeArabic('کریم')).toBe(normalizeArabic('كريم'));
  });

  it('folds Arabic-Indic digits inside mixed text', () => {
    expect(normalizeArabic('دعوى ١٢٣٤')).toBe('دعوى 1234'.normalize('NFKD').replace(/ى/g, 'ي'));
  });

  it('collapses whitespace and lowercases Latin', () => {
    expect(normalizeArabic('  Ahmed   KAREEM ')).toBe('ahmed kareem');
  });

  it('is idempotent', () => {
    const input = 'أحمد كَريم ١٢٣';
    expect(normalizeArabic(normalizeArabic(input))).toBe(normalizeArabic(input));
  });

  it('handles null and empty input', () => {
    expect(normalizeArabic(null)).toBe('');
    expect(normalizeArabic(undefined)).toBe('');
    expect(normalizeArabic('')).toBe('');
  });

  it('regression corpus: real spelling variants must collide', () => {
    const corpus: ReadonlyArray<readonly [string, string]> = [
      ['علي حسين الجبوري', 'علي حسين الجبورى'],
      ['عبد الرحمن', 'عبدالرحمن '],
      ['زينب عبّاس', 'زينب عباس'],
      ['حيدر الأعرجي', 'حيدر الاعرجي'],
      ['شركة النور للتجارة', 'شركه النور للتجاره'],
    ];
    for (const [a, b] of corpus) {
      expect(normalizeArabic(a).replace(/\s/g, '')).toBe(normalizeArabic(b).replace(/\s/g, ''));
    }
  });
});

describe('digit folding', () => {
  it('folds Arabic-Indic and Eastern Arabic-Indic digits', () => {
    expect(foldArabicDigits('١٢٣٤٥٦٧٨٩٠')).toBe('1234567890');
    expect(foldArabicDigits('۱۲۳')).toBe('123');
  });

  it('round-trips through the display formatter', () => {
    expect(foldArabicDigits(toArabicDigits('2025'))).toBe('2025');
  });
});

describe('containsArabic', () => {
  it('detects Arabic script', () => {
    expect(containsArabic('دعوى')).toBe(true);
    expect(containsArabic('case 123')).toBe(false);
  });
});
