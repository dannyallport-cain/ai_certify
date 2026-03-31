import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useJob } from '@/components/JobStateContext';
import { createDraftCertificate } from '@/services/api';

export default function ReviewScreen() {
  const { state, dispatch } = useJob();
  const [submitting, setSubmitting] = useState(false);
  const { selectedCustomer, gpsAddress, capturedImages, analysisResult } = state;

  const ready = selectedCustomer && gpsAddress;

  async function handleSubmit() {
    if (!selectedCustomer || !gpsAddress) return;
    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const formData: Record<string, unknown> = {
        _createdFromMobile: true,
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
        inspectionDate: today,
        formData,
      });

      dispatch({ type: 'SET_CERTIFICATE', payload: cert });
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
        <Text className="text-gray-500 mb-6">Check all details before creating the draft EICR.</Text>

        {/* Customer */}
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

        {/* Address */}
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

        {/* Images */}
        <Section
          title="Photos"
          icon="camera-outline"
          done={capturedImages.length > 0}
          onEdit={() => router.push('/(tabs)/capture')}
        >
          <Text className="text-gray-600 text-sm">{capturedImages.length} image(s) captured</Text>
        </Section>

        {/* Analysis */}
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
              Please complete all required steps before submitting.
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
