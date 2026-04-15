import type {
  FireAlarmDiagnosticCategory,
  FireAlarmDiagnosticFault,
} from './types';

const generalSafetyNotes = [
  'Guidance notes only. Follow site risk assessment, isolation procedure, cause and effect strategy, and manufacturer instructions at all times.',
  'Where testing could impair life safety, agree the impairment with the responsible person, place the system on test where permitted, and restore full protection promptly.',
  'Use calibrated test equipment and confirm conductor identification before disconnecting, linking, or applying meter ranges.',
];

export const fireAlarmDiagnosticsCategories: FireAlarmDiagnosticCategory[] = [
  {
    id: 'loops-and-circuits',
    title: 'Loop and circuit faults',
    description:
      'Common addressable loop and conventional circuit issues, with practical checks for continuity, voltage, current, and insulation to earth.',
    faults: [
      {
        id: 'open-circuit-loop',
        title: 'Open circuit loop',
        symptoms: [
          'Loop fault shown at panel or loop card',
          'Devices beyond one point missing or reported offline',
          'No return voltage on one side of the loop',
        ],
        likelyCauses: [
          'Broken conductor, loose termination, or damaged joint',
          'Isolator held open after a previous fault',
          'Device base or spur connection not remade correctly',
        ],
        safetyNotes: generalSafetyNotes,
        testSteps: [
          'Confirm the affected loop number, recent works, and the last healthy device shown in panel diagnostics.',
          'If permitted, isolate the loop at the panel and visually inspect both outgoing and return terminations for loose or reversed cores.',
          'Measure continuity end to end on each conductor section with the loop disconnected. Split the loop at a mid-point if needed to narrow the break.',
          'Measure resistance of the positive conductor and then the negative conductor around the loop. Compare both legs; a very high or open reading indicates the broken path.',
          'With the loop energised where safe, measure voltage from positive to negative at devices before and after the suspected break. Then measure each conductor to earth.',
          'Check loop current on positive and negative using the panel diagnostics or an appropriate clamp or meter method approved for the system.',
        ],
        expectedFindings: [
          'Healthy continuity should show a finite loop resistance on both cores; an open conductor will read open circuit or unstable high resistance.',
          'Voltage present on one side of the break but absent beyond it points to the discontinuity location.',
          'Positive and negative loop currents should broadly balance; zero or much lower current on one leg can indicate an open path or open isolator.',
          'Low resistance from either conductor to earth suggests an additional earth fault rather than a simple open circuit.',
        ],
        actions: [
          'Remake the loose termination, replace the damaged cable section, or reset or replace the latched isolator.',
          'Reinstate the loop, confirm all devices return, and clear the panel fault.',
          'Carry out a final device poll or auto-learn check only if the manufacturer permits it for that panel.',
        ],
        measurementFocus: [
          {
            id: 'loopResistance',
            label: 'Loop resistance',
            unit: 'Ω',
            helpText: 'Record end-to-end resistance of the affected conductor or loop section after safe isolation.',
          },
          {
            id: 'lineVoltage',
            label: 'Loop voltage',
            unit: 'V DC',
            helpText: 'Compare panel voltage with voltage at the last healthy and first failed device.',
          },
          {
            id: 'positiveCurrent',
            label: 'Positive loop current',
            unit: 'mA',
            helpText: 'Useful when verifying whether one side of the loop has lost load or feed.',
          },
          {
            id: 'negativeCurrent',
            label: 'Negative loop current',
            unit: 'mA',
            helpText: 'Compare return current with outgoing current to identify imbalance or open return path.',
          },
        ],
        tags: ['loop', 'continuity', 'voltage', 'current'],
        escalationNotes: [
          'Escalate if the break is within inaccessible containment, fire-stopped penetrations, or shared building infrastructure.',
          'Escalate to the manufacturer if the loop card reports inconsistent open-loop diagnostics after field wiring is proven healthy.',
        ],
      },
      {
        id: 'short-circuit-loop',
        title: 'Short circuit loop',
        symptoms: [
          'Loop short fault on the panel',
          'Section of devices isolated or lost',
          'Loop voltage collapses when connected',
        ],
        likelyCauses: [
          'Core-to-core short in cable or device base',
          'Water ingress or crushed cable',
          'Incorrect termination after maintenance works',
        ],
        safetyNotes: generalSafetyNotes,
        testSteps: [
          'Identify whether isolators have segmented the loop and note which addresses remain visible.',
          'Isolate the loop and measure resistance between positive and negative. A very low reading indicates a short or heavy partial short.',
          'Split the loop into smaller sections and repeat the resistance test to narrow the faulted leg.',
          'Measure resistance from each conductor to earth to check whether the short also involves building ground.',
          'With the suspect section disconnected, re-energise the healthy section and confirm the panel loop voltage recovers.',
          'Where supported, review loop current values; excessive current draw before isolation can help confirm a shorted section.',
        ],
        expectedFindings: [
          'Positive-to-negative resistance near zero indicates a direct short.',
          'If resistance rises when a section is removed, the fault sits in the removed section.',
          'Low resistance to earth on one or both conductors suggests moisture or insulation breakdown rather than a clean core-to-core short.',
          'Recovered loop voltage after sectioning confirms the removed section contains the fault.',
        ],
        actions: [
          'Repair or replace the damaged cable, base, or accessory creating the short.',
          'Dry and re-test any water-affected equipment before reinstatement.',
          'Restore the full loop and confirm isolators reset correctly.',
        ],
        escalationNotes: [
          'Escalate if repeated short faults occur with no field wiring defect found, as the loop driver card may need manufacturer support.',
        ],
      },
      {
        id: 'earth-fault',
        title: 'Earth fault',
        symptoms: [
          'Earth fault indicated on panel or repeater',
          'Intermittent faults after rain, cleaning, or other trades',
          'Healthy loop operation but persistent earth warning',
        ],
        likelyCauses: [
          'Insulation damage allowing one core to touch earth or screened containment',
          'Moisture ingress in devices, joints, or external equipment',
          'Incorrect screen or drain wire termination',
        ],
        safetyNotes: generalSafetyNotes,
        testSteps: [
          'Confirm whether the panel identifies the affected circuit, loop, sounder circuit, or network segment.',
          'Isolate the suspected circuit and measure resistance from positive to earth and from negative to earth.',
          'Compare readings on each conductor. A low reading on one side usually identifies the faulted core.',
          'If the fault is not obvious, divide the circuit and repeat the resistance-to-earth tests on each half.',
          'Measure conductor voltage to earth when energised. Unexpected voltage collapse on one conductor can support the earth fault location.',
          'Inspect external interfaces, screened cables, damp areas, and glands where insulation often breaks down first.',
        ],
        expectedFindings: [
          'Healthy circuits normally show high resistance to earth on both conductors.',
          'A notably lower resistance on one core indicates leakage or direct contact to earth on that conductor.',
          'If both conductors show low resistance to earth, moisture contamination or a crushed multicore cable may be present.',
          'Temporary improvement after disconnecting a field section confirms the fault lies downstream.',
        ],
        actions: [
          'Remove the conductor-to-earth contact, dry or replace affected equipment, and remake any incorrect screen termination.',
          'Re-test insulation to earth before reconnecting to the panel.',
          'Clear the fault and monitor for recurrence under normal site conditions.',
        ],
        measurementFocus: [
          {
            id: 'positiveToEarth',
            label: 'Positive to earth resistance',
            unit: 'Ω',
            helpText: 'Capture the resistance from the positive core to earth after safely isolating the circuit.',
          },
          {
            id: 'negativeToEarth',
            label: 'Negative to earth resistance',
            unit: 'Ω',
            helpText: 'Compare with positive-to-earth to identify which core is leaking to ground.',
          },
          {
            id: 'lineVoltage',
            label: 'Conductor voltage to earth',
            unit: 'V DC',
            helpText: 'Unexpected voltage collapse to earth can support the fault location once the circuit is energised.',
          },
        ],
        tags: ['earth fault', 'insulation', 'ground leakage'],
        escalationNotes: [
          'Escalate where the fault lies in buried, inaccessible, or shared containment.',
          'Escalate if panel earth monitoring remains active despite proven high insulation readings in the field.',
        ],
      },
      {
        id: 'sounder-circuit-fault',
        title: 'Sounder circuit fault',
        symptoms: [
          'Conventional sounder fault or NAC fault at panel',
          'No sounder operation on test, or sounders operate weakly',
          'EOL fault shown or circuit disabled after alarm output demand',
        ],
        likelyCauses: [
          'Open circuit, short circuit, or incorrect end-of-line device',
          'Sounder overload or too many devices on one circuit',
          'Polarity issue or failed sounder base or interface',
        ],
        safetyNotes: generalSafetyNotes,
        testSteps: [
          'Confirm the panel type, circuit rating, and the correct end-of-line resistor or module value.',
          'Isolate the sounder circuit and measure end-to-end continuity on both conductors where accessible.',
          'Measure resistance across the circuit to verify the expected EOL value when all devices are healthy and not in alarm.',
          'Check resistance from each conductor to earth if an earth fault is also present.',
          'With the circuit energised, measure standby voltage across positive and negative, then check output voltage under alarm condition if safe to do so.',
          'If weak operation is reported, assess voltage drop along the circuit and compare the current draw to the panel circuit capacity.',
        ],
        expectedFindings: [
          'Open circuit will prevent the correct EOL reading and often shows panel fault continuously.',
          'Very low resistance across the pair indicates a short or reversed connection through a device.',
          'Standby and alarm voltages should remain within the manufacturer limits; a large drop under load indicates overload or high resistance.',
          'Uneven current or repeated output shutdown points to overcurrent protection operating.',
        ],
        actions: [
          'Fit the correct EOL component, repair the open or short, correct polarity, or reduce circuit loading.',
          'Replace failed sounders, bases, or output interfaces as required.',
          'Retest audibility and panel output operation after reinstatement.',
        ],
        measurementFocus: [
          {
            id: 'lineVoltage',
            label: 'Sounder circuit voltage',
            unit: 'V DC',
            helpText: 'Record standby and alarm voltage at the panel and at the furthest sounder point.',
          },
          {
            id: 'loopResistance',
            label: 'EOL / circuit resistance',
            unit: 'Ω',
            helpText: 'Check whether the circuit presents the expected end-of-line value when healthy.',
          },
          {
            id: 'positiveCurrent',
            label: 'Alarm current draw',
            unit: 'mA',
            helpText: 'Compare circuit current during alarm with the panel output rating.',
          },
        ],
        tags: ['sounders', 'NAC', 'EOL', 'voltage drop'],
        escalationNotes: [
          'Escalate if the panel output stage trips with a proven healthy field circuit, as the sounder driver may be defective.',
        ],
      },
      {
        id: 'high-resistance-fault',
        title: 'High resistance fault',
        symptoms: [
          'Voltage drop, intermittent device loss, or degraded sounder output',
          'Fault appears under load but not always at rest',
          'Loop or circuit readings appear healthy until alarm or polling demand increases',
        ],
        likelyCauses: [
          'Loose terminals, corroded joints, or damaged copper strands',
          'Undersized cable or excessive circuit length',
          'Aging field connections with heat or moisture damage',
        ],
        safetyNotes: generalSafetyNotes,
        testSteps: [
          'Review where the circuit performs poorly: standby only, alarm load, or at the far end.',
          'Measure conductor resistance on the positive and negative paths and compare against expected cable length.',
          'Measure voltage at the panel and at the far end under standby and under load. Note the voltage drop on each conductor.',
          'Where possible, measure current on positive and negative during normal polling or alarm operation.',
          'Inspect and remake suspect terminations one by one, especially at joints, isolators, and high-current devices.',
          'If the issue is intermittent, gently flex suspect cable sections or terminations only where permitted and safe, while monitoring readings.',
        ],
        expectedFindings: [
          'Higher than expected loop resistance indicates poor joints or damaged conductors.',
          'Excessive voltage drop under load confirms the circuit cannot carry the required current reliably.',
          'Current imbalance between positive and negative may indicate a poor return path or parallel leakage.',
          'Readings that improve after remaking one joint confirm a local connection issue.',
        ],
        actions: [
          'Remake or replace high-resistance joints, damaged conductors, or overloaded cable sections.',
          'Reduce loading or reconfigure the circuit if the design margin is insufficient.',
          'Confirm stable voltage and current after repair and repeat the functional test.',
        ],
        measurementFocus: [
          {
            id: 'loopResistance',
            label: 'Conductor resistance',
            unit: 'Ω',
            helpText: 'Compare measured conductor resistance against expected cable length and size.',
          },
          {
            id: 'lineVoltage',
            label: 'Loaded circuit voltage',
            unit: 'V DC',
            helpText: 'Capture voltage at the panel and far end under standby and under load.',
          },
          {
            id: 'positiveCurrent',
            label: 'Outgoing current',
            unit: 'mA',
            helpText: 'Use with return current to prove imbalance or excessive loading.',
          },
          {
            id: 'negativeCurrent',
            label: 'Return current',
            unit: 'mA',
            helpText: 'Differences from outgoing current can highlight poor returns or leakage paths.',
          },
        ],
        tags: ['voltage drop', 'high resistance', 'loading'],
        escalationNotes: [
          'Escalate if measured values suggest an original design issue, excessive length, or loading outside the approved cause and effect design.',
        ],
      },
      {
        id: 'intermittent-fault',
        title: 'Intermittent fault',
        symptoms: [
          'Fault clears before arrival or occurs only at certain times',
          'Random loop, device, or network troubles with no fixed location',
          'Faults linked to vibration, temperature, moisture, or plant operation',
        ],
        likelyCauses: [
          'Loose or oxidised connections',
          'Moisture ingress, thermal movement, or cable stress',
          'A marginal device or interface card failing under load',
        ],
        safetyNotes: generalSafetyNotes,
        testSteps: [
          'Check the panel history log for time, circuit, and repeat pattern before disturbing the system.',
          'Inspect recent work areas, vibrating plant rooms, roof spaces, damp zones, and door transfer points.',
          'Measure voltage, current, and resistance on the affected circuit while healthy, then compare during or immediately after recurrence if possible.',
          'Record resistance to earth on each conductor, as intermittent moisture-related faults often drift rather than fail solidly.',
          'Section the circuit or substitute suspect devices one at a time to see whether the fault follows a component.',
          'Use panel diagnostics to watch address polling, signal quality, or network node status if those functions are available.',
        ],
        expectedFindings: [
          'Small changes in resistance or voltage over time can indicate a developing loose joint or moisture path.',
          'A fault that disappears when a section is removed confirms the issue is downstream of that split.',
          'If the fault follows one device or interface after substitution, that item is likely defective.',
        ],
        actions: [
          'Tighten or replace suspect terminations, dry affected areas, and renew unstable devices or interfaces.',
          'Leave detailed notes of measured values and timing for follow-up if the fault does not reappear during the visit.',
          'Monitor the system after repair and review the history log again if the fault returns.',
        ],
        escalationNotes: [
          'Escalate persistent intermittent faults to manufacturer technical support when field wiring and device swaps do not produce a stable root cause.',
        ],
      },
    ],
  },
  {
    id: 'devices-and-field-equipment',
    title: 'Devices and field equipment',
    description:
      'Typical device-level issues including removed heads, contamination, and local field equipment checks.',
    faults: [
      {
        id: 'device-missing-removed-head',
        title: 'Device missing or detector head removed',
        symptoms: [
          'Specific address missing at the panel',
          'Base remains fitted but detector head removed or loose',
          'Zone or loop healthy apart from one address',
        ],
        likelyCauses: [
          'Head removed for decoration or maintenance and not refitted',
          'Incorrect detector type fitted to the base',
          'Damaged base contacts or twisted-lock not engaged',
        ],
        safetyNotes: generalSafetyNotes,
        testSteps: [
          'Confirm the missing device address, label, and expected detector type from the panel text and records.',
          'Visually inspect whether the head is missing, unlocked, contaminated, or mismatched to the base.',
          'Check the base terminals for loose loop conductors and confirm correct polarity in and out.',
          'Measure loop voltage at the base across positive and negative. If required, compare with a nearby healthy base.',
          'Measure voltage from each conductor to earth if there are wider loop issues.',
          'Refit a known compatible head or substitute with a known good unit where site procedures allow.',
        ],
        expectedFindings: [
          'A missing head with healthy base voltage usually indicates a local device issue rather than a cable fault.',
          'No voltage at the base suggests upstream open circuit, isolator operation, or polarity issue.',
          'If a known good head restores communication, the original detector head is faulty or incompatible.',
        ],
        actions: [
          'Refit the correct detector head, clean and secure the base contacts, or replace the faulty head or base.',
          'Confirm the device returns at the correct address and passes a functional test.',
          'Update records if the device type or address label was incorrect on site.',
        ],
        escalationNotes: [
          'Escalate if repeated head loss occurs due to tampering, access issues, or unsuitable environmental conditions.',
        ],
      },
      {
        id: 'detector-contamination-false-alarm',
        title: 'Detector contamination or false alarm',
        symptoms: [
          'Repeated unwanted alarms from one detector or area',
          'Detector drift compensation or contamination warning',
          'Alarms linked to dust, steam, aerosols, or poor siting',
        ],
        likelyCauses: [
          'Dust or insect ingress inside the detector chamber',
          'Detector type unsuitable for the environment',
          'Airflow, steam, cooking fumes, or building works affecting the detector',
        ],
        safetyNotes: generalSafetyNotes,
        testSteps: [
          'Review the panel log for repeated activations from the same address and note timing and site activity.',
          'Inspect the detector condition, chamber contamination, and local environment for steam, dust, or drafts.',
          'Check base terminations and local loop voltage to rule out supply instability at the device.',
          'If supported, read analogue values, contamination level, or drift data from the panel or device programmer.',
          'Clean or replace the detector in line with manufacturer instructions, then carry out a controlled functional test.',
          'Where false alarms persist, assess whether a different detector technology or repositioning is required.',
        ],
        expectedFindings: [
          'High analogue or contamination values with stable loop voltage indicate a detector condition issue rather than a wiring fault.',
          'Evidence of dust, insects, or adverse airflow supports environmental false alarm causes.',
          'If alarms continue after cleaning and substitution, the area or detector type may be unsuitable.',
        ],
        actions: [
          'Clean or replace the detector, fit the correct sensing technology, and address the environmental cause where possible.',
          'Brief the responsible person if building activity is contributing to unwanted alarms.',
          'Retest and monitor the device trend after reinstatement.',
        ],
        escalationNotes: [
          'Escalate to the designer or manufacturer if persistent false alarms indicate an application or detector selection issue.',
        ],
      },
    ],
  },
  {
    id: 'power-and-panel',
    title: 'Power supply and panel faults',
    description:
      'Panel mains, charger, and standby battery issues that affect system availability and compliance.',
    faults: [
      {
        id: 'battery-charger-fault',
        title: 'Battery or charger fault',
        symptoms: [
          'Battery fault, charger fault, or low battery voltage at panel',
          'Standby duration concerns or rapid voltage drop on mains fail',
          'Batteries warm, swollen, aged, or unable to hold charge',
        ],
        likelyCauses: [
          'End-of-life batteries',
          'Failed charger circuit or blown charger fuse',
          'Loose battery links, incorrect battery size, or poor mains supply to PSU',
        ],
        safetyNotes: generalSafetyNotes,
        testSteps: [
          'Confirm battery age, type, and rated capacity against the panel requirement.',
          'Measure charger output voltage at the battery terminals with mains healthy and batteries connected.',
          'Measure individual battery voltages and check interlink connections for tightness and heating.',
          'Simulate or observe a mains fail condition where permitted and measure battery voltage under load.',
          'Check panel current demand and verify the charger is not overloaded by ancillary equipment.',
          'Inspect for signs of swelling, leakage, or damaged battery terminals.',
        ],
        expectedFindings: [
          'Healthy charger output should sit within the manufacturer charging range; a low reading suggests charger or mains PSU issues.',
          'A weak battery will show low standing voltage or a rapid drop under load.',
          'Unequal battery voltages in a series pair often indicate one failed block.',
          'Excessive load current can prevent proper charging and shorten standby time.',
        ],
        actions: [
          'Replace failed or aged batteries with the correct approved type and capacity.',
          'Repair the charger or PSU fault, renew fuses where appropriate, and tighten battery terminations.',
          'Recheck charge voltage and carry out a mains fail test after repair.',
        ],
        measurementFocus: [
          {
            id: 'lineVoltage',
            label: 'Charger output voltage',
            unit: 'V DC',
            helpText: 'Measure at the battery terminals with mains healthy and batteries connected.',
          },
          {
            id: 'positiveCurrent',
            label: 'Charger / load current',
            unit: 'A',
            helpText: 'Capture the standing current if the panel or test method allows it safely.',
          },
        ],
        tags: ['battery', 'charger', 'standby supply'],
        escalationNotes: [
          'Escalate if the panel charger board output is outside tolerance with correct incoming supply present.',
        ],
      },
      {
        id: 'panel-supply-fault',
        title: 'Panel supply fault',
        symptoms: [
          'Mains fail, PSU fault, or panel dead',
          'Display resets, random reboots, or system instability',
          'Multiple circuit faults appearing after supply disturbance',
        ],
        likelyCauses: [
          'Local isolator off, failed fused spur, or lost mains feed',
          'Internal PSU failure, blown fuse, or loose supply connection',
          'Shared supply disturbed by building works',
        ],
        safetyNotes: generalSafetyNotes,
        testSteps: [
          'Confirm safe access to the panel supply and follow electrical isolation rules before opening covers.',
          'Check the local mains isolator, fused spur, protective device, and any labelled fire alarm supply arrangement.',
          'Measure incoming AC supply to the panel PSU, then confirm PSU DC output to the motherboard or distribution card.',
          'Measure battery voltage and confirm whether the panel remains stable on battery only.',
          'Inspect internal fuses, PSU indicators, and signs of overheating or damaged terminals.',
          'If multiple outputs are affected, disconnect non-essential field loads one at a time where permitted to identify overload conditions.',
        ],
        expectedFindings: [
          'No incoming AC confirms an external supply issue rather than a panel electronics fault.',
          'Incoming AC present but no correct DC output indicates PSU or internal protection failure.',
          'Stable operation on battery but not on mains can indicate charger or PSU regulation issues.',
          'If the panel stabilises when a field load is removed, an overloaded or shorted output may be pulling the supply down.',
        ],
        actions: [
          'Restore the dedicated mains supply, replace failed fuses only after finding the cause, or replace the faulty PSU module.',
          'Reconnect field loads in a controlled order and verify normal panel operation.',
          'Record any impairment period and confirm full system recovery before leaving site.',
        ],
        escalationNotes: [
          'Escalate immediately if supply arrangements do not match fire alarm labelling or safe isolation cannot be confirmed.',
          'Escalate to the manufacturer if internal PSU regulation remains unstable after supply checks.',
        ],
      },
    ],
  },
  {
    id: 'network-and-comms',
    title: 'Communication and network faults',
    description:
      'Faults affecting repeaters, networked panels, and communication links between nodes and interfaces.',
    faults: [
      {
        id: 'communication-network-fault',
        title: 'Communication or network fault',
        symptoms: [
          'Network fault between panels or repeaters',
          'One node offline or stale event updates',
          'Intermittent comms loss with otherwise healthy local loops',
        ],
        likelyCauses: [
          'Open, short, reversed, or earth-faulted communication pair',
          'Address clash, configuration mismatch, or failed network card',
          'Third-party interface or fibre or media converter issue',
        ],
        safetyNotes: generalSafetyNotes,
        testSteps: [
          'Confirm which nodes are affected and whether the fault is on copper, fibre, IP, or a proprietary network card.',
          'Check node addressing, configuration labels, and recent changes before disconnecting hardware.',
          'For copper links, measure continuity and resistance on the communication pair, then check resistance from each conductor to earth.',
          'Measure voltage on the communication pair and, where relevant, on each conductor to earth. Compare with a healthy segment.',
          'Inspect termination resistors, screen continuity, polarity, and any converter or interface power supplies.',
          'Swap to a known good port, card, or patch lead where permitted to determine whether the issue follows the path or the hardware.',
        ],
        expectedFindings: [
          'Open or short readings on the pair indicate basic wiring faults that will interrupt network traffic.',
          'Unexpected low resistance to earth suggests insulation breakdown or incorrect screen termination affecting comms quality.',
          'Correct field readings with one node still offline may point to address, firmware, or card failure.',
          'If the fault follows a card or converter swap, the hardware is likely defective.',
        ],
        actions: [
          'Correct the wiring fault, polarity, termination, or addressing mismatch.',
          'Replace failed network cards, converters, or patch components as required.',
          'Confirm event transmission, fault routing, and time synchronisation after reinstatement.',
        ],
        measurementFocus: [
          {
            id: 'loopResistance',
            label: 'Communication pair resistance',
            unit: 'Ω',
            helpText: 'Use continuity and resistance readings to identify opens, shorts, or abnormal pair loading.',
          },
          {
            id: 'positiveToEarth',
            label: 'A leg to earth resistance',
            unit: 'Ω',
            helpText: 'Check one side of the comms pair to earth and compare with the opposite leg.',
          },
          {
            id: 'negativeToEarth',
            label: 'B leg to earth resistance',
            unit: 'Ω',
            helpText: 'Low resistance to earth on either leg can degrade communications quality.',
          },
          {
            id: 'lineVoltage',
            label: 'Communication pair voltage',
            unit: 'V',
            helpText: 'Compare the suspect segment with a healthy network segment or node.',
          },
        ],
        tags: ['network', 'communications', 'repeaters', 'panels'],
        escalationNotes: [
          'Escalate to manufacturer support for firmware mismatch, network database corruption, or persistent comms faults with healthy physical layer readings.',
        ],
      },
    ],
  },
];

export const fireAlarmDiagnosticsSafetyNotice =
  'These notes are practical guidance only and do not replace site-specific procedures, approved method statements, or manufacturer documentation.';

export function findFireAlarmDiagnosticFaultById(
  faultId: string,
): { category: FireAlarmDiagnosticCategory; fault: FireAlarmDiagnosticFault } | null {
  for (const category of fireAlarmDiagnosticsCategories) {
    const fault = category.faults.find((item) => item.id === faultId);

    if (fault) {
      return {
        category,
        fault,
      };
    }
  }

  return null;
}