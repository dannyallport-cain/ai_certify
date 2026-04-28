import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getApiBaseUrl, getMobileAccountOverview, type MobileAccountOverview } from '@/services/api';


function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View className="mb-3 rounded-[20px] border border-[#E0E6ED] bg-[#FFFFFF] px-4 py-4">
      <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-[#8FA3B8]">{label}</Text>
      <Text className="mt-2 text-base font-semibold text-[#1A202C]">{value}</Text>
    </View>
  );
}

function StatusPill({ label, active }: { label: string; active: boolean }) {
  return (
    <View className={`self-start rounded-full px-3 py-1.5 ${active ? 'bg-[#E8F5E9]' : 'bg-[#FFF4E6]'}`}>
      <Text className={`text-xs font-semibold uppercase tracking-[0.8px] ${active ? 'text-[#2E7D32]' : 'text-[#C56E00]'}`}>
        {label}
      </Text>
    </View>
  );
}

export default function AccountScreen() {
  const [overview, setOverview] = useState<MobileAccountOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      setError(null);
      const data = await getMobileAccountOverview();
      setOverview(data);
    } catch (fetchError) {
      console.error('Failed to load account overview:', fetchError);
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load account details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  async function handleOpenBilling() {
    const billingUrl = `${getApiBaseUrl()}/subscription`;
    const supported = await Linking.canOpenURL(billingUrl);

    if (!supported) {
      setError('Unable to open the billing page on this device.');
      return;
    }

    await Linking.openURL(billingUrl);
  }

  const teamName = overview?.team?.companyName ?? overview?.team?.name ?? 'Your team';
  const planName = overview?.subscription?.planName ?? 'No active plan';
  const subscriptionStatus = overview?.subscription?.subscriptionStatus ?? 'unknown';
  const subscriptionDiscount =
    overview?.subscription?.discountPercentage != null
      ? `${overview.subscription.discountPercentage}% discount`
      : 'No discount';

  return (
    <ScrollView
      className="flex-1 bg-[#F5F7FA]"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 120 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void loadOverview();
          }}
        />
      }
    >
      <View className="mb-4 rounded-[30px] border border-[#E0E6ED] bg-[#FFFFFF] px-5 py-5">
        <View className="mb-4 flex-row items-start justify-between">
          <View className="mr-4 flex-1">
            <View className="mb-3 self-start rounded-full bg-[#E3F2FD] px-3 py-1.5">
              <Text className="text-xs font-semibold uppercase tracking-[1px] text-[#718096]">
                Account
              </Text>
            </View>
            <Text className="text-[28px] font-bold leading-8 text-[#1A202C]">Subscription details</Text>
            <Text className="mt-2 text-sm leading-6 text-[#718096]">
              Review your team, plan and billing status from the mobile app.
            </Text>
          </View>

          <View className="h-14 w-14 items-center justify-center rounded-[20px] bg-[#E3F2FD]">
            <Ionicons name="person-circle-outline" size={26} color="#0D47A1" />
          </View>
        </View>

        {loading ? (
          <View className="py-8">
            <ActivityIndicator color="#0D47A1" />
          </View>
        ) : error ? (
          <View className="rounded-[22px] bg-[#FFF4E6] px-4 py-4">
            <Text className="text-sm font-semibold text-[#C56E00]">Could not load account</Text>
            <Text className="mt-2 text-sm leading-5 text-[#8A6A3A]">{error}</Text>
          </View>
        ) : (
          <View className="rounded-[22px] bg-[#FAFBFC] px-4 py-4">
            <Text className="text-sm font-semibold text-[#5E5148]">Current plan</Text>
            <Text className="mt-2 text-base font-semibold text-[#1A202C]">{planName}</Text>
            <Text className="mt-1 text-sm leading-5 text-[#718096]">
              {teamName} • {subscriptionStatus}
            </Text>
          </View>
        )}
      </View>

      <View className="mb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-lg font-semibold text-[#1A202C]">Profile</Text>
          <Text className="text-sm text-[#8B7F75]">Your account and subscription data</Text>
        </View>
        <StatusPill label={subscriptionStatus} active={subscriptionStatus === 'active' || subscriptionStatus === 'trialing' || subscriptionStatus === 'trial'} />
      </View>

      <DetailRow
        label="User"
        value={overview?.user?.name ? `${overview.user.name}${overview.user.email ? ` • ${overview.user.email}` : ''}` : 'User details unavailable'}
      />
      <DetailRow label="Team" value={teamName} />
      <DetailRow label="Plan" value={planName} />
      <DetailRow label="Discount" value={subscriptionDiscount} />
      <DetailRow
        label="Billing bypass"
        value={overview?.subscription?.subscriptionBypass ? 'Enabled' : 'Disabled'}
      />

      <TouchableOpacity
        className="mt-2 rounded-[24px] bg-[#0D47A1] px-5 py-4"
        onPress={() => void handleOpenBilling()}
        activeOpacity={0.85}
      >
        <View className="flex-row items-center justify-between">
          <View className="mr-4 flex-1">
            <Text className="text-base font-semibold text-[#FFFFFF]">Manage billing</Text>
            <Text className="mt-1 text-sm leading-5 text-[#D8E6FB]">
              Open the subscription page in the web app to update billing or plans.
            </Text>
          </View>
          <Ionicons name="open-outline" size={20} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}
