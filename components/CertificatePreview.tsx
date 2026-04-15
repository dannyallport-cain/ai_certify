'use client';

import React, { useMemo } from 'react';
import './certificate-preview.css';

import {
  createCertificatePreviewLayoutEditController,
  type CertificatePreviewBlockPositions,
} from './preview/layout-editing';

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Not specified';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  } catch {
    return String(dateString);
  }
};

export interface CertificatePreviewData {
  certificateNumber: string;
  certificateType: string;
  siteName?: string | null;
  siteAddress?: string | null;
  inspectionDate?: string | null;
  nextInspectionDate?: string | null;
  inspectorName?: string | null;
  inspectorQualification?: string | null;
  inspectionType?: string | null;
  status?: string;
  formData?: Record<string, any>;
  customer: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    postcode?: string | null;
    contactPerson?: string | null;
  };
  items?: Array<{
    id?: number;
    itemType?: string;
    location?: string | null;
    description?: string | null;
    status?: string;
    defects?: string | null;
    recommendations?: string | null;
  }>;
}

interface CertificatePreviewProps {
  data: CertificatePreviewData;
  className?: string;
  layoutEditMode?: boolean;
  selectedBlockId?: string | null;
  blockPositions?: CertificatePreviewBlockPositions;
  onSelectBlock?: (blockId: string | null) => void;
  onMoveBlock?: (blockId: string, position: { x: number; y: number }) => void;
}

const getCertificateTypeDisplayName = (type: string): string => {
  const names: Record<string, string> = {
    BS5839_1: 'BS 5839-1: Fire Detection & Alarm System (Non-Domestic)',
    BS5839_6: 'BS 5839-6: Fire Detection & Alarm System (Domestic)',
    BS5266: 'BS 5266: Emergency Lighting System',
    FIRE_EXTINGUISHER: 'Portable Fire Extinguisher Certificate',
    DRY_RISER: 'Dry Riser Certificate',
    CP12: 'Landlord / Homeowner Gas Safety Record (CP12)',
    EICR: 'Electrical Installation Condition Report',
  };
  return names[type] || type;
};

const getStandardsText = (type: string): string => {
  const standards: Record<string, string> = {
    BS5839_1: 'Compliant with BS 5839-1:2017 & British Standards Institution',
    BS5839_6: 'Compliant with BS 5839-6:2019 & British Standards Institution',
    BS5266: 'Compliant with BS 5266-1:2016 & British Standards Institution',
    FIRE_EXTINGUISHER: 'Compliant with BS 5306-3:2017 & British Standards Institution',
    DRY_RISER: 'Compliant with BS 5306:2012 & British Standards Institution',
    CP12: 'Gas Safety (Installation and Use) Regulations 1998 landlord gas safety record',
    EICR: 'Compliant with BS 7671:2018 & IET Wiring Regulations',
  };
  return standards[type] || 'Professional Safety Certification Service';
};

const getSystemDetails = (data: CertificatePreviewData): Array<[string, string]> => {
  const details: Record<string, string> = data.formData || {};

  switch (data.certificateType) {
    case 'BS5839_1':
      return [
        ['System Type (Category):', details.systemType || 'Not specified'],
        ['Number of Zones:', details.numberOfZones || 'Not specified'],
        ['Number of Devices:', details.numberOfDevices || 'Not specified'],
        ['Control Panel Make:', details.controlPanelMake || 'Not specified'],
        ['Control Panel Model:', details.controlPanelModel || 'Not specified'],
        ['Total Detectors:', details.totalDetectors || 'Not specified'],
        ['Total Call Points:', details.totalCallPoints || 'Not specified'],
        ['Total Sounders:', details.totalSounders || 'Not specified'],
      ];
    case 'BS5839_6':
      return [
        ['Property Type:', details.propertyType || 'Not specified'],
        ['Grade of System:', details.gradeOfSystem || 'Not specified'],
        ['Smoke Detectors:', details.numberOfSmokeSensors || 'Not specified'],
        ['Heat Detectors:', details.numberOfHeatSensors || 'Not specified'],
        ['CO Detectors:', details.numberOfCOSensors || 'Not specified'],
        ['Bedrooms:', details.bedrooms || 'Not specified'],
      ];
    case 'BS5266':
      return [
        ['System Type:', details.systemType || 'Not specified'],
        ['Number of Luminaires:', details.numberOfLuminaires || 'Not specified'],
        ['Battery Blocks:', details.batteryBlocks || 'Not specified'],
        ['Emergency Duration:', details.emergencyDuration || 'Not specified hours'],
      ];
    case 'FIRE_EXTINGUISHER':
      return [
        ['Risk Category:', details.riskCategory || 'Not specified'],
        ['Service Interval:', details.serviceInterval || 'Annual'],
      ];
    case 'DRY_RISER':
      return [
        ['Building Height:', details.buildingHeight || 'Not specified'],
        ['Number of Inlets:', details.numberOfInlets || 'Not specified'],
        ['Test Pressure:', details.testPressure || 'Not specified'],
        ['Test Flow:', details.testFlow || 'Not specified'],
      ];
    case 'CP12':
      return [
        ['Appliance Type:', details.applianceType || 'Not specified'],
        ['Appliance Location:', details.applianceLocation || 'Not specified'],
        ['Appliance Make/Model:', details.applianceMakeModel || 'Not specified'],
        ['Flue Type:', details.flueType || 'Not specified'],
        ['Operating Pressure:', details.operatingPressure || 'Not specified'],
        ['Safety Devices:', details.safetyDevicesCorrect || 'Not specified'],
        ['Flue Performance:', details.fluePerformanceSatisfactory || 'Not specified'],
        ['Appliance Safe To Use:', details.applianceSafeToUse || 'Not specified'],
      ];
    default:
      return [['System Type:', details.systemType || 'Not specified']];
  }
};

export const CertificatePreview = React.memo(function CertificatePreview({
  data,
  className = '',
  layoutEditMode = false,
  selectedBlockId = null,
  blockPositions = {},
  onSelectBlock,
  onMoveBlock,
}: CertificatePreviewProps) {
  const systemDetails = useMemo(() => getSystemDetails(data), [data]);

  const layoutEditController = useMemo(
    () =>
      createCertificatePreviewLayoutEditController({
        enabled: layoutEditMode,
        selection: {
          selectedBlockId,
          onSelectBlock,
        },
        movement: {
          blockPositions,
          onMoveBlock,
        },
      }),
    [blockPositions, layoutEditMode, onMoveBlock, onSelectBlock, selectedBlockId]
  );

  const getEditableBlockProps = (blockId: string, baseClassName = '') =>
    layoutEditController.getBlockBindings(blockId, baseClassName);

  return (
    <div
      className={`bg-white text-gray-900 print:bg-white ${className}`}
      onClick={() => {
        layoutEditController.clearSelection();
      }}
    >
      <div className="mx-auto m-0 border border-gray-300 bg-white shadow-sm print:shadow-none certificate-preview-page">
        <div {...getEditableBlockProps('header', 'mb-6 border-b-2 border-blue-900 pb-4')}>
          <div className="bg-blue-900 text-white p-3 mb-3 rounded-sm">
            <h1 className="text-xl font-bold">AI-CERTIFICATES</h1>
          </div>
          <p className="text-xs text-gray-600">Professional certification management services</p>
          <p className="text-xs text-gray-600">Operated by Cain Enabled Engineering Ltd</p>
        </div>

        <div {...getEditableBlockProps('title', 'mb-6 text-center')}>
          <h2 className="text-2xl font-bold mb-2">{getCertificateTypeDisplayName(data.certificateType)}</h2>
          <p className="text-lg font-semibold mb-2">INSPECTION AND SERVICING REPORT</p>
          <p className="text-xs italic text-gray-600">{getStandardsText(data.certificateType)}</p>
        </div>

        <div {...getEditableBlockProps('certificate-number', 'mb-6 rounded-sm border-2 border-yellow-400 bg-yellow-100 p-3')}>
          <p className="font-bold text-sm">
            CERTIFICATE NUMBER: <span className="text-lg">{data.certificateNumber || '[Certificate Number]'}</span>
          </p>
        </div>

        <div {...getEditableBlockProps('site-details', 'mb-6')}>
          <h3 className="text-lg font-bold bg-blue-900 text-white p-2 mb-3">1. SITE DETAILS</h3>
          <div className="grid gap-2 text-sm">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="font-semibold">Site Name:</span>
                <p className="text-gray-700">{data.siteName || 'Not specified'}</p>
              </div>
              <div className="col-span-2">
                <span className="font-semibold">Site Address:</span>
                <p className="text-gray-700">{data.siteAddress || 'Not specified'}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="font-semibold">Client/Customer:</span>
                <p className="text-gray-700">{data.customer.name}</p>
              </div>
              <div>
                <span className="font-semibold">Contact Person:</span>
                <p className="text-gray-700">{data.customer.contactPerson || 'Not specified'}</p>
              </div>
              <div>
                <span className="font-semibold">Contact Telephone:</span>
                <p className="text-gray-700">{data.customer.phone || 'Not specified'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-semibold">Contact Email:</span>
                <p className="text-gray-700">{data.customer.email || 'Not specified'}</p>
              </div>
              <div>
                <span className="font-semibold">Address/Postcode:</span>
                <p className="text-gray-700">
                  {data.customer.address ? `${data.customer.address}, ${data.customer.postcode}` : 'Not specified'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div {...getEditableBlockProps('system-details', 'mb-6')}>
          <h3 className="text-lg font-bold bg-blue-900 text-white p-2 mb-3">2. SYSTEM/EQUIPMENT DETAILS</h3>
          <div className="grid gap-2 text-sm">
            {systemDetails.map((detail, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-4">
                <span className="font-semibold">{detail[0]}</span>
                <span className="text-gray-700">{detail[1]}</span>
              </div>
            ))}
          </div>
        </div>

        <div {...getEditableBlockProps('inspection-details', 'mb-6')}>
          <h3 className="text-lg font-bold bg-blue-900 text-white p-2 mb-3">3. INSPECTION DETAILS</h3>
          <div className="grid gap-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-semibold">Inspection Date:</span>
                <p className="text-gray-700">{formatDate(data.inspectionDate) || 'Not specified'}</p>
              </div>
              <div>
                <span className="font-semibold">Next Inspection Due:</span>
                <p className="text-gray-700">{formatDate(data.nextInspectionDate) || 'Not specified'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-semibold">Inspector Name:</span>
                <p className="text-gray-700">{data.inspectorName || 'Not specified'}</p>
              </div>
              <div>
                <span className="font-semibold">Inspector Qualification:</span>
                <p className="text-gray-700">{data.inspectorQualification || 'Certified Fire Safety Engineer'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-semibold">Inspection Type:</span>
                <p className="text-gray-700">{data.inspectionType || 'Initial Assessment'}</p>
              </div>
              <div>
                <span className="font-semibold">Certificate Status:</span>
                <p className="text-gray-700 font-bold">{(data.status || 'DRAFT').toUpperCase()}</p>
              </div>
            </div>
          </div>
        </div>

        {data.items && data.items.length > 0 && (
          <div {...getEditableBlockProps('items-tested', 'mb-6')}>
            <h3 className="text-lg font-bold bg-blue-900 text-white p-2 mb-3">4. EQUIPMENT/ITEMS TESTED</h3>
            <div className="border border-gray-300 rounded-sm overflow-hidden text-sm">
              <table className="w-full border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Item Type</th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Location</th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Description</th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, idx) => (
                    <tr key={idx} {...getEditableBlockProps(`items-tested-row-${idx}`, `${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`)}>
                      <td className="border border-gray-300 px-2 py-2">{item.itemType || '-'}</td>
                      <td className="border border-gray-300 px-2 py-2">{item.location || '-'}</td>
                      <td className="border border-gray-300 px-2 py-2">{item.description || '-'}</td>
                      <td className="border border-gray-300 px-2 py-2">
                        <span
                          className={`px-2 py-1 rounded-sm text-xs font-semibold ${
                            item.status === 'PASS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.status || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.items && data.items.some((item) => item.defects || item.recommendations) && (
          <div {...getEditableBlockProps('defects', 'mb-6')}>
            <h3 className="text-lg font-bold bg-blue-900 text-white p-2 mb-3">5. DEFECTS AND RECOMMENDATIONS</h3>
            <div className="space-y-3">
              {data.items.map((item, idx) =>
                item.defects || item.recommendations ? (
                  <div key={idx} {...getEditableBlockProps(`defect-item-${idx}`, 'border-l-4 border-yellow-400 bg-yellow-50 p-3 rounded-sm')}>
                    {item.defects && (
                      <div>
                        <p className="font-semibold text-sm mb-1">Defects: {item.location}</p>
                        <p className="text-sm text-gray-700">{item.defects}</p>
                      </div>
                    )}
                    {item.recommendations && (
                      <div className="mt-2">
                        <p className="font-semibold text-sm mb-1">Recommendations:</p>
                        <p className="text-sm text-gray-700">{item.recommendations}</p>
                      </div>
                    )}
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}

        <div {...getEditableBlockProps('certification-statement', 'my-6 rounded-sm border-2 border-blue-900 bg-blue-50 p-4 text-xs')}>
          <p className="font-bold mb-2">CERTIFICATION STATEMENT</p>
          <p className="text-justify leading-relaxed">
            I hereby certify that the inspection and testing of the above fire safety system has been carried out in
            accordance with the applicable British Standards and current regulations. All equipment has been found to be
            in a safe and satisfactory condition unless otherwise stated in this report.
          </p>
        </div>

        <div {...getEditableBlockProps('signatures', 'mt-12 grid grid-cols-2 gap-8 text-sm')}>
          <div>
            <p className="text-center mb-8 pb-2 border-b border-gray-400 min-h-10">
              &nbsp;
            </p>
            <p className="font-semibold text-center">Inspector Signature and Date</p>
          </div>
          <div>
            <p className="text-center mb-8 pb-2 border-b border-gray-400 min-h-10">
              &nbsp;
            </p>
            <p className="font-semibold text-center">Client Representative</p>
          </div>
        </div>

        <div {...getEditableBlockProps('footer', 'mt-12 border-t border-gray-300 pt-4 text-center text-xs text-gray-500')}>
          <p>This certificate is only valid when accompanied by the detailed technical report.</p>
          <p>Page 1 of Certificate {data.certificateNumber}</p>
        </div>
      </div>
    </div>
  );
});

CertificatePreview.displayName = 'CertificatePreview';
