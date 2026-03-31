import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useJob } from '@/components/JobStateContext';

export default function SuccessScreen() {
  const { state, dispatch } = useJob();
  const cert = state.createdCertificate;

  function startNewJob() {
    dispatch({ type: 'RESET' });
    router.replace('/(tabs)');
  }

  return (
    <View className="flex-1 bg-white items-center justify-center px-8">
      <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-6">
        <Ionicons name="checkmark-circle" size={52} color="#16a34a" />
      </View>

      <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">Draft Created!</Text>
      <Text className="text-gray-500 text-center mb-8">
        The EICR draft has been created in the web app and is ready for the inspector to complete.
      </Text>

      {cert && (
        <View className="bg-gray-50 border border-gray-200 rounded-xl px-6 py-4 mb-8 w-full items-center">
          <Text className="text-gray-500 text-sm mb-1">Certificate Number</Text>
          <Text className="text-2xl font-bold text-brand">{cert.certificateNumber}</Text>
        </View>
      )}

      <Text className="text-gray-400 text-sm text-center mb-8">
        Open the AI Certify web app to find this draft pre-filled with site details and circuit data.
      </Text>

      <TouchableOpacity
        className="bg-brand rounded-xl py-4 px-12 items-center"
        onPress={startNewJob}
      >
        <Text className="text-white font-bold text-base">Start New Job</Text>
      </TouchableOpacity>
    </View>
  );
}
