import type { PlanPoint } from './geometry-math';
import type { FireAlarmDeviceType } from './types';

export type PlanPolygonKind = 'floor' | 'wall-face' | 'wall-top' | 'opening' | 'coverage';

export interface PlanScenePolygon {
  id: string;
  kind: PlanPolygonKind;
  path: string;
  depth: number;
  fill: string;
  stroke: string | null;
  strokeWidth: number;
  opacity: number;
  clipPathId?: string | null;
}

export interface PlanSceneClipPath {
  id: string;
  path: string;
}

export interface PlanSceneLine {
  id: string;
  kind: 'grid' | 'leader' | 'wall-edge';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth: number;
  dashArray: string | null;
  opacity: number;
  depth: number;
}

export interface PlanSceneMarker {
  id: string;
  deviceId: string;
  type: FireAlarmDeviceType;
  label: string;
  x: number;
  y: number;
  depth: number;
  colour: string;
  fill: string;
  identified: boolean;
  selected: boolean;
  mountedOnCeiling: boolean;
  heightMeters: number;
  radius: number;
}

export interface PlanSceneText {
  id: string;
  x: number;
  y: number;
  text: string;
  colour: string;
  fontSize: number;
  anchor: 'start' | 'middle' | 'end';
  weight: '400' | '600' | '700';
  depth: number;
}

export interface PlanSceneEllipse {
  id: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  fill: string;
  opacity: number;
  depth: number;
}

export interface PlanScene {
  polygons: PlanScenePolygon[];
  lines: PlanSceneLine[];
  markers: PlanSceneMarker[];
  texts: PlanSceneText[];
  shadows: PlanSceneEllipse[];
  coverageCircles: PlanScenePolygon[];
  clipPaths: PlanSceneClipPath[];
  hasGeometry: boolean;
}

export interface PlanSceneDevice {
  id: string;
  type: FireAlarmDeviceType;
  label: string;
  position: PlanPoint;
  heightMeters: number;
  identified: boolean;
  coverageRadiusMeters: number | null;
}
