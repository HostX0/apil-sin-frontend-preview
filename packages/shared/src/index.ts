// @muhami/shared — the single source of truth shared by the API and the web client.
// Anything that both sides must agree on lives here: domain enums, the case status
// state machine, the permission registry, text normalisation, money, and the API
// conventions. Nothing here may import from @muhami/api or @muhami/web.

export * from './brand';
export * from './text/arabic';
export * from './text/phone';
export * from './money/iqd';
export * from './locale/calendar';
export * from './locale/hijri';
export * from './locale/month-grid';
export * from './domain/enums';
export * from './domain/case-status-machine';
export * from './domain/case-number';
export * from './auth/permissions';
export * from './auth/roles';
export * from './api/pagination';
export * from './api/errors';
export * from './schemas/common';
export * from './schemas/auth';
export * from './schemas/client';
export * from './schemas/court';
export * from './schemas/case';
export * from './schemas/calendar';
export * from './schemas/task';
export * from './schemas/document';
export * from './schemas/finance';
export * from './schemas/finance-accounts';
export * from './schemas/dashboard';
export * from './schemas/search';
export * from './schemas/monitoring';
export * from './schemas/office';
export * from './schemas/admin';
export * from './schemas/sync';
export * from './schemas/portability';

export * from './schemas/whatsapp';

export * from './schemas/transactions';
