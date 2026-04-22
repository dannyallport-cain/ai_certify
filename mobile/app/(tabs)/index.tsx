import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useJob } from '@/components/JobStateContext';

interface StepCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  done: boolean;
  stepNumber: number;
  onPress: () => void;
}

function StepCard({ icon, title, subtitle, done, stepNumber, onPress }: StepCardProps) {
  return (
    <TouchableOpacity
      className="mb-3 rounded-[24px] border border-[#E0E6ED] bg-[#FFFFFF] px-4 py-4"
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View className="flex-row items-center">
        <View
          className={`mr-4 h-12 w-12 items-center justify-center rounded-2xl ${
            done ? 'bg-[#E8F5E9]' : 'bg-[#E3F2FD]'
          }`}
        >
          <Ionicons
            name={done ? 'checkmark' : icon}
            size={22}
            color={done ? '#4CAF50' : '#0D47A1'}
          />
        </View>

        <View className="flex-1 pr-3">
          <View className="mb-1 flex-row items-center">
            <View className="mr-2 rounded-full bg-[#E3F2FD] px-2 py-1">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#A0AEC0]">
                Step {stepNumber}
              </Text>
            </View>
            {done && (
              <View className="rounded-full bg-[#E8F5E9] px-2 py-1">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#4CAF50]">
                  Done
                </Text>
              </View>
            )}
          </View>

          <Text className="mb-1 text-base font-semibold text-[#1A202C]">{title}</Text>
          <Text className="text-sm leading-5 text-[#718096]">{subtitle}</Text>
        </View>

        <View className="h-10 w-10 items-center justify-center rounded-full bg-[#F5F7FA]">
          <Ionicons name="chevron-forward" size={18} color="#A0AEC0" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { state, dispatch } = useJob();

  const hasDraftCertificate = !!state.createdCertificate;
  const hasWorkflowProgress =
    !!state.selectedCustomer || !!state.gpsAddress || state.capturedImages.length > 0;

  function startCertificateRoute(mode: 'guided_photo' | 'manual_only') {
    router.push({
      pathname: '/(tabs)/wizard',
      params: { entryMode: mode },
    });
  }

  return (
    <ScrollView
      className="flex-1 bg-[#F5F7FA]"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 132 }}
    >
      <View className="mb-5 rounded-[30px] border border-[#E0E6ED] bg-[#FFFFFF] px-5 py-5">
        <View className="mb-4 flex-row items-start justify-between">
          <View className="mr-4 flex-1">
            <View className="mb-3 self-start rounded-full bg-[#E3F2FD] px-3 py-1.5">
              <Text className="text-xs font-semibold uppercase tracking-[1px] text-[#718096]">
                Task requirement
              </Text>
            </View>
            <Text className="mb-2 text-[28px] font-bold leading-8 text-[#1A202C]">
              What do you need to do today?
            </Text>
            <Text className="text-sm leading-6 text-[#718096]">
              Start a certificate, capture a fire alarm plan, or jump straight into diagnostics.
              Top-level actions live here, while lower-level certificate steps stay inside the guided wizard.
            </Text>
          </View>

          <View className="h-14 w-14 items-center justify-center rounded-[20px] bg-[#E3F2FD]">
            <Ionicons
              name={hasDraftCertificate ? 'document-text-outline' : 'grid-outline'}
              size={26}
              color="#0D47A1"
            />
          </View>
        </View>

        {hasDraftCertificate ? (
          <View className="rounded-[22px] bg-[#FAFBFC] px-4 py-4">
            <Text className="text-sm font-semibold text-[#5e5148]">Current certificate</Text>
            <Text className="mt-2 text-sm leading-5 text-[#718096]">
              A draft certificate already exists for this job. You can continue editing it directly or return to the guided workflow to finish any remaining setup steps.
            </Text>
          </View>
        ) : hasWorkflowProgress ? (
          <View className="rounded-[22px] bg-[#FAFBFC] px-4 py-4">
            <Text className="text-sm font-semibold text-[#5e5148]">Certificate workflow in progress</Text>
            <Text className="mt-2 text-sm leading-5 text-[#718096]">
              You have started capturing certificate information. Continue the guided wizard to complete the remaining steps in order.
            </Text>
          </View>
        ) : (
          <View className="rounded-[22px] bg-[#FAFBFC] px-4 py-4">
            <Text className="text-sm font-semibold text-[#5e5148]">Choose a starting point</Text>
            <Text className="mt-2 text-sm leading-5 text-[#718096]">
              Select one of the task cards below. Certificate creation now starts in either a guided or manual route, while fire alarm tools remain separate top-level workflows.
            </Text>
          </View>
        )}
      </View>

      <View className="mb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-lg font-semibold text-[#1A202C]">Tasks</Text>
          <Text className="text-sm text-[#8b7f75]">Choose the workflow you want to open</Text>
        </View>

        <View className="rounded-full bg-[#eee5dc] px-3 py-1.5">
          <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-[#718096]">
            Start
          </Text>
        </View>
      </View>

      {hasDraftCertificate ? (
        <StepCard
          icon="document-text-outline"
          title="Continue current certificate"
          subtitle="Open the current draft certificate or return to the guided workflow for any remaining setup."
          done
          stepNumber={1}
          onPress={() => router.push('/(tabs)/certificate' as never)}
        />
      ) : (
        <>
          <StepCard
            icon="sparkles-outline"
            title="Create certificate — AI / guided"
            subtitle="Start the guided certificate route with customer, site, evidence capture, AI-assisted steps, and review."
            done={false}
            stepNumber={1}
            onPress={() => startCertificateRoute('guided_photo')}
          />

          <StepCard
            icon="create-outline"
            title="Create certificate — manual data entry"
            subtitle="Start the manual certificate route with manual-first answers and direct data entry instead of guided photo capture."
            done={false}
            stepNumber={2}
            onPress={() => startCertificateRoute('manual_only')}
          />
        </>
      )}

      <StepCard
        icon="map-outline"
        title="Fire alarm plan capture"
        subtitle="Use the room plan workflow to capture or build a fire alarm layout plan."
        done={false}
        stepNumber={hasDraftCertificate ? 2 : 3}
        onPress={() => router.push('/(tabs)/room-plan' as never)}
      />

      <StepCard
        icon="flame-outline"
        title="Fire alarm diagnostics"
        subtitle="Run guided troubleshooting for fire alarm faults, testing, and common diagnostic paths."
        done={false}
        stepNumber={hasDraftCertificate ? 3 : 4}
        onPress={() => router.push('/(tabs)/fire-alarm-diagnostics' as never)}
      />

      {!hasDraftCertificate && hasWorkflowProgress && (
        <TouchableOpacity
          className="mb-4 mt-1 rounded-[24px] border border-[#eadfd5] bg-[#fffaf5] px-5 py-5"
          onPress={() => router.push('/(tabs)/wizard' as never)}
          activeOpacity={0.85}
        >
          <View className="flex-row items-center justify-between">
            <View className="mr-4 flex-1">
              <Text className="mb-1 text-lg font-semibold text-[#1A202C]">Resume certificate workflow</Text>
              <Text className="text-sm leading-5 text-[#718096]">
                Continue the in-progress certificate from inside the certificate workflow.
              </Text>
            </View>
            <View className="h-11 w-11 items-center justify-center rounded-full bg-[#E3F2FD]">
              <Ionicons name="arrow-forward" size={20} color="#0D47A1" />
            </View>
          </View>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        className="mb-2 mt-1 items-center rounded-full py-3"
        onPress={() => dispatch({ type: 'RESET' })}
      >
        <Text className="text-sm font-medium text-[#A0AEC0]">Reset job</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}