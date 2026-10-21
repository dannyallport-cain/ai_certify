import { analysePlanCoverage, type CoverageOptions, type CoverageReport } from './plan-coverage';
import { buildPlanGeometry, type PlanGeometry } from './plan-geometry';
import { toSceneDevice } from './plan-scene-devices';
import type { PlanSceneDevice } from './plan-scene-types';
import type { FireAlarmDeviceDetection, FireAlarmScanSession } from './types';

export interface PlanSnapshot {
  geometry: PlanGeometry;
  coverage: CoverageReport;
  sceneDevices: PlanSceneDevice[];
  placedDeviceCount: number;
  unplacedDeviceCount: number;
}

export interface PlanSnapshotOptions {
  coverage?: CoverageOptions;
  defaultWallHeight?: number;
}
/**
 * Single entry point used by the 3D plan screens: turns a captured session plus its
 * device list into geometry, projected device markers and an indicative coverage report.
 */
export function createPlanSnapshot(
  session: FireAlarmScanSession | null | undefined,
  devices: FireAlarmDeviceDetection[],
  options: PlanSnapshotOptions = {},
): PlanSnapshot {
  const geometry = buildPlanGeometry(session, {
    defaultWallHeight: options.defaultWallHeight,
  });
  const sceneDevices = devices
    .map((device) => toSceneDevice(device, geometry.defaultWallHeight, options.coverage ?? {}))
    .filter((device): device is PlanSceneDevice => device !== null);
  const coverage = analysePlanCoverage(
    geometry.rooms,
    sceneDevices.map((device) => ({
      id: device.id,
      type: device.type,
      position: device.position,
    })),
    options.coverage,
  );

  return {
    geometry,
    coverage,
    sceneDevices,
    placedDeviceCount: sceneDevices.length,
    unplacedDeviceCount: devices.length - sceneDevices.length,
  };
}
