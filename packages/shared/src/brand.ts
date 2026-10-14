/**
 * Apil Sin identity shared by the interface, notifications, mail and exports.
 * Static PWA files carry matching literals, checked by the web brand suite.
 * The office profile supplies the editable name and contact details on documents.
 */

/** Company display name stays English on every interface locale. Legacy suffix kept for callers. */
export const APP_NAME_AR = 'Apil Sin';

/** For a home-screen icon and any surface under ~14 characters. */
export const APP_SHORT_NAME_AR = 'Apil Sin';

/**
 * Latin form, for contexts that cannot render Arabic reliably: the Swagger
 * header, container image labels, and download file names, where an RFC 5987
 * round trip through a proxy is one misconfiguration away from mojibake.
 */
export const APP_NAME_EN = 'Apil Sin';

/** ASCII slug for file names and identifiers. */
export const APP_SLUG = 'apilsin';

export const APP_TAGLINE_AR = 'نظام إدارة مكتب المحاماة';

/** Company name and product description for page titles. */
export const APP_TITLE_AR = `${APP_NAME_AR} — ${APP_TAGLINE_AR}`;

export const APP_DESCRIPTION_AR =
  'نظام إدارة مكتب المحاماة الخاص بشركة Apil Sin — الدعاوى والمحامون والموكّلون والجلسات والمستندات والتواصل.';

/** Shown in the footer of the More screen. */
export const APP_VERSION = '0.1.0';
