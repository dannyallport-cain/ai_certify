import type { HousingReportTemplate } from '@/lib/housing/types';
import { communalAreaTemplate } from './templates/communal-area';
import { contractorAccessTemplate } from './templates/contractor-access';
import { dampMouldTemplate } from './templates/damp-mould';
import { legionellaTemplate } from './templates/legionella';
import { plantRoomTemplate } from './templates/plant-room';
import { preTerminationTemplate } from './templates/pre-termination';
import { stockConditionTemplate } from './templates/stock-condition';
import { voidInspectionTemplate } from './templates/void-inspection';

/**
 * The housing template pack, in the order it is presented on the marketing
 * page and in the certificate hub.
 */
export const HOUSING_REPORT_TEMPLATES: HousingReportTemplate[] = [
  voidInspectionTemplate,
  preTerminationTemplate,
  stockConditionTemplate,
  dampMouldTemplate,
  communalAreaTemplate,
  plantRoomTemplate,
  legionellaTemplate,
  contractorAccessTemplate,
];

export const HOUSING_REPORT_BASE_ROUTE = '/certificates/new/housing';

const HOUSING_TEMPLATES_BY_KEY = new Map(
  HOUSING_REPORT_TEMPLATES.map((template) => [template.key, template]),
);

const HOUSING_TEMPLATES_BY_TYPE = new Map(
  HOUSING_REPORT_TEMPLATES.map((template) => [template.certificateType, template]),
);

export function getHousingReportTemplateByKey(key: string): HousingReportTemplate | null {
  return HOUSING_TEMPLATES_BY_KEY.get(key) ?? null;
}

export function getHousingReportTemplateByType(certificateType: string): HousingReportTemplate | null {
  return HOUSING_TEMPLATES_BY_TYPE.get(certificateType) ?? null;
}

export function getHousingReportRoute(key: string): string {
  return `${HOUSING_REPORT_BASE_ROUTE}/${key}`;
}

export function isHousingReportType(certificateType: string | null | undefined): boolean {
  if (!certificateType) {
    return false;
  }

  return HOUSING_TEMPLATES_BY_TYPE.has(certificateType);
}

export type { HousingReportTemplate } from '@/lib/housing/types';
