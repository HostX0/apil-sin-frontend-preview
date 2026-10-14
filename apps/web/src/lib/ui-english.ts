import phrases from './ui-english-phrases.json';

const dictionary: Readonly<Record<string, string>> = phrases;
const arabic = /[\u0600-\u06ff]/;
const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();

/** Only known interface copy and validation messages go through this function. Never office data. */
export function uiEnglish(
  value: string,
  fallback = 'Please check the entered information.',
): string {
  if (!arabic.test(value)) return value;
  const normalized = normalize(value);
  const exact = dictionary[normalized];
  if (exact) return exact;
  const required = normalized.match(/^(.+) مطلوب\.$/);
  if (required) return `${uiEnglish(required[1]!, 'This field')} is required.`;
  const invalid = normalized.match(/^(.+) غير صالح\.$/);
  if (invalid) return `${uiEnglish(invalid[1]!, 'This field')} is invalid.`;
  const length = normalized.match(/^(.+) يتجاوز الحد المسموح \((\d+) حرفاً\)\.$/);
  if (length) return `${uiEnglish(length[1]!, 'Text')} must be ${length[2]} characters or fewer.`;
  return fallback;
}

/** Preserve validation field identifiers and missing values; translate displayed messages only. */
export function uiFieldErrors<T extends Record<string, string[] | undefined>>(errors: T): T {
  return Object.fromEntries(
    Object.entries(errors).map(([key, messages]) => [
      key,
      messages?.map((message) => uiEnglish(message, 'Please check this field.')),
    ]),
  ) as T;
}

const systemMessages: Readonly<Record<string, string>> = {
  'إضافة الموكّل': 'Client added',
  'تعديل بيانات الموكّل': 'Client details updated',
  'حذف الموكّل': 'Client deleted',
  'استرجاع الموكّل': 'Client restored',
  تعديل: 'Updated',
  'تسجيل دخول': 'Signed in',
  'تسجيل خروج': 'Signed out',
  'تغيير كلمة المرور': 'Password changed',
  'إعادة تعيين كلمة المرور': 'Password reset',
  'إنهاء جلسة جهاز': 'Device session ended',
  'إنهاء جميع الجلسات': 'All sessions ended',
  'محاولة دخول فاشلة': 'Failed sign-in attempt',
  'محاولات دخول فاشلة متكررة': 'Repeated failed sign-in attempts',
  تذكير: 'Reminder',
  'تذكير بجلسة': 'Hearing reminder',
  'وكالة تقترب من الانتهاء': 'Power of attorney expires soon',
  'اقترب الموعد النهائي المسجّل في التقويم.':
    'The deadline recorded in the calendar is approaching.',
};

/** Recognise server-authored templates; retain every inserted name, number and custom text verbatim. */
export function uiSystemText(value: string): string {
  const exact = systemMessages[value];
  if (exact) return exact;
  const patterns: Array<readonly [RegExp, (match: RegExpMatchArray) => string]> = [
    [/^تذكير بجلسة الدعوى (.+)$/, (match) => `Case hearing reminder: ${match[1]}`],
    [/^موعد نهائي:\s*(.*)$/, (match) => `Deadline: ${match[1]}`],
    [/^تذكير بموعد:\s*(.*)$/, (match) => `Appointment reminder: ${match[1]}`],
    [/^وكالة تقترب من الانتهاء — (.+)$/, (match) => `Power of attorney expires soon - ${match[1]}`],
    [/^مستند يقترب من الانتهاء:\s*(.*)$/, (match) => `Document expires soon: ${match[1]}`],
    [/^مهمة مستحقة غداً:\s*(.*)$/, (match) => `Task due tomorrow: ${match[1]}`],
    [/^إنشاء مكتب «(.*)»$/, (match) => `Office created: “${match[1]}”`],
    [
      /^الوكالة رقم (.*) تنتهي قريباً\. جدّدها قبل الجلسة القادمة\.$/,
      (match) => `Power of attorney ${match[1]} expires soon. Renew it before the next hearing.`,
    ],
    [
      /^لديك جلسة قادمة\. تاريخ التذكير: (.+)$/,
      (match) => `You have an upcoming hearing. Reminder date: ${uiGeneratedDate(match[1]!)}`,
    ],
  ];
  for (const [pattern, render] of patterns) {
    const match = value.match(pattern);
    if (match) return render(match);
  }
  // Unknown content may be an office-authored description; never substitute or hide it.
  return value;
}

function uiGeneratedDate(value: string): string {
  const tokens: Record<string, string> = {
    الأحد: 'Sunday',
    الاثنين: 'Monday',
    الثلاثاء: 'Tuesday',
    الأربعاء: 'Wednesday',
    الخميس: 'Thursday',
    الجمعة: 'Friday',
    السبت: 'Saturday',
    'كانون الثاني': 'January',
    شباط: 'February',
    آذار: 'March',
    نيسان: 'April',
    أيار: 'May',
    حزيران: 'June',
    تموز: 'July',
    آب: 'August',
    أيلول: 'September',
    'تشرين الأول': 'October',
    'تشرين الثاني': 'November',
    'كانون الأول': 'December',
  };
  let result = value;
  for (const [token, label] of Object.entries(tokens)) result = result.replace(token, label);
  return result.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
}
