import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import {
  DEFAULT_CAMERA_PITCH,
  DEFAULT_CAMERA_YAW,
  INDICATIVE_COVERAGE_PROFILES,
  MAX_CAMERA_PITCH,
  MAX_ZOOM,
  MIN_CAMERA_PITCH,
  MIN_ZOOM,
  TOP_DOWN_PITCH,
  createPlanSnapshot,
  suggestDetectorPositions,
  type DetectorClass,
  type FireAlarmDeviceType,
  type PlanPoint,
} from '@/modules/fire-alarm-roomplan';
import { createManualDevice } from '@/services/roomplan/session-mutations';

import { CoveragePanel } from '@/components/room-plan/CoveragePanel';
import { DeviceInspector } from '@/components/room-plan/DeviceInspector';
import { ManualRoomCard } from '@/components/room-plan/ManualRoomCard';
import { Plan3DCanvas } from '@/components/room-plan/Plan3DCanvas';
import { PlanToolbar } from '@/components/room-plan/PlanToolbar';
import { usePlanEditor } from '@/components/room-plan/usePlanEditor';

const MIN_CANVAS_HEIGHT = 300;
const MAX_CANVAS_HEIGHT = 520;
const CANVAS_ASPECT = 0.62;
const QUICK_ADD_TYPES: FireAlarmDeviceType[] = ['detector', 'sounder', 'vad', 'panel', 'interface', 'io_unit'];

function formatType(type: string) {
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function RoomPlanPlanScreen() {
  const params = useLocalSearchParams<{ sessionId?: string; id?: string; session?: string }>();
  const editor = usePlanEditor({
    sessionId: params.sessionId ?? params.id,
    sessionParam: params.session,
  });

  const [detectorClass, setDetectorClass] = useState<DetectorClass>('smoke');
  const [yaw, setYaw] = useState(DEFAULT_CAMERA_YAW);
  const [pitch, setPitch] = useState(DEFAULT_CAMERA_PITCH);
  const [zoom, setZoom] = useState(1);
  const [showLabels, setShowLabels] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showCoverage, setShowCoverage] = useState(true);
  const [isPlacing, setIsPlacing] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const snapshot = useMemo(
    () => createPlanSnapshot(editor.session, editor.devices, { coverage: { detectorClass } }),
    [detectorClass, editor.devices, editor.session],
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setCanvasWidth(Math.max(0, Math.floor(event.nativeEvent.layout.width)));
  }, []);

  // The plan is depth-limited, so a taller frame on wide screens is what makes it fill the card.
  const canvasHeight = Math.round(
    Math.min(MAX_CANVAS_HEIGHT, Math.max(MIN_CANVAS_HEIGHT, canvasWidth * CANVAS_ASPECT)),
  );

  const handlePlaceAt = useCallback(
    (point: PlanPoint) => {
      if (!isPlacing || !editor.selectedDeviceId) {
        return;
      }

      editor.moveDeviceTo(editor.selectedDeviceId, point);
      setIsPlacing(false);
      setNotice(null);
    },
    [editor, isPlacing],
  );

  const handleAutoPlace = useCallback(() => {
    if (!editor.geometry.hasGeometry) {
      setNotice('Add a room before laying out detectors.');
      return;
    }

    const existing = editor.devices
      .filter((device) => device.type === 'detector')
      .map((device) => ({ x: device.location?.x ?? 0, y: device.location?.y ?? 0 }));
    const result = suggestDetectorPositions(editor.geometry.rooms, existing, {
      radiusMeters: INDICATIVE_COVERAGE_PROFILES[detectorClass].radiusMeters,
    });

    if (result.positions.length === 0) {
      setNotice('Existing detectors already cover this floor plan.');
      return;
    }

    const additions = result.positions.map((entry, index) =>
      createManualDevice(editor.session?.id ?? 'plan-session', {
        type: 'detector',
        position: entry.position,
        label: `Detector ${existing.length + index + 1}`,
        ceilingHeight: editor.geometry.defaultWallHeight,
      }),
    );

    editor.setDevices((current) => [...current, ...additions]);
    setNotice(`Added ${additions.length} detector${additions.length === 1 ? '' : 's'} to cover the plan.`);
  }, [detectorClass, editor]);

  if (editor.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F7FA] px-6">
        <ActivityIndicator size="small" color="#0D47A1" />
        <Text className="mt-3 text-sm text-[#718096]">Loading fire alarm plan…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-[#F5F7FA]"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 132 }}
    >
      <View className="mb-4 rounded-[28px] border border-[#E0E6ED] bg-white p-5">
        <View className="flex-row items-start justify-between">
          <View className="mr-3 flex-1">
            <View className="mb-3 self-start rounded-full bg-[#E3F2FD] px-3 py-1.5">
              <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-[#718096]">
                3D fire alarm plan
              </Text>
            </View>
            <Text className="text-[24px] font-bold leading-7 text-[#1A202C]">
              {editor.session?.metadata.sessionName ?? 'Fire alarm plan'}
            </Text>
            <Text className="mt-2 text-sm leading-5 text-[#718096]">
              Rotate the captured room, place devices in 3D, and check indicative detection coverage
              before review and export.
            </Text>
          </View>
          <View className="h-12 w-12 items-center justify-center rounded-[18px] bg-[#E3F2FD]">
            <Ionicons name="cube-outline" size={24} color="#0D47A1" />
          </View>
        </View>

        <View className="mt-4 flex-row gap-2">
          <View className="flex-1 rounded-2xl bg-[#F8FAFC] p-3">
            <Text className="text-[10px] font-semibold uppercase tracking-[0.7px] text-[#64748B]">
              Rooms
            </Text>
            <Text className="mt-1 text-lg font-bold text-[#1A202C]">{editor.geometry.rooms.length}</Text>
          </View>
          <View className="flex-1 rounded-2xl bg-[#F8FAFC] p-3">
            <Text className="text-[10px] font-semibold uppercase tracking-[0.7px] text-[#64748B]">
              Devices
            </Text>
            <Text className="mt-1 text-lg font-bold text-[#1A202C]">{editor.devices.length}</Text>
          </View>
          <View className="flex-1 rounded-2xl bg-[#F8FAFC] p-3">
            <Text className="text-[10px] font-semibold uppercase tracking-[0.7px] text-[#64748B]">
              Coverage
            </Text>
            <Text className="mt-1 text-lg font-bold text-[#1A202C]">
              {Math.round(snapshot.coverage.ratio * 100)}%
            </Text>
          </View>
        </View>
      </View>

      <View className="mb-4 overflow-hidden rounded-[28px] border border-[#E0E6ED] bg-white">
        <View onLayout={handleLayout} style={{ height: canvasHeight }}>
          {canvasWidth > 0 ? (
            <Plan3DCanvas
              geometry={editor.geometry}
              devices={snapshot.sceneDevices}
              width={canvasWidth}
              height={canvasHeight}
              yaw={yaw}
              pitch={pitch}
              zoom={zoom}
              selectedDeviceId={editor.selectedDeviceId}
              showGrid={showGrid}
              showLabels={showLabels}
              showCoverage={showCoverage}
              onSelectDevice={editor.setSelectedDeviceId}
              onPlaceAt={isPlacing ? handlePlaceAt : undefined}
            />
          ) : null}
        </View>

        {!editor.geometry.hasGeometry ? (
          <View className="border-t border-[#E0E6ED] bg-[#FFF7ED] px-4 py-3">
            <Text className="text-xs leading-5 text-[#92400E]">
              No room geometry yet. Capture a room with RoomPlan, or add a rectangular room below to
              start the plan without a LiDAR device.
            </Text>
          </View>
        ) : null}

        {isPlacing ? (
          <View className="border-t border-[#E0E6ED] bg-[#E8F5E9] px-4 py-3">
            <Text className="text-xs font-semibold text-[#15803D]">
              Tap the floor to position the selected device.
            </Text>
          </View>
        ) : null}
      </View>

      <View className="mb-4">
        <PlanToolbar
          onRotate={(delta) => setYaw((current) => current + delta)}
          onTilt={(delta) =>
            setPitch((current) => Math.min(MAX_CAMERA_PITCH, Math.max(MIN_CAMERA_PITCH, current + delta)))
          }
          onZoom={(factor) => setZoom((current) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current * factor)))}
          onResetView={() => {
            setYaw(DEFAULT_CAMERA_YAW);
            setPitch(DEFAULT_CAMERA_PITCH);
            setZoom(1);
          }}
          onTopView={() => {
            setYaw(0);
            setPitch(TOP_DOWN_PITCH);
            setZoom(1);
          }}
          showLabels={showLabels}
          showGrid={showGrid}
          showCoverage={showCoverage}
          onToggleLabels={() => setShowLabels((current) => !current)}
          onToggleGrid={() => setShowGrid((current) => !current)}
          onToggleCoverage={() => setShowCoverage((current) => !current)}
          canZoomIn={zoom < MAX_ZOOM}
          canZoomOut={zoom > MIN_ZOOM}
        />
      </View>

      {notice ? (
        <View className="mb-4 rounded-2xl bg-[#EAF1FF] px-4 py-3">
          <Text className="text-xs font-semibold text-[#0D47A1]">{notice}</Text>
        </View>
      ) : null}

      <View className="mb-4 rounded-[24px] border border-[#E0E6ED] bg-white p-4">
        <Text className="text-base font-semibold text-[#1A202C]">Add devices</Text>
        <Text className="mt-1 text-sm leading-5 text-[#718096]">
          Place a device at the room centre, then drag it into position with “Move on plan”.
        </Text>

        <View className="mt-3 flex-row flex-wrap">
          {QUICK_ADD_TYPES.map((type) => (
            <Pressable
              key={type}
              className="mb-2 mr-2 flex-row items-center rounded-full border border-[#E0E6ED] bg-white px-3 py-2"
              onPress={() => {
                editor.addDevice(type);
                setNotice(`${formatType(type)} added — use “Move on plan” to position it.`);
              }}
            >
              <Ionicons name="add" size={14} color="#0D47A1" />
              <Text className="ml-1 text-xs font-semibold text-[#334155]">{formatType(type)}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable className="mt-1 rounded-2xl bg-[#0D47A1] px-4 py-3" onPress={handleAutoPlace}>
          <Text className="text-center text-sm font-semibold text-white">Auto-lay out detectors</Text>
        </Pressable>
        <Text className="mt-2 text-[11px] leading-4 text-[#94A3B8]">
          Greedy layout using the {INDICATIVE_COVERAGE_PROFILES[detectorClass].label.toLowerCase()} radius — review every
          suggested position before relying on it.
        </Text>
      </View>

      <View className="mb-4">
        <CoveragePanel
          report={snapshot.coverage}
          detectorClass={detectorClass}
          onChangeDetectorClass={setDetectorClass}
        />
      </View>

      <View className="mb-4">
        <ManualRoomCard
          geometry={editor.geometry}
          onAddRoom={(draft) => {
            editor.addRoom(draft);
            setNotice(`${draft.name} added to the plan.`);
          }}
          onRemoveRoom={editor.removeRoomById}
        />
      </View>

      <View className="mb-4 rounded-[24px] border border-[#E0E6ED] bg-white p-4">
        <Text className="text-base font-semibold text-[#1A202C]">Devices on plan</Text>
        {editor.devices.length === 0 ? (
          <Text className="mt-2 text-sm leading-5 text-[#718096]">
            No devices yet. Add one above, or capture a room with RoomPlan to import detections.
          </Text>
        ) : (
          <View className="mt-3">
            {editor.devices.map((device) => {
              const selected = device.id === editor.selectedDeviceId;

              return (
                <Pressable
                  key={device.id}
                  className={`mb-2 flex-row items-center justify-between rounded-2xl border px-3 py-3 ${
                    selected ? 'border-[#0D47A1] bg-[#EAF1FF]' : 'border-[#E0E6ED] bg-[#FAFBFC]'
                  }`}
                  onPress={() => editor.setSelectedDeviceId(device.id)}
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-semibold text-[#1A202C]">
                      {device.label?.trim() || formatType(device.type)}
                    </Text>
                    <Text className="mt-0.5 text-xs text-[#718096]">
                      {formatType(device.type)} · x {(device.location?.x ?? 0).toFixed(1)} y{' '}
                      {(device.location?.y ?? 0).toFixed(1)} z {(device.location?.z ?? 0).toFixed(1)}
                    </Text>
                  </View>
                  <Ionicons
                    name={device.identifiedByUser ? 'checkmark-circle' : 'help-circle-outline'}
                    size={18}
                    color={device.identifiedByUser ? '#15803D' : '#94A3B8'}
                  />
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {editor.selectedDevice ? (
        <View className="mb-4">
          <DeviceInspector
            device={editor.selectedDevice}
            ceilingHeight={editor.geometry.defaultWallHeight}
            isPlacing={isPlacing}
            onPlaceMode={() => {
              setIsPlacing((current) => !current);
              setNotice(null);
            }}
            onUpdate={(patch) => {
              if (editor.selectedDeviceId) {
                editor.updateDevice(editor.selectedDeviceId, patch);
              }
            }}
            onDelete={() => {
              if (editor.selectedDeviceId) {
                editor.removeDevice(editor.selectedDeviceId);
              }
            }}
          />
        </View>
      ) : null}

      <View className="gap-3">
        <Pressable
          className="rounded-2xl bg-[#15803D] px-4 py-4"
          onPress={async () => {
            await editor.saveNow();
            setNotice('Plan saved to this device.');
          }}
        >
          <Text className="text-center text-sm font-semibold text-white">
            {editor.saveState === 'saving' ? 'Saving…' : 'Save plan'}
          </Text>
        </Pressable>

        <View className="flex-row gap-3">
          <Pressable
            className="flex-1 rounded-2xl bg-[#1A202C] px-4 py-4"
            onPress={() =>
              editor.session &&
              router.push({
                pathname: '/room-plan/review',
                params: { sessionId: editor.session.id },
              })
            }
          >
            <Text className="text-center text-sm font-semibold text-white">Review devices</Text>
          </Pressable>

          <Pressable
            className="flex-1 rounded-2xl bg-[#0D47A1] px-4 py-4"
            onPress={() =>
              editor.session &&
              router.push({
                pathname: '/room-plan/export',
                params: { sessionId: editor.session.id },
              })
            }
          >
            <Text className="text-center text-sm font-semibold text-white">Export plan</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
