import { useMemo, useState } from 'react';
import { Linking, Modal, Pressable, Share, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { FireAlarmScanSession } from '@/modules/fire-alarm-roomplan/types';
import type { Plan3DZone } from '@/modules/fire-alarm-roomplan/plan3d/plan3d-types';
import { resolveSessionFloors } from '@/modules/fire-alarm-roomplan/plan3d/floors';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/theme/useTheme';
import { publishDesign, type PublishedDesign } from '@/services/roomplan/design-api';

interface SendDesignModalProps {
  session: FireAlarmScanSession;
  /** Zones drawn on the phone; they travel with the design instead of being thrown away. */
  zones: Plan3DZone[];
  visible: boolean;
  onClose: () => void;
}

/**
 * Hands the captured session to the web design studio.
 *
 * This is the hand-off point for the whole feature: the phone measures the building, then the
 * surveyor opens the studio on the web app to drag detectors onto the plan, draw colour coded
 * zones and add the external areas RoomPlan cannot see. Publishing the same session twice updates
 * the existing design rather than creating a second one.
 */
export default function SendDesignModal({
  session,
  zones,
  visible,
  onClose,
}: SendDesignModalProps) {
  const { palette } = useTheme();
  const [allowEdit, setAllowEdit] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<PublishedDesign | null>(null);

  const floors = useMemo(() => resolveSessionFloors(session), [session]);
  const deviceCount = floors.reduce((total, floor) => total + floor.deviceCount, 0);

  const handleClose = () => {
    setError(null);
    setPublished(null);
    setIsBusy(false);
    onClose();
  };

  const handlePublish = async () => {
    setIsBusy(true);
    setError(null);

    try {
      const design = await publishDesign({
        session,
        zones,
        name: session.metadata?.sessionName ?? null,
        editEnabled: allowEdit,
      });

      setPublished(design);
    } catch (publishError) {
      setError(
        publishError instanceof Error ? publishError.message : 'Unable to open the design studio',
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleOpenEditor = async () => {
    if (!published?.editorUrl) {
      return;
    }

    try {
      await Linking.openURL(published.editorUrl);
    } catch {
      setError('Could not open a browser on this device.');
    }
  };

  const handleShare = async () => {
    // Prefer the public share link: the editor route needs a signed-in account, so sending it to a
    // client would only bounce them to the sign-in page.
    const url =
      published?.shareUrl || published?.sharePath || published?.editorUrl || published?.editorPath;

    if (!url) {
      return;
    }

    try {
      await Share.share({ message: url, url });
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
            <AppText variant="heading">Open in design studio</AppText>
            <AppText variant="caption" tone="muted">
              Place detectors and draw zones on the web
            </AppText>
          </View>
        </View>

        <View style={{ flex: 1, padding: 16 }}>
          {published ? (
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="checkmark-circle" size={18} color={palette.success} />
                <AppText variant="bodyStrong" tone="success">
                  {published.name} is ready to design
                </AppText>
              </View>

              <Card>
                <AppText variant="label" tone="muted">
                  DESIGN STUDIO
                </AppText>
                <AppText variant="body" tone="brand" selectable style={{ marginTop: 4 }}>
                  {published.editorUrl || published.editorPath}
                </AppText>
                <AppText variant="caption" tone="muted" style={{ marginTop: 6 }}>
                  {published.floorCount} floor{published.floorCount === 1 ? '' : 's'} ·{' '}
                  {published.deviceCount} device{published.deviceCount === 1 ? '' : 's'} ·{' '}
                  {published.zoneCount} zone{published.zoneCount === 1 ? '' : 's'} carried across.
                  Publishing again updates the same design.
                </AppText>

                {published.shareUrl || published.sharePath ? (
                  <>
                    <AppText variant="label" tone="muted" style={{ marginTop: 12 }}>
                      SHARED LINK
                    </AppText>
                    <AppText variant="body" tone="brand" selectable style={{ marginTop: 4 }}>
                      {published.shareUrl || published.sharePath}
                    </AppText>
                    <AppText variant="caption" tone="muted" style={{ marginTop: 6 }}>
                      Opens without signing in. Anyone with this link can see the plan.
                    </AppText>
                  </>
                ) : null}
              </Card>

              <Button
                label="Open the design studio"
                icon="open-outline"
                accent="teal"
                onPress={() => void handleOpenEditor()}
                block
              />

              <Button
                label="Share the link"
                icon="share-outline"
                accent="teal"
                variant="outline"
                onPress={() => void handleShare()}
                block
              />

              <Button label="Done" accent="teal" variant="outline" onPress={handleClose} block />
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <AppText variant="body" tone="muted">
                Sends this capture to the web app, where the building opens as a multi-floor plan.
                Detectors, call points and sounders can then be dragged onto the measured plan,
                zones drawn and car parks or compounds added by hand.
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
                  {floors.length === 0
                    ? 'No rooms captured yet — the design will start empty.'
                    : `${floors.length} floor${floors.length === 1 ? '' : 's'} and ${deviceCount} device${deviceCount === 1 ? '' : 's'} will be imported.`}
                  {zones.length > 0
                    ? ` The ${zones.length} zone${zones.length === 1 ? '' : 's'} drawn here go with them.`
                    : ''}
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
                  <AppText variant="bodyStrong">Allow a shared link to edit</AppText>
                  <AppText variant="caption" tone="muted">
                    Off by default: you can issue a read-only link later.
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
                label="Open the design studio"
                icon="arrow-forward-outline"
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
