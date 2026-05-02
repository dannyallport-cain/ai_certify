export type CertificateDiscipline =
  | 'gas'
  | 'electrical'
  | 'fire-alarm'
  | 'emergency-lighting'
  | 'fire-extinguisher'
  | 'dry-riser';

export type CertificateImplementationStatus = 'implemented' | 'planned';

export interface CertificateTypeCatalogEntry {
  key: string;
  certificateType: string;
  discipline: CertificateDiscipline;
  label: string;
  route: string;
  description: string;
  standards: string[];
  typicalUse: string;
  explanatoryNotes: string[];
  designNotes: string[];
  implementationStatus: CertificateImplementationStatus;
}

export interface CertificateDisciplineGroup {
  title: string;
  description: string;
  discipline: CertificateDiscipline;
  entries: CertificateTypeCatalogEntry[];
}

export const CERTIFICATE_TYPE_CATALOG: CertificateTypeCatalogEntry[] = [
  {
    key: 'bs5839-1-periodic',
    certificateType: 'BS5839-1',
    discipline: 'fire-alarm',
    label: 'BS 5839-1 periodic inspection and servicing',
    route: '/certificates/new/bs5839-1',
    description:
      'Non-domestic fire alarm inspection, test, and maintenance certificate aligned to BS 5839-1.',
    standards: ['BS 5839-1', 'BS 5839-6 (where domestic logic is used for comparison only)'],
    typicalUse:
      'Routine service, periodic inspection, commissioning follow-up, and maintenance record for commercial fire alarm systems.',
    explanatoryNotes: [
      'Use for non-domestic premises where the fire detection and alarm system is being inspected, tested, and serviced.',
      'Common sections: site details, system overview, inspection date, next visit due, control panel details, test results, defects, recommendations, and certifier sign-off.',
      'Typical outputs should note the system category, device counts, panel make/model, and any zones or devices with faults.',
    ],
    designNotes: [
      'Match the app’s existing fire-alarm styling and keep the report language professional and standard-focused.',
      'Add an explanatory note block clarifying that C1/C2 outcomes need prompt action and can affect the final assessment.',
      'Keep the visual hierarchy consistent with the EICR/CP12 workflows so the user recognises the same certificate pattern.',
    ],
    implementationStatus: 'implemented',
  },
  {
    key: 'bs5839-1-commissioning',
    certificateType: 'BS5839-1',
    discipline: 'fire-alarm',
    label: 'BS 5839-1 commissioning / handover',
    route: '/certificates/new/bs5839-1?mode=commissioning',
    description:
      'Commissioning and handover version of the BS 5839-1 certificate for newly installed non-domestic fire alarm systems.',
    standards: ['BS 5839-1', 'BS 7671 where relevant to the associated electrical supplies'],
    typicalUse:
      'New system commissioning, handover, and initial verification following installation or major alteration.',
    explanatoryNotes: [
      'Best used after installation work, major alteration, or replacement of a panel or device group.',
      'Should capture cause-and-effect testing, audibility, device addressing, battery backup, and any outstanding snagging items.',
      'The explanatory note should remind users that commissioning is not the same as a periodic service visit.',
    ],
    designNotes: [
      'Use clearer commissioning language: cause-and-effect, handover, acceptance, and snagging.',
      'Add explanatory notes for commissioning reports so they feel distinct from maintenance reports.',
      'Consider a commissioning-specific summary block or banner to reduce user confusion.',
    ],
    implementationStatus: 'planned',
  },
  {
    key: 'bs5839-6-periodic',
    certificateType: 'BS5839-6',
    discipline: 'fire-alarm',
    label: 'BS 5839-6 domestic alarm service',
    route: '/certificates/new/bs5839-6',
    description:
      'Domestic fire alarm inspection, testing, and maintenance certificate for flats, HMOs, and dwellings.',
    standards: ['BS 5839-6'],
    typicalUse:
      'Routine domestic alarm service, landlord visit, and maintenance record for residential detection systems.',
    explanatoryNotes: [
      'Use for domestic premises and similar occupancies where a BS 5839-6 domestic alarm system is installed.',
      'Should include grade, category, device counts, interconnection type, test outcomes, and any deficiencies affecting coverage.',
      'Explain whether the system remains appropriate for the dwelling layout and current occupancy risk profile.',
    ],
    designNotes: [
      'Keep the existing domestic fire-alarm styling, but add note text that explains grade/category terminology to users.',
      'Where helpful, include short guidance beside the system grade and category fields.',
      'Use wording that will make sense to landlords and property managers as well as engineers.',
    ],
    implementationStatus: 'implemented',
  },
  {
    key: 'bs5839-6-commissioning',
    certificateType: 'BS5839-6',
    discipline: 'fire-alarm',
    label: 'BS 5839-6 commissioning / initial verification',
    route: '/certificates/new/bs5839-6?mode=commissioning',
    description:
      'Commissioning and initial verification certificate for domestic fire alarm systems.',
    standards: ['BS 5839-6'],
    typicalUse:
      'New dwellings, upgraded systems, or post-installation verification in domestic premises.',
    explanatoryNotes: [
      'Should capture the initial installation result, device coverage, interconnection checks, and any commissioning defects.',
      'A commissioning report should clearly distinguish new-installation work from routine servicing.',
      'Include explanatory notes for any non-standard device placement or limitations in domestic layouts.',
    ],
    designNotes: [
      'Differentiate the commissioning title from the routine service title in the preview and hub.',
      'Provide more guidance around grade/category selection and common domestic scenarios.',
      'Keep the report concise but still mirror the EICR/CP12 level of detail.',
    ],
    implementationStatus: 'planned',
  },
  {
    key: 'bs5266-periodic',
    certificateType: 'BS5266',
    discipline: 'emergency-lighting',
    label: 'BS 5266 emergency lighting service',
    route: '/certificates/new/bs5266',
    description:
      'Emergency lighting inspection, test, and maintenance certificate for non-domestic premises.',
    standards: ['BS 5266-1', 'BS 5266-8', 'BS EN 62034 where automatic test systems are used'],
    typicalUse:
      'Daily/weekly visual checks, monthly function tests, annual duration tests, and maintenance records.',
    explanatoryNotes: [
      'Use for periodic emergency lighting service visits, annual duration tests, and maintenance records.',
      'Should record system type, rated duration, total luminaires, battery blocks, failed units, and the overall outcome.',
      'Explain any shortcomings in coverage, signage, battery condition, or record keeping.',
    ],
    designNotes: [
      'Keep the current emergency-lighting style, but add explicit notes explaining daily, monthly, and annual testing distinctions.',
      'Include explanatory text around system type and duration so users know how to complete it correctly.',
      'Retain the same preview/parity behaviour as EICR and CP12 where possible.',
    ],
    implementationStatus: 'implemented',
  },
  {
    key: 'bs5266-commissioning',
    certificateType: 'BS5266',
    discipline: 'emergency-lighting',
    label: 'BS 5266 commissioning / initial test',
    route: '/certificates/new/bs5266?mode=commissioning',
    description:
      'Commissioning and initial verification certificate for emergency lighting systems.',
    standards: ['BS 5266-1', 'BS EN 62034 where applicable'],
    typicalUse:
      'New install or major alteration, where the emergency lighting system needs commissioning and handover.',
    explanatoryNotes: [
      'Should capture initial duration testing, charging status, coverage, logbook details, and any snagging items.',
      'Differentiate from periodic service so the user understands it is a handover/commissioning document.',
      'Add notes for standard and non-standard luminaires, central battery systems, and automatic test systems.',
    ],
    designNotes: [
      'Use commissioning language in the title and note text.',
      'The explanatory notes should make clear that this is not the same as a routine annual service visit.',
      'Keep the same section order as the periodic report for consistency.',
    ],
    implementationStatus: 'planned',
  },
  {
    key: 'cp12-landlord-gas-safety-record',
    certificateType: 'CP12',
    discipline: 'gas',
    label: 'CP12 landlord gas safety record',
    route: '/certificates/new/cp12',
    description:
      'Landlord gas safety record covering appliance checks, flues, ventilation, and safety findings.',
    standards: ['Gas Safety (Installation and Use) Regulations 1998', 'BS 7967 (where CO data is relevant)'],
    typicalUse:
      'Annual landlord gas safety inspection, appliance record, and warning notice workflow.',
    explanatoryNotes: [
      'Use for annual gas safety compliance checks in rented property and similar landlord-managed premises.',
      'Typical fields: appliance type, flue type, operating pressure, combustion/safety devices, CO alarm checks, and remedial actions.',
      'Explain if the appliance is safe to use, at risk, or immediately dangerous.',
    ],
    designNotes: [
      'Keep the Gas Safe styling and make the gas-safe branding prominent in the form and preview.',
      'The explanatory notes should explain what CP12 means in plain language for landlords and agents.',
      'Preserve the same workflow pattern as the EICR page, including sample fill and guided mode.',
    ],
    implementationStatus: 'implemented',
  },
  {
    key: 'gas-boiler-service',
    certificateType: 'CP12',
    discipline: 'gas',
    label: 'Boiler service / appliance service record',
    route: '/certificates/new/cp12?mode=boiler-service',
    description:
      'Service-focused gas certificate for boiler servicing and appliance maintenance records.',
    standards: ['Gas Safety (Installation and Use) Regulations 1998', 'Manufacturer service requirements'],
    typicalUse:
      'Annual boiler service or appliance service visit where the primary output is a service record rather than a landlord check.',
    explanatoryNotes: [
      'Use when the visit is primarily a boiler service, with gas safety checks recorded alongside the service actions.',
      'Should include appliance make/model, service notes, combustion observations, and CO alarm checks where applicable.',
      'Explain that the boiler service record can coexist with, but is not identical to, a landlord gas safety record.',
    ],
    designNotes: [
      'Use service-focused labels in any mode switch or title block.',
      'If supported, expose a service-specific note area to capture maintenance actions separately from compliance findings.',
      'Keep the same customer/site prefill experience as the CP12 workflow.',
    ],
    implementationStatus: 'planned',
  },
  {
    key: 'gas-installation',
    certificateType: 'CP12',
    discipline: 'gas',
    label: 'Gas installation / commissioning record',
    route: '/certificates/new/cp12?mode=commissioning',
    description:
      'Commissioning, purging, and completion record for gas installation work.',
    standards: ['Gas Safety (Installation and Use) Regulations 1998', 'IGEM / manufacturer commissioning guidance'],
    typicalUse:
      'New gas installation, appliance replacement, commissioning, and handover.',
    explanatoryNotes: [
      'Use for newly installed appliances or pipework where commissioning and gas tightness evidence are required.',
      'The report should note purging, soundness, operating pressure, burner performance, and any residual defects.',
      'Explain whether the appliance was left safe to use or requires follow-up action.',
    ],
    designNotes: [
      'Use commissioning language instead of landlord language when this mode is selected.',
      'Capture the handover details clearly so users can distinguish it from the CP12 annual check.',
      'Match the style of other commissioning reports in the hub and preview.',
    ],
    implementationStatus: 'planned',
  },
  {
    key: 'gas-tightness-test',
    certificateType: 'CP12',
    discipline: 'gas',
    label: 'Gas tightness test / pressure test record',
    route: '/certificates/new/cp12?mode=tightness',
    description:
      'Gas tightness and pressure test certificate for installation and alteration work.',
    standards: ['Gas Safety (Installation and Use) Regulations 1998', 'IGEM / manufacturer test procedures'],
    typicalUse:
      'Pressure testing pipework, confirming soundness, and recording test results before commissioning.',
    explanatoryNotes: [
      'Use when the main purpose of the visit is a tightness test, pressure test, or soundness check.',
      'Record test pressure, duration, permitted drop, reading at start and finish, and any remedial action.',
      'Explain whether the installation is safe to proceed to commissioning or requires further leak investigation.',
    ],
    designNotes: [
      'Add a more technical, test-focused note block for pressure-test workflows.',
      'Make clear that the certificate is a test record, not a full landlord safety record.',
      'Keep a concise technical presentation with room for pressures and readings.',
    ],
    implementationStatus: 'planned',
  },
  {
    key: 'eicr-periodic',
    certificateType: 'EICR',
    discipline: 'electrical',
    label: 'EICR periodic inspection and testing',
    route: '/certificates/new/eicr',
    description:
      'Electrical Installation Condition Report for fixed wiring inspection and testing.',
    standards: ['BS 7671', 'IET Guidance Note 3', 'Electrical safety best practice'],
    typicalUse:
      'Periodic inspection and testing of fixed wiring installations in domestic, commercial, and industrial premises.',
    explanatoryNotes: [
      'Use for periodic inspections of fixed wiring installations and related distribution equipment.',
      'Should include schedule of test results, observations, circuit details, supply characteristics, and recommendations.',
      'Explain the significance of C1, C2, C3, and FI codes so the report reads clearly for end users.',
    ],
    designNotes: [
      'Keep the full EICR as the reference design for the rest of the electrical family.',
      'The explanatory notes should remain strong and technical, but understandable to non-specialists.',
      'Use the same cover-page and schedule layout language across future electrical certificates.',
    ],
    implementationStatus: 'implemented',
  },
  {
    key: 'eicr-streamlined',
    certificateType: 'EICR',
    discipline: 'electrical',
    label: 'EICR streamlined entry',
    route: '/certificates/new/eicr?mode=streamlined',
    description:
      'Streamlined EICR workflow with the same validation logic and circuit quality checks.',
    standards: ['BS 7671', 'IET Guidance Note 3'],
    typicalUse:
      'Fast entry when the full electrical report is still required but the operator wants a shorter workflow.',
    explanatoryNotes: [
      'Use when you want the same validation, defect logic, and report output but with less friction during entry.',
      'Keep the same underlying result structure so the PDF and certificate page stay consistent.',
      'Explain the difference between streamlined and full entry so users know the report remains equivalent in content.',
    ],
    designNotes: [
      'Use the existing streamlined EICR design language and keep any new notes short and unobtrusive.',
      'Do not remove the important schedule and validation behaviour from the streamlined flow.',
      'This should feel like a productivity variant, not a separate certificate type.',
    ],
    implementationStatus: 'implemented',
  },
  {
    key: 'electrical-installation-certificate',
    certificateType: 'EIC',
    discipline: 'electrical',
    label: 'Electrical Installation Certificate (EIC)',
    route: '/certificates/new/electrical/eic',
    description:
      'Electrical installation certificate for new work, additions, or alterations.',
    standards: ['BS 7671', 'IET Guidance Note 3'],
    typicalUse:
      'New electrical installation work, major alterations, and certification of completed works.',
    explanatoryNotes: [
      'Use when a new circuit, board, or installation is being certified after installation or alteration.',
      'Should include design, construction, and inspection/testing declarations plus test results and particulars of installation.',
      'Explain the difference between an EIC and an EICR: the EIC certifies completed work; the EICR certifies condition of an existing installation.',
    ],
    designNotes: [
      'Use a structure that mirrors the BS 7671 model form: design, construction, inspection/testing, and schedules.',
      'The explanatory notes should mention the responsible person, client, and electrical contractor clearly.',
      'Keep the presentation formal and document-like rather than survey-style.',
    ],
    implementationStatus: 'planned',
  },
  {
    key: 'minor-electrical-installation-works-certificate',
    certificateType: 'MEIWC',
    discipline: 'electrical',
    label: 'Minor Electrical Installation Works Certificate',
    route: '/certificates/new/electrical/meiwc',
    description:
      'Certificate for small electrical additions or alterations to an existing installation.',
    standards: ['BS 7671', 'IET Guidance Note 3'],
    typicalUse:
      'Small-scale additions, alterations, circuit extensions, or replacement equipment where a full EIC is not necessary.',
    explanatoryNotes: [
      'Use for limited works such as a new socket, lighting alteration, local circuit changes, or replacement accessories.',
      'Should still record inspection and testing results relevant to the work carried out.',
      'Explain when an MEIWC is appropriate and when a full EIC or EICR should instead be used.',
    ],
    designNotes: [
      'Keep the workflow short and highly focused on the work carried out.',
      'The explanatory notes should help users avoid using the wrong certificate for larger electrical works.',
      'The PDF / preview should still feel formal and standard-aligned.',
    ],
    implementationStatus: 'planned',
  },
  {
    key: 'electrical-installation-variation-record',
    certificateType: 'EIC',
    discipline: 'electrical',
    label: 'Electrical installation variation / amendment record',
    route: '/certificates/new/electrical/variation',
    description:
      'Record of a variation, amendment, or partial re-certification to an existing electrical installation.',
    standards: ['BS 7671'],
    typicalUse:
      'Alterations and variations where the original installation remains in place but a record of the change is required.',
    explanatoryNotes: [
      'Use when documenting a variation to an existing installation rather than a fully new installation.',
      'Record what has changed, what remains untouched, and any updated test results or safety notes.',
      'Explain the scope carefully so future maintainers can understand the extent of the certified change.',
    ],
    designNotes: [
      'Provide a clear scope summary box and a concise explanatory note about what the variation covers.',
      'Keep terminology consistent with BS 7671 model forms.',
      'Make it obvious that this is a change record, not a periodic inspection.',
    ],
    implementationStatus: 'planned',
  },
  {
    key: 'fire-extinguisher-service',
    certificateType: 'FIRE_EXTINGUISHER',
    discipline: 'fire-extinguisher',
    label: 'Portable fire extinguisher service',
    route: '/certificates/new/fire-extinguisher',
    description:
      'Portable fire extinguisher and fire blanket service certificate.',
    standards: ['BS 5306-3', 'BS EN 3', 'BS 5306-8 where fire blankets are included'],
    typicalUse:
      'Annual extinguisher servicing, discharge testing, replacement, condemnation, and maintenance record.',
    explanatoryNotes: [
      'Use for annual extinguisher maintenance visits and on-site inventory records.',
      'Should capture unit type, service level, quantities, signage, mounting, access, and overall condition.',
      'Explain the difference between visual inspection, basic service, extended service, and overhaul/discharge test.',
    ],
    designNotes: [
      'This workflow should be brought up to the same interaction standard as EICR and CP12, including preview and guided entry parity.',
      'Add more explicit explanatory notes for risk category, service level, and maintenance labels.',
      'Make the form feel like a serious service report rather than a basic inventory sheet.',
    ],
    implementationStatus: 'implemented',
  },
  {
    key: 'fire-extinguisher-commissioning',
    certificateType: 'FIRE_EXTINGUISHER',
    discipline: 'fire-extinguisher',
    label: 'Fire extinguisher commissioning / installation record',
    route: '/certificates/new/fire-extinguisher?mode=commissioning',
    description:
      'Commissioning and first-fix record for new fire extinguisher installations.',
    standards: ['BS 5306-3', 'BS EN 3'],
    typicalUse:
      'New installation, fit-out, or handover of extinguisher equipment to a client or landlord.',
    explanatoryNotes: [
      'Use when the installation is being handed over for the first time or after major refit.',
      'Should note unit counts, siting, access, signage, mounting, and any missing items before handover.',
      'Explain whether the installation is fully complete or has snags requiring follow-up.',
    ],
    designNotes: [
      'Commissioning content should be clearer than the routine service flow and use more handover-oriented language.',
      'Keep the certificate concise but add an explanatory note box about the commissioning scope.',
      'The end result should look like a proper handover certificate, not only a maintenance checklist.',
    ],
    implementationStatus: 'planned',
  },
  {
    key: 'dry-riser-testing',
    certificateType: 'DRY_RISER',
    discipline: 'dry-riser',
    label: 'Dry riser inspection and pressure test',
    route: '/certificates/new/dry-riser',
    description:
      'Dry riser inspection, test, and maintenance certificate.',
    standards: ['BS 9990', 'BS 5306-1 where wet riser references are needed for comparison'],
    typicalUse:
      'Six-monthly / annual dry riser inspection, pressure testing, flow testing, and maintenance records.',
    explanatoryNotes: [
      'Use for dry riser and, where applicable, related inlet/outlet, valves, and pressure testing records.',
      'Should capture building height, inlet/outlet counts, pump/tank details where relevant, and pressure/flow results.',
      'Explain the difference between visual inspection, pressure test, and flow test outcomes.',
    ],
    designNotes: [
      'This workflow should be improved to match the same guided/preview experience as the gas and EICR pages.',
      'Add clearer explanatory notes around test pressure, flow rate, and whether the system is dry, wet, or combined.',
      'Treat the report like a formal test certificate with a real engineering summary.',
    ],
    implementationStatus: 'implemented',
  },
  {
    key: 'dry-riser-commissioning',
    certificateType: 'DRY_RISER',
    discipline: 'dry-riser',
    label: 'Dry riser commissioning / installation record',
    route: '/certificates/new/dry-riser?mode=commissioning',
    description:
      'Installation handover and commissioning record for dry riser systems.',
    standards: ['BS 9990'],
    typicalUse:
      'New dry riser installation, after major alteration, or at handover to the responsible person.',
    explanatoryNotes: [
      'Use when the dry riser is being commissioned for the first time or after a substantial modification.',
      'Record system configuration, pipe size, valve counts, pressure tests, and acceptance / snagging notes.',
      'Explain any limitations or follow-up work clearly before handover.',
    ],
    designNotes: [
      'Add commissioning-specific wording to avoid confusion with the periodic test certificate.',
      'The form should clearly distinguish between installed equipment and tested performance.',
      'Keep the content detailed enough for a proper handover record.',
    ],
    implementationStatus: 'planned',
  },
];

export const CERTIFICATE_DISCIPLINE_GROUPS: CertificateDisciplineGroup[] = [
  {
    title: 'Gas certificates',
    description: 'Landlord, service, commissioning, and pressure-test gas paperwork.',
    discipline: 'gas',
    entries: CERTIFICATE_TYPE_CATALOG.filter((entry) => entry.discipline === 'gas'),
  },
  {
    title: 'Electrical certificates',
    description: 'Periodic, installation, minor works, and variation electrical certification.',
    discipline: 'electrical',
    entries: CERTIFICATE_TYPE_CATALOG.filter((entry) => entry.discipline === 'electrical'),
  },
  {
    title: 'Fire alarm certificates',
    description: 'Commercial and domestic fire alarm commissioning and service certificates.',
    discipline: 'fire-alarm',
    entries: CERTIFICATE_TYPE_CATALOG.filter((entry) => entry.discipline === 'fire-alarm'),
  },
  {
    title: 'Emergency lighting certificates',
    description: 'Periodic and commissioning emergency lighting service records.',
    discipline: 'emergency-lighting',
    entries: CERTIFICATE_TYPE_CATALOG.filter((entry) => entry.discipline === 'emergency-lighting'),
  },
  {
    title: 'Portable fire safety certificates',
    description: 'Fire extinguisher servicing and commissioning records.',
    discipline: 'fire-extinguisher',
    entries: CERTIFICATE_TYPE_CATALOG.filter((entry) => entry.discipline === 'fire-extinguisher'),
  },
  {
    title: 'Dry riser certificates',
    description: 'Dry riser testing and commissioning records.',
    discipline: 'dry-riser',
    entries: CERTIFICATE_TYPE_CATALOG.filter((entry) => entry.discipline === 'dry-riser'),
  },
];

export const CERTIFICATE_HUB_INTRODUCTION = [
  'This catalogue separates implemented workflows from planned workflows so the hub can clearly show what is available now and what is being added next.',
  'The explanatory notes are designed to keep wording accurate, user-friendly, and aligned with common UK certificate naming across other software platforms.',
  'When building each workflow, prefer the same interaction pattern used by the current EICR and CP12 pages: guided mode, preview, sample data, and clear validation hints.',
];

export function getCertificateCatalogEntryByKey(key: string) {
  return CERTIFICATE_TYPE_CATALOG.find((entry) => entry.key === key) ?? null;
}

export function getCertificateCatalogEntryByRoute(route: string) {
  return CERTIFICATE_TYPE_CATALOG.find((entry) => entry.route === route) ?? null;
}

export function getImplementedCertificateEntries() {
  return CERTIFICATE_TYPE_CATALOG.filter((entry) => entry.implementationStatus === 'implemented');
}

export function getPlannedCertificateEntries() {
  return CERTIFICATE_TYPE_CATALOG.filter((entry) => entry.implementationStatus === 'planned');
}
