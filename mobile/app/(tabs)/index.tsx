import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useJob } from '@/components/JobStateContext';

interface StepCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  done: boolean;
  onPress: () => void;
}

function StepCard({ icon, title, subtitle, done, onPress }: StepCardProps) {
  return (
    <TouchableOpacity
      className="flex-row items-center bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
      onPress={onPress}
    >
      <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${done ? 'bg-green-100' : 'bg-gray-100'}`}>
        <Ionicons name={done ? 'checkmark' : icon} size={22} color={done ? '#16a34a' : '#6b7280'} />
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-gray-800">{title}</Text>
        <Text className="text-gray-400 text-sm">{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { state, dispatch } = useJob();

  const steps = [
    {
      icon: 'camera-outline' as const,
      title: 'Photograph Consumer Unit',
      subtitle: state.capturedImages.length
        ? `${state.capturedImages.length} image(s) captured`
        : 'Take photos for AI analysis',
      done: state.capturedImages.length > 0,
      route: '/(tabs)/capture',
    },
    {
      icon: 'location-outline' as const,
      title: 'Confirm Site Address',
      subtitle: state.gpsAddress || 'Use GPS to detect address',
      done: !!state.gpsAddress,
      route: '/(tabs)/location',
    },
    {
      icon: 'person-outline' as const,
      title: 'Select Customer',
      subtitle: state.selectedCustomer?.name || 'Choose or create a customer',
      done: !!state.selectedCustomer,
      route: '/(tabs)/customer',
    },
    {
      icon: 'checkmark-circle-outline' as const,
      title: 'Review & Create Certificate',
      subtitle: 'Preview and submit draft EICR',
      done: !!state.createdCertificate,
      route: '/(tabs)/review',
    },
  ];

  const allDone = state.capturedImages.length > 0 && !!state.gpsAddress && !!state.selectedCustomer;

  return (
    <ScrollView className="flex-1 bg-gray-50 px-4 pt-6">
      <Text className="text-2xl font-bold text-gray-900 mb-1">New Inspection Job</Text>
      <Text className="text-gray-500 mb-4">Complete each step to create a pre-filled EICR draft.</Text>

      <TouchableOpacity
        className="bg-brand rounded-2xl px-5 py-5 mb-5"
        onPress={() => router.push('/(tabs)/wizard')}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-white text-xl font-bold mb-1">Start Guided Wizard</Text>
            <Text className="text-white/90">
              Follow a step-by-step workflow for customer, address, photos, smoke detectors, and CO checks.
            </Text>
          </View>
          <Ionicons name="sparkles-outline" size={26} color="white" />
        </View>
      </TouchableOpacity>

      {steps.map((step) => (
        <StepCard
          key={step.title}
          icon={step.icon}
          title={step.title}
          subtitle={step.subtitle}
          done={step.done}
          onPress={() => router.push(step.route as never)}
        />
      ))}

      {allDone && (
        <TouchableOpacity
          className="bg-brand rounded-xl py-4 items-center mt-4 mb-8"
          onPress={() => router.push('/(tabs)/review')}
        >
          <Text className="text-white font-bold text-base">Review & Submit</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        className="items-center mt-2 mb-10"
        onPress={() => dispatch({ type: 'RESET' })}
      >
        <Text className="text-gray-400 text-sm">Reset job</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
