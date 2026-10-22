import type { HousingReportTemplate } from '@/lib/housing/types';
import {
  PROPERTY_CONDITION_OPTIONS,
  actionSummarySection,
  inspectionContextSection,
  photoEvidenceSection,
  propertyDetailsSection,
  signOffSection,
} from './shared';

export const stockConditionTemplate: HousingReportTemplate = {
  key: 'stock-condition',
  certificateType: 'HOUSING_STOCK_CONDITION',
  numberPrefix: 'HSC',
  title: 'Stock condition survey',
  reportTitle: 'STOCK CONDITION SURVEY',
  summary:
    'Track component condition, remaining life and replacement planning across your housing stock.',
  standards: [
    'Decent Homes Standard',
    'Housing Health and Safety Rating System (HHSRS)',
    'Asset management and planned maintenance policy',
  ],
  typicalUse:
    'Used for stock condition surveys on individual properties or samples of a block or estate. The component table becomes the input for planned maintenance, budget forecasting and 30-year investment modelling.',
  explanatoryNotes: [
    'Survey one property per report so the component schedule stays comparable across the stock.',
    'Use the condition grade consistently: A = good, B = satisfactory, C = poor, D = failed. Grade D items must appear as planned works.',
    'Record remaining life in whole years so the data can be aggregated without post-processing.',
  ],
  sections: [
    propertyDetailsSection({ includeTenancy: false }),
    inspectionContextSection({
      title: 'Survey context',
      description: 'What was surveyed and how the sample was chosen.',
    }),
    {
      id: 'property-profile',
      title: 'Property profile',
      description: 'Construction and energy context needed for investment planning.',
      fields: [
        { id: 'constructionYear', label: 'Year of construction', type: 'number', placeholder: 'e.g. 1968' },
        {
          id: 'constructionType',
          label: 'Construction type',
          type: 'select',
          options: ['Traditional masonry', 'Cavity wall', 'Solid wall', 'Timber frame', 'Concrete frame', 'System build', 'Other'],
        },
        { id: 'roofType', label: 'Roof type', type: 'text', placeholder: 'e.g. Pitched tile' },
        {
          id: 'heatingType',
          label: 'Heating type',
          type: 'select',
          options: ['Gas boiler', 'Communal heating', 'Heat pump', 'Electric storage', 'Solid fuel', 'Other'],
        },
        { id: 'epcRating', label: 'EPC rating', type: 'select', options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'No EPC'] },
        { id: 'epcExpiry', label: 'EPC expiry date', type: 'date' },
        { id: 'surveyType', label: 'Survey type', type: 'select', options: ['Full stock condition', 'Sample survey', 'Pre-works survey', 'Post-works verification'] },
        { id: 'totalUnitsInBlock', label: 'Total units in block / scheme', type: 'number' },
        { id: 'sampleReference', label: 'Sample reference', type: 'text' },
      ],
    },
    {
      id: 'components',
      title: 'Component condition schedule',
      description: 'One row per building component or element surveyed.',
      repeatable: {
        id: 'components',
        title: 'Components and elements',
        description: 'Add a row for each element, such as roof coverings, windows, kitchen or heating.',
        addLabel: 'Add component',
        emptyLabel: 'No components recorded yet.',
        defaultRows: 4,
        columns: [
          { id: 'component', label: 'Component / element', type: 'text', placeholder: 'e.g. Roof coverings' },
          { id: 'location', label: 'Location', type: 'text', placeholder: 'e.g. Main roof' },
          {
            id: 'conditionGrade',
            label: 'Condition',
            type: 'select',
            options: ['A - Good', 'B - Satisfactory', 'C - Poor', 'D - Failed'],
          },
          { id: 'remainingLife', label: 'Remaining life (years)', type: 'number' },
          { id: 'quantity', label: 'Quantity / measure', type: 'text' },
          { id: 'replacementYear', label: 'Planned replacement year', type: 'number' },
          {
            id: 'priority',
            label: 'Priority',
            type: 'select',
            options: ['Urgent', 'High', 'Medium', 'Low'],
          },
          { id: 'costEstimate', label: 'Estimated cost', type: 'text' },
          { id: 'notes', label: 'Notes', type: 'textarea' },
        ],
      },
    },
    {
      id: 'compliance',
      title: 'Compliance and safety',
      description: 'Statutory checks that affect the property plan.',
      fields: [
        { id: 'gasSafetyCurrent', label: 'Gas safety certificate current', type: 'yesno-na' },
        { id: 'eicrCurrent', label: 'EICR current and satisfactory', type: 'yesno-na' },
        { id: 'fireRiskAssessmentCurrent', label: 'Fire risk assessment current', type: 'yesno-na' },
        { id: 'legionellaAssessmentCurrent', label: 'Legionella assessment current', type: 'yesno-na' },
        { id: 'asbestosSurveyCurrent', label: 'Asbestos survey current', type: 'yesno-na' },
        { id: 'smokeAlarmsPresent', label: 'Working smoke alarms present', type: 'yesno' },
        { id: 'coAlarmsPresent', label: 'Working CO alarms present', type: 'yesno-na' },
        { id: 'hhsrsHazardsFound', label: 'HHSRS hazards identified', type: 'yesno' },
        { id: 'complianceNotes', label: 'Compliance notes', type: 'textarea', span: 3 },
      ],
    },
    {
      id: 'survey-summary',
      title: 'Survey summary',
      description: 'The investment and condition headline for this property.',
      fields: [
        {
          id: 'overallCondition',
          label: 'Overall property condition',
          type: 'select',
          options: [...PROPERTY_CONDITION_OPTIONS],
        },
        {
          id: 'decentHomesCompliant',
          label: 'Meets Decent Homes Standard',
          type: 'yesno-na',
        },
        { id: 'worksRequiredFiveYears', label: 'Works required within 5 years', type: 'textarea', span: 3 },
        { id: 'worksRequiredThirtyYears', label: 'Works required within 30 years', type: 'textarea', span: 3 },
        {
          id: 'budgetBand',
          label: 'Indicative budget band',
          type: 'select',
          options: ['Under £5,000', '£5,000 - £15,000', '£15,000 - £30,000', 'Over £30,000'],
        },
        { id: 'nextSurveyDate', label: 'Next survey due', type: 'date' },
      ],
    },
    photoEvidenceSection(),
    actionSummarySection(),
    signOffSection(),
  ],
};
