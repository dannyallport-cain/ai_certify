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
      className="mb-3 rounded-[24px] border border-[#e8ddd2] bg-[#fffdf9] px-4 py-4"
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View className="flex-row items-center">
        <View
          className={`mr-4 h-12 w-12 items-center justify-center rounded-2xl ${
            done ? 'bg-[#e4efe7]' : 'bg-[#f3ece5]'
          }`}
        >
          <Ionicons
            name={done ? 'checkmark' : icon}
            size={22}
            color={done ? '#4f7a5c' : '#7c5a45'}
          />
        </View>

        <View className="flex-1 pr-3">
          <View className="mb-1 flex-row items-center">
            <View className="mr-2 rounded-full bg-[#f3ece5] px-2 py-1">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9b8d82]">
                Step {stepNumber}
              </Text>
            </View>
            {done && (
              <View className="rounded-full bg-[#edf6ef] px-2 py-1">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#4f7a5c]">
                  Done
                </Text>
              </View>
            )}
          </View>

          <Text className="mb-1 text-base font-semibold text-[#1f2937]">{title}</Text>
          <Text className="text-sm leading-5 text-[#7b7280]">{subtitle}</Text>
        </View>

        <View className="h-10 w-10 items-center justify-center rounded-full bg-[#f7f1ea]">
          <Ionicons name="chevron-forward" size={18} color="#9b8d82" />
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

  return (
    <ScrollView
      className="flex-1 bg-[#f8f5f1]"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 132 }}
    >
      <View className="mb-5 rounded-[30px] border border-[#e6dbcf] bg-[#fffdf9] px-5 py-5">
        <View className="mb-4 flex-row items-start justify-between">
          <View className="mr-4 flex-1">
            <View className="mb-3 self-start rounded-full bg-[#f3ece5] px-3 py-1.5">
              <Text className="text-xs font-semibold uppercase tracking-[1px] text-[#8d7a6d]">
                Task requirement
              </Text>
            </View>
            <Text className="mb-2 text-[28px] font-bold leading-8 text-[#1f2937]">
              What do you need to do today?
            </Text>
            <Text className="text-sm leading-6 text-[#6b7280]">
              Start a certificate, capture a fire alarm plan, or jump straight into diagnostics.
              Top-level actions live here, while lower-level certificate steps stay inside the guided wizard.
            </Text>
          </View>

          <View className="h-14 w-14 items-center justify-center rounded-[20px] bg-[#f3ece5]">
            <Ionicons
              name={hasDraftCertificate ? 'document-text-outline' : 'grid-outline'}
              size={26}
              color="#7c5a45"
            />
          </View>
        </View>

        {hasDraftCertificate ? (
          <View className="rounded-[22px] bg-[#f6f1eb] px-4 py-4">
            <Text className="text-sm font-semibold text-[#5e5148]">Current certificate</Text>
            <Text className="mt-2 text-sm leading-5 text-[#7b7280]">
              A draft certificate already exists for this job. You can continue editing it directly or return to the guided workflow to finish any remaining setup steps.
            </Text>
          </View>
        ) : hasWorkflowProgress ? (
          <View className="rounded-[22px] bg-[#f6f1eb] px-4 py-4">
            <Text className="text-sm font-semibold text-[#5e5148]">Certificate workflow in progress</Text>
            <Text className="mt-2 text-sm leading-5 text-[#7b7280]">
              You have started capturing certificate information. Continue the guided wizard to complete the remaining steps in order.
            </Text>
          </View>
        ) : (
          <View className="rounded-[22px] bg-[#f6f1eb] px-4 py-4">
            <Text className="text-sm font-semibold text-[#5e5148]">Choose a starting point</Text>
            <Text className="mt-2 text-sm leading-5 text-[#7b7280]">
              Select one of the task cards below. Certificate creation is split into AI/guided and manual entry routes, and fire alarm tools are split into plan capture and diagnostics.
            </Text>
          </View>
        )}
      </View>

      <View className="mb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-lg font-semibold text-[#1f2937]">Tasks</Text>
          <Text className="text-sm text-[#8b7f75]">Choose the workflow you want to open</Text>
        </View>

        <View className="rounded-full bg-[#eee5dc] px-3 py-1.5">
          <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-[#8d7a6d]">
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
            subtitle="Use the guided workflow with customer, site, photos, AI-assisted capture, and review."
            done={false}
            stepNumber={1}
            onPress={() => router.push('/(tabs)/wizard' as never)}
          />

          <StepCard
            icon="create-outline"
            title="Create certificate — manual data entry"
            subtitle="Start a certificate using manual entry instead of the guided AI/photo workflow."
            done={false}
            stepNumber={2}
            onPress={() => router.push('/(tabs)/wizard' as never)}
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
              <Text className="mb-1 text-lg font-semibold text-[#1f2937]">Resume certificate workflow</Text>
              <Text className="text-sm leading-5 text-[#6b7280]">
                Continue the lower-level certificate steps from inside the guided wizard.
              </Text>
            </View>
            <View className="h-11 w-11 items-center justify-center rounded-full bg-[#f3ece5]">
              <Ionicons name="arrow-forward" size={20} color="#7c5a45" />
            </View>
          </View>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        className="mb-2 mt-1 items-center rounded-full py-3"
        onPress={() => dispatch({ type: 'RESET' })}
      >
        <Text className="text-sm font-medium text-[#9b8d82]">Reset job</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
