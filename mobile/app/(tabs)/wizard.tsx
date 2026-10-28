import { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useJob, type WizardPhotoType } from '@/components/JobStateContext';
import { TAB_BAR_CLEARANCE } from '@/components/keyboard/KeyboardAwareScreen';
import { CertificateTypeSelector } from '@/components/certificate/CertificateTypeSelector';
import { Callout } from '@/components/form/Callout';
import { ChoiceChips, type ChoiceOption } from '@/components/form/ChoiceChips';
import { NumberField } from '@/components/form/NumberField';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { SectionCard } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import WizardProgressRail from '@/components/wizard/WizardProgressRail';
import { WizardStepCard } from '@/components/wizard/WizardStepCard';
import { inferCertificateTypeFromJob } from '@/services/certificates/types';
import { useTheme } from '@/theme/useTheme';

type StepItem = {
  key: string;
  title: string;
  detail: string;
  done: boolean;
  locked: boolean;
  actionLabel?: string;
  onPress?: () => void;
};

type BooleanWizardKey =
  | 'hasRcdProtection'
  | 'hasRcboProtection'
  | 'hasSurgeProtectionDevice'
  | 'hasEvCharger'
  | 'hasSolarPv'
  | 'hasAfddProtection'
  | 'hasCommunalOrLandlordSupplies';

const PROTECTION_QUESTIONS: { key: BooleanWizardKey; title: string }[] = [
  { key: 'hasRcdProtection', title: 'RCD protection present?' },
  { key: 'hasRcboProtection', title: 'RCBO protection present?' },
  { key: 'hasSurgeProtectionDevice', title: 'Surge protection device (SPD) present?' },
  { key: 'hasEvCharger', title: 'EV charger present?' },
  { key: 'hasSolarPv', title: 'Solar PV present?' },
  { key: 'hasAfddProtection', title: 'AFDD protection present?' },
  { key: 'hasCommunalOrLandlordSupplies', title: 'Communal / landlord supplies present?' },
];

const requiredElectricalPhotos: {
  type: WizardPhotoType;
  label: string;
  mode: 'consumer_unit' | 'circuit_label';
}[] = [
  { type: 'consumer_unit_external', label: 'Take a photo of the consumer unit', mode: 'consumer_unit' },
  {
    type: 'consumer_unit_internal',
    label: 'Take a photo of the consumer unit with the front removed',
    mode: 'consumer_unit',
  },
  { type: 'bonding', label: 'Take a photo of the main protective bonding', mode: 'consumer_unit' },
];

const LANDLORD_GUIDANCE_SMOKE =
  'For rented homes in England, at least one smoke alarm should be installed on every storey used as living accommodation.';

const LANDLORD_GUIDANCE_CO =
  'A carbon monoxide alarm should be installed in any room used as living accommodation which contains a fixed combustion appliance, excluding a gas cooker.';

const reportPurposeOptions: ChoiceOption<string>[] = [
  { label: 'Private rented sector EICR (5 yearly)', value: 'private_rented_sector_eicr' },
  { label: 'Change of tenancy', value: 'change_of_tenancy' },
  { label: 'Homebuyer / vendor report', value: 'homebuyer_vendor' },
  { label: 'Periodic inspection / maintenance', value: 'periodic_inspection_maintenance' },
  { label: 'Insurance', value: 'insurance' },
  { label: 'Pre-purchase', value: 'pre_purchase' },
  { label: 'Other', value: 'other' },
];

const installationTypeOptions: ChoiceOption<string>[] = [
  { label: 'Domestic', value: 'domestic' },
  { label: 'Commercial', value: 'commercial' },
  { label: 'Industrial', value: 'industrial' },
  { label: 'Caravan', value: 'caravan' },
  { label: 'Boat', value: 'boat' },
  { label: 'Mixed use', value: 'mixed_use' },
  { label: 'Other', value: 'other' },
];

const occupancyTypeOptions: ChoiceOption<string>[] = [
  { label: 'Tenanted', value: 'tenanted' },
  { label: 'Owner occupied', value: 'owner_occupied' },
  { label: 'Void property', value: 'void' },
  { label: 'Managed block / communal', value: 'managed_block' },
  { label: 'Other', value: 'other' },
];

const supplyPhaseOptions: ChoiceOption<string>[] = [
  { label: 'Single phase', value: 'single_phase' },
  { label: 'Three phase', value: 'three_phase' },
  { label: 'Unknown', value: 'unknown' },
];

const dataEntryModeOptions: ChoiceOption<string>[] = [
  { label: 'Guided photo workflow', value: 'guided_photo' },
  { label: 'Manual entry only', value: 'manual_only' },
  { label: 'Hybrid: photos + manual', value: 'hybrid' },
];

const consumerUnitMaterialOptions: ChoiceOption<string>[] = [
  { label: 'Metal', value: 'metal' },
  { label: 'Plastic', value: 'plastic' },
  { label: 'Not sure', value: 'not_sure' },
];

const YES_NO: ChoiceOption<boolean>[] = [
  { label: 'Yes', value: true },
  { label: 'No', value: false },
];

export default function WizardScreen() {
  const { palette } = useTheme();
  const { state, dispatch } = useJob();
  const params = useLocalSearchParams<{ entryMode?: string | string[] }>();

  const requestedEntryMode = Array.isArray(params.entryMode) ? params.entryMode[0] : params.entryMode;
  const isValidRequestedEntryMode =
    requestedEntryMode === 'guided_photo' || requestedEntryMode === 'manual_only';

  useEffect(() => {
    if (!isValidRequestedEntryMode || state.wizard.dataEntryMode === requestedEntryMode) {
      return;
    }

    dispatch({
      type: 'SET_WIZARD_FIELD',
      payload: { key: 'dataEntryMode', value: requestedEntryMode },
    });
  }, [dispatch, isValidRequestedEntryMode, requestedEntryMode, state.wizard.dataEntryMode]);

  // A ServiceM8 job usually states what is needed in its description, so seed
  // the type from it once per job. The user can always override the choice.
  const inference = useMemo(
    () => inferCertificateTypeFromJob(state.selectedServiceM8Job),
    [state.selectedServiceM8Job]
  );
  const appliedInferenceRef = useRef<string | null>(null);

  useEffect(() => {
    const jobUuid = state.selectedServiceM8Job?.uuid ?? null;

    if (!jobUuid || appliedInferenceRef.current === jobUuid) {
      return;
    }

    appliedInferenceRef.current = jobUuid;
    dispatch({
      type: 'SET_WIZARD_FIELD',
      payload: { key: 'certificateType', value: inference.type },
    });
  }, [dispatch, inference.type, state.selectedServiceM8Job]);

  const currentEntryMode = isValidRequestedEntryMode
    ? requestedEntryMode
    : state.wizard.dataEntryMode;
  const isManualEntryRoute = currentEntryMode === 'manual_only';

  const displayDate = useMemo(
    () => new Date(state.wizard.inspectionDate).toLocaleDateString('en-GB'),
    [state.wizard.inspectionDate],
  );

  const getImageFor = (type: WizardPhotoType, slotIndex?: number) =>
    state.capturedImages.find(
      (image) => image.type === type && (image.slotIndex ?? null) === (slotIndex ?? null),
    );

  const requiredPhotoStatus = requiredElectricalPhotos.map((photo) => {
    const image = getImageFor(photo.type);
    return {
      ...photo,
      captured: !!image?.qualityAssessment?.isSufficient,
      hasAttempt: !!image,
      qualityScore: image?.qualityAssessment?.score ?? null,
    };
  });

  const damagePhotoStatus = [
    {
      type: 'damaged_accessory' as const,
      question: 'Any damaged sockets, switches, or accessories found?',
      label: 'Take a photo of the damaged socket, switch, or accessory',
      flagKey: 'hasDamagedAccessory' as const,
      required: state.wizard.hasDamagedAccessory === true,
      answered: state.wizard.hasDamagedAccessory !== null,
      image: getImageFor('damaged_accessory'),
    },
    {
      type: 'damaged_luminaire' as const,
      question: 'Any damaged luminaires found?',
      label: 'Take a photo of the damaged luminaire',
      flagKey: 'hasDamagedLuminaire' as const,
      required: state.wizard.hasDamagedLuminaire === true,
      answered: state.wizard.hasDamagedLuminaire !== null,
      image: getImageFor('damaged_luminaire'),
    },
  ].map((item) => ({
    ...item,
    captured: !!item.image?.qualityAssessment?.isSufficient,
    qualityScore: item.image?.qualityAssessment?.score ?? null,
  }));

  const usesPhotoEvidence =
    state.wizard.dataEntryMode === 'guided_photo' || state.wizard.dataEntryMode === 'hybrid';

  const mandatoryRequiredPhotosDone = requiredPhotoStatus.every((item) => item.captured);
  const damageQuestionsAnswered = damagePhotoStatus.every((item) => item.answered);
  const requiredDamagePhotosDone = damagePhotoStatus.every(
    (item) => !item.required || item.captured,
  );

  const isDomesticStyleInstallation =
    state.wizard.installationType === 'domestic' ||
    state.wizard.installationType === 'mixed_use' ||
    state.wizard.installationType === 'caravan';

  const requiresSmokeAndCoFlow =
    state.wizard.reportPurpose === 'private_rented_sector_eicr' ||
    state.wizard.reportPurpose === 'change_of_tenancy' ||
    state.wizard.occupancyType === 'tenanted';

  const minimumRecommendedSmokeAlarms = Math.max(1, state.wizard.storeyCount);
  const smokeAlarmCountMeetsGuidance =
    state.wizard.smokeDetectorCount >= minimumRecommendedSmokeAlarms;

  const smokePhotosDone =
    state.wizard.smokeDetectorCount === 0 ||
    Array.from({ length: state.wizard.smokeDetectorCount }, (_, index) => {
      const image = getImageFor('smoke_detector', index);
      return !!image?.qualityAssessment?.isSufficient;
    }).every(Boolean);

  const coDetectorPhotoDone = !!getImageFor('co_detector')?.qualityAssessment?.isSufficient;
  const coBranchRequired = state.wizard.hasSolidFuelAppliance === true;
  const coBranchDone = !coBranchRequired || (state.wizard.coDetectorTested && coDetectorPhotoDone);

  const infrastructureQuestionsComplete =
    state.wizard.distributionBoardCount >= 1 &&
    state.wizard.hasRcdProtection !== null &&
    state.wizard.hasRcboProtection !== null &&
    state.wizard.hasSurgeProtectionDevice !== null &&
    state.wizard.hasEvCharger !== null &&
    state.wizard.hasSolarPv !== null &&
    state.wizard.hasAfddProtection !== null &&
    state.wizard.hasCommunalOrLandlordSupplies !== null &&
    (state.wizard.hasSolarPv !== true || state.wizard.hasBatteryStorage !== null);

  const stepFlags = {
    customer: !!state.selectedCustomer,
    address: !!state.gpsAddress,
    inspectionDate: !!state.wizard.inspectionDate,
    dataEntryMode: !!state.wizard.dataEntryMode,
    reportPurpose: state.wizard.reportPurpose !== null,
    installationType: state.wizard.installationType !== null,
    occupancyType: state.wizard.occupancyType !== null,
    supplyPhase: state.wizard.supplyPhase !== null,
    ancillarySupplies: state.wizard.hasOutbuildingsOrAncillarySupplies !== null,
    requiredPhotos:
      !usesPhotoEvidence ||
      (mandatoryRequiredPhotosDone && damageQuestionsAnswered && requiredDamagePhotosDone),
    consumerUnitMaterial:
      !isDomesticStyleInstallation || state.wizard.consumerUnitMaterial !== null,
    infrastructureQuestions: infrastructureQuestionsComplete,
    smokeCount:
      !requiresSmokeAndCoFlow || (state.wizard.storeyCount >= 1 && smokeAlarmCountMeetsGuidance),
    smokePhotos: !requiresSmokeAndCoFlow || smokePhotosDone,
    solidFuelQuestion: !requiresSmokeAndCoFlow || state.wizard.hasSolidFuelAppliance !== null,
    coBranch: !requiresSmokeAndCoFlow || coBranchDone,
  };

  const requiredPhotoPlan = [
    ...requiredPhotoStatus.map((item) => ({
      id: item.type,
      label: item.label,
      required: true,
      complete: item.captured,
      blocked: false,
      helper: item.captured
        ? `Accepted${item.qualityScore ? ` • score ${item.qualityScore}` : ''}`
        : item.hasAttempt
          ? 'Retake required due to insufficient quality'
          : 'Capture required',
      action: () => openCapture(item.type, item.label, item.mode),
    })),
    ...damagePhotoStatus.map((item) => ({
      id: item.type,
      label: item.label,
      required: item.required,
      complete: !item.required || item.captured,
      blocked: !item.answered,
      helper: !item.answered
        ? 'Answer the damage question first'
        : item.required
          ? item.captured
            ? `Accepted${item.qualityScore ? ` • score ${item.qualityScore}` : ''}`
            : item.image
              ? 'Retake required due to insufficient quality'
              : 'Capture required'
          : 'Not required',
      action: () => openCapture(item.type, item.label, 'consumer_unit'),
    })),
    ...Array.from({ length: state.wizard.smokeDetectorCount }, (_, index) => {
      const image = getImageFor('smoke_detector', index);
      const accepted = !!image?.qualityAssessment?.isSufficient;
      return {
        id: `smoke_detector_${index}`,
        label: `Smoke detector ${index + 1}`,
        required: requiresSmokeAndCoFlow,
        complete: !requiresSmokeAndCoFlow || accepted,
        blocked: !requiresSmokeAndCoFlow || !stepFlags.smokeCount,
        helper: !requiresSmokeAndCoFlow
          ? 'Not required for this workflow'
          : accepted
            ? `Accepted${image?.qualityAssessment?.score ? ` • score ${image.qualityAssessment.score}` : ''}`
            : image
              ? 'Retake required due to insufficient quality'
              : 'Capture required',
        action: () =>
          openCapture(
            'smoke_detector',
            `Take photo of smoke detector ${index + 1}`,
            'consumer_unit',
            index,
          ),
      };
    }),
    {
      id: 'co_detector',
      label: 'CO detector',
      required: coBranchRequired,
      complete: !coBranchRequired || coDetectorPhotoDone,
      blocked: !coBranchRequired || !state.wizard.coDetectorTested,
      helper: !coBranchRequired
        ? 'Not required unless a solid fuel appliance is present'
        : coDetectorPhotoDone
          ? 'Accepted'
          : state.wizard.coDetectorTested
            ? 'Capture required'
            : 'Test the CO detector first',
      action: () => openCapture('co_detector', 'Take a photo of the CO detector', 'consumer_unit'),
    },
  ];

  const outstandingRequiredPhotos = requiredPhotoPlan.filter(
    (item) => item.required && !item.complete,
  );
  const nextOutstandingPhoto = outstandingRequiredPhotos.find((item) => !item.blocked) ?? null;

  function openCapture(
    type: WizardPhotoType,
    label: string,
    mode: 'consumer_unit' | 'circuit_label',
    slotIndex?: number,
  ) {
    dispatch({
      type: 'SET_ACTIVE_CAPTURE',
      payload: { type, label, mode, slotIndex: slotIndex ?? null },
    });
    router.push('/(tabs)/capture');
  }

  function skipOptionalPhoto(type: WizardPhotoType) {
    dispatch({
      type: 'REMOVE_IMAGE_BY_TARGET',
      payload: { type, slotIndex: null },
    });
  }

  function setField(key: keyof typeof state.wizard, value: unknown) {
    dispatch({
      type: 'SET_WIZARD_FIELD',
      payload: { key, value } as never,
    });
  }

  const steps: StepItem[] = [
    {
      key: 'customer',
      title: 'Enter customer name',
      detail: state.selectedCustomer?.name
        ? `Selected customer: ${state.selectedCustomer.name}`
        : 'Select an existing customer or create a new one.',
      done: stepFlags.customer,
      locked: false,
      actionLabel: 'Open Customer Step',
      onPress: () => router.push('/(tabs)/customer'),
    },
    {
      key: 'address',
      title: 'Confirm address using GPS or manual entry',
      detail: state.gpsAddress || 'Capture the site address from GPS or type it manually.',
      done: stepFlags.address,
      locked: !stepFlags.customer,
      actionLabel: 'Open Address Step',
      onPress: () => router.push('/(tabs)/location'),
    },
    {
      key: 'date',
      title: 'Inspection date',
      detail: `Auto-set to today: ${displayDate}`,
      done: stepFlags.inspectionDate,
      locked: !stepFlags.address,
    },
    {
      key: 'data-entry-mode',
      title: 'Data entry mode',
      detail: state.wizard.dataEntryMode.replaceAll('_', ' '),
      done: stepFlags.dataEntryMode,
      locked: !stepFlags.inspectionDate,
    },
    {
      key: 'report-purpose',
      title: 'Report purpose',
      detail: state.wizard.reportPurpose
        ? state.wizard.reportPurpose.replaceAll('_', ' ')
        : 'Select why this report is being created.',
      done: stepFlags.reportPurpose,
      locked: !stepFlags.inspectionDate,
    },
    {
      key: 'installation-type',
      title: 'Installation type',
      detail: state.wizard.installationType
        ? state.wizard.installationType.replaceAll('_', ' ')
        : 'Select the installation type so the wizard asks appropriate questions.',
      done: stepFlags.installationType,
      locked: !stepFlags.reportPurpose,
    },
    {
      key: 'occupancy-type',
      title: 'Occupancy profile',
      detail: state.wizard.occupancyType
        ? state.wizard.occupancyType.replaceAll('_', ' ')
        : 'Select whether the premises are tenanted, owner occupied, void, or similar.',
      done: stepFlags.occupancyType,
      locked: !stepFlags.installationType,
    },
    {
      key: 'supply-phase',
      title: 'Supply characteristics',
      detail:
        state.wizard.supplyPhase && state.wizard.hasOutbuildingsOrAncillarySupplies !== null
          ? `${state.wizard.supplyPhase.replaceAll('_', ' ')} supply • ancillary supplies ${
              state.wizard.hasOutbuildingsOrAncillarySupplies ? 'present' : 'not present'
            }`
          : 'Confirm phase arrangement and whether there are outbuildings or ancillary supplies.',
      done: stepFlags.supplyPhase && stepFlags.ancillarySupplies,
      locked: !stepFlags.occupancyType,
    },
    {
      key: 'required-photos',
      title: 'Guided evidence photos',
      detail: !usesPhotoEvidence
        ? 'Skipped because this job is using manual certificate entry.'
        : mandatoryRequiredPhotosDone && damageQuestionsAnswered && requiredDamagePhotosDone
          ? 'All required electrical evidence photos are captured with acceptable quality.'
          : `${requiredPhotoStatus.filter((item) => item.captured).length}/${requiredPhotoStatus.length} fixed evidence photo steps accepted, plus any confirmed damage photos.`,
      done: stepFlags.requiredPhotos,
      locked: !stepFlags.supplyPhase || !stepFlags.ancillarySupplies,
    },
    {
      key: 'consumer-unit-material',
      title: 'Consumer unit material',
      detail: !isDomesticStyleInstallation
        ? 'Skipped for non-domestic style installations.'
        : state.wizard.consumerUnitMaterial
          ? `Selected: ${state.wizard.consumerUnitMaterial.replaceAll('_', ' ')}`
          : 'Is the consumer unit metal or plastic?',
      done: stepFlags.consumerUnitMaterial,
      locked: !stepFlags.requiredPhotos,
    },
    {
      key: 'infrastructure-questions',
      title: 'Installation protection and special equipment',
      detail: infrastructureQuestionsComplete
        ? `Boards ${state.wizard.distributionBoardCount} • RCD ${
            state.wizard.hasRcdProtection ? 'yes' : 'no'
          } • RCBO ${state.wizard.hasRcboProtection ? 'yes' : 'no'} • SPD ${
            state.wizard.hasSurgeProtectionDevice ? 'yes' : 'no'
          }`
        : 'Confirm boards, protective devices, and whether EV, PV, battery, AFDD, or landlord supplies are present.',
      done: stepFlags.infrastructureQuestions,
      locked: !stepFlags.consumerUnitMaterial,
    },
    {
      key: 'smoke-count',
      title: 'Storeys and smoke alarm quantity',
      detail: !requiresSmokeAndCoFlow
        ? 'Skipped because this workflow is not using the landlord smoke alarm branch.'
        : smokeAlarmCountMeetsGuidance
          ? `${state.wizard.storeyCount} storey/storeys entered and ${state.wizard.smokeDetectorCount} smoke alarm(s) recorded.`
          : `Enter storeys used as living accommodation and record at least ${minimumRecommendedSmokeAlarms} smoke alarm(s).`,
      done: stepFlags.smokeCount,
      locked: !stepFlags.infrastructureQuestions,
    },
    {
      key: 'smoke-photos',
      title: 'Smoke detector photos',
      detail: !requiresSmokeAndCoFlow
        ? 'Skipped because this workflow is not using the landlord smoke alarm branch.'
        : state.wizard.smokeDetectorCount === 0
          ? 'No smoke detector photos required.'
          : `${
              state.capturedImages.filter(
                (image) =>
                  image.type === 'smoke_detector' && image.qualityAssessment?.isSufficient,
              ).length
            }/${state.wizard.smokeDetectorCount} smoke detector photo(s) accepted.`,
      done: stepFlags.smokePhotos,
      locked: !stepFlags.smokeCount,
    },
    {
      key: 'solid-fuel',
      title: 'Solid fuel appliance question',
      detail: !requiresSmokeAndCoFlow
        ? 'Skipped because this workflow is not using the landlord CO alarm branch.'
        : state.wizard.hasSolidFuelAppliance === null
          ? 'Answer whether there is a solid fuel burning appliance.'
          : state.wizard.hasSolidFuelAppliance
            ? 'Solid fuel appliance present.'
            : 'No solid fuel appliance present.',
      done: stepFlags.solidFuelQuestion,
      locked: !stepFlags.smokePhotos,
    },
    {
      key: 'co-branch',
      title: 'CO detector branch',
      detail: !requiresSmokeAndCoFlow
        ? 'Skipped because this workflow is not using the landlord CO alarm branch.'
        : state.wizard.hasSolidFuelAppliance === true
          ? coBranchDone
            ? 'CO detector tested and photo captured.'
            : 'Complete the CO detector test and capture a clear photo.'
          : 'Skipped because no solid fuel appliance is present.',
      done: stepFlags.coBranch,
      locked: !stepFlags.solidFuelQuestion,
    },
  ];

  const reviewUnlocked = Object.values(stepFlags).every(Boolean);

  return (
    <Screen bottomGap={TAB_BAR_CLEARANCE}>
      <SectionCard
        title="Certificate workflow"
        hint={
          isManualEntryRoute
            ? 'Ordered steps for a manual certificate draft. Customer, address, capture and review stay inside this workflow.'
            : 'Ordered steps for a guided certificate draft. Customer, address, capture and review stay inside this workflow.'
        }
      >
        <CertificateTypeSelector
          value={state.wizard.certificateType}
          onChange={(value) => setField('certificateType', value)}
          inferredFrom={
            appliedInferenceRef.current === (state.selectedServiceM8Job?.uuid ?? null)
              ? inference.matchedKeyword
              : null
          }
        />

        <View style={{ marginTop: 4 }}>
          <Button
            label="Back to task selection"
            icon="arrow-back"
            variant="ghost"
            size="small"
            onPress={() => router.push('/(tabs)')}
          />
        </View>
      </SectionCard>

      <View style={{ marginBottom: 14 }}>
        <AppText variant="subheading" style={{ marginBottom: 8 }}>
          Workflow progress
        </AppText>
        <WizardProgressRail steps={steps.map(({ key, done, locked }) => ({ key, done, locked }))} />
      </View>

      {steps.map((step, index) => (
        <WizardStepCard
          key={step.key}
          index={index + 1}
          title={step.title}
          detail={step.detail}
          done={step.done}
          locked={step.locked}
          actionLabel={step.actionLabel}
          onPress={step.onPress}
        />
      ))}

      <SectionCard title="Data entry mode" hint="Switch this draft between guided, manual-only or hybrid entry if the job changes on site.">
        <ChoiceChips
          options={dataEntryModeOptions}
          value={state.wizard.dataEntryMode}
          onChange={(value) => setField('dataEntryMode', value)}
          disabled={!stepFlags.inspectionDate}
        />
      </SectionCard>

      <SectionCard title="Report purpose" hint="Adapts the evidence flow and suggested certificate wording.">
        <ChoiceChips
          options={reportPurposeOptions}
          value={state.wizard.reportPurpose}
          onChange={(value) => setField('reportPurpose', value)}
          disabled={!stepFlags.dataEntryMode}
        />
      </SectionCard>

      <SectionCard title="Installation type" hint="Controls which downstream questions are relevant.">
        <ChoiceChips
          options={installationTypeOptions}
          value={state.wizard.installationType}
          onChange={(value) => setField('installationType', value)}
          disabled={!stepFlags.reportPurpose}
        />
      </SectionCard>

      <SectionCard title="Occupancy profile" hint="Tenanted properties enable the landlord smoke and CO alarm checks.">
        <ChoiceChips
          options={occupancyTypeOptions}
          value={state.wizard.occupancyType}
          onChange={(value) => setField('occupancyType', value)}
          disabled={!stepFlags.installationType}
        />
      </SectionCard>

      <SectionCard title="Supply characteristics" hint="Phase arrangement and any ancillary supplies on site.">
        <ChoiceChips
          label="Supply phase"
          options={supplyPhaseOptions}
          value={state.wizard.supplyPhase}
          onChange={(value) => setField('supplyPhase', value)}
          disabled={!stepFlags.occupancyType}
        />

        <ChoiceChips
          label="Outbuildings or ancillary supplies present?"
          options={YES_NO}
          value={state.wizard.hasOutbuildingsOrAncillarySupplies}
          onChange={(value) => setField('hasOutbuildingsOrAncillarySupplies', value)}
          disabled={!stepFlags.occupancyType}
          layout="row"
        />
      </SectionCard>

      {usesPhotoEvidence ? (
        <SectionCard
          title="Guided evidence photos"
          hint="Consumer unit, consumer unit with the front removed, and main protective bonding are mandatory."
        >
          <Callout tone={outstandingRequiredPhotos.length === 0 ? 'success' : 'warning'}>
            {outstandingRequiredPhotos.length === 0
              ? 'All currently required photos have been accepted.'
              : `${outstandingRequiredPhotos.length} required photo step(s) still need attention.`}
          </Callout>

          {nextOutstandingPhoto ? (
            <View style={{ marginBottom: 14 }}>
              <Button
                label={`Next required photo: ${nextOutstandingPhoto.label}`}
                icon="camera"
                onPress={nextOutstandingPhoto.action}
                block
              />
            </View>
          ) : null}

          {requiredPhotoPlan
            .filter((item) => item.required)
            .map((item) => (
              <View
                key={item.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 9,
                  borderBottomWidth: 1,
                  borderBottomColor: palette.line,
                }}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{item.label}</AppText>
                  <AppText
                    variant="caption"
                    tone={item.complete ? 'success' : item.blocked ? 'warning' : 'danger'}
                    style={{ marginTop: 2 }}
                  >
                    {item.helper}
                  </AppText>
                </View>

                <Button
                  label={item.complete ? 'Retake' : 'Capture'}
                  size="small"
                  variant="soft"
                  onPress={item.action}
                />
              </View>
            ))}

          <View style={{ marginTop: 16 }}>
            <AppText variant="subheading" style={{ marginBottom: 4 }}>
              Damage prompts
            </AppText>
            <AppText variant="caption" tone="muted" style={{ marginBottom: 12 }}>
              Confirm whether damaged sockets, switches, accessories or luminaires are present. If
              yes, a clear photo becomes mandatory for that defect.
            </AppText>

            {damagePhotoStatus.map((item) => {
              const locked = !stepFlags.supplyPhase || !stepFlags.ancillarySupplies;
              const statusText = !item.answered
                ? 'Answer required'
                : item.required
                  ? item.captured
                    ? `Accepted${item.qualityScore ? ` • score ${item.qualityScore}` : ''}`
                    : item.image
                      ? 'Retake required'
                      : 'Capture required'
                  : 'No defect reported';

              return (
                <View
                  key={item.type}
                  style={{
                    backgroundColor: palette.surfaceAlt,
                    borderRadius: 14,
                    padding: 12,
                    marginBottom: 10,
                  }}
                >
                  <ChoiceChips
                    label={item.question}
                    options={YES_NO}
                    value={state.wizard[item.flagKey]}
                    onChange={(value) => setField(item.flagKey, value)}
                    disabled={locked}
                    layout="row"
                  />

                  <AppText
                    variant="caption"
                    tone={
                      !item.answered
                        ? 'warning'
                        : item.required
                          ? item.captured
                            ? 'success'
                            : 'danger'
                          : 'muted'
                    }
                    style={{ marginBottom: item.required ? 10 : 0 }}
                  >
                    {statusText}
                  </AppText>

                  {item.required ? (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Button
                          label={item.image ? 'Retake photo' : 'Capture photo'}
                          size="small"
                          onPress={() => openCapture(item.type, item.label, 'consumer_unit')}
                          disabled={locked}
                          block
                        />
                      </View>
                      <Button
                        label="Clear photo"
                        size="small"
                        variant="outline"
                        onPress={() => skipOptionalPhoto(item.type)}
                        disabled={locked}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </SectionCard>
      ) : (
        <Callout tone="info" title="Manual certificate route">
          Guided evidence photos are skipped for this route. The certificate is completed from
          manual interrogation and direct test results on the certificate screen.
        </Callout>
      )}

      {isDomesticStyleInstallation ? (
        <SectionCard title="Consumer unit material" hint="Drives the coding guidance for the board.">
          <ChoiceChips
            options={consumerUnitMaterialOptions}
            value={state.wizard.consumerUnitMaterial}
            onChange={(value) => setField('consumerUnitMaterial', value)}
            disabled={!stepFlags.requiredPhotos}
          />
        </SectionCard>
      ) : (
        <Callout tone="info" title="Installation-specific branching">
          Consumer unit material is skipped because this installation type is not domestic-style.
          Commercial, industrial and marine question branches come next.
        </Callout>
      )}

      <SectionCard
        title="Installation protection and special equipment"
        hint="Core branching answers that affect coding, observations and certificate completion."
      >
        <NumberField
          label="Distribution boards / consumer units"
          value={state.wizard.distributionBoardCount}
          onChange={(value) => setField('distributionBoardCount', value)}
          min={1}
          disabled={!stepFlags.consumerUnitMaterial}
        />

        {PROTECTION_QUESTIONS.map((question) => (
          <ChoiceChips
            key={question.key}
            label={question.title}
            options={YES_NO}
            value={state.wizard[question.key]}
            onChange={(value) => setField(question.key, value)}
            disabled={!stepFlags.consumerUnitMaterial}
            layout="row"
          />
        ))}

        {state.wizard.hasSolarPv === true ? (
          <ChoiceChips
            label="Battery storage present?"
            options={YES_NO}
            value={state.wizard.hasBatteryStorage}
            onChange={(value) => setField('hasBatteryStorage', value)}
            disabled={!stepFlags.consumerUnitMaterial}
            layout="row"
          />
        ) : state.wizard.hasSolarPv === false ? (
          <Callout tone="info" inset>
            Battery storage is skipped because solar PV is not present.
          </Callout>
        ) : null}
      </SectionCard>

      {requiresSmokeAndCoFlow ? (
        <>
          <SectionCard title="Landlord smoke alarm requirement" hint={LANDLORD_GUIDANCE_SMOKE}>
            <NumberField
              label="Storeys used as living accommodation"
              value={state.wizard.storeyCount}
              onChange={(value) => setField('storeyCount', value)}
              min={1}
              disabled={!stepFlags.consumerUnitMaterial}
            />

            <NumberField
              label="Working smoke alarms found"
              value={state.wizard.smokeDetectorCount}
              onChange={(value) => setField('smokeDetectorCount', value)}
              min={0}
              disabled={!stepFlags.consumerUnitMaterial}
            />

            <Callout tone={smokeAlarmCountMeetsGuidance ? 'success' : 'warning'} inset>
              {smokeAlarmCountMeetsGuidance
                ? `Smoke alarm count meets the minimum storey-based guidance (${minimumRecommendedSmokeAlarms} required).`
                : `Record at least ${minimumRecommendedSmokeAlarms} working smoke alarm(s) for the ${state.wizard.storeyCount} storey/storeys used as living accommodation.`}
            </Callout>
          </SectionCard>

          <SectionCard title="Smoke detector evidence" hint="One clear photo per alarm recorded above.">
            {state.wizard.smokeDetectorCount === 0 ? (
              <AppText variant="caption" tone="muted">
                No smoke detector photos required.
              </AppText>
            ) : (
              Array.from({ length: state.wizard.smokeDetectorCount }, (_, index) => {
                const existing = getImageFor('smoke_detector', index);
                const locked = !stepFlags.smokeCount;

                return (
                  <View
                    key={index}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      paddingVertical: 9,
                      borderBottomWidth: 1,
                      borderBottomColor: palette.line,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyStrong" tone={locked ? 'soft' : 'default'}>
                        {`Take photo of smoke detector ${index + 1}`}
                      </AppText>
                      <AppText
                        variant="caption"
                        tone={
                          existing?.qualityAssessment?.isSufficient
                            ? 'success'
                            : existing
                              ? 'danger'
                              : 'soft'
                        }
                        style={{ marginTop: 2 }}
                      >
                        {existing
                          ? existing.qualityAssessment?.isSufficient
                            ? `Accepted${existing.qualityAssessment?.score ? ` • score ${existing.qualityAssessment.score}` : ''}`
                            : 'Retake required'
                          : 'Not captured'}
                      </AppText>
                    </View>

                    <Button
                      label={existing ? 'Retake' : 'Capture'}
                      size="small"
                      variant="soft"
                      disabled={locked}
                      onPress={() =>
                        openCapture(
                          'smoke_detector',
                          `Take photo of smoke detector ${index + 1}`,
                          'consumer_unit',
                          index,
                        )
                      }
                    />
                  </View>
                );
              })
            )}
          </SectionCard>

          <SectionCard title="Solid fuel burning appliance" hint={LANDLORD_GUIDANCE_CO}>
            <ChoiceChips
              label="Is a solid fuel burning appliance present?"
              options={YES_NO}
              value={state.wizard.hasSolidFuelAppliance}
              onChange={(value) => setField('hasSolidFuelAppliance', value)}
              disabled={!stepFlags.smokePhotos}
              layout="row"
            />

            {state.wizard.hasSolidFuelAppliance === true ? (
              <View style={{ gap: 8 }}>
                <Button
                  label={
                    state.wizard.coDetectorTested
                      ? 'CO detector marked as tested'
                      : 'Mark CO detector as tested'
                  }
                  icon={state.wizard.coDetectorTested ? 'checkmark-circle' : 'flask-outline'}
                  variant={state.wizard.coDetectorTested ? 'soft' : 'solid'}
                  disabled={!stepFlags.solidFuelQuestion}
                  onPress={() => setField('coDetectorTested', !state.wizard.coDetectorTested)}
                  block
                />

                <Button
                  label={coDetectorPhotoDone ? 'Retake CO detector photo' : 'Capture CO detector photo'}
                  icon="camera"
                  variant="outline"
                  disabled={!state.wizard.coDetectorTested}
                  onPress={() =>
                    openCapture('co_detector', 'Take a photo of the CO detector', 'consumer_unit')
                  }
                  block
                />
              </View>
            ) : state.wizard.hasSolidFuelAppliance === false ? (
              <AppText variant="caption" tone="success">
                CO detector branch skipped.
              </AppText>
            ) : null}
          </SectionCard>
        </>
      ) : (
        <Callout tone="info" title="Conditional question branch">
          Smoke and CO alarm questions are skipped because the selected report purpose and
          occupancy profile do not indicate a tenancy-focused workflow.
        </Callout>
      )}

      <Callout tone="info" title="Planned next branching questions">
        Still to add: PME / TN-S / TT earthing branch, Ze / PFC capture, main switch rating
        confirmation, bonding conductor sizes, and a fuller non-domestic branch for commercial,
        industrial and marine installations.
      </Callout>

      <View style={{ marginTop: 4 }}>
        <Button
          label="Continue to Review"
          icon="arrow-forward"
          size="large"
          disabled={!reviewUnlocked}
          onPress={() => router.push('/(tabs)/review')}
          block
        />
      </View>

      <AppText variant="caption" tone="soft" style={{ textAlign: 'center', marginTop: 12 }}>
        Workflow reference: mobile/MOBILE_WIZARD_WORKFLOW.md
      </AppText>
    </Screen>
  );
}
