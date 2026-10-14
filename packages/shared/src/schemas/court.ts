import { z } from 'zod';
import { COURT_TYPES, JURISDICTIONS, type CourtType, type Jurisdiction } from '../domain/enums';
import { optionalText, requiredText, versionSchema } from './common';

/**
 * Courts — data, not an enum.
 *
 * Iraq's judicial map changes without our release cycle, and every office works
 * with a different subset of it. A court list the office can edit is the only
 * version that stays correct.
 */

export const createCourtSchema = z.object({
  name: requiredText('اسم المحكمة', 200),
  type: z.enum(COURT_TYPES),
  jurisdiction: z.enum(JURISDICTIONS).default('FEDERAL'),
  governorate: optionalText(80),
  appealRegion: optionalText(120),
  address: optionalText(300),
  // Courts frequently publish landlines rather than mobile numbers. Reusing
  // the client-mobile validator here rejected perfectly valid office numbers.
  phone: optionalText(30),
  notes: optionalText(1000),
});
export type CreateCourtInput = z.infer<typeof createCourtSchema>;

/** Full-form update with optimistic concurrency, consistent with clients/cases. */
export const updateCourtSchema = createCourtSchema.extend({ version: versionSchema });
export type UpdateCourtInput = z.infer<typeof updateCourtSchema>;

export const listCourtsQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  type: z.enum(COURT_TYPES).optional(),
  jurisdiction: z.enum(JURISDICTIONS).optional(),
  governorate: z.string().trim().max(80).optional(),
});
export type ListCourtsQuery = z.infer<typeof listCourtsQuerySchema>;

export interface CourtSummary {
  id: string;
  name: string;
  type: CourtType;
  jurisdiction: Jurisdiction;
  governorate: string | null;
  appealRegion: string | null;
  caseCount: number;
  version: number;
}

export interface CourtDetail extends CourtSummary {
  address: string | null;
  phone: string | null;
  notes: string | null;
}

/**
 * Canonical governorate labels used by filters and court administration.
 *
 * This is intentionally UI/reference data rather than validation: court records
 * remain editable because judicial naming and administrative boundaries can
 * change independently of an application release.
 */
export const IRAQ_GOVERNORATES = [
  'بغداد',
  'البصرة',
  'نينوى',
  'الأنبار',
  'بابل',
  'كربلاء',
  'النجف',
  'القادسية',
  'المثنى',
  'ذي قار',
  'ميسان',
  'واسط',
  'ديالى',
  'صلاح الدين',
  'كركوك',
  'أربيل',
  'السليمانية',
  'دهوك',
  'حلبجة',
] as const;

/**
 * Version of the bundled court starter catalog. It is a baseline, not a claim
 * that every local court/branch in Iraq is permanently represented.
 */
export const COURT_CATALOG_VERSION = '2026-09-02';

type SeedCourt = Readonly<{
  name: string;
  type: CourtType;
  governorate: string;
  jurisdiction?: Jurisdiction;
  appealRegion?: string;
}>;

/**
 * Federal appellate presidencies used as the nationwide backbone of the
 * starter catalog. The lower-court catalog is expanded independently because
 * local courts are more numerous and change more frequently.
 */
export const FEDERAL_APPEAL_COURTS: ReadonlyArray<SeedCourt> = [
  {
    name: 'رئاسة محكمة استئناف بغداد/الكرخ الاتحادية',
    type: 'APPEAL',
    governorate: 'بغداد',
    appealRegion: 'بغداد/الكرخ',
  },
  {
    name: 'رئاسة محكمة استئناف بغداد/الرصافة الاتحادية',
    type: 'APPEAL',
    governorate: 'بغداد',
    appealRegion: 'بغداد/الرصافة',
  },
  {
    name: 'رئاسة محكمة استئناف البصرة الاتحادية',
    type: 'APPEAL',
    governorate: 'البصرة',
    appealRegion: 'البصرة',
  },
  {
    name: 'رئاسة محكمة استئناف الأنبار الاتحادية',
    type: 'APPEAL',
    governorate: 'الأنبار',
    appealRegion: 'الأنبار',
  },
  {
    name: 'رئاسة محكمة استئناف المثنى الاتحادية',
    type: 'APPEAL',
    governorate: 'المثنى',
    appealRegion: 'المثنى',
  },
  {
    name: 'رئاسة محكمة استئناف النجف الاتحادية',
    type: 'APPEAL',
    governorate: 'النجف',
    appealRegion: 'النجف',
  },
  {
    name: 'رئاسة محكمة استئناف بابل الاتحادية',
    type: 'APPEAL',
    governorate: 'بابل',
    appealRegion: 'بابل',
  },
  {
    name: 'رئاسة محكمة استئناف ديالى الاتحادية',
    type: 'APPEAL',
    governorate: 'ديالى',
    appealRegion: 'ديالى',
  },
  {
    name: 'رئاسة محكمة استئناف ذي قار الاتحادية',
    type: 'APPEAL',
    governorate: 'ذي قار',
    appealRegion: 'ذي قار',
  },
  {
    name: 'رئاسة محكمة استئناف صلاح الدين الاتحادية',
    type: 'APPEAL',
    governorate: 'صلاح الدين',
    appealRegion: 'صلاح الدين',
  },
  {
    name: 'رئاسة محكمة استئناف كربلاء الاتحادية',
    type: 'APPEAL',
    governorate: 'كربلاء',
    appealRegion: 'كربلاء',
  },
  {
    name: 'رئاسة محكمة استئناف كركوك الاتحادية',
    type: 'APPEAL',
    governorate: 'كركوك',
    appealRegion: 'كركوك',
  },
  {
    name: 'رئاسة محكمة استئناف ميسان الاتحادية',
    type: 'APPEAL',
    governorate: 'ميسان',
    appealRegion: 'ميسان',
  },
  {
    name: 'رئاسة محكمة استئناف نينوى الاتحادية',
    type: 'APPEAL',
    governorate: 'نينوى',
    appealRegion: 'نينوى',
  },
  {
    name: 'رئاسة محكمة استئناف واسط الاتحادية',
    type: 'APPEAL',
    governorate: 'واسط',
    appealRegion: 'واسط',
  },
  {
    name: 'رئاسة محكمة استئناف القادسية الاتحادية',
    type: 'APPEAL',
    governorate: 'القادسية',
    appealRegion: 'القادسية',
  },
];

/**
 * Starter catalog offered to every office.
 *
 * Previous builds shipped only a small Baghdad-weighted list. This catalog now
 * provides the federal appellate backbone across Iraq while preserving useful
 * Baghdad first-instance entries. The API merges it idempotently, so an older
 * office can receive new catalog entries without deleting or duplicating its
 * own custom courts.
 */
export const SEED_COURTS: ReadonlyArray<SeedCourt> = [
  {
    name: 'المحكمة الاتحادية العليا',
    type: 'FEDERAL_SUPREME',
    governorate: 'بغداد',
    jurisdiction: 'FEDERAL',
  },
  {
    name: 'محكمة التمييز الاتحادية',
    type: 'CASSATION',
    governorate: 'بغداد',
    jurisdiction: 'FEDERAL',
  },
  {
    name: 'محكمة القضاء الإداري',
    type: 'ADMINISTRATIVE',
    governorate: 'بغداد',
    jurisdiction: 'FEDERAL',
  },
  {
    name: 'محكمة قضاء الموظفين',
    type: 'ADMINISTRATIVE',
    governorate: 'بغداد',
    jurisdiction: 'FEDERAL',
  },
  ...FEDERAL_APPEAL_COURTS,
  {
    name: 'محكمة بداءة الكرخ',
    type: 'FIRST_INSTANCE',
    governorate: 'بغداد',
    appealRegion: 'بغداد/الكرخ',
  },
  {
    name: 'محكمة بداءة الرصافة',
    type: 'FIRST_INSTANCE',
    governorate: 'بغداد',
    appealRegion: 'بغداد/الرصافة',
  },
  {
    name: 'محكمة الأحوال الشخصية في الكرخ',
    type: 'PERSONAL_STATUS',
    governorate: 'بغداد',
    appealRegion: 'بغداد/الكرخ',
  },
  {
    name: 'محكمة الأحوال الشخصية في الرصافة',
    type: 'PERSONAL_STATUS',
    governorate: 'بغداد',
    appealRegion: 'بغداد/الرصافة',
  },
  {
    name: 'محكمة جنايات بغداد/الرصافة',
    type: 'FELONY',
    governorate: 'بغداد',
    appealRegion: 'بغداد/الرصافة',
  },
  {
    name: 'محكمة تحقيق الكرادة',
    type: 'INVESTIGATION',
    governorate: 'بغداد',
    appealRegion: 'بغداد/الرصافة',
  },
  {
    name: 'محكمة جنح الكرخ',
    type: 'MISDEMEANOR',
    governorate: 'بغداد',
    appealRegion: 'بغداد/الكرخ',
  },
  {
    name: 'محكمة العمل في بغداد',
    type: 'LABOR',
    governorate: 'بغداد',
  },
  {
    name: 'مديرية تنفيذ الكرخ',
    type: 'ENFORCEMENT_DIR',
    governorate: 'بغداد',
    appealRegion: 'بغداد/الكرخ',
  },
  {
    name: 'مديرية تنفيذ الرصافة',
    type: 'ENFORCEMENT_DIR',
    governorate: 'بغداد',
    appealRegion: 'بغداد/الرصافة',
  },
];
