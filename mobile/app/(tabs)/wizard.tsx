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
  { type: 'main_fuse', label: 'Take a photo of the main fuse', mode: 'consumer_unit' },
  { type: 'meter', label: 'Take a photo of the meter', mode: 'consumer_unit' },
  { type: 'consumer_unit_cover_on', label: 'Take a photo of the consumer unit with the cover on', mode: 'consumer_unit' },
  { type: 'circuit_schedule', label: 'Take a photo of the circuit schedule', mode: 'circuit_label' },
];

function StepCard({ title, detail, done, locked, actionLabel, onPress }: StepItem) {
  return (
    <View className={`rounded-2xl border p-4 mb-3 ${locked ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-200'}`}>
      <View className="flex-row items-start">
        <View className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${done ? 'bg-green-100' : locked ? 'bg-gray-200' : 'bg-brand/10'}`}>
          <Ionicons
            name={done ? 'checkmark' : locked ? 'lock-closed-outline' : 'ellipse-outline'}
            size={18}
            color={done ? '#16a34a' : locked ? '#9ca3af' : '#BE0000'}
          />
        </View>
        <View className="flex-1">
          <Text className={`font-semibold ${locked ? 'text-gray-500' : 'text-gray-900'}`}>{title}</Text>
          <Text className={`text-sm mt-1 ${locked ? 'text-gray-400' : 'text-gray-500'}`}>{detail}</Text>

          {actionLabel && onPress ? (
            <TouchableOpacity
              className={`self-start mt-3 rounded-xl px-4 py-2 ${locked ? 'bg-gray-300' : 'bg-brand'}`}
              onPress={onPress}
              disabled={locked}
            >
              <Text className="text-white font-semibold text-sm">{actionLabel}</Text>
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

  const requiredPhotoStatus = requiredElectricalPhotos.map((photo) => ({
    ...photo,
    captured: !!getImageFor(photo.type),
  }));

  const requiredPhotosDone = requiredPhotoStatus.every((item) => item.captured);
  const smokePhotosDone =
    state.wizard.smokeDetectorCount === 0 ||
    Array.from({ length: state.wizard.smokeDetectorCount }, (_, index) => !!getImageFor('smoke_detector', index)).every(Boolean);
  const coDetectorPhotoDone = !!getImageFor('co_detector');
  const coBranchRequired = state.wizard.hasSolidFuelAppliance === true;
  const coBranchDone = !coBranchRequired || (state.wizard.coDetectorTested && coDetectorPhotoDone);

  function openCapture(type: WizardPhotoType, label: string, mode: 'consumer_unit' | 'circuit_label', slotIndex?: number) {
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

  const stepFlags = {
    customer: !!state.selectedCustomer,
    address: !!state.gpsAddress,
    inspectionDate: !!state.wizard.inspectionDate,
    requiredPhotos: requiredPhotosDone,
    consumerUnitMaterial: state.wizard.consumerUnitMaterial !== null,
    smokeCount: state.wizard.smokeDetectorCount >= 0,
    smokePhotos: smokePhotosDone,
    solidFuelQuestion: state.wizard.hasSolidFuelAppliance !== null,
    coBranch: coBranchDone,
  };

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
      detail: state.gpsAddress || 'Capture the site address from GPS or type it manually.',
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
      key: 'required-photos',
      title: '4. Required electrical photos',
      detail: requiredPhotosDone
        ? 'All required electrical photos captured.'
        : `${requiredPhotoStatus.filter((item) => item.captured).length}/${requiredPhotoStatus.length} required electrical photos captured.`,
      done: stepFlags.requiredPhotos,
      locked: !stepFlags.inspectionDate,
    },
    {
      key: 'consumer-unit-material',
      title: '5. Consumer unit material',
      detail: state.wizard.consumerUnitMaterial
        ? `Selected: ${state.wizard.consumerUnitMaterial.replaceAll('_', ' ')}`
        : 'Is the consumer unit metal or plastic?',
      done: stepFlags.consumerUnitMaterial,
      locked: !stepFlags.requiredPhotos,
    },
    {
      key: 'smoke-count',
      title: '6. Smoke detector quantity',
      detail: `${state.wizard.smokeDetectorCount} detector(s) entered.`,
      done: stepFlags.smokeCount,
      locked: !stepFlags.consumerUnitMaterial,
    },
    {
      key: 'smoke-photos',
      title: '7. Smoke detector photos',
      detail:
        state.wizard.smokeDetectorCount === 0
          ? 'No smoke detector photos required.'
          : `${state.capturedImages.filter((image) => image.type === 'smoke_detector').length}/${state.wizard.smokeDetectorCount} smoke detector photo(s) captured.`,
      done: stepFlags.smokePhotos,
      locked: !stepFlags.smokeCount,
    },
    {
      key: 'solid-fuel',
      title: '8. Solid fuel appliance question',
      detail:
        state.wizard.hasSolidFuelAppliance === null
          ? 'Answer whether there is a solid fuel burning appliance.'
          : state.wizard.hasSolidFuelAppliance
            ? 'Solid fuel appliance present.'
            : 'No solid fuel appliance present.',
      done: stepFlags.solidFuelQuestion,
      locked: !stepFlags.smokePhotos,
    },
    {
      key: 'co-branch',
      title: '9. CO detector branch',
      detail:
        state.wizard.hasSolidFuelAppliance === true
          ? coBranchDone
            ? 'CO detector tested and photo captured.'
            : 'Complete the CO detector test and capture a photo.'
          : 'Skipped because no solid fuel appliance is present.',
      done: stepFlags.coBranch,
      locked: !stepFlags.solidFuelQuestion,
    },
  ];

  const reviewUnlocked = Object.values(stepFlags).every(Boolean);

  return (
    <ScrollView className="flex-1 bg-gray-50 px-4 pt-6">
      <View className="bg-brand rounded-3xl px-5 py-5 mb-5">
        <Text className="text-white text-2xl font-bold mb-2">Guided Wizard</Text>
        <Text className="text-white/90">
          Follow the steps in order. Each step unlocks the next.
        </Text>
      </View>

      <Text className="text-lg font-bold text-gray-900 mb-3">Workflow progress</Text>
      {steps.map(({ key, ...step }) => (
        <StepCard key={key} {...step} />
      ))}

      <View className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <Text className="text-gray-900 font-semibold mb-3">Required electrical photos</Text>
        {requiredPhotoStatus.map((photo) => {
          const existing = getImageFor(photo.type);
          const locked = !stepFlags.inspectionDate;
          return (
            <View key={photo.type} className="flex-row items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <View className="flex-1 pr-3">
                <Text className={`font-medium ${locked ? 'text-gray-400' : 'text-gray-800'}`}>{photo.label}</Text>
                <Text className={`text-xs mt-1 ${existing ? 'text-green-700' : 'text-gray-400'}`}>
                  {existing ? 'Photo captured' : 'Not captured'}
                </Text>
              </View>
              <TouchableOpacity
                className={`rounded-xl px-3 py-2 ${locked ? 'bg-gray-300' : 'bg-brand'}`}
                disabled={locked}
                onPress={() => openCapture(photo.type, photo.label, photo.mode)}
              >
                <Text className="text-white text-sm font-semibold">{existing ? 'Retake' : 'Capture'}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <View className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <Text className="text-gray-900 font-semibold mb-3">Consumer unit material</Text>
        <View className="flex-row flex-wrap gap-2">
          {[
            { label: 'Metal', value: 'metal' as const },
            { label: 'Plastic', value: 'plastic' as const },
            { label: 'Not sure', value: 'not_sure' as const },
          ].map((option) => {
            const selected = state.wizard.consumerUnitMaterial === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                className={`rounded-xl px-4 py-3 border ${selected ? 'bg-brand border-brand' : 'bg-white border-gray-300'} ${!stepFlags.requiredPhotos ? 'opacity-50' : ''}`}
                disabled={!stepFlags.requiredPhotos}
                onPress={() =>
                  dispatch({
                    type: 'SET_WIZARD_FIELD',
                    payload: { key: 'consumerUnitMaterial', value: option.value },
                  })
                }
              >
                <Text className={`${selected ? 'text-white' : 'text-gray-700'} font-medium`}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <Text className="text-gray-900 font-semibold mb-2">Smoke detectors</Text>
        <Text className="text-gray-500 text-sm mb-3">
          Enter the quantity, then capture one photo for each detector.
        </Text>
        <TextInput
          className={`border border-gray-300 rounded-xl px-4 py-3 text-base ${!stepFlags.consumerUnitMaterial ? 'opacity-50' : ''}`}
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
      </View>

      <View className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <Text className="text-gray-900 font-semibold mb-2">Smoke detector evidence</Text>
        {state.wizard.smokeDetectorCount === 0 ? (
          <Text className="text-gray-500 text-sm">No smoke detector photos required.</Text>
        ) : (
          Array.from({ length: state.wizard.smokeDetectorCount }, (_, index) => {
            const existing = getImageFor('smoke_detector', index);
            const locked = !stepFlags.smokeCount;
            return (
              <View key={index} className="flex-row items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <View className="flex-1 pr-3">
                  <Text className={`${locked ? 'text-gray-400' : 'text-gray-800'} font-medium`}>
                    Take photo of smoke detector {index + 1}
                  </Text>
                  <Text className={`text-xs mt-1 ${existing ? 'text-green-700' : 'text-gray-400'}`}>
                    {existing ? 'Photo captured' : 'Not captured'}
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
                  <Text className="text-white text-sm font-semibold">{existing ? 'Retake' : 'Capture'}</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>

      <View className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <Text className="text-gray-900 font-semibold mb-3">Solid fuel burning appliance</Text>
        <Text className="text-gray-500 text-sm mb-3">
          If one is present, you must test the CO detector and photograph it.
        </Text>

        <View className="flex-row gap-2 mb-3">
          <TouchableOpacity
            className={`flex-1 rounded-xl py-3 items-center border ${state.wizard.hasSolidFuelAppliance === true ? 'bg-brand border-brand' : 'border-gray-300 bg-white'} ${!stepFlags.smokePhotos ? 'opacity-50' : ''}`}
            disabled={!stepFlags.smokePhotos}
            onPress={() =>
              dispatch({
                type: 'SET_WIZARD_FIELD',
                payload: { key: 'hasSolidFuelAppliance', value: true },
              })
            }
          >
            <Text className={`${state.wizard.hasSolidFuelAppliance === true ? 'text-white' : 'text-gray-700'} font-medium`}>
              Yes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 rounded-xl py-3 items-center border ${state.wizard.hasSolidFuelAppliance === false ? 'bg-brand border-brand' : 'border-gray-300 bg-white'} ${!stepFlags.smokePhotos ? 'opacity-50' : ''}`}
            disabled={!stepFlags.smokePhotos}
            onPress={() =>
              dispatch({
                type: 'SET_WIZARD_FIELD',
                payload: { key: 'hasSolidFuelAppliance', value: false },
              })
            }
          >
            <Text className={`${state.wizard.hasSolidFuelAppliance === false ? 'text-white' : 'text-gray-700'} font-medium`}>
              No
            </Text>
          </TouchableOpacity>
        </View>

        {state.wizard.hasSolidFuelAppliance === true && (
          <View className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <TouchableOpacity
              className={`rounded-xl py-3 items-center mb-3 ${stepFlags.solidFuelQuestion ? 'bg-brand' : 'bg-gray-300'}`}
              disabled={!stepFlags.solidFuelQuestion}
              onPress={() =>
                dispatch({
                  type: 'SET_WIZARD_FIELD',
                  payload: { key: 'coDetectorTested', value: !state.wizard.coDetectorTested },
                })
              }
            >
              <Text className="text-white font-semibold">
                {state.wizard.coDetectorTested ? 'CO Detector Tested ✓' : 'Mark CO Detector as Tested'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`rounded-xl py-3 items-center ${state.wizard.coDetectorTested ? 'bg-brand' : 'bg-gray-300'}`}
              disabled={!state.wizard.coDetectorTested}
              onPress={() => openCapture('co_detector', 'Take a photo of the CO detector', 'consumer_unit')}
            >
              <Text className="text-white font-semibold">
                {coDetectorPhotoDone ? 'Retake CO Detector Photo' : 'Capture CO Detector Photo'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {state.wizard.hasSolidFuelAppliance === false ? (
          <Text className="text-green-700 text-sm">CO detector branch skipped.</Text>
        ) : null}
      </View>

      <TouchableOpacity
        className={`rounded-2xl py-4 items-center mb-3 ${reviewUnlocked ? 'bg-brand' : 'bg-gray-300'}`}
        disabled={!reviewUnlocked}
        onPress={() => router.push('/(tabs)/review')}
      >
        <Text className={`font-bold text-base ${reviewUnlocked ? 'text-white' : 'text-gray-500'}`}>
          Continue to Review
        </Text>
      </TouchableOpacity>

      <Text className="text-gray-400 text-sm text-center mb-10">
        Workflow reference: `mobile/MOBILE_WIZARD_WORKFLOW.md`
      </Text>
    </ScrollView>
  );
}
