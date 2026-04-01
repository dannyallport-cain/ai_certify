import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useJob, type WizardPhotoType } from '@/components/JobStateContext';
import { createDraftCertificate } from '@/services/api';

const requiredPhotoSummary: { type: WizardPhotoType; label: string }[] = [
  { type: 'main_fuse', label: 'Main fuse' },
  { type: 'meter', label: 'Meter' },
  { type: 'consumer_unit_cover_on', label: 'Consumer unit with cover on' },
  { type: 'circuit_schedule', label: 'Circuit schedule' },
];

export default function ReviewScreen() {
  const { state, dispatch } = useJob();
  const [submitting, setSubmitting] = useState(false);
  const { selectedCustomer, gpsAddress, capturedImages, analysisResult, wizard } = state;

  const getImageFor = (type: WizardPhotoType, slotIndex?: number) =>
    capturedImages.find(
      (image) => image.type === type && (image.slotIndex ?? null) === (slotIndex ?? null),
    );

  const requiredPhotosComplete = requiredPhotoSummary.every((item) => !!getImageFor(item.type));
  const smokePhotosComplete =
    wizard.smokeDetectorCount === 0 ||
    Array.from({ length: wizard.smokeDetectorCount }, (_, index) => !!getImageFor('smoke_detector', index)).every(Boolean);
  const coDetectorPhotoComplete = !!getImageFor('co_detector');
  const coBranchComplete =
    wizard.hasSolidFuelAppliance !== true || (wizard.coDetectorTested && coDetectorPhotoComplete);

  const ready =
    !!selectedCustomer &&
    !!gpsAddress &&
    requiredPhotosComplete &&
    wizard.consumerUnitMaterial !== null &&
    smokePhotosComplete &&
    wizard.hasSolidFuelAppliance !== null &&
    coBranchComplete;

  const inspectionDateDisplay = useMemo(
    () => new Date(wizard.inspectionDate).toLocaleDateString('en-GB'),
    [wizard.inspectionDate],
  );

  async function handleSubmit() {
    if (!ready || !selectedCustomer || !gpsAddress) return;
    setSubmitting(true);
    try {
      const formData: Record<string, unknown> = {
        _createdFromMobile: true,
        consumerUnitMaterial: wizard.consumerUnitMaterial,
        smokeDetectorCount: wizard.smokeDetectorCount,
        hasSolidFuelAppliance: wizard.hasSolidFuelAppliance,
        coDetectorTested: wizard.coDetectorTested,
        mobileCapturedImages: capturedImages.map((image, index) => ({
          order: index + 1,
          mode: image.mode,
          type: image.type ?? null,
          label: image.label ?? null,
          slotIndex: image.slotIndex ?? null,
          uri: image.uri,
        })),
        wizardEvidenceSummary: {
          requiredElectricalPhotos: requiredPhotoSummary.map((item) => ({
            type: item.type,
            label: item.label,
            captured: !!getImageFor(item.type),
          })),
          smokeDetectorPhotos: Array.from({ length: wizard.smokeDetectorCount }, (_, index) => ({
            index,
            captured: !!getImageFor('smoke_detector', index),
          })),
          coDetectorPhotoCaptured: coDetectorPhotoComplete,
        },
      };

      if (analysisResult) {
        formData.mainSwitchRating = analysisResult.mainSwitchRating;
        formData.numberOfCircuits = String(analysisResult.numberOfCircuits);
        formData.earthingArrangement = analysisResult.earthingArrangement;
        formData.supplyVoltage = analysisResult.voltage;
        formData._mobileCircuits = analysisResult.circuits;
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
        <Text className="text-2xl font-bold text-gray-900 mb-1">Review Job</Text>
        <Text className="text-gray-500 mb-6">Check all guided requirements before creating the draft EICR.</Text>

        <Section
          title="Customer"
          icon="person-outline"
          done={!!selectedCustomer}
          onEdit={() => router.push('/(tabs)/customer')}
        >
          {selectedCustomer ? (
            <>
              <Text className="font-semibold text-gray-800">{selectedCustomer.name}</Text>
              {selectedCustomer.email ? <Text className="text-gray-500 text-sm">{selectedCustomer.email}</Text> : null}
            </>
          ) : (
            <Text className="text-red-500 text-sm">Not selected</Text>
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
            <Text className="text-red-500 text-sm">Not set</Text>
          )}
        </Section>

        <Section title="Inspection Date" icon="calendar-outline" done={true} onEdit={() => router.push('/(tabs)/wizard')}>
          <Text className="text-gray-800">{inspectionDateDisplay}</Text>
        </Section>

        <Section
          title="Required Electrical Photos"
          icon="camera-outline"
          done={requiredPhotosComplete}
          onEdit={() => router.push('/(tabs)/wizard')}
        >
          {requiredPhotoSummary.map((item) => {
            const captured = !!getImageFor(item.type);
            return (
              <Text key={item.type} className={`text-sm ${captured ? 'text-green-700' : 'text-red-500'}`}>
                {captured ? '✓' : '✗'} {item.label}
              </Text>
            );
          })}
        </Section>

        <Section
          title="Wizard Answers"
          icon="list-outline"
          done={wizard.consumerUnitMaterial !== null && wizard.hasSolidFuelAppliance !== null}
          onEdit={() => router.push('/(tabs)/wizard')}
        >
          <Text className="text-gray-600 text-sm">
            Consumer unit material:{' '}
            <Text className="font-medium text-gray-800">
              {wizard.consumerUnitMaterial ? wizard.consumerUnitMaterial.replaceAll('_', ' ') : 'Not set'}
            </Text>
          </Text>
          <Text className="text-gray-600 text-sm">
            Smoke detectors: <Text className="font-medium text-gray-800">{wizard.smokeDetectorCount}</Text>
          </Text>
          <Text className="text-gray-600 text-sm">
            Smoke detector photos:{' '}
            <Text className={`font-medium ${smokePhotosComplete ? 'text-green-700' : 'text-red-500'}`}>
              {capturedImages.filter((image) => image.type === 'smoke_detector').length}/{wizard.smokeDetectorCount}
            </Text>
          </Text>
          <Text className="text-gray-600 text-sm">
            Solid fuel appliance:{' '}
            <Text className="font-medium text-gray-800">
              {wizard.hasSolidFuelAppliance === null ? 'Not set' : wizard.hasSolidFuelAppliance ? 'Yes' : 'No'}
            </Text>
          </Text>
          {wizard.hasSolidFuelAppliance === true ? (
            <>
              <Text className="text-gray-600 text-sm">
                CO detector tested:{' '}
                <Text className={`font-medium ${wizard.coDetectorTested ? 'text-green-700' : 'text-red-500'}`}>
                  {wizard.coDetectorTested ? 'Yes' : 'No'}
                </Text>
              </Text>
              <Text className="text-gray-600 text-sm">
                CO detector photo:{' '}
                <Text className={`font-medium ${coDetectorPhotoComplete ? 'text-green-700' : 'text-red-500'}`}>
                  {coDetectorPhotoComplete ? 'Captured' : 'Missing'}
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
          <Text className="text-gray-600 text-sm">{capturedImages.length} image(s) captured</Text>
        </Section>

        {analysisResult && (
          <Section title="AI Analysis" icon="analytics-outline" done={true}>
            <Text className="text-gray-600 text-sm">Main switch: <Text className="font-medium text-gray-800">{analysisResult.mainSwitchRating}</Text></Text>
            <Text className="text-gray-600 text-sm">Circuits: <Text className="font-medium text-gray-800">{analysisResult.numberOfCircuits}</Text></Text>
            <Text className="text-gray-600 text-sm">Earthing: <Text className="font-medium text-gray-800">{analysisResult.earthingArrangement}</Text></Text>
          </Section>
        )}

        {!ready && (
          <View className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <Text className="text-amber-700 text-sm font-medium">
              Complete every guided requirement before submitting the draft certificate.
            </Text>
          </View>
        )}

        <TouchableOpacity
          className={`rounded-xl py-4 items-center mt-2 ${ready ? 'bg-brand' : 'bg-gray-300'}`}
          onPress={handleSubmit}
          disabled={!ready || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className={`font-bold text-base ${ready ? 'text-white' : 'text-gray-500'}`}>
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
    <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <Ionicons name={icon as never} size={18} color={done ? '#16a34a' : '#9ca3af'} />
          <Text className="font-semibold text-gray-700">{title}</Text>
        </View>
        {onEdit && (
          <TouchableOpacity onPress={onEdit}>
            <Text className="text-brand text-sm font-medium">Edit</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}
