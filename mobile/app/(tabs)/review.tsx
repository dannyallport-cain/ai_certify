import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useJob, type WizardPhotoType } from '@/components/JobStateContext';
import { createDraftCertificate, uploadMobileImage } from '@/services/api';

const guidedPhotoSummary: { type: WizardPhotoType; label: string }[] = [
  { type: 'consumer_unit_external', label: 'Consumer unit' },
  { type: 'consumer_unit_internal', label: 'Consumer unit with front removed' },
  { type: 'bonding', label: 'Main protective bonding' },
];

const LANDLORD_GUIDANCE_SMOKE =
  'For rented homes in England, at least one smoke alarm should be installed on every storey used as living accommodation.';

const LANDLORD_GUIDANCE_CO =
  'A carbon monoxide alarm should be installed in any room used as living accommodation which contains a fixed combustion appliance, excluding a gas cooker.';

function buildMobileCaptureFolderHint() {
  return `mobile-${Date.now()}`;
}

export default function ReviewScreen() {
  const { state, dispatch } = useJob();
  const [submitting, setSubmitting] = useState(false);
  const { selectedCustomer, gpsAddress, capturedImages, analysisResult, wizard } = state;

  const getImageFor = (type: WizardPhotoType, slotIndex?: number) =>
    capturedImages.find(
      (image) => image.type === type && (image.slotIndex ?? null) === (slotIndex ?? null),
    );

  const usesPhotoEvidence =
    wizard.dataEntryMode === 'guided_photo' || wizard.dataEntryMode === 'hybrid';

  const mandatoryGuidedPhotosComplete =
    !usesPhotoEvidence ||
    guidedPhotoSummary.every((item) => !!getImageFor(item.type)?.qualityAssessment?.isSufficient);

  const damagePhotoSummary = [
    {
      type: 'damaged_accessory' as const,
      label: 'Damaged socket, switch, or accessory',
      present: wizard.hasDamagedAccessory,
      image: getImageFor('damaged_accessory'),
    },
    {
      type: 'damaged_luminaire' as const,
      label: 'Damaged luminaire',
      present: wizard.hasDamagedLuminaire,
      image: getImageFor('damaged_luminaire'),
    },
  ].map((item) => ({
    ...item,
    accepted: !!item.image?.qualityAssessment?.isSufficient,
  }));

  const damagePromptsComplete =
    !usesPhotoEvidence ||
    damagePhotoSummary.every((item) => item.present !== null && (item.present === false || item.accepted));

  const isDomesticStyleInstallation =
    wizard.installationType === 'domestic' ||
    wizard.installationType === 'mixed_use' ||
    wizard.installationType === 'caravan';

  const requiresSmokeAndCoFlow =
    wizard.reportPurpose === 'private_rented_sector_eicr' ||
    wizard.reportPurpose === 'change_of_tenancy' ||
    wizard.occupancyType === 'tenanted';

  const minimumRecommendedSmokeAlarms = Math.max(1, wizard.storeyCount);
  const smokeAlarmCountMeetsGuidance =
    !requiresSmokeAndCoFlow || wizard.smokeDetectorCount >= minimumRecommendedSmokeAlarms;

  const smokePhotosComplete =
    !requiresSmokeAndCoFlow ||
    wizard.smokeDetectorCount === 0 ||
    Array.from(
      { length: wizard.smokeDetectorCount },
      (_, index) => !!getImageFor('smoke_detector', index)?.qualityAssessment?.isSufficient,
    ).every(Boolean);

  const coDetectorPhotoComplete = !!getImageFor('co_detector')?.qualityAssessment?.isSufficient;
  const coBranchComplete =
    !requiresSmokeAndCoFlow ||
    wizard.hasSolidFuelAppliance !== true ||
    (wizard.coDetectorTested && coDetectorPhotoComplete);

  const requiredPhotoChecklist = [
    ...guidedPhotoSummary.map((item) => {
      const image = getImageFor(item.type);
      return {
        key: item.type,
        label: item.label,
        required: true,
        complete: !!image?.qualityAssessment?.isSufficient,
        status: image
          ? image.qualityAssessment?.isSufficient
            ? `Accepted${image.qualityAssessment?.score ? ` • score ${image.qualityAssessment.score}` : ''}`
            : 'Retake required due to insufficient quality'
          : 'Capture required',
      };
    }),
    ...damagePhotoSummary
      .filter((item) => item.present === true)
      .map((item) => ({
        key: item.type,
        label: item.label,
        required: true,
        complete: item.accepted,
        status: item.image
          ? item.accepted
            ? `Accepted${item.image.qualityAssessment?.score ? ` • score ${item.image.qualityAssessment.score}` : ''}`
            : 'Retake required due to insufficient quality'
          : 'Capture required',
      })),
    ...Array.from({ length: wizard.smokeDetectorCount }, (_, index) => {
      const image = getImageFor('smoke_detector', index);
      const accepted = !!image?.qualityAssessment?.isSufficient;
      return {
        key: `smoke_detector_${index}`,
        label: `Smoke detector ${index + 1}`,
        required: requiresSmokeAndCoFlow,
        complete: !requiresSmokeAndCoFlow || accepted,
        status: !requiresSmokeAndCoFlow
          ? 'Not required'
          : image
            ? accepted
              ? `Accepted${image.qualityAssessment?.score ? ` • score ${image.qualityAssessment.score}` : ''}`
              : 'Retake required due to insufficient quality'
            : 'Capture required',
      };
    }),
    {
      key: 'co_detector',
      label: 'CO detector',
      required: wizard.hasSolidFuelAppliance === true,
      complete: wizard.hasSolidFuelAppliance !== true || coDetectorPhotoComplete,
      status:
        wizard.hasSolidFuelAppliance !== true
          ? 'Not required'
          : coDetectorPhotoComplete
            ? 'Accepted'
            : wizard.coDetectorTested
              ? 'Capture required'
              : 'Test detector, then capture photo',
    },
  ].filter((item) => item.required);

  const outstandingRequiredPhotos = requiredPhotoChecklist.filter((item) => !item.complete);

  const wizardAnswersComplete =
    !!wizard.reportPurpose &&
    !!wizard.installationType &&
    !!wizard.occupancyType &&
    !!wizard.supplyPhase &&
    wizard.hasOutbuildingsOrAncillarySupplies !== null &&
    (!isDomesticStyleInstallation || wizard.consumerUnitMaterial !== null) &&
    (!requiresSmokeAndCoFlow || wizard.hasSolidFuelAppliance !== null);

  const ready =
    !!selectedCustomer &&
    !!gpsAddress &&
    wizardAnswersComplete &&
    mandatoryGuidedPhotosComplete &&
    damagePromptsComplete &&
    smokeAlarmCountMeetsGuidance &&
    smokePhotosComplete &&
    coBranchComplete;

  const inspectionDateDisplay = useMemo(
    () => new Date(wizard.inspectionDate).toLocaleDateString('en-GB'),
    [wizard.inspectionDate],
  );

  async function handleSubmit() {
    if (!ready || !selectedCustomer || !gpsAddress) return;
    setSubmitting(true);
    try {
      const certificateNumberHint = buildMobileCaptureFolderHint();

      const uploadedCapturedImages = await Promise.all(
        capturedImages.map(async (image, index) => {
          const upload = await uploadMobileImage({
            imageUri: image.uri,
            category: 'certificate-photo',
            certificateNumber: certificateNumberHint,
            label: image.label ?? undefined,
            type: image.type ?? undefined,
            slotIndex: image.slotIndex ?? undefined,
          });

          return {
            order: index + 1,
            mode: image.mode,
            type: image.type ?? null,
            label: image.label ?? null,
            slotIndex: image.slotIndex ?? null,
            uri: upload.url,
            storageKey: upload.key,
            contentType: upload.contentType,
            qualityAssessment: image.qualityAssessment ?? null,
          };
        }),
      );

      const formData: Record<string, unknown> = {
        _createdFromMobile: true,
        dataEntryMode: wizard.dataEntryMode,
        reportPurpose: wizard.reportPurpose,
        installationType: wizard.installationType,
        occupancyType: wizard.occupancyType,
        supplyPhase: wizard.supplyPhase,
        hasOutbuildingsOrAncillarySupplies: wizard.hasOutbuildingsOrAncillarySupplies,
        consumerUnitMaterial: wizard.consumerUnitMaterial,
        storeyCount: wizard.storeyCount,
        smokeDetectorCount: wizard.smokeDetectorCount,
        hasSolidFuelAppliance: wizard.hasSolidFuelAppliance,
        coDetectorTested: wizard.coDetectorTested,
        mobileCapturedImages: uploadedCapturedImages,
        wizardEvidenceSummary: {
          landlordGuidance: {
            smokeAlarmGuidance: LANDLORD_GUIDANCE_SMOKE,
            coAlarmGuidance: LANDLORD_GUIDANCE_CO,
            storeyCount: wizard.storeyCount,
            minimumRecommendedSmokeAlarms,
            smokeAlarmCountRecorded: wizard.smokeDetectorCount,
            smokeAlarmCountMeetsGuidance,
            solidFuelAppliancePresent: wizard.hasSolidFuelAppliance,
            coAlarmPhotoAccepted: coDetectorPhotoComplete,
            tenancyFlowApplied: requiresSmokeAndCoFlow,
          },
          guidedPhotos: guidedPhotoSummary.map((item) => {
            const image = getImageFor(item.type);
            return {
              type: item.type,
              label: item.label,
              captured: !!image,
              accepted: !!image?.qualityAssessment?.isSufficient,
              score: image?.qualityAssessment?.score ?? null,
            };
          }),
          damagePrompts: damagePhotoSummary.map((item) => ({
            type: item.type,
            label: item.label,
            present: item.present,
            captured: !!item.image,
            accepted: item.accepted,
            score: item.image?.qualityAssessment?.score ?? null,
          })),
          smokeDetectorPhotos: Array.from({ length: wizard.smokeDetectorCount }, (_, index) => {
            const image = getImageFor('smoke_detector', index);
            return {
              index,
              captured: !!image,
              accepted: !!image?.qualityAssessment?.isSufficient,
              score: image?.qualityAssessment?.score ?? null,
            };
          }),
          coDetectorPhotoCaptured: coDetectorPhotoComplete,
        },
      };

      if (analysisResult) {
        const safeAnalysisResult = analysisResult;
        formData.mainSwitchRating = safeAnalysisResult.mainSwitchRating;
        formData.numberOfCircuits = String(safeAnalysisResult.numberOfCircuits);
        formData.earthingArrangement = safeAnalysisResult.earthingArrangement;
        formData.supplyVoltage = safeAnalysisResult.voltage;
        formData._mobileCircuits = safeAnalysisResult.circuits;
      }

      const cert = await createDraftCertificate({
        customerId: selectedCustomer.id,
        siteAddress: gpsAddress,
        inspectionDate: wizard.inspectionDate,
        formData,
      });

      dispatch({ type: 'SET_CERTIFICATE', payload: cert });
      dispatch({
        type: 'SET_ACTIVE_CAPTURE',
        payload: { type: null, label: null, mode: 'consumer_unit', slotIndex: null },
      });
      router.replace('/(tabs)/success');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create certificate');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-5 pt-6 pb-8">
        <TouchableOpacity
          className="mb-4 flex-row items-center self-start rounded-full bg-white px-3 py-2"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={18} color="#111827" />
          <Text className="ml-2 font-medium text-gray-900">Back</Text>
        </TouchableOpacity>

        <Text className="mb-1 text-2xl font-bold text-gray-900">Review Job</Text>
        <Text className="mb-6 text-gray-500">
          Check the captured evidence and wizard answers before creating the draft EICR.
        </Text>

        <Section
          title="Customer"
          icon="person-outline"
          done={!!selectedCustomer}
          onEdit={() => router.push('/(tabs)/customer')}
        >
          {selectedCustomer ? (
            <View>
              <Text className="font-semibold text-gray-800">{selectedCustomer.name}</Text>
              {selectedCustomer.email ? (
                <Text className="text-sm text-gray-500">{selectedCustomer.email}</Text>
              ) : null}
            </View>
          ) : (
            <Text className="text-sm text-red-500">Not selected</Text>
          )}
        </Section>

        <Section
          title="Site Address"
          icon="location-outline"
          done={!!gpsAddress}
          onEdit={() => router.push('/(tabs)/location')}
        >
          {gpsAddress ? (
            <Text className="text-gray-800">{gpsAddress}</Text>
          ) : (
            <Text className="text-sm text-red-500">Not set</Text>
          )}
        </Section>

        <Section title="Inspection Date" icon="calendar-outline" done={true} onEdit={() => router.push('/(tabs)/wizard')}>
          <Text className="text-gray-800">{inspectionDateDisplay}</Text>
        </Section>

        <Section
          title="Guided Evidence Photos"
          icon="camera-outline"
          done={mandatoryGuidedPhotosComplete}
          onEdit={() => router.push('/(tabs)/wizard')}
        >
          {!usesPhotoEvidence ? (
            <Text className="text-sm text-blue-700">
              Manual-only workflow selected. Guided photo evidence is optional for this draft.
            </Text>
          ) : (
            <>
              <View className={`mb-3 rounded-xl border px-3 py-3 ${outstandingRequiredPhotos.length === 0 ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
                <Text className={`font-medium ${outstandingRequiredPhotos.length === 0 ? 'text-green-800' : 'text-amber-800'}`}>
                  {outstandingRequiredPhotos.length === 0
                    ? 'All currently required evidence photos are accepted'
                    : `${outstandingRequiredPhotos.length} required photo step(s) still need attention`}
                </Text>
                {outstandingRequiredPhotos.length > 0 ? (
                  <View className="mt-2">
                    {outstandingRequiredPhotos.map((item) => (
                      <Text key={item.key} className="text-sm text-amber-800">
                        • {item.label}: {item.status}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
              {guidedPhotoSummary.map((item) => {
                const image = getImageFor(item.type);
                const accepted = !!image?.qualityAssessment?.isSufficient;
                return (
                  <Text key={item.type} className={`text-sm ${accepted ? 'text-green-700' : image ? 'text-red-500' : 'text-red-500'}`}>
                    {accepted ? '✓' : '✗'} {item.label}
                    {accepted
                      ? (image?.qualityAssessment?.score ? ` (score ${image.qualityAssessment.score})` : '')
                      : ' (retake required)'}
                  </Text>
                );
              })}
              {damagePhotoSummary.map((item) => (
                <Text
                  key={item.type}
                  className={`text-sm ${
                    item.present === null
                      ? 'text-amber-700'
                      : item.present === false
                        ? 'text-gray-600'
                        : item.accepted
                          ? 'text-green-700'
                          : item.image
                            ? 'text-red-500'
                            : 'text-red-500'
                  }`}
                >
                  {item.present === null
                    ? '•'
                    : item.present === false
                      ? '–'
                      : item.accepted
                        ? '✓'
                        : '✗'}{' '}
                  {item.label}
                  {item.present === null
                    ? ' (presence not answered)'
                    : item.present === false
                      ? ' (not present)'
                      : item.accepted
                        ? (item.image?.qualityAssessment?.score ? ` (score ${item.image.qualityAssessment.score})` : '')
                        : item.image
                          ? ' (retake required)'
                          : ' (capture required)'}
                </Text>
              ))}
            </>
          )}
        </Section>

        <Section
          title="Wizard Answers"
          icon="list-outline"
          done={wizardAnswersComplete}
          onEdit={() => router.push('/(tabs)/wizard')}
        >
          <Text className="text-sm text-gray-600">
            Data entry mode:{' '}
            <Text className="font-medium text-gray-800">
              {wizard.dataEntryMode.replaceAll('_', ' ')}
            </Text>
          </Text>
          <Text className="text-sm text-gray-600">
            Report purpose:{' '}
            <Text className="font-medium text-gray-800">
              {wizard.reportPurpose ? wizard.reportPurpose.replaceAll('_', ' ') : 'Not set'}
            </Text>
          </Text>
          <Text className="text-sm text-gray-600">
            Installation type:{' '}
            <Text className="font-medium text-gray-800">
              {wizard.installationType ? wizard.installationType.replaceAll('_', ' ') : 'Not set'}
            </Text>
          </Text>
          <Text className="text-sm text-gray-600">
            Occupancy profile:{' '}
            <Text className="font-medium text-gray-800">
              {wizard.occupancyType ? wizard.occupancyType.replaceAll('_', ' ') : 'Not set'}
            </Text>
          </Text>
          <Text className="text-sm text-gray-600">
            Supply phase:{' '}
            <Text className="font-medium text-gray-800">
              {wizard.supplyPhase ? wizard.supplyPhase.replaceAll('_', ' ') : 'Not set'}
            </Text>
          </Text>
          <Text className="text-sm text-gray-600">
            Ancillary supplies:{' '}
            <Text className="font-medium text-gray-800">
              {wizard.hasOutbuildingsOrAncillarySupplies === null
                ? 'Not set'
                : wizard.hasOutbuildingsOrAncillarySupplies
                  ? 'Yes'
                  : 'No'}
            </Text>
          </Text>
          <Text className="text-sm text-gray-600">
            Consumer unit material:{' '}
            <Text className="font-medium text-gray-800">
              {wizard.consumerUnitMaterial ? wizard.consumerUnitMaterial.replaceAll('_', ' ') : 'Not set / skipped'}
            </Text>
          </Text>
          <Text className="text-sm text-gray-600">
            Damaged socket / switch / accessory present:{' '}
            <Text className="font-medium text-gray-800">
              {wizard.hasDamagedAccessory === null ? 'Not answered' : wizard.hasDamagedAccessory ? 'Yes' : 'No'}
            </Text>
          </Text>
          <Text className="text-sm text-gray-600">
            Damaged luminaire present:{' '}
            <Text className="font-medium text-gray-800">
              {wizard.hasDamagedLuminaire === null ? 'Not answered' : wizard.hasDamagedLuminaire ? 'Yes' : 'No'}
            </Text>
          </Text>
          <Text className="text-sm text-gray-600">
            Storeys used as living accommodation:{' '}
            <Text className="font-medium text-gray-800">{wizard.storeyCount}</Text>
          </Text>
          <Text className="text-sm text-gray-600">
            Smoke alarms found: <Text className="font-medium text-gray-800">{wizard.smokeDetectorCount}</Text>
          </Text>
          <Text className="text-sm text-gray-600">
            Storey-based smoke alarm guidance:{' '}
            <Text className={`font-medium ${smokeAlarmCountMeetsGuidance ? 'text-green-700' : 'text-red-500'}`}>
              {smokeAlarmCountMeetsGuidance
                ? `Met (${wizard.smokeDetectorCount}/${minimumRecommendedSmokeAlarms})`
                : `Not met (${wizard.smokeDetectorCount}/${minimumRecommendedSmokeAlarms})`}
            </Text>
          </Text>
          <Text className="text-sm text-gray-600">
            Smoke detector photos:{' '}
            <Text className={`font-medium ${smokePhotosComplete ? 'text-green-700' : 'text-red-500'}`}>
              {capturedImages.filter((image) => image.type === 'smoke_detector' && image.qualityAssessment?.isSufficient).length}/{wizard.smokeDetectorCount}
            </Text>
          </Text>
          <Text className="text-sm text-gray-600">
            Solid fuel appliance:{' '}
            <Text className="font-medium text-gray-800">
              {wizard.hasSolidFuelAppliance === null ? 'Not set' : wizard.hasSolidFuelAppliance ? 'Yes' : 'No'}
            </Text>
          </Text>
          <Text className="mt-2 text-xs text-gray-500">{LANDLORD_GUIDANCE_SMOKE}</Text>
          <Text className="mt-1 text-xs text-gray-500">{LANDLORD_GUIDANCE_CO}</Text>
          {wizard.hasSolidFuelAppliance === true ? (
            <>
              <Text className="text-sm text-gray-600">
                CO detector tested:{' '}
                <Text className={`font-medium ${wizard.coDetectorTested ? 'text-green-700' : 'text-red-500'}`}>
                  {wizard.coDetectorTested ? 'Yes' : 'No'}
                </Text>
              </Text>
              <Text className="text-sm text-gray-600">
                CO detector photo:{' '}
                <Text className={`font-medium ${coDetectorPhotoComplete ? 'text-green-700' : 'text-red-500'}`}>
                  {coDetectorPhotoComplete ? 'Accepted' : 'Missing or insufficient'}
                </Text>
              </Text>
            </>
          ) : null}
        </Section>

        <Section
          title="All Captured Photos"
          icon="images-outline"
          done={capturedImages.length > 0}
          onEdit={() => router.push('/(tabs)/capture')}
        >
          <Text className="text-sm text-gray-600">{capturedImages.length} image(s) captured</Text>
          <Text className="mt-1 text-xs text-gray-500">
            Only photos that pass the in-app quality check count toward required evidence.
          </Text>
        </Section>

        {analysisResult && (
          <Section title="AI Analysis" icon="analytics-outline" done={true}>
            <Text className="text-sm text-gray-600">
              Main switch: <Text className="font-medium text-gray-800">{analysisResult.mainSwitchRating}</Text>
            </Text>
            <Text className="text-sm text-gray-600">
              Circuits: <Text className="font-medium text-gray-800">{analysisResult.numberOfCircuits}</Text>
            </Text>
            <Text className="text-sm text-gray-600">
              Earthing: <Text className="font-medium text-gray-800">{analysisResult.earthingArrangement}</Text>
            </Text>
          </Section>
        )}

        {!ready && (
          <View className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <Text className="text-sm font-medium text-amber-700">
              Complete every mandatory wizard answer and, when using guided or hybrid capture, retake any insufficient required photos before submitting the draft certificate.
            </Text>
          </View>
        )}

        <TouchableOpacity
          className={`mt-2 items-center rounded-xl py-4 ${ready ? 'bg-brand' : 'bg-gray-300'}`}
          onPress={handleSubmit}
          disabled={!ready || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className={`text-base font-bold ${ready ? 'text-white' : 'text-gray-500'}`}>
              Create Draft Certificate
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

interface SectionProps {
  title: string;
  icon: string;
  done: boolean;
  onEdit?: () => void;
  children: React.ReactNode;
}

function Section({ title, icon, done, onEdit, children }: SectionProps) {
  return (
    <View className="mb-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <View className="mb-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Ionicons name={icon as never} size={18} color={done ? '#16a34a' : '#9ca3af'} />
          <Text className="font-semibold text-gray-700">{title}</Text>
        </View>
        {onEdit && (
          <TouchableOpacity onPress={onEdit}>
            <Text className="text-sm font-medium text-brand">Edit</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}
