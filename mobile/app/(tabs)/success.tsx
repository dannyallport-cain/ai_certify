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
        The EICR draft has been created and can now be updated in the mobile app while you are still on-site.
      </Text>

      {cert && (
        <View className="bg-gray-50 border border-gray-200 rounded-xl px-6 py-4 mb-8 w-full items-center">
          <Text className="text-gray-500 text-sm mb-1">Certificate Number</Text>
          <Text className="text-2xl font-bold text-brand">{cert.certificateNumber}</Text>
        </View>
      )}

      <Text className="text-gray-400 text-sm text-center mb-6">
        You can continue in the AI Certify web app later, but essential report details can also be edited here now.
      </Text>

      <TouchableOpacity
        className="bg-brand rounded-xl py-4 px-12 items-center mb-3"
        onPress={() => router.replace('/(tabs)/certificate' as never)}
      >
        <Text className="text-white font-bold text-base">Edit Certificate On-Site</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-white border border-gray-200 rounded-xl py-4 px-12 items-center"
        onPress={startNewJob}
      >
        <Text className="text-gray-800 font-bold text-base">Start New Job</Text>
      </TouchableOpacity>
    </View>
  );
}
