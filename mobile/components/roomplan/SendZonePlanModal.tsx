import { useState } from 'react';
import { Modal, Pressable, Share, Switch, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { normaliseLegendConfig } from '@/modules/fire-alarm-roomplan/plan3d/legend-config';
import type { Plan3DZone } from '@/modules/fire-alarm-roomplan/plan3d/plan3d-types';
import type { FireAlarmScanSession } from '@/modules/fire-alarm-roomplan/types';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/theme/useTheme';
import { publishZonePlan, type PublishedZonePlan } from '@/services/roomplan/zone-plan-api';

interface SendZonePlanModalProps {
  session: FireAlarmScanSession;
  zones: Plan3DZone[];
  visible: boolean;
  onClose: () => void;
}

const EMAIL_PLACEHOLDER = 'client@example.com';

/**
 * Publishes the session to the hosted viewer and, when an address is given,
 * emails the link. Zones drawn on the phone travel with the plan.
 */
export default function SendZonePlanModal({
  session,
  zones,
  visible,
  onClose,
}: SendZonePlanModalProps) {
  const { palette } = useTheme();
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
        zones,
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
      // Dismissing the share sheet is not an error.
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.canvas }} edges={['top', 'bottom']}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderBottomWidth: 1,
            borderBottomColor: palette.line,
            backgroundColor: palette.surface,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={handleClose}
            hitSlop={8}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: palette.surfaceAlt,
            }}
          >
            <Ionicons name="close" size={18} color={palette.ink} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <AppText variant="heading">Send zone plan link</AppText>
            <AppText variant="caption" tone="muted">
              Opens in a browser, no app needed
            </AppText>
          </View>
        </View>

        <View style={{ flex: 1, padding: 16 }}>
          {published ? (
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="checkmark-circle" size={18} color={palette.success} />
                <AppText variant="bodyStrong" tone="success">
                  {published.emailedTo ? `Link sent to ${published.emailedTo}` : 'Link created'}
                </AppText>
              </View>

              <Card>
                <AppText variant="label" tone="muted">
                  VIEWER LINK
                </AppText>
                <AppText variant="body" tone="brand" selectable style={{ marginTop: 4 }}>
                  {published.viewerUrl || published.viewerPath}
                </AppText>
                <AppText variant="caption" tone="muted" style={{ marginTop: 6 }}>
                  {published.editEnabled
                    ? 'The recipient can edit zones and the legend, then save.'
                    : 'The recipient can open and print the plan.'}
                </AppText>
              </Card>

              <Button
                label="Share the link"
                icon="share-outline"
                accent="teal"
                onPress={() => void handleShare()}
                block
              />

              <Button
                label="Done"
                accent="teal"
                variant="outline"
                onPress={handleClose}
                block
              />
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <AppText variant="body" tone="muted">
                Publish this session to a hosted plan view, then email the link. Publishing the
                same session again keeps the existing link working.
              </AppText>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: palette.surfaceAlt,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <Ionicons name="layers-outline" size={15} color={palette.inkMuted} />
                <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
                  {zones.length === 0
                    ? 'No zones drawn yet — the recipient can draw them in the viewer.'
                    : `${zones.length} zone(s) will be sent with the plan.`}
                </AppText>
              </View>

              <View style={{ gap: 6 }}>
                <AppText variant="label" tone="muted">
                  SEND TO (OPTIONAL)
                </AppText>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder={EMAIL_PLACEHOLDER}
                  placeholderTextColor={palette.inkSoft}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  style={{
                    borderWidth: 1,
                    borderColor: palette.line,
                    backgroundColor: palette.surface,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: palette.ink,
                    fontSize: 14,
                  }}
                />
                <AppText variant="caption" tone="soft">
                  Leave blank to create the link and share it yourself.
                </AppText>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  borderWidth: 1,
                  borderColor: palette.line,
                  backgroundColor: palette.surface,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText variant="bodyStrong">Let the recipient edit zones</AppText>
                  <AppText variant="caption" tone="muted">
                    Draw and rename colour coded zones.
                  </AppText>
                </View>
                <Switch
                  value={allowEdit}
                  onValueChange={setAllowEdit}
                  trackColor={{ true: palette.brand, false: palette.lineStrong }}
                />
              </View>

              {error ? (
                <AppText variant="caption" tone="danger">
                  {error}
                </AppText>
              ) : null}

              <Button
                label={email.trim() ? 'Create link and email it' : 'Create link'}
                icon="paper-plane-outline"
                accent="teal"
                loading={isBusy}
                onPress={() => void handlePublish()}
                block
              />
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
