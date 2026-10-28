import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { NavRow } from '@/components/ui/NavRow';
import { StatTile } from '@/components/ui/StatTile';
import { listCertificates, type MobileCertificateListRecord } from '@/services/api';
import { useTheme } from '@/theme/useTheme';

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return 'Not set';
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

type StatusTone = 'warning' | 'success' | 'danger' | 'info';

/** One status → one colour, so the list reads at a glance. */
function statusTone(status: string | null | undefined): {
  tone: StatusTone;
  label: string;
} {
  const normalised = (status ?? '').toLowerCase();

  if (normalised.includes('draft')) {
    return { tone: 'warning', label: status ?? 'Draft' };
  }

  if (
    normalised.includes('complete') ||
    normalised.includes('issued') ||
    normalised.includes('sent')
  ) {
    return { tone: 'success', label: status ?? 'Complete' };
  }

  if (normalised.includes('void') || normalised.includes('cancel')) {
    return { tone: 'danger', label: status ?? 'Void' };
  }

  return { tone: 'info', label: status ?? 'Unknown' };
}

export default function CertificatesScreen() {
  const { palette } = useTheme();
  const [items, setItems] = useState<MobileCertificateListRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCertificates = useCallback(async () => {
    try {
      setError(null);
      setItems(await listCertificates());
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Could not load certificates');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadCertificates();
  }, [loadCertificates]);

  const openCertificate = (item: MobileCertificateListRecord) => {
    router.push({
      pathname: '/(tabs)/certificate',
      params: { certificateId: String(item.id) },
    } as never);
  };

  const drafts = items.filter((item) => (item.status ?? '').toLowerCase().includes('draft')).length;

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
            void loadCertificates();
          }}
        />
      }
    >
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 13 }}>
        <StatTile label="Total" value={items.length} accent="teal" />
        <StatTile label="Drafts" value={drafts} accent="amber" />
      </View>

      {isLoading ? (
        <Card>
          <ActivityIndicator color={palette.brand} />
        </Card>
      ) : error ? (
        <Card>
          <AppText variant="bodyStrong" tone="danger">
            Could not load certificates
          </AppText>
          <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>
            {error}
          </AppText>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <AppText variant="bodyStrong">No certificates yet</AppText>
          <AppText variant="body" tone="muted" style={{ marginTop: 4 }}>
            Records appear here once a certificate is created.
          </AppText>
        </Card>
      ) : (
        <View style={{ gap: 8 }}>
          {items.map((item) => {
            const status = statusTone(item.status);

            return (
              <NavRow
                key={item.id}
                icon="document-text-outline"
                title={item.certificateNumber || `Certificate ${item.id}`}
                subtitle={`${item.customer?.name ?? 'No customer'} · ${formatDate(item.inspectionDate)}`}
                accent="teal"
                trailingLabel={status.label}
                onPress={() => openCertificate(item)}
              />
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
