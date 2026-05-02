import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { listCertificates, type MobileCertificateListRecord } from '@/services/api';

function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Not set';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString();
}

function statusTone(status: string | null | undefined) {
  const normalized = (status ?? '').toLowerCase();

  if (normalized.includes('draft')) {
    return 'bg-[#FFF4E6] text-[#C56E00]';
  }

  if (normalized.includes('complete') || normalized.includes('issued') || normalized.includes('sent')) {
    return 'bg-[#E8F5E9] text-[#2E7D32]';
  }

  if (normalized.includes('void') || normalized.includes('cancel')) {
    return 'bg-[#FCE8E8] text-[#C62828]';
  }

  return 'bg-[#E3F2FD] text-[#0D47A1]';
}

function CertificateCard({
  item,
  onPress,
}: {
  item: MobileCertificateListRecord;
  onPress: () => void;
}) {
  const title = item.certificateNumber || `Certificate ${item.id}`;
  const customerName = item.customer?.name ?? 'No customer linked';

  return (
    <TouchableOpacity
      className="mb-3 rounded-[24px] border border-[#E0E6ED] bg-[#FFFFFF] px-4 py-4"
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View className="flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <Text className="text-base font-semibold text-[#1A202C]">{title}</Text>
          <Text className="mt-1 text-sm text-[#718096]">{customerName}</Text>
        </View>

        <View className={`rounded-full px-3 py-1.5 ${statusTone(item.status)}`}>
          <Text className="text-xs font-semibold uppercase tracking-[0.8px]">{item.status ?? 'Unknown'}</Text>
        </View>
      </View>

      <View className="mt-4 flex-row flex-wrap">
        <View className="mr-4 mb-2">
          <Text className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8FA3B8]">Site address</Text>
          <Text className="mt-1 text-sm text-[#374151]">{item.siteAddress ?? 'Not set'}</Text>
        </View>
        <View className="mr-4 mb-2">
          <Text className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8FA3B8]">Inspection date</Text>
          <Text className="mt-1 text-sm text-[#374151]">{formatDate(item.inspectionDate)}</Text>
        </View>
        <View className="mb-2">
          <Text className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8FA3B8]">Created</Text>
          <Text className="mt-1 text-sm text-[#374151]">{formatDate(item.inspectionDate)}</Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between rounded-[18px] bg-[#F5F7FA] px-3 py-3">
        <View className="flex-row items-center">
          <Ionicons name="document-text-outline" size={18} color="#0D47A1" />
          <Text className="ml-2 text-sm font-semibold text-[#1A202C]">Open certificate</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );
}

export default function CertificatesScreen() {
  const [items, setItems] = useState<MobileCertificateListRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCertificates = useCallback(async () => {
    try {
      setError(null);
      const data = await listCertificates();
      setItems(data);
    } catch (fetchError) {
      console.error('Failed to load certificates:', fetchError);
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load certificates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadCertificates();
  }, [loadCertificates]);

  return (
    <ScrollView
      className="flex-1 bg-[#F5F7FA]"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 120 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void loadCertificates();
          }}
        />
      }
    >
      <View className="mb-4 rounded-[30px] border border-[#E0E6ED] bg-[#FFFFFF] px-5 py-5">
        <View className="mb-4 flex-row items-start justify-between">
          <View className="mr-4 flex-1">
            <View className="mb-3 self-start rounded-full bg-[#E3F2FD] px-3 py-1.5">
              <Text className="text-xs font-semibold uppercase tracking-[1px] text-[#718096]">Certificates</Text>
            </View>
            <Text className="text-[28px] font-bold leading-8 text-[#1A202C]">Certificate list</Text>
            <Text className="mt-2 text-sm leading-6 text-[#718096]">
              Open any existing certificate to review or continue editing it.
            </Text>
          </View>
          <View className="h-14 w-14 items-center justify-center rounded-[20px] bg-[#E3F2FD]">
            <Ionicons name="documents-outline" size={26} color="#0D47A1" />
          </View>
        </View>

        {loading ? (
          <View className="py-8">
            <ActivityIndicator color="#0D47A1" />
          </View>
        ) : error ? (
          <View className="rounded-[22px] bg-[#FFF4E6] px-4 py-4">
            <Text className="text-sm font-semibold text-[#C56E00]">Could not load certificates</Text>
            <Text className="mt-2 text-sm leading-5 text-[#8A6A3A]">{error}</Text>
          </View>
        ) : (
          <View className="rounded-[22px] bg-[#FAFBFC] px-4 py-4">
            <Text className="text-sm font-semibold text-[#5E5148]">Saved certificates</Text>
            <Text className="mt-2 text-base font-semibold text-[#1A202C]">{items.length} total</Text>
            <Text className="mt-1 text-sm leading-5 text-[#718096]">
              Pull to refresh the latest certificates from the mobile API.
            </Text>
          </View>
        )}
      </View>

      <View className="mb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-lg font-semibold text-[#1A202C]">Recent records</Text>
          <Text className="text-sm text-[#8B7F75]">Tap a certificate to continue editing</Text>
        </View>
      </View>

      {items.length === 0 && !loading && !error ? (
        <View className="rounded-[24px] border border-dashed border-[#CBD5E1] bg-[#FFFFFF] px-5 py-8">
          <Text className="text-base font-semibold text-[#1A202C]">No certificates found</Text>
          <Text className="mt-2 text-sm leading-6 text-[#718096]">
            Certificates will appear here after they are created in the mobile workflow.
          </Text>
        </View>
      ) : null}

      {items.map((item) => (
        <CertificateCard
          key={item.id}
          item={item}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/certificate',
              params: { certificateId: String(item.id) },
            } as never)
          }
        />
      ))}
    </ScrollView>
  );
}
