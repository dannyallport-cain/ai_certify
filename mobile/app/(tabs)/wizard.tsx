import { useMemo } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useJob, type WizardPhotoType } from '@/components/JobStateContext';

type StepItem = {
  key: string;
  title: string;
  detail: string;
  done: boolean;
  locked: boolean;
  actionLabel?: string;
  onPress?: () => void;
};

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

const reportPurposeOptions = [
  { label: 'Private rented sector EICR (5 yearly)', value: 'private_rented_sector_eicr' as const },
  { label: 'Change of tenancy', value: 'change_of_tenancy' as const },
  { label: 'Homebuyer / vendor report', value: 'homebuyer_vendor' as const },
  { label: 'Periodic inspection / maintenance', value: 'periodic_inspection_maintenance' as const },
  { label: 'Insurance', value: 'insurance' as const },
  { label: 'Pre-purchase', value: 'pre_purchase' as const },
  { label: 'Other', value: 'other' as const },
];

const installationTypeOptions = [
  { label: 'Domestic', value: 'domestic' as const },
  { label: 'Commercial', value: 'commercial' as const },
  { label: 'Industrial', value: 'industrial' as const },
  { label: 'Caravan', value: 'caravan' as const },
  { label: 'Boat', value: 'boat' as const },
  { label: 'Mixed use', value: 'mixed_use' as const },
  { label: 'Other', value: 'other' as const },
];

const occupancyTypeOptions = [
  { label: 'Tenanted', value: 'tenanted' as const },
  { label: 'Owner occupied', value: 'owner_occupied' as const },
  { label: 'Void property', value: 'void' as const },
  { label: 'Managed block / communal', value: 'managed_block' as const },
  { label: 'Other', value: 'other' as const },
];

const supplyPhaseOptions = [
  { label: 'Single phase', value: 'single_phase' as const },
  { label: 'Three phase', value: 'three_phase' as const },
  { label: 'Unknown', value: 'unknown' as const },
];

const dataEntryModeOptions = [
  { label: 'Guided photo workflow', value: 'guided_photo' as const },
  { label: 'Manual entry only', value: 'manual_only' as const },
  { label: 'Hybrid: photos + manual', value: 'hybrid' as const },
];

function StepCard({ title, detail, done, locked, actionLabel, onPress }: StepItem) {
  return (
    <View className={`mb-3 rounded-2xl border p-4 ${locked ? 'border-gray-200 bg-gray-100' : 'border-gray-200 bg-white'}`}>
      <View className="flex-row items-start">
        <View className={`mr-3 h-9 w-9 items-center justify-center rounded-full ${done ? 'bg-green-100' : locked ? 'bg-gray-200' : 'bg-brand/10'}`}>
          <Ionicons
            name={done ? 'checkmark' : locked ? 'lock-closed-outline' : 'ellipse-outline'}
            size={18}
            color={done ? '#16a34a' : locked ? '#9ca3af' : '#BE0000'}
          />
        </View>
        <View className="flex-1">
          <Text className={`font-semibold ${locked ? 'text-gray-500' : 'text-gray-900'}`}>{title}</Text>
          <Text className={`mt-1 text-sm ${locked ? 'text-gray-400' : 'text-gray-500'}`}>{detail}</Text>

          {actionLabel && onPress ? (
            <TouchableOpacity
              className={`mt-3 self-start rounded-xl px-4 py-2 ${locked ? 'bg-gray-300' : 'bg-brand'}`}
              onPress={onPress}
              disabled={locked}
            >
              <Text className="text-sm font-semibold text-white">{actionLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function WizardScreen() {
  const { state, dispatch } = useJob();

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
      required: state.wizard.hasDamagedAccessory === true,
      answered: state.wizard.hasDamagedAccessory !== null,
      image: getImageFor('damaged_accessory'),
    },
    {
      type: 'damaged_luminaire' as const,
      question: 'Any damaged luminaires found?',
      label: 'Take a photo of the damaged luminaire',
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
    state.wizard.dataEntryMode === 'guided_photo' ||
    state.wizard.dataEntryMode === 'hybrid';

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
    smokeCount:
      !requiresSmokeAndCoFlow ||
      (state.wizard.storeyCount >= 1 && smokeAlarmCountMeetsGuidance),
    smokePhotos: !requiresSmokeAndCoFlow || smokePhotosDone,
    solidFuelQuestion:
      !requiresSmokeAndCoFlow || state.wizard.hasSolidFuelAppliance !== null,
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

  const outstandingRequiredPhotos = requiredPhotoPlan.filter((item) => item.required && !item.complete);
  const nextOutstandingPhoto = outstandingRequiredPhotos.find((item) => !item.blocked) ?? null;

  function openCapture(
    type: WizardPhotoType,
    label: string,
    mode: 'consumer_unit' | 'circuit_label',
    slotIndex?: number,
  ) {
    dispatch({
      type: 'SET_ACTIVE_CAPTURE',
      payload: {
        type,
        label,
        mode,
        slotIndex: slotIndex ?? null,
      },
    });
    router.push('/(tabs)/capture');
  }

  function skipOptionalPhoto(type: WizardPhotoType) {
    dispatch({
      type: 'REMOVE_IMAGE_BY_TARGET',
      payload: { type, slotIndex: null },
    });
  }

  const steps: StepItem[] = [
    {
      key: 'customer',
      title: '1. Enter customer name',
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
      title: '2. Confirm address using GPS or manual entry',
      detail:
        state.gpsAddress || 'Capture the site address from GPS or type it manually.',
      done: stepFlags.address,
      locked: !stepFlags.customer,
      actionLabel: 'Open Address Step',
      onPress: () => router.push('/(tabs)/location'),
    },
    {
      key: 'date',
      title: '3. Inspection date',
      detail: `Auto-set to today: ${displayDate}`,
      done: stepFlags.inspectionDate,
      locked: !stepFlags.address,
    },
    {
      key: 'report-purpose',
      title: '4. Data entry mode',
      detail: state.wizard.dataEntryMode.replaceAll('_', ' '),
      done: stepFlags.dataEntryMode,
      locked: !stepFlags.inspectionDate,
    },
    {
      key: 'report-purpose',
      title: '5. Report purpose',
      detail: state.wizard.reportPurpose
        ? state.wizard.reportPurpose.replaceAll('_', ' ')
        : 'Select why this report is being created.',
      done: stepFlags.reportPurpose,
      locked: !stepFlags.inspectionDate,
    },
    {
      key: 'installation-type',
      title: '6. Installation type',
      detail: state.wizard.installationType
        ? state.wizard.installationType.replaceAll('_', ' ')
        : 'Select the installation type so the wizard asks appropriate questions.',
      done: stepFlags.installationType,
      locked: !stepFlags.reportPurpose,
    },
    {
      key: 'occupancy-type',
      title: '7. Occupancy profile',
      detail: state.wizard.occupancyType
        ? state.wizard.occupancyType.replaceAll('_', ' ')
        : 'Select whether the premises are tenanted, owner occupied, void, or similar.',
      done: stepFlags.occupancyType,
      locked: !stepFlags.installationType,
    },
    {
      key: 'supply-phase',
      title: '8. Supply characteristics',
      detail:
        state.wizard.supplyPhase &&
        state.wizard.hasOutbuildingsOrAncillarySupplies !== null
          ? `${state.wizard.supplyPhase.replaceAll('_', ' ')} supply • ancillary supplies ${state.wizard.hasOutbuildingsOrAncillarySupplies ? 'present' : 'not present'}`
          : 'Confirm phase arrangement and whether there are outbuildings or ancillary supplies.',
      done: stepFlags.supplyPhase && stepFlags.ancillarySupplies,
      locked: !stepFlags.occupancyType,
    },
    {
      key: 'required-photos',
      title: '9. Guided evidence photos',
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
      title: '10. Consumer unit material',
      detail: !isDomesticStyleInstallation
        ? 'Skipped for non-domestic style installations.'
        : state.wizard.consumerUnitMaterial
          ? `Selected: ${state.wizard.consumerUnitMaterial.replaceAll('_', ' ')}`
          : 'Is the consumer unit metal or plastic?',
      done: stepFlags.consumerUnitMaterial,
      locked: !stepFlags.requiredPhotos,
    },
    {
      key: 'smoke-count',
      title: '11. Storeys and smoke alarm quantity',
      detail: !requiresSmokeAndCoFlow
        ? 'Skipped because this workflow is not using the landlord smoke alarm branch.'
        : smokeAlarmCountMeetsGuidance
          ? `${state.wizard.storeyCount} storey/storeys entered and ${state.wizard.smokeDetectorCount} smoke alarm(s) recorded.`
          : `Enter storeys used as living accommodation and record at least ${minimumRecommendedSmokeAlarms} smoke alarm(s).`,
      done: stepFlags.smokeCount,
      locked: !stepFlags.consumerUnitMaterial,
    },
    {
      key: 'smoke-photos',
      title: '12. Smoke detector photos',
      detail: !requiresSmokeAndCoFlow
        ? 'Skipped because this workflow is not using the landlord smoke alarm branch.'
        : state.wizard.smokeDetectorCount === 0
          ? 'No smoke detector photos required.'
          : `${state.capturedImages.filter((image) => image.type === 'smoke_detector' && image.qualityAssessment?.isSufficient).length}/${state.wizard.smokeDetectorCount} smoke detector photo(s) accepted.`,
      done: stepFlags.smokePhotos,
      locked: !stepFlags.smokeCount,
    },
    {
      key: 'solid-fuel',
      title: '13. Solid fuel appliance question',
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
      title: '14. CO detector branch',
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
    <ScrollView className="flex-1 bg-gray-50 px-4 pt-6">
      <View className="mb-5 rounded-3xl bg-brand px-5 py-5">
        <Text className="mb-2 text-2xl font-bold text-white">Guided Wizard</Text>
        <Text className="text-white/90">
          Start by defining the report purpose and installation type so the app only
          asks relevant questions and can pre-fill more of the certificate.
        </Text>
      </View>

      <Text className="mb-3 text-lg font-bold text-gray-900">Workflow progress</Text>
      {steps.map(({ key, ...step }) => (
        <StepCard key={key} {...step} />
      ))}

      <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
        <Text className="mb-3 font-semibold text-gray-900">Data entry mode</Text>
        <Text className="mb-3 text-sm text-gray-500">
          Choose whether this certificate will be created from guided photos, fully manual data entry, or a hybrid of both.
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {dataEntryModeOptions.map((option) => {
            const selected = state.wizard.dataEntryMode === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                className={`rounded-xl border px-4 py-3 ${selected ? 'border-brand bg-brand' : 'border-gray-300 bg-white'} ${!stepFlags.inspectionDate ? 'opacity-50' : ''}`}
                disabled={!stepFlags.inspectionDate}
                onPress={() =>
                  dispatch({
                    type: 'SET_WIZARD_FIELD',
                    payload: { key: 'dataEntryMode', value: option.value },
                  })
                }
              >
                <Text className={`font-medium ${selected ? 'text-white' : 'text-gray-700'}`}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
        <Text className="mb-3 font-semibold text-gray-900">Report purpose</Text>
        <Text className="mb-3 text-sm text-gray-500">
          This helps the app adapt the evidence flow and suggested certificate wording.
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {reportPurposeOptions.map((option) => {
            const selected = state.wizard.reportPurpose === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                className={`rounded-xl border px-4 py-3 ${selected ? 'border-brand bg-brand' : 'border-gray-300 bg-white'} ${!stepFlags.inspectionDate ? 'opacity-50' : ''}`}
                disabled={!stepFlags.dataEntryMode}
                onPress={() =>
                  dispatch({
                    type: 'SET_WIZARD_FIELD',
                    payload: { key: 'reportPurpose', value: option.value },
                  })
                }
              >
                <Text className={`font-medium ${selected ? 'text-white' : 'text-gray-700'}`}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
        <Text className="mb-3 font-semibold text-gray-900">Installation type</Text>
        <Text className="mb-3 text-sm text-gray-500">
          The installation type controls which downstream questions are relevant.
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {installationTypeOptions.map((option) => {
            const selected = state.wizard.installationType === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                className={`rounded-xl border px-4 py-3 ${selected ? 'border-brand bg-brand' : 'border-gray-300 bg-white'} ${!stepFlags.reportPurpose ? 'opacity-50' : ''}`}
                disabled={!stepFlags.reportPurpose}
                onPress={() =>
                  dispatch({
                    type: 'SET_WIZARD_FIELD',
                    payload: { key: 'installationType', value: option.value },
                  })
                }
              >
                <Text className={`font-medium ${selected ? 'text-white' : 'text-gray-700'}`}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
        <Text className="mb-3 font-semibold text-gray-900">Occupancy profile</Text>
        <Text className="mb-3 text-sm text-gray-500">
          Tenanted properties enable landlord-oriented smoke and CO alarm checks.
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {occupancyTypeOptions.map((option) => {
            const selected = state.wizard.occupancyType === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                className={`rounded-xl border px-4 py-3 ${selected ? 'border-brand bg-brand' : 'border-gray-300 bg-white'} ${!stepFlags.installationType ? 'opacity-50' : ''}`}
                disabled={!stepFlags.installationType}
                onPress={() =>
                  dispatch({
                    type: 'SET_WIZARD_FIELD',
                    payload: { key: 'occupancyType', value: option.value },
                  })
                }
              >
                <Text className={`font-medium ${selected ? 'text-white' : 'text-gray-700'}`}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
        <Text className="mb-3 font-semibold text-gray-900">Supply characteristics</Text>
        <Text className="mb-2 text-sm font-medium text-gray-800">Supply phase</Text>
        <View className="mb-3 flex-row flex-wrap gap-2">
          {supplyPhaseOptions.map((option) => {
            const selected = state.wizard.supplyPhase === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                className={`rounded-xl border px-4 py-3 ${selected ? 'border-brand bg-brand' : 'border-gray-300 bg-white'} ${!stepFlags.occupancyType ? 'opacity-50' : ''}`}
                disabled={!stepFlags.occupancyType}
                onPress={() =>
                  dispatch({
                    type: 'SET_WIZARD_FIELD',
                    payload: { key: 'supplyPhase', value: option.value },
                  })
                }
              >
                <Text className={`font-medium ${selected ? 'text-white' : 'text-gray-700'}`}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text className="mb-2 text-sm font-medium text-gray-800">
          Outbuildings or ancillary supplies present?
        </Text>
        <View className="flex-row gap-2">
          <TouchableOpacity
            className={`flex-1 items-center rounded-xl border py-3 ${state.wizard.hasOutbuildingsOrAncillarySupplies === true ? 'border-brand bg-brand' : 'border-gray-300 bg-white'} ${!stepFlags.occupancyType ? 'opacity-50' : ''}`}
            disabled={!stepFlags.occupancyType}
            onPress={() =>
              dispatch({
                type: 'SET_WIZARD_FIELD',
                payload: { key: 'hasOutbuildingsOrAncillarySupplies', value: true },
              })
            }
          >
            <Text
              className={`font-medium ${state.wizard.hasOutbuildingsOrAncillarySupplies === true ? 'text-white' : 'text-gray-700'}`}
            >
              Yes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 items-center rounded-xl border py-3 ${state.wizard.hasOutbuildingsOrAncillarySupplies === false ? 'border-brand bg-brand' : 'border-gray-300 bg-white'} ${!stepFlags.occupancyType ? 'opacity-50' : ''}`}
            disabled={!stepFlags.occupancyType}
            onPress={() =>
              dispatch({
                type: 'SET_WIZARD_FIELD',
                payload: { key: 'hasOutbuildingsOrAncillarySupplies', value: false },
              })
            }
          >
            <Text
              className={`font-medium ${state.wizard.hasOutbuildingsOrAncillarySupplies === false ? 'text-white' : 'text-gray-700'}`}
            >
              No
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {usesPhotoEvidence ? (
        <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
        <Text className="mb-1 font-semibold text-gray-900">Guided evidence photos</Text>
        <Text className="mb-3 text-sm text-gray-500">
          Mandatory: consumer unit, consumer unit with front removed, and bonding.
          The app will also ask whether damaged sockets, switches, accessories, or luminaires are present and require photos when they are confirmed.
        </Text>

        <View className={`mb-4 rounded-2xl border px-4 py-4 ${outstandingRequiredPhotos.length === 0 ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
          <Text className={`font-semibold ${outstandingRequiredPhotos.length === 0 ? 'text-green-800' : 'text-amber-800'}`}>
            {outstandingRequiredPhotos.length === 0
              ? 'All currently required photos have been accepted'
              : `${outstandingRequiredPhotos.length} required photo step(s) still need attention`}
          </Text>
          <Text className={`mt-1 text-sm ${outstandingRequiredPhotos.length === 0 ? 'text-green-700' : 'text-amber-700'}`}>
            Required evidence can include the consumer unit, consumer unit with front removed, bonding, any damaged sockets or switches, damaged luminaires, smoke detectors, and a CO detector where applicable.
          </Text>

          {nextOutstandingPhoto ? (
            <TouchableOpacity
              className="mt-3 self-start rounded-xl bg-brand px-4 py-3"
              onPress={nextOutstandingPhoto.action}
            >
              <Text className="font-semibold text-white">{`Next required photo: ${nextOutstandingPhoto.label}`}</Text>
            </TouchableOpacity>
          ) : null}

          <View className="mt-4 gap-2">
            {requiredPhotoPlan.filter((item) => item.required).map((item) => (
              <View key={item.id} className="flex-row items-start justify-between rounded-xl bg-white/80 px-3 py-3">
                <View className="mr-3 flex-1">
                  <Text className="font-medium text-gray-900">{item.label}</Text>
                  <Text className={`mt-1 text-xs ${item.complete ? 'text-green-700' : item.blocked ? 'text-amber-700' : 'text-red-600'}`}>
                    {item.helper}
                  </Text>
                </View>
                <Ionicons
                  name={item.complete ? 'checkmark-circle' : item.blocked ? 'alert-circle-outline' : 'camera-outline'}
                  size={20}
                  color={item.complete ? '#16a34a' : item.blocked ? '#b45309' : '#BE0000'}
                />
              </View>
            ))}
          </View>
        </View>
        {requiredPhotoStatus.map((photo) => {
          const existing = getImageFor(photo.type);
          const locked = !stepFlags.supplyPhase || !stepFlags.ancillarySupplies;
          const statusText = existing
            ? existing.qualityAssessment?.isSufficient
              ? `Accepted${photo.qualityScore ? ` • score ${photo.qualityScore}` : ''}`
              : 'Retake required'
            : 'Not captured';

          return (
            <View
              key={photo.type}
              className="flex-row items-center justify-between border-b border-gray-100 py-2 last:border-b-0"
            >
              <View className="flex-1 pr-3">
                <Text className={`font-medium ${locked ? 'text-gray-400' : 'text-gray-800'}`}>
                  {photo.label}
                </Text>
                <Text
                  className={`mt-1 text-xs ${
                    existing
                      ? existing.qualityAssessment?.isSufficient
                        ? 'text-green-700'
                        : 'text-red-500'
                      : 'text-gray-400'
                  }`}
                >
                  {statusText}
                </Text>
              </View>
              <View className="items-end gap-2">
                <TouchableOpacity
                  className={`rounded-xl px-3 py-2 ${locked ? 'bg-gray-300' : 'bg-brand'}`}
                  disabled={locked}
                  onPress={() => openCapture(photo.type, photo.label, photo.mode)}
                >
                  <Text className="text-sm font-semibold text-white">
                    {existing ? 'Retake' : 'Capture'}
                  </Text>
                </TouchableOpacity>
                
              </View>
            </View>
          );
        })}
        <View className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <Text className="mb-3 font-semibold text-gray-900">Damage prompts</Text>
          <Text className="mb-3 text-sm text-gray-500">
            Confirm whether any damaged sockets, switches, accessories, or luminaires are present. If yes, a clear photo becomes mandatory for that defect.
          </Text>

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
              <View key={item.type} className="mb-4 rounded-xl border border-gray-200 bg-white p-3 last:mb-0">
                <Text className={`font-medium ${locked ? 'text-gray-400' : 'text-gray-800'}`}>{item.question}</Text>
                <View className="mt-3 flex-row gap-2">
                  <TouchableOpacity
                    className={`flex-1 items-center rounded-xl border py-3 ${state.wizard[item.type === 'damaged_accessory' ? 'hasDamagedAccessory' : 'hasDamagedLuminaire'] === true ? 'border-brand bg-brand' : 'border-gray-300 bg-white'} ${locked ? 'opacity-50' : ''}`}
                    disabled={locked}
                    onPress={() =>
                      dispatch({
                        type: 'SET_WIZARD_FIELD',
                        payload: {
                          key: item.type === 'damaged_accessory' ? 'hasDamagedAccessory' : 'hasDamagedLuminaire',
                          value: true,
                        },
                      })
                    }
                  >
                    <Text
                      className={`font-medium ${state.wizard[item.type === 'damaged_accessory' ? 'hasDamagedAccessory' : 'hasDamagedLuminaire'] === true ? 'text-white' : 'text-gray-700'}`}
                    >
                      Yes
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-1 items-center rounded-xl border py-3 ${state.wizard[item.type === 'damaged_accessory' ? 'hasDamagedAccessory' : 'hasDamagedLuminaire'] === false ? 'border-brand bg-brand' : 'border-gray-300 bg-white'} ${locked ? 'opacity-50' : ''}`}
                    disabled={locked}
                    onPress={() =>
                      dispatch({
                        type: 'SET_WIZARD_FIELD',
                        payload: {
                          key: item.type === 'damaged_accessory' ? 'hasDamagedAccessory' : 'hasDamagedLuminaire',
                          value: false,
                        },
                      })
                    }
                  >
                    <Text
                      className={`font-medium ${state.wizard[item.type === 'damaged_accessory' ? 'hasDamagedAccessory' : 'hasDamagedLuminaire'] === false ? 'text-white' : 'text-gray-700'}`}
                    >
                      No
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text
                  className={`mt-3 text-xs ${
                    !item.answered
                      ? 'text-amber-700'
                      : item.required
                        ? item.captured
                          ? 'text-green-700'
                          : 'text-red-500'
                        : 'text-gray-500'
                  }`}
                >
                  {statusText}
                </Text>

                {item.required ? (
                  <View className="mt-3 flex-row gap-2">
                    <TouchableOpacity
                      className={`flex-1 items-center rounded-xl px-3 py-3 ${locked ? 'bg-gray-300' : 'bg-brand'}`}
                      disabled={locked}
                      onPress={() => openCapture(item.type, item.label, 'consumer_unit')}
                    >
                      <Text className="text-sm font-semibold text-white">
                        {item.image ? 'Retake photo' : 'Capture photo'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className={`items-center rounded-xl border px-3 py-3 ${locked ? 'border-gray-200 bg-gray-100' : 'border-gray-300 bg-white'}`}
                      disabled={locked}
                      onPress={() => skipOptionalPhoto(item.type)}
                    >
                      <Text className={`text-sm font-semibold ${locked ? 'text-gray-400' : 'text-gray-700'}`}>
                        Clear photo
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
      ) : (
        <View className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <Text className="font-semibold text-blue-900">Manual certificate route</Text>
          <Text className="mt-1 text-sm text-blue-800">
            Guided evidence photos are skipped. The certificate can be completed from manual interrogation and direct test result entry on the certificate screen.
          </Text>
        </View>
      )}

      {isDomesticStyleInstallation ? (
        <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="mb-3 font-semibold text-gray-900">Consumer unit material</Text>
          <View className="flex-row flex-wrap gap-2">
            {[
              { label: 'Metal', value: 'metal' as const },
              { label: 'Plastic', value: 'plastic' as const },
              { label: 'Not sure', value: 'not_sure' as const },
            ].map((materialOption) => {
              const selected = state.wizard.consumerUnitMaterial === materialOption.value;
              return (
                <TouchableOpacity
                  key={materialOption.value}
                  className={`rounded-xl border px-4 py-3 ${selected ? 'border-brand bg-brand' : 'border-gray-300 bg-white'} ${!stepFlags.requiredPhotos ? 'opacity-50' : ''}`}
                  disabled={!stepFlags.requiredPhotos}
                  onPress={() =>
                    dispatch({
                      type: 'SET_WIZARD_FIELD',
                      payload: { key: 'consumerUnitMaterial', value: materialOption.value },
                    })
                  }
                >
                  <Text className={`font-medium ${selected ? 'text-white' : 'text-gray-700'}`}>
                    {materialOption.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : (
        <View className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <Text className="font-semibold text-blue-900">Installation-specific branching</Text>
          <Text className="mt-1 text-sm text-blue-800">
            Consumer unit material has been skipped because this installation type is not
            domestic-style. This is where further commercial / industrial / marine
            question branches can be added next.
          </Text>
        </View>
      )}

      {requiresSmokeAndCoFlow ? (
        <>
          <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
            <Text className="mb-2 font-semibold text-gray-900">
              Landlord smoke alarm requirement
            </Text>
            <Text className="mb-2 text-sm text-gray-500">{LANDLORD_GUIDANCE_SMOKE}</Text>
            <Text className="mb-3 text-sm text-gray-500">
              Enter the number of storeys used as living accommodation, then confirm at
              least one working smoke alarm on each floor and capture a photo of each alarm.
            </Text>

            <Text className="mb-2 text-sm font-medium text-gray-800">
              Number of storeys used as living accommodation
            </Text>
            <TextInput
              className={`mb-3 rounded-xl border border-gray-300 px-4 py-3 text-base ${!stepFlags.consumerUnitMaterial ? 'opacity-50' : ''}`}
              value={String(state.wizard.storeyCount)}
              onChangeText={(value) =>
                dispatch({
                  type: 'SET_WIZARD_FIELD',
                  payload: {
                    key: 'storeyCount',
                    value: Math.max(1, parseInt(value || '1', 10) || 1),
                  },
                })
              }
              keyboardType="number-pad"
              placeholder="1"
              editable={stepFlags.consumerUnitMaterial}
            />

            <Text className="mb-2 text-sm font-medium text-gray-800">
              Number of working smoke alarms found
            </Text>
            <TextInput
              className={`rounded-xl border border-gray-300 px-4 py-3 text-base ${!stepFlags.consumerUnitMaterial ? 'opacity-50' : ''}`}
              value={String(state.wizard.smokeDetectorCount)}
              onChangeText={(value) =>
                dispatch({
                  type: 'SET_WIZARD_FIELD',
                  payload: {
                    key: 'smokeDetectorCount',
                    value: Math.max(0, parseInt(value || '0', 10) || 0),
                  },
                })
              }
              keyboardType="number-pad"
              placeholder="0"
              editable={stepFlags.consumerUnitMaterial}
            />

            <View
              className={`mt-3 rounded-xl border px-3 py-3 ${smokeAlarmCountMeetsGuidance ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}
            >
              <Text
                className={`text-sm font-medium ${smokeAlarmCountMeetsGuidance ? 'text-green-700' : 'text-amber-700'}`}
              >
                {smokeAlarmCountMeetsGuidance
                  ? `Smoke alarm count meets the minimum storey-based guidance (${minimumRecommendedSmokeAlarms} required).`
                  : `Record at least ${minimumRecommendedSmokeAlarms} working smoke alarm(s) for the ${state.wizard.storeyCount} storey/storeys used as living accommodation.`}
              </Text>
            </View>
          </View>

          <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
            <Text className="mb-2 font-semibold text-gray-900">Smoke detector evidence</Text>
            {state.wizard.smokeDetectorCount === 0 ? (
              <Text className="text-sm text-gray-500">No smoke detector photos required.</Text>
            ) : (
              Array.from({ length: state.wizard.smokeDetectorCount }, (_, index) => {
                const existing = getImageFor('smoke_detector', index);
                const locked = !stepFlags.smokeCount;
                return (
                  <View
                    key={index}
                    className="flex-row items-center justify-between border-b border-gray-100 py-2 last:border-b-0"
                  >
                    <View className="flex-1 pr-3">
                      <Text className={`${locked ? 'text-gray-400' : 'text-gray-800'} font-medium`}>
                        Take photo of smoke detector {index + 1}
                      </Text>
                      <Text
                        className={`mt-1 text-xs ${existing?.qualityAssessment?.isSufficient ? 'text-green-700' : existing ? 'text-red-500' : 'text-gray-400'}`}
                      >
                        {existing
                          ? existing.qualityAssessment?.isSufficient
                            ? `Accepted${existing.qualityAssessment?.score ? ` • score ${existing.qualityAssessment.score}` : ''}`
                            : 'Retake required'
                          : 'Not captured'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      className={`rounded-xl px-3 py-2 ${locked ? 'bg-gray-300' : 'bg-brand'}`}
                      disabled={locked}
                      onPress={() =>
                        openCapture(
                          'smoke_detector',
                          `Take photo of smoke detector ${index + 1}`,
                          'consumer_unit',
                          index,
                        )
                      }
                    >
                      <Text className="text-sm font-semibold text-white">
                        {existing ? 'Retake' : 'Capture'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>

          <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
            <Text className="mb-3 font-semibold text-gray-900">
              Solid fuel burning appliance
            </Text>
            <Text className="mb-2 text-sm text-gray-500">{LANDLORD_GUIDANCE_CO}</Text>
            <Text className="mb-3 text-sm text-gray-500">
              If one is present, confirm a CO alarm is provided, test it where appropriate,
              and capture a clear photo.
            </Text>

            <View className="mb-3 flex-row gap-2">
              <TouchableOpacity
                className={`flex-1 items-center rounded-xl border py-3 ${state.wizard.hasSolidFuelAppliance === true ? 'border-brand bg-brand' : 'border-gray-300 bg-white'} ${!stepFlags.smokePhotos ? 'opacity-50' : ''}`}
                disabled={!stepFlags.smokePhotos}
                onPress={() =>
                  dispatch({
                    type: 'SET_WIZARD_FIELD',
                    payload: { key: 'hasSolidFuelAppliance', value: true },
                  })
                }
              >
                <Text
                  className={`font-medium ${state.wizard.hasSolidFuelAppliance === true ? 'text-white' : 'text-gray-700'}`}
                >
                  Yes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 items-center rounded-xl border py-3 ${state.wizard.hasSolidFuelAppliance === false ? 'border-brand bg-brand' : 'border-gray-300 bg-white'} ${!stepFlags.smokePhotos ? 'opacity-50' : ''}`}
                disabled={!stepFlags.smokePhotos}
                onPress={() =>
                  dispatch({
                    type: 'SET_WIZARD_FIELD',
                    payload: { key: 'hasSolidFuelAppliance', value: false },
                  })
                }
              >
                <Text
                  className={`font-medium ${state.wizard.hasSolidFuelAppliance === false ? 'text-white' : 'text-gray-700'}`}
                >
                  No
                </Text>
              </TouchableOpacity>
            </View>

            {state.wizard.hasSolidFuelAppliance === true && (
              <View className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <TouchableOpacity
                  className={`mb-3 items-center rounded-xl py-3 ${stepFlags.solidFuelQuestion ? 'bg-brand' : 'bg-gray-300'}`}
                  disabled={!stepFlags.solidFuelQuestion}
                  onPress={() =>
                    dispatch({
                      type: 'SET_WIZARD_FIELD',
                      payload: {
                        key: 'coDetectorTested',
                        value: !state.wizard.coDetectorTested,
                      },
                    })
                  }
                >
                  <Text className="font-semibold text-white">
                    {state.wizard.coDetectorTested
                      ? 'CO Detector Tested ✓'
                      : 'Mark CO Detector as Tested'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`items-center rounded-xl py-3 ${state.wizard.coDetectorTested ? 'bg-brand' : 'bg-gray-300'}`}
                  disabled={!state.wizard.coDetectorTested}
                  onPress={() =>
                    openCapture(
                      'co_detector',
                      'Take a photo of the CO detector',
                      'consumer_unit',
                    )
                  }
                >
                  <Text className="font-semibold text-white">
                    {coDetectorPhotoDone
                      ? 'Retake CO Detector Photo'
                      : 'Capture CO Detector Photo'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {state.wizard.hasSolidFuelAppliance === false ? (
              <Text className="text-sm text-green-700">CO detector branch skipped.</Text>
            ) : null}
          </View>
        </>
      ) : (
        <View className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <Text className="font-semibold text-blue-900">Conditional question branch</Text>
          <Text className="mt-1 text-sm text-blue-800">
            Smoke and CO alarm questions are currently skipped because the selected report
            purpose and occupancy profile do not indicate a tenancy-focused workflow.
          </Text>
        </View>
      )}

      <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
        <Text className="mb-2 font-semibold text-gray-900">Suggested next questions</Text>
        <Text className="text-sm text-gray-500">
          Useful additional branching fields to add next: number of distribution boards,
          whether RCD / RCBO protection is present, PME / TN-S / TT supply type, presence
          of EV charger, solar PV, battery storage, SPD, AFDD, and whether there are
          communal areas or landlord supplies.
        </Text>
      </View>

      <TouchableOpacity
        className={`mb-3 items-center rounded-2xl py-4 ${reviewUnlocked ? 'bg-brand' : 'bg-gray-300'}`}
        disabled={!reviewUnlocked}
        onPress={() => router.push('/(tabs)/review')}
      >
        <Text className={`text-base font-bold ${reviewUnlocked ? 'text-white' : 'text-gray-500'}`}>
          Continue to Review
        </Text>
      </TouchableOpacity>

      <Text className="mb-10 text-center text-sm text-gray-400">
        Workflow reference: `mobile/MOBILE_WIZARD_WORKFLOW.md`
      </Text>
    </ScrollView>
  );
}
