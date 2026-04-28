import { Alert, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useJob } from '@/components/JobStateContext';
import { deleteToken, getApiBaseUrl } from '@/services/api';

type MenuActionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  accent: string;
  onPress: () => void;
};

function MenuAction({ icon, title, subtitle, accent, onPress }: MenuActionProps) {
  return (
    <TouchableOpacity
      className="mb-3 rounded-[24px] border border-[#E0E6ED] bg-[#FFFFFF] px-4 py-4"
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View className="flex-row items-center">
        <View className={`mr-4 h-12 w-12 items-center justify-center rounded-2xl ${accent}`}>
          <Ionicons name={icon} size={22} color="#0D47A1" />
        </View>

        <View className="flex-1 pr-3">
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

async function openExternalPath(path: string) {
  const url = `${getApiBaseUrl()}${path}`;

  try {
    const supported = await Linking.canOpenURL(url);

    if (!supported) {
      Alert.alert('Unable to open link', 'This device cannot open the requested page right now.');
      return;
    }

    await Linking.openURL(url);
  } catch (error) {
    console.error('Failed to open external link:', error);
    Alert.alert('Unable to open link', 'Please try again in a moment.');
  }
}

async function signOut() {
  Alert.alert('Log out', 'Do you want to log out of the mobile app?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Log out',
      style: 'destructive',
      onPress: async () => {
        await deleteToken();
        router.replace('/(auth)/login');
      },
    },
  ]);
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
                Mobile menu
              </Text>
            </View>
            <Text className="mb-2 text-[28px] font-bold leading-8 text-[#1A202C]">
              What do you need to do today?
            </Text>
            <Text className="text-sm leading-6 text-[#718096]">
              Start a certificate, open the certificate list, review your account, or connect
              ServiceM8 from one clear place.
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
            <Text className="text-sm font-semibold text-[#5E5148]">Current certificate</Text>
            <Text className="mt-2 text-sm leading-5 text-[#718096]">
              A draft certificate already exists for this job. Open it directly or jump back into
              the guided workflow if you want to finish the remaining steps in order.
            </Text>
          </View>
        ) : hasWorkflowProgress ? (
          <View className="rounded-[22px] bg-[#FAFBFC] px-4 py-4">
            <Text className="text-sm font-semibold text-[#5E5148]">Workflow in progress</Text>
            <Text className="mt-2 text-sm leading-5 text-[#718096]">
              You have started capturing certificate information. Continue the guided wizard or
              switch to a manual certificate route.
            </Text>
          </View>
        ) : (
          <View className="rounded-[22px] bg-[#FAFBFC] px-4 py-4">
            <Text className="text-sm font-semibold text-[#5E5148]">Choose a starting point</Text>
            <Text className="mt-2 text-sm leading-5 text-[#718096]">
              Select one of the actions below. Certificate creation now starts in either a guided
              or manual route, while account and certificate records live in their own screens.
            </Text>
          </View>
        )}
      </View>

      <View className="mb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-lg font-semibold text-[#1A202C]">Actions</Text>
          <Text className="text-sm text-[#8B7F75]">Common menu items</Text>
        </View>

        <View className="rounded-full bg-[#EEE5DC] px-3 py-1.5">
          <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-[#718096]">
            Menu
          </Text>
        </View>
      </View>

      {hasDraftCertificate ? (
        <MenuAction
          icon="document-text-outline"
          title="Continue current certificate"
          subtitle="Open the draft certificate already created for this job."
          accent="bg-[#E8F5E9]"
          onPress={() => router.push('/(tabs)/certificate' as never)}
        />
      ) : (
        <>
          <MenuAction
            icon="sparkles-outline"
            title="Create new cert"
            subtitle="Start the guided certificate route with customer, site, evidence capture, and review."
            accent="bg-[#E3F2FD]"
            onPress={() => startCertificateRoute('guided_photo')}
          />

          <MenuAction
            icon="create-outline"
            title="Manual new cert"
            subtitle="Start the manual-first certificate route for faster direct data entry."
            accent="bg-[#FFF4E6]"
            onPress={() => startCertificateRoute('manual_only')}
          />
        </>
      )}

      <MenuAction
        icon="map-outline"
        title="Fire plan capture"
        subtitle="Use the room plan workflow to capture or build a fire alarm layout plan."
        accent="bg-[#E3F2FD]"
        onPress={() => router.push('/(tabs)/room-plan' as never)}
      />

      <MenuAction
        icon="link-outline"
        title="ServiceM8 login"
        subtitle="Open the ServiceM8 connection page in the web app to connect or update access."
        accent="bg-[#E8F5E9]"
        onPress={() => void openExternalPath('/servicem8')}
      />

      <MenuAction
        icon="person-circle-outline"
        title="Account"
        subtitle="Review your team, subscription status, and billing details."
        accent="bg-[#F0E8FF]"
        onPress={() => router.push('/account' as never)}
      />

      <MenuAction
        icon="documents-outline"
        title="Certificates"
        subtitle="Browse saved certificates and open any record for review or editing."
        accent="bg-[#FFF4E6]"
        onPress={() => router.push('/certificates' as never)}
      />

      {hasDraftCertificate && hasWorkflowProgress ? (
        <TouchableOpacity
          className="mb-4 mt-1 rounded-[24px] border border-[#EADFD5] bg-[#FFFAF5] px-5 py-5"
          onPress={() => router.push('/(tabs)/wizard' as never)}
          activeOpacity={0.85}
        >
          <View className="flex-row items-center justify-between">
            <View className="mr-4 flex-1">
              <Text className="mb-1 text-lg font-semibold text-[#1A202C]">Resume certificate workflow</Text>
              <Text className="text-sm leading-5 text-[#718096]">
                Continue the in-progress certificate from inside the guided workflow.
              </Text>
            </View>
            <View className="h-11 w-11 items-center justify-center rounded-full bg-[#E3F2FD]">
              <Ionicons name="arrow-forward" size={20} color="#0D47A1" />
            </View>
          </View>
        </TouchableOpacity>
      ) : null}

      <View className="mt-2 mb-4 flex-row items-center justify-between rounded-[24px] border border-[#E0E6ED] bg-[#FFFFFF] px-4 py-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            className="h-12 w-12 items-center justify-center rounded-full bg-[#E3F2FD]"
            onPress={() => void signOut()}
            activeOpacity={0.8}
          >
            <Ionicons name="person-circle-outline" size={28} color="#0D47A1" />
          </TouchableOpacity>

          <View className="ml-3">
            <Text className="text-sm font-semibold text-[#1A202C]">Signed in</Text>
            <Text className="text-xs text-[#718096]">Tap the avatar to log out</Text>
          </View>
        </View>

        <TouchableOpacity
          className="rounded-full bg-[#F5F7FA] px-4 py-2"
          onPress={() => dispatch({ type: 'RESET' })}
          activeOpacity={0.85}
        >
          <Text className="text-sm font-medium text-[#718096]">Reset job</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
