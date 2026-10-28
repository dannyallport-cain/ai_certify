import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, RefreshControl, ScrollView, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { StatTile } from '@/components/ui/StatTile';
import { BiometricSecurityCard } from '@/components/auth/BiometricSecurityCard';
import {
  getApiBaseUrl,
  getMobileAccountOverview,
  type MobileAccountOverview,
} from '@/services/api';
import { useTheme } from '@/theme/useTheme';

function DetailRow({ label, value }: { label: string; value: string }) {
  const { palette } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: palette.line,
      }}
    >
      <AppText variant="caption" tone="muted">
        {label.toUpperCase()}
      </AppText>
      <AppText variant="bodyStrong" numberOfLines={1} style={{ flex: 1, textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
}

export default function AccountScreen() {
  const { palette } = useTheme();
  const [overview, setOverview] = useState<MobileAccountOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      setError(null);
      setOverview(await getMobileAccountOverview());
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Could not load account details');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  async function handleOpenBilling() {
    const billingUrl = `${getApiBaseUrl()}/subscription`;
    const supported = await Linking.canOpenURL(billingUrl);

    if (!supported) {
      setError('This device cannot open the billing page.');
      return;
    }

    await Linking.openURL(billingUrl);
  }

  const teamName = overview?.team?.companyName ?? overview?.team?.name ?? 'Your team';
  const planName = overview?.subscription?.planName ?? 'No active plan';
  const subscriptionStatus = overview?.subscription?.subscriptionStatus ?? 'unknown';
  const isActive = ['active', 'trialing', 'trial'].includes(subscriptionStatus);
  const discount =
    overview?.subscription?.discountPercentage != null
      ? `${overview.subscription.discountPercentage}%`
      : 'None';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.canvas }}
      contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          tintColor={palette.brand}
          onRefresh={() => {
            setIsRefreshing(true);
            void loadOverview();
          }}
        />
      }
    >
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 13 }}>
        <StatTile label="Plan" value={planName} accent="emerald" />
        <StatTile label="Discount" value={discount} accent="teal" />
      </View>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <AppText variant="heading" style={{ flex: 1 }}>
            {teamName}
          </AppText>
          <Pill
            label={subscriptionStatus}
            tone={isActive ? 'success' : 'warning'}
            icon={isActive ? 'checkmark-circle' : 'alert-circle'}
          />
        </View>

        {isLoading ? (
          <View style={{ paddingVertical: 24 }}>
            <ActivityIndicator color={palette.brand} />
          </View>
        ) : error ? (
          <AppText variant="body" tone="danger" style={{ marginTop: 10 }}>
            {error}
          </AppText>
        ) : (
          <View style={{ marginTop: 6 }}>
            <DetailRow
              label="User"
              value={
                overview?.user?.name
                  ? `${overview.user.name}${overview.user.email ? ` · ${overview.user.email}` : ''}`
                  : 'Unavailable'
              }
            />
            <DetailRow label="Team" value={teamName} />
            <DetailRow label="Plan" value={planName} />
            <DetailRow
              label="Billing bypass"
              value={overview?.subscription?.subscriptionBypass ? 'Enabled' : 'Disabled'}
            />
          </View>
        )}
      </Card>

      <View style={{ height: 13 }} />

      <BiometricSecurityCard accountEmail={overview?.user?.email ?? null} />

      <View style={{ height: 13 }} />

      <Button
        label="Manage billing"
        icon="open-outline"
        accent="emerald"
        variant="outline"
        onPress={() => void handleOpenBilling()}
        block
      />
    </ScrollView>
  );
}
