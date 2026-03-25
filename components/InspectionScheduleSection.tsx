'use client';

// --------------------------------------------------------------------------
// Inspection Schedule – Section 13
// BS 7671:2018 model EICR – domestic/similar premises with ≤ 100 A supply
// --------------------------------------------------------------------------

export type InspCode = '' | 'N/A' | '✓' | 'C1' | 'C2' | 'C3' | 'LIM' | 'NV';

export const INSP_CODE_CYCLE: InspCode[] = [
  '', 'N/A', '✓', 'C1', 'C2', 'C3', 'LIM', 'NV',
];

export interface InspGroup {
  section: string;
  title: string;
  items: { ref: string; desc: string }[];
}

export const SCHEDULE_GROUPS: InspGroup[] = [
  {
    section: '1.0',
    title: 'EXTERNAL CONDITION OF INTAKE EQUIPMENT (VISUAL INSPECTION ONLY)',
    items: [
      { ref: '1.1', desc: 'Service cable' },
      { ref: '1.2', desc: 'Service head' },
      { ref: '1.3', desc: 'Earthing arrangement' },
      { ref: '1.4', desc: 'Meter tails' },
      { ref: '1.5', desc: 'Metering equipment' },
      { ref: '1.6', desc: 'Isolator (where present)' },
    ],
  },
  {
    section: '2.0',
    title: 'PRESENCE OF ADEQUATE ARRANGEMENTS FOR OTHER SOURCES SUCH AS MICROGENERATORS (551.6; 551.7)',
    items: [],
  },
  {
    section: '3.0',
    title: 'EARTHING / BONDING ARRANGEMENTS (411.3; Chap 54)',
    items: [
      { ref: '3.1', desc: "Presence and condition of distributor's earthing arrangement (542.1.2.1; 542.1.2.2)" },
      { ref: '3.2', desc: 'Presence and condition of earth electrode connection where applicable (542.1.2.3)' },
      { ref: '3.3', desc: 'Provision of earthing/bonding labels at all appropriate locations (514.13.1)' },
      { ref: '3.4', desc: 'Confirmation of earthing conductor size (542.3; 543.1.1)' },
      { ref: '3.5', desc: 'Accessibility and condition of earthing conductor at MET (543.3.2)' },
      { ref: '3.6', desc: 'Confirmation of main protective bonding conductor sizes (544.1)' },
      { ref: '3.7', desc: 'Condition and accessibility of main protective bonding conductor connections (543.3.2; 544.1.2)' },
      { ref: '3.8', desc: 'Accessibility and condition of other protective bonding connections (543.3.1; 543.3.2)' },
    ],
  },
  {
    section: '4.0',
    title: 'CONSUMER UNIT(S) / DISTRIBUTION BOARD(S)',
    items: [
      { ref: '4.1',  desc: 'Adequacy of working space/accessibility to consumer unit/distribution board (132.12; 513.1)' },
      { ref: '4.2',  desc: 'Security of fixing (134.1.1)' },
      { ref: '4.3',  desc: 'Condition of enclosure(s) in terms of IP rating etc (416.2)' },
      { ref: '4.4',  desc: 'Condition of enclosure(s) in terms of fire rating etc (421.1.201; 526.5)' },
      { ref: '4.5',  desc: 'Enclosure not damaged/deteriorated so as to impair safety (651.2)' },
      { ref: '4.6',  desc: 'Presence of main linked switch (as required by 462.1.201)' },
      { ref: '4.7',  desc: 'Operation of main switch (functional check) (643.10)' },
      { ref: '4.8',  desc: 'Manual operation of circuit-breakers and RCDs to prove disconnection (643.10)' },
      { ref: '4.9',  desc: 'Correct identification of circuit details and protective devices (514.8.1; 514.9.1)' },
      { ref: '4.10', desc: 'Presence of RCD six-monthly test notice at or near consumer unit/distribution board (514.12.2)' },
      { ref: '4.11', desc: 'Presence of non-standard (mixed) cable colour warning notice at or near consumer unit/distribution board (514.14)' },
      { ref: '4.12', desc: 'Presence of alternative supply warning notice at or near consumer unit/distribution board (514.15)' },
      { ref: '4.13', desc: 'Presence of other required labelling (please specify) (Section 514)' },
      { ref: '4.14', desc: 'Compatibility of protective devices, bases and other components; correct type and rating (411.3.2; 411.4; 411.5; 411.6; Sections 432, 433)' },
      { ref: '4.15', desc: 'Single-pole switching or protective devices in line conductor only (132.14.1; 530.3.3)' },
      { ref: '4.16', desc: 'Protection against mechanical damage where cables enter consumer unit/distribution board (132.14.1; 522.8.1; 522.8.5; 522.8.11)' },
      { ref: '4.17', desc: 'Protection against electromagnetic effects where cables enter consumer unit/distribution board/enclosures (521.5.1)' },
      { ref: '4.18', desc: 'RCD(s) provided for fault protection – includes RCBOs (411.4.204; 411.5.2; 531.2)' },
      { ref: '4.19', desc: 'RCD(s) provided for additional protection/requirements – includes RCBOs (411.3.3; 415.1)' },
      { ref: '4.20', desc: 'Confirmation of indication that SPD is functional (651.4)' },
      { ref: '4.21', desc: 'Confirmation that ALL conductor connections, including connections to busbars, are correctly located in terminals and are tight and secure (526.1)' },
      { ref: '4.22', desc: 'Adequate arrangements where a generating set operates as a switched alternative to the public supply (551.6)' },
      { ref: '4.23', desc: 'Adequate arrangements where a generating set operates in parallel with the public supply (551.7)' },
    ],
  },
  {
    section: '5.0',
    title: 'FINAL CIRCUITS',
    items: [
      { ref: '5.1',    desc: 'Identification of conductors (514.3.1)' },
      { ref: '5.2',    desc: 'Cables correctly supported throughout their run (521.10.202; 522.8.5)' },
      { ref: '5.3',    desc: 'Condition of insulation of live parts (416.1)' },
      { ref: '5.4',    desc: 'Non-sheathed cables protected by enclosure in conduit, ducting or trunking (521.10.1)' },
      { ref: '5.4.1',  desc: 'To include the integrity of conduit and trunking systems (metallic and plastic)' },
      { ref: '5.5',    desc: 'Adequacy of cables for current-carrying capacity with regard for the type and nature of installation (Section 523)' },
      { ref: '5.6',    desc: 'Coordination between conductors and overload protective devices (433.1; 533.2.1)' },
      { ref: '5.7',    desc: 'Adequacy of protective devices: type and rated current for fault protection (411.3)' },
      { ref: '5.8',    desc: 'Presence and adequacy of circuit protective conductors (411.3.1; Section 543)' },
      { ref: '5.9',    desc: 'Wiring system(s) appropriate for the type and nature of the installation and external influences (Section 522)' },
      { ref: '5.10',   desc: 'Concealed cables installed in prescribed zones (522.6.202)' },
      { ref: '5.11',   desc: 'Cables concealed under floors, above ceilings or in walls/partitions, adequately protected against damage (522.6.204)' },
      { ref: '5.12',   desc: 'Provision of additional requirements for protection by RCD not exceeding 30 mA:' },
      { ref: '5.12.1', desc: 'For all socket-outlets of rating 32 A or less, unless an exception is permitted (411.3.3)' },
      { ref: '5.12.2', desc: 'For the supply of mobile equipment not exceeding 32 A rating for use outdoors (411.3.3)' },
      { ref: '5.12.3', desc: 'For cables concealed in walls at a depth of less than 50 mm (522.6.202; 522.6.203)' },
      { ref: '5.12.4', desc: 'For cables concealed in walls/partitions containing metal parts regardless of depth (522.6.203)' },
      { ref: '5.12.5', desc: 'Final circuits supplying luminaires within domestic (household) premises (411.3.4)' },
      { ref: '5.13',   desc: 'Provision of fire barriers, sealing arrangements and protection against thermal effects (Section 527)' },
      { ref: '5.14',   desc: 'Band II cables segregated/separated from Band I cables (528.1)' },
      { ref: '5.15',   desc: 'Cables segregated/separated from communications cabling (528.2)' },
      { ref: '5.16',   desc: 'Cables segregated/separated from non-electrical services (528.3)' },
      { ref: '5.17',   desc: 'Termination of cables at enclosures (Section 526)' },
      { ref: '5.17.1', desc: 'Connections soundly made and under no undue strain (526.6)' },
      { ref: '5.17.2', desc: 'No basic insulation of a conductor visible outside enclosure (526.8)' },
      { ref: '5.17.3', desc: 'Connections of live conductors adequately enclosed (526.5)' },
      { ref: '5.17.4', desc: 'Adequately connected at point of entry to enclosure (glands, bushes etc.) (522.8.5)' },
      { ref: '5.18',   desc: 'Condition of accessories including socket-outlets, switches and joint boxes (651.2(v))' },
      { ref: '5.19',   desc: 'Suitability of accessories for external influences (512.2)' },
      { ref: '5.20',   desc: 'Adequacy of working space/accessibility to equipment (132.12; 513.1)' },
      { ref: '5.21',   desc: 'Single-pole switching or protective devices in line conductors only (132.14.1, 530.3.3)' },
    ],
  },
  {
    section: '6.0',
    title: 'LOCATION(S) CONTAINING A BATH OR SHOWER',
    items: [
      { ref: '6.1', desc: 'Additional protection for all LV circuits by RCD not exceeding 30 mA (701.411.3.3)' },
      { ref: '6.2', desc: 'Where used as a protective measure, requirements for SELV or PELV met (701.414.4.5)' },
      { ref: '6.3', desc: 'Shaver sockets comply with BS EN 61558-2-5 formerly BS 3535 (701.512.3)' },
      { ref: '6.4', desc: 'Presence of supplementary bonding conductors, unless not required by BS 7671:2018 (701.415.2)' },
      { ref: '6.5', desc: 'Low voltage (e.g. 230 V) socket-outlets sited at least 3 m from zone 1 (701.512.3)' },
      { ref: '6.6', desc: 'Suitability of equipment for external influences for installed location in terms of IP rating (701.512.2)' },
      { ref: '6.7', desc: 'Suitability of accessories and controlgear etc. for a particular zone (701.512.3)' },
      { ref: '6.8', desc: 'Suitability of current-using equipment for particular position within the location (701.55)' },
    ],
  },
  {
    section: '7.0',
    title: 'OTHER PART 7 SPECIAL INSTALLATIONS OR LOCATIONS',
    items: [
      { ref: '7.1',  desc: '' },
      { ref: '7.2',  desc: '' },
      { ref: '7.3',  desc: '' },
      { ref: '7.4',  desc: '' },
      { ref: '7.5',  desc: '' },
      { ref: '7.6',  desc: '' },
      { ref: '7.7',  desc: '' },
      { ref: '7.8',  desc: '' },
      { ref: '7.9',  desc: '' },
      { ref: '7.10', desc: '' },
    ],
  },
];

// --------------------------------------------------------------------------
// Visual config for each code
// --------------------------------------------------------------------------
const CODE_CONFIG: Record<
  InspCode,
  { label: string; bg: string; border: string; text: string; title: string }
> = {
  '':    { label: '—',   bg: 'bg-white',        border: 'border-gray-200', text: 'text-gray-400',   title: 'Click to begin cycling (currently blank)' },
  'N/A': { label: 'N/A', bg: 'bg-gray-100',     border: 'border-gray-400', text: 'text-gray-600',   title: 'Not Applicable' },
  '✓':   { label: '✓',  bg: 'bg-green-50',     border: 'border-green-500',text: 'text-green-800',  title: 'Satisfactory' },
  'C1':  { label: 'C1',  bg: 'bg-red-100',      border: 'border-red-600',  text: 'text-red-800',    title: 'C1 – Danger Present (immediate action required)' },
  'C2':  { label: 'C2',  bg: 'bg-orange-100',   border: 'border-orange-500',text: 'text-orange-800',title: 'C2 – Potentially Dangerous (urgent action required)' },
  'C3':  { label: 'C3',  bg: 'bg-blue-100',     border: 'border-blue-500', text: 'text-blue-800',   title: 'C3 – Improvement Recommended' },
  'LIM': { label: 'LIM', bg: 'bg-amber-50',     border: 'border-amber-400',text: 'text-amber-800',  title: 'LIM – Limitation on Inspection' },
  'NV':  { label: 'NV',  bg: 'bg-slate-100',    border: 'border-slate-400',text: 'text-slate-700',  title: 'NV – Not Verified' },
};

// --------------------------------------------------------------------------
// Single cycling button
// --------------------------------------------------------------------------
function CodeButton({
  code,
  onCycle,
}: {
  code: InspCode;
  onCycle: () => void;
}) {
  const cfg = CODE_CONFIG[code];
  return (
    <button
      type="button"
      onClick={onCycle}
      title={cfg.title}
      className={`
        w-12 min-w-[3rem] text-center text-xs font-bold
        py-0.5 px-1 rounded border cursor-pointer select-none
        transition-colors duration-100
        ${cfg.bg} ${cfg.border} ${cfg.text}
      `}
    >
      {cfg.label}
    </button>
  );
}

// --------------------------------------------------------------------------
// Outcomes legend at the bottom of the section
// --------------------------------------------------------------------------
function OutcomesLegend() {
  return (
    <div className="flex flex-wrap gap-2 mt-3 p-2 rounded border border-gray-200 bg-gray-50 text-xs">
      <span className="font-semibold text-gray-600 mr-1">Outcomes:</span>
      {(Object.entries(CODE_CONFIG) as [InspCode, typeof CODE_CONFIG[InspCode]][])
        .filter(([k]) => k !== '')
        .map(([code, cfg]) => (
          <span
            key={code}
            className={`px-2 py-0.5 rounded border font-medium ${cfg.bg} ${cfg.border} ${cfg.text}`}
          >
            {cfg.label} – {cfg.title.split(' – ')[1] ?? cfg.title}
          </span>
        ))}
    </div>
  );
}

// --------------------------------------------------------------------------
// Main component
// --------------------------------------------------------------------------
export interface InspScheduleValue {
  codes: Record<string, InspCode>;
  comments: Record<string, string>;
}

interface Props {
  value: InspScheduleValue;
  onCodeChange: (ref: string, desc: string, newCode: InspCode, prevCode: InspCode) => void;
  onCommentChange: (ref: string, comment: string) => void;
}

export function InspectionScheduleSection({ value, onCodeChange, onCommentChange }: Props) {
  const cycleCode = (ref: string, desc: string) => {
    const prev = value.codes[ref] ?? '';
    const idx = INSP_CODE_CYCLE.indexOf(prev);
    const next = INSP_CODE_CYCLE[(idx + 1) % INSP_CODE_CYCLE.length];
    onCodeChange(ref, desc, next, prev);
  };

  return (
    <div className="space-y-3">
      {/* Column header */}
      <div className="grid grid-cols-[3rem_1fr_5rem_5rem] gap-x-2 px-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
        <span>Item</span>
        <span>Description</span>
        <span className="text-center">Comments</span>
        <span className="text-center">Outcome</span>
      </div>

      {SCHEDULE_GROUPS.map((group) => (
        <div key={group.section} className="border border-gray-200 rounded-md overflow-hidden">
          {/* Group heading */}
          <div className="bg-blue-50 border-b border-blue-200 px-3 py-1.5 flex items-baseline gap-2">
            <span className="text-xs font-bold text-blue-900">{group.section}</span>
            <span className="text-xs font-semibold text-blue-800">{group.title}</span>
            {group.items.length === 0 && (
              <div className="ml-auto">
                <CodeButton
                  code={value.codes[group.section] ?? ''}
                  onCycle={() => cycleCode(group.section, group.title)}
                />
              </div>
            )}
          </div>

          {/* Items */}
          {group.items.map((item, idx) => {
            const code = value.codes[item.ref] ?? '';
            const comment = value.comments[item.ref] ?? '';
            const isHighlighted = code === 'C1' || code === 'C2';
            return (
              <div
                key={item.ref}
                className={`
                  grid grid-cols-[3rem_1fr_5rem_5rem] gap-x-2 items-center
                  px-2 py-1 text-xs border-b border-gray-100 last:border-b-0
                  ${isHighlighted ? 'bg-red-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                `}
              >
                {/* Ref */}
                <span className="font-mono text-gray-500">{item.ref}</span>

                {/* Description + optional comment textarea */}
                <div className="space-y-1">
                  <span className={item.desc ? '' : 'italic text-gray-400'}>
                    {item.desc || '(blank – for special locations)'}
                  </span>
                  {/* Show comment box if code is C1/C2/C3/LIM/NV */}
                  {(code === 'C1' || code === 'C2' || code === 'C3' || code === 'LIM' || code === 'NV') && (
                    <textarea
                      rows={2}
                      className="w-full text-xs border border-gray-300 rounded p-1 resize-y"
                      placeholder={
                        code === 'C1' ? 'Describe the danger present…'
                        : code === 'C2' ? 'Describe the potentially dangerous condition…'
                        : code === 'C3' ? 'Describe the improvement needed…'
                        : code === 'LIM' ? 'State the limitation…'
                        : 'State why not verified…'
                      }
                      value={comment}
                      onChange={(e) => onCommentChange(item.ref, e.target.value)}
                    />
                  )}
                </div>

                {/* Comments cell (shows comment summary when collapsed) */}
                <div className="text-center text-gray-500 truncate">
                  {comment && !(code === 'C1' || code === 'C2' || code === 'C3' || code === 'LIM' || code === 'NV')
                    ? comment
                    : null}
                </div>

                {/* Outcome cycling button */}
                <div className="flex justify-center">
                  <CodeButton
                    code={code}
                    onCycle={() => cycleCode(item.ref, item.desc)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <OutcomesLegend />
    </div>
  );
}
