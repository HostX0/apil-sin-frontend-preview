import { APP_NAME_AR } from '@muhami/shared';

const EXAMPLE_VALUES: Readonly<Record<string, string>> = {
  اسم_المستلم: 'أحمد كريم',
  اسم_الشركة: APP_NAME_AR,
  رقم_الدعوى: '١٢٣ / ٢٠٢٦',
  عنوان_الدعوى: 'مطالبة مالية',
  نوع_المعاملة: 'تسجيل عقار',
  حالة_المعاملة: 'قيد الإنجاز',
  الدائرة: 'دائرة التسجيل العقاري',
  اسم_الملف: 'تبليغ المحكمة.pdf',
};

/** A local preview only. The server renders the saved template for delivery. */
export function automaticMessagePreview(
  body: string,
  values: Readonly<Record<string, string>> = {},
) {
  return body.replace(/\{([^{}]+)\}/g, (token, key: string) => {
    if (Object.hasOwn(values, key)) return values[key]!;
    return Object.hasOwn(EXAMPLE_VALUES, key) ? EXAMPLE_VALUES[key]! : token;
  });
}
