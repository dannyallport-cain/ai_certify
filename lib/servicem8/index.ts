/**
 * Public surface of the ServiceM8 integration.
 *
 * Import from here rather than reaching into individual modules.
 */

export {
  SERVICEM8_CONFIG,
  SERVICEM8_READ_SCOPES,
  SERVICEM8_WRITE_SCOPES,
} from './config';

export {
  ServiceM8Client_API,
  ServiceM8ApiError,
  SERVICEM8_PAGE_SIZE,
} from './client';
export type {
  ServiceM8AttachmentDownloadInfo,
  ServiceM8JobPageOptions,
  ServiceM8TokenResponse,
} from './client';

export type {
  ServiceM8Address,
  ServiceM8Attachment,
  ServiceM8AttachmentRecord,
  ServiceM8ClientRecord,
  ServiceM8Company,
  ServiceM8CompanyContact,
  ServiceM8CompanyInfo,
  ServiceM8ContactRecord,
  ServiceM8Job,
  ServiceM8JobCategory,
  ServiceM8JobMaterial,
  ServiceM8JobRecord,
  ServiceM8Page,
  ServiceM8Staff,
} from './types';

export {
  EMPTY_SERVICEM8_ADDRESS,
  buildServiceM8Address,
  buildServiceM8ContactName,
  flattenAddressText,
  formatByteSize,
  getServiceM8FileExtension,
  groupAttachmentsByObject,
  groupContactsByCompany,
  normalizeServiceM8Attachment,
  normalizeServiceM8Client,
  normalizeServiceM8Contact,
  normalizeServiceM8Job,
  parseServiceM8Badges,
  parseServiceM8Flag,
  parseServiceM8Number,
  selectPrimaryServiceM8Contact,
  trimmedOrNull,
} from './normalize';

export {
  findServiceM8Client,
  getServiceM8ClientDirectory,
  invalidateServiceM8DirectoryCache,
  loadServiceM8ClientDirectory,
  loadServiceM8Jobs,
} from './directory';
export type {
  LoadDirectoryOptions,
  LoadJobsOptions,
  ServiceM8ClientDirectory,
} from './directory';

export {
  getMissingServiceM8ClientFields,
  mapServiceM8ClientToCustomer,
} from './client-mapping';
export type { ServiceM8CustomerMapping } from './client-mapping';

export {
  describeServiceM8ScopeGap,
  getMissingServiceM8Scopes,
  parseGrantedScopes,
} from './scopes';

export type { ServiceM8JobPickerRecord } from './picker';
