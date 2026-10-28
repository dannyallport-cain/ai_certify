import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Share,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { normaliseLegendConfig } from '@/modules/fire-alarm-roomplan/plan3d/legend-config';
import type { FireAlarmScanSession } from '@/modules/fire-alarm-roomplan/types';

import { publishZonePlan, type PublishedZonePlan } from '@/services/roomplan/zone-plan-api';

interface SendZonePlanModalProps {
  session: FireAlarmScanSession;
  visible: boolean;
  onClose: () => void;
}

const EMAIL_PLACEHOLDER = 'client@example.com';

/**
 * Publishes the session to the hosted viewer and, when an address is given, emails the link.
 *
 * The zones start empty on purpose: the link is created so the recipient can draw the colour coded
 * zones in plan view themselves, which is what the viewer offers when editing is allowed.
 */
export default function SendZonePlanModal({ session, visible, onClose }: SendZonePlanModalProps) {
  const [email, setEmail] = useState('');
  const [allowEdit, setAllowEdit] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<PublishedZonePlan | null>(null);

  const handleClose = () => {
    setEmail('');
    setError(null);
    setPublished(null);
    setIsBusy(false);
    onClose();
  };

  const handlePublish = async () => {
    setIsBusy(true);
    setError(null);

    try {
      const plan = await publishZonePlan({
        session,
        zones: [],
        legend: normaliseLegendConfig(null),
        recipientEmail: email.trim() ? email.trim() : null,
        editEnabled: allowEdit,
      });

      setPublished(plan);
    } catch (publishError) {
      setError(
        publishError instanceof Error ? publishError.message : 'Unable to create the link',
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleShare = async () => {
    if (!published?.viewerUrl) {
      return;
    }

    try {
      await Share.share({ message: published.viewerUrl, url: published.viewerUrl });
    } catch {
      // Dismissing the share sheet is not an error worth reporting.
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView className="flex-1 bg-[#F5F7FA]" edges={['top', 'bottom']}>
        <View className="flex-row items-center border-b border-[#E0E6ED] bg-white px-4 py-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={handleClose}
            hitSlop={8}
            className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-[#F1F5F9]"
          >
            <Ionicons name="close" size={18} color="#1A202C" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-bold text-[#1A202C]">Send zone plan link</Text>
            <Text className="mt-0.5 text-[11px] text-[#718096]">
              Opens the plan in a browser, no app needed
            </Text>
          </View>
        </View>

        <View className="flex-1 px-4 py-4">
          {published ? (
            <View>
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={20} color="#15803D" />
                <Text className="ml-2 text-sm font-semibold text-[#15803D]">
                  {published.emailedTo ? `Link sent to ${published.emailedTo}` : 'Link created'}
                </Text>
              </View>

              <View className="mt-4 rounded-2xl border border-[#E0E6ED] bg-white p-4">
                <Text className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  Viewer link
                </Text>
                <Text selectable className="mt-2 text-sm text-[#0D47A1]">
                  {published.viewerUrl || published.viewerPath}
                </Text>
                <Text className="mt-2 text-[11px] text-[#718096]">
                  {published.editEnabled
                    ? 'The recipient can draw and rename zones and edit the legend, then save.'
                    : 'The recipient can open and print the plan, but not change it.'}
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => void handleShare()}
                className="mt-4 flex-row items-center justify-center rounded-xl bg-[#0D47A1] px-4 py-4"
              >
                <Ionicons name="share-outline" size={18} color="#FFFFFF" />
                <Text className="ml-2 text-sm font-semibold text-white">Share the link</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={handleClose}
                className="mt-3 items-center justify-center rounded-xl border border-[#CBD5E1] bg-white px-4 py-4"
              >
                <Text className="text-sm font-semibold text-[#334155]">Done</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <Text className="text-sm text-[#475569]">
                Publish this session to a hosted plan view, then email the link. Publishing again
                from the same session keeps the existing link working.
              </Text>

              <Text className="mt-5 text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                Send to (optional)
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={EMAIL_PLACEHOLDER}
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                className="mt-2 rounded-xl border border-[#E0E6ED] bg-white px-4 py-3 text-sm text-[#1A202C]"
              />
              <Text className="mt-1 text-[11px] text-[#718096]">
                Leave blank to create the link and share it yourself.
              </Text>

              <View className="mt-5 flex-row items-center justify-between rounded-xl border border-[#E0E6ED] bg-white px-4 py-3">
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-semibold text-[#1A202C]">
                    Let the recipient edit zones
                  </Text>
                  <Text className="mt-0.5 text-[11px] text-[#718096]">
                    Draw and rename colour coded zones, edit the legend and company details.
                  </Text>
                </View>
                <Switch value={allowEdit} onValueChange={setAllowEdit} />
              </View>

              {error ? (
                <Text className="mt-4 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
                  {error}
                </Text>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: isBusy }}
                disabled={isBusy}
                onPress={() => void handlePublish()}
                className={`mt-5 flex-row items-center justify-center rounded-xl px-4 py-4 ${
                  isBusy ? 'bg-[#93C5FD]' : 'bg-[#0D47A1]'
                }`}
              >
                {isBusy ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
                <Text className="ml-2 text-sm font-semibold text-white">
                  {email.trim() ? 'Create link and email it' : 'Create link'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
