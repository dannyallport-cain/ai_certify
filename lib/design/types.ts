/**
 * Building design domain.
 *
 * A design is the editable artefact a surveyor produces from a room capture: a multi-floor
 * plan-view drawing with fire alarm devices placed on it, colour coded zone overlays and any
 * external areas (car parks, compounds, bin stores) drawn by hand.
 *
 * All geometry is stored in metres on the floor plane, in a coordinate system shared by every
 * floor of the building, so a device dropped on the ground floor at (12, 4) sits directly below
 * the same point on the first floor. Screen positions are never stored; they are derived by the
 * viewport whenever the design is drawn.
 */

/** A point in metres on the floor plane. */
export interface DesignPoint {
  x: number;
  y: number;
}

/** A closed polygon in metres, wound in either direction. */
export type DesignPolygon = DesignPoint[];

export type DesignFloorKind = 'ground' | 'upper' | 'basement' | 'mezzanine' | 'external';

/**
 * One storey of the building. `elevationMeters` is the finished floor level relative to the
 * ground floor, which is what makes a stacked 3D read possible later without re-capturing.
 */
export interface DesignFloor {
  id: string;
  name: string;
  kind: DesignFloorKind;
  /** Storey index. Ground is 0, upper floors are positive, basements negative. */
  level: number;
  elevationMeters: number;
  heightMeters: number;
  /** Captured rooms projected flat onto this floor. */
  rooms: DesignRoom[];
  /** Id of the capture session this floor was imported from, when it came from a scan. */
  sourceSessionId: string | null;
  /** True when the floor was added by hand rather than imported from a capture. */
  manual: boolean;
  notes: string | null;
}

/** A room outline on a floor, taken from the capture or drawn by hand. */
export interface DesignRoom {
  id: string;
  name: string;
  polygon: DesignPolygon;
  /** Set when the room is not enclosed (a corridor stub, an open canopy). */
  open: boolean;
  notes: string | null;
}

/**
 * What a drawn external area is. These are drawn by hand on the design because RoomPlan cannot
 * capture them, and BS 5839-1 zone plans routinely show car parks, compounds and yards.
 */
export type DesignAreaKind =
  | 'car_park'
  | 'compound'
  | 'yard'
  | 'bin_store'
  | 'plant'
  | 'canopy'
  | 'loading_bay'
  | 'garden'
  | 'other';

/** A hand-drawn external area on a floor. */
export interface DesignArea {
  id: string;
  floorId: string;
  kind: DesignAreaKind;
  name: string;
  colour: string;
  polygon: DesignPolygon;
  notes: string | null;
}

/**
 * A colour coded fire alarm zone.
 *
 * A zone is built from one or more regions rather than a single outline: a real compartment is
 * often L-shaped, wraps around a stair core, or comprises two parts of a storey that are not
 * physically joined. Each region is a closed polygon in the same winding-agnostic sense as
 * `DesignRoom.polygon`; together they are the zone's area.
 *
 * Two further things about real compartmentation are modelled here:
 *
 * - **A zone may pass through several storeys.** A stair, lift shaft or service riser is one zone
 *   across the whole building, not a separate zone per floor. `spansFloorIds` lists the extra
 *   storeys the zone's geometry is projected onto; `floorId` is where it was drawn.
 * - **A zone may sit inside another zone.** A shaft inside a floor plate is its own zone, and the
 *   plate's area is the plate minus the shaft. `parentZoneId` records that containment, which is
 *   why nested zones are the one case where regions are allowed to overlap.
 *
 * Apart from a parent and its children, regions of different zones never overlap, which is what
 * keeps the plan readable and the device roll-up unambiguous.
 */
export interface DesignZone {
  id: string;
  /** Storey the zone's regions are drawn on. Also its home storey when it spans several. */
  floorId: string;
  name: string;
  /** Short code printed on the plan and read out in the legend, e.g. `Z1`. */
  reference: string;
  colour: string;
  /** Fill opacity for the semi-translucent overlay, 0.05 to 0.6. */
  opacity: number;
  /** Every part of the zone, in order. Always at least one region. */
  regions: DesignPolygon[];
  /**
   * Extra storeys this compartment continues through, beyond `floorId` — the storeys of a stair
   * or lift shaft. The same regions are projected onto each of them.
   */
  spansFloorIds: string[];
  /** Zone this one sits inside (a shaft within a plate), or null when it is a top-level zone. */
  parentZoneId: string | null;
  notes: string | null;
}

export type DesignMounting = 'ceiling' | 'ceiling_void' | 'wall' | 'floor' | 'external';

/** A fire alarm device placed on a floor. */
export interface DesignDevice {
  id: string;
  floorId: string;
  /** Catalogue kind, see `device-catalogue.ts`. Unknown kinds fall back to a generic marker. */
  kind: string;
  /** Free text label printed beside the symbol. Falls back to the catalogue label. */
  label: string;
  position: DesignPoint;
  mounting: DesignMounting;
  /** Zone the device is assigned to, or null when it sits outside every zone. */
  zoneId: string | null;
  /** Rotation of the symbol in degrees, for wall mounted devices on a diagonal wall. */
  rotation: number;
  /** Address or loop reference, e.g. `L1-07`. Free text because panels differ. */
  address: string | null;
  notes: string | null;
  /** True when the device came from a capture rather than being placed by hand. */
  fromCapture: boolean;
}

/** Optionally included detail printed with the design. */
export interface DesignSheet {
  title: string;
  siteName: string;
  siteAddress: string;
  jobReference: string;
  revision: string;
  preparedBy: string;
  preparedOn: string;
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  accreditation: string;
  notes: string;
  /** Scale bar text, e.g. `1:100 @ A3`. Free text; the drawing itself is unit based. */
  scaleNote: string;
  showZoneLegend: boolean;
  showDeviceLegend: boolean;
  showGrid: boolean;
}

export interface BuildingDesign {
  id: string;
  name: string;
  /** Id of the capture session the design was created from, when it began as a scan. */
  sourceSessionId: string | null;
  floors: DesignFloor[];
  zones: DesignZone[];
  devices: DesignDevice[];
  areas: DesignArea[];
  sheet: DesignSheet;
  /** Schema version, so a stored design can be migrated rather than rejected. */
  version: number;
}

/**
 * Current stored schema version. Bumped when the shape changes in a breaking way.
 *
 * Version 1 designs predate nested and vertical zones; the sanitiser reads them as zones with no
 * parent and no extra storeys, so they open unchanged.
 */
export const DESIGN_SCHEMA_VERSION = 2;

/** Tool the editor is currently using. Plan-view editing only, as designs are drawn flat. */
export type DesignTool = 'select' | 'device' | 'zone' | 'area' | 'pan';

/** A world-space rectangle, produced by dragging on the canvas. */
export interface DesignRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
