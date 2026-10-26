import { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder, type GestureResponderHandlers } from 'react-native';

import type { Plan3DPoint } from '@/modules/fire-alarm-roomplan';

export interface Plan3DOrbitCamera {
  yawDegrees: number;
  pitchDegrees: number;
  /** Multiplier applied on top of the fit-to-viewport scale. */
  zoom: number;
}

export interface Plan3DOrbitCameraOptions {
  initial?: Partial<Plan3DOrbitCamera>;
  onTap?: (point: Plan3DPoint) => void;
  minZoom?: number;
  maxZoom?: number;
}

export interface Plan3DOrbitCameraController {
  camera: Plan3DOrbitCamera;
  panHandlers: GestureResponderHandlers;
  isDragging: boolean;
  reset: () => void;
  rotateBy: (yawDeltaDegrees: number, pitchDeltaDegrees: number) => void;
  zoomBy: (factor: number) => void;
}

export const DEFAULT_ORBIT_CAMERA: Plan3DOrbitCamera = {
  yawDegrees: 45,
  pitchDegrees: 32,
  zoom: 1,
};

const YAW_DEGREES_PER_PIXEL = 0.45;
const PITCH_DEGREES_PER_PIXEL = 0.35;
/** Below this the pitch becomes a horizon view and the floor stops being pickable. */
const MIN_PITCH_DEGREES = 8;
const MAX_PITCH_DEGREES = 89;
const DEFAULT_MIN_ZOOM = 0.6;
const DEFAULT_MAX_ZOOM = 3.2;
const TAP_MAX_TRAVEL_PX = 12;
const TAP_MAX_DURATION_MS = 500;
const PINCH_MIN_SPREAD_PX = 12;
/** Commits camera state at most this often while a finger is moving, to keep re-projection cheap. */
const MIN_COMMIT_INTERVAL_MS = 12;

interface GestureBaseline {
  camera: Plan3DOrbitCamera;
  touchCount: number;
  pinchSpread: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normaliseYaw(degrees: number): number {
  const wrapped = degrees % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

function touchSpread(touches: { pageX: number; pageY: number }[]): number {
  if (touches.length < 2) {
    return 0;
  }

  return Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
}

/**
 * Drives the placement camera: one finger rotates the room (yaw horizontally, pitch vertically),
 * two fingers pinch to zoom, and a still tap reports the canvas point that was touched.
 */
export function usePlan3DOrbitCamera(
  options: Plan3DOrbitCameraOptions = {},
): Plan3DOrbitCameraController {
  const minZoom = options.minZoom ?? DEFAULT_MIN_ZOOM;
  const maxZoom = options.maxZoom ?? DEFAULT_MAX_ZOOM;

  const initialCamera = useMemo<Plan3DOrbitCamera>(
    () => ({
      yawDegrees: options.initial?.yawDegrees ?? DEFAULT_ORBIT_CAMERA.yawDegrees,
      pitchDegrees: clamp(
        options.initial?.pitchDegrees ?? DEFAULT_ORBIT_CAMERA.pitchDegrees,
        MIN_PITCH_DEGREES,
        MAX_PITCH_DEGREES,
      ),
      zoom: clamp(options.initial?.zoom ?? DEFAULT_ORBIT_CAMERA.zoom, minZoom, maxZoom),
    }),
    // The starting camera is read once; later gestures own the state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [camera, setCamera] = useState<Plan3DOrbitCamera>(initialCamera);
  const [isDragging, setIsDragging] = useState(false);

  const cameraRef = useRef<Plan3DOrbitCamera>(initialCamera);
  const baselineRef = useRef<GestureBaseline | null>(null);
  const tapRef = useRef<{ startedAt: number; travelled: boolean }>({ startedAt: 0, travelled: false });
  const lastCommitRef = useRef(0);

  const onTapRef = useRef(options.onTap);
  onTapRef.current = options.onTap;

  const applyCamera = useCallback((next: Plan3DOrbitCamera) => {
    cameraRef.current = next;
    lastCommitRef.current = Date.now();
    setCamera(next);
  }, []);

  const reset = useCallback(() => {
    applyCamera(initialCamera);
  }, [applyCamera, initialCamera]);

  const rotateBy = useCallback(
    (yawDeltaDegrees: number, pitchDeltaDegrees: number) => {
      const current = cameraRef.current;

      applyCamera({
        ...current,
        yawDegrees: normaliseYaw(current.yawDegrees + yawDeltaDegrees),
        pitchDegrees: clamp(current.pitchDegrees + pitchDeltaDegrees, MIN_PITCH_DEGREES, MAX_PITCH_DEGREES),
      });
    },
    [applyCamera],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      const current = cameraRef.current;

      applyCamera({ ...current, zoom: clamp(current.zoom * factor, minZoom, maxZoom) });
    },
    [applyCamera, maxZoom, minZoom],
  );

  const panHandlers = useMemo<GestureResponderHandlers>(() => {
    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep the gesture even if a surrounding ScrollView wants it: a drag here means orbit.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,

      onPanResponderGrant: (event) => {
        const touches = event.nativeEvent.touches;

        baselineRef.current = {
          camera: cameraRef.current,
          touchCount: touches.length,
          pinchSpread: touchSpread(touches),
        };
        tapRef.current = { startedAt: Date.now(), travelled: false };
        setIsDragging(true);
      },

      onPanResponderMove: (event, gestureState) => {
        const baseline = baselineRef.current;
        const touches = event.nativeEvent.touches;

        if (!baseline || touches.length === 0) {
          return;
        }

        if (
          Math.abs(gestureState.dx) > TAP_MAX_TRAVEL_PX ||
          Math.abs(gestureState.dy) > TAP_MAX_TRAVEL_PX
        ) {
          tapRef.current.travelled = true;
        }

        if (touches.length !== baseline.touchCount) {
          // A finger landed or lifted mid-gesture. Re-baseline from what is on screen now so the
          // model does not jump by the distance the first finger had already travelled.
          baselineRef.current = {
            camera: cameraRef.current,
            touchCount: touches.length,
            pinchSpread: touchSpread(touches),
          };
          tapRef.current.travelled = true;

          return;
        }

        if (touches.length >= 2) {
          const spread = touchSpread(touches);

          if (baseline.pinchSpread < PINCH_MIN_SPREAD_PX || spread < PINCH_MIN_SPREAD_PX) {
            return;
          }

          if (Date.now() - lastCommitRef.current < MIN_COMMIT_INTERVAL_MS) {
            return;
          }

          applyCamera({
            ...baseline.camera,
            zoom: clamp(baseline.camera.zoom * (spread / baseline.pinchSpread), minZoom, maxZoom),
          });

          return;
        }

        if (Date.now() - lastCommitRef.current < MIN_COMMIT_INTERVAL_MS) {
          return;
        }

        // The scene follows the finger: dragging right spins the room right, dragging down tips
        // the floor toward the viewer so more of it is visible.
        applyCamera({
          ...baseline.camera,
          yawDegrees: normaliseYaw(baseline.camera.yawDegrees - gestureState.dx * YAW_DEGREES_PER_PIXEL),
          pitchDegrees: clamp(
            baseline.camera.pitchDegrees + gestureState.dy * PITCH_DEGREES_PER_PIXEL,
            MIN_PITCH_DEGREES,
            MAX_PITCH_DEGREES,
          ),
        });
      },

      onPanResponderRelease: (event) => {
        const tap = tapRef.current;
        const isTap =
          !tap.travelled &&
          Date.now() - tap.startedAt <= TAP_MAX_DURATION_MS &&
          event.nativeEvent.touches.length === 0;

        baselineRef.current = null;
        setIsDragging(false);

        if (!isTap) {
          return;
        }

        onTapRef.current?.({
          x: event.nativeEvent.locationX,
          y: event.nativeEvent.locationY,
        });
      },

      onPanResponderTerminate: () => {
        baselineRef.current = null;
        setIsDragging(false);
      },
    });

    return responder.panHandlers;
  }, [applyCamera, maxZoom, minZoom]);

  return { camera, panHandlers, isDragging, reset, rotateBy, zoomBy };
}
