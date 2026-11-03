'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  Building2,
  CopyPlus,
  MousePointer2,
  Redo2,
  Save,
  SquareDashed,
  Undo2,
  Warehouse,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  AREA_KIND_LABELS,
  buildFloorScene,
  zoneIsAncestor,
  zonesOnFloor,
  type BuildingDesign,
  type DesignAreaKind,
} from '@/lib/design';
import type { BlueprintSource, DemoDesignSummary } from '@/lib/design/demo';

import AreaInspector from './AreaInspector';
import DemoPlanBanner from './DemoPlanBanner';
import { DesignCanvas } from './DesignCanvas';
import DesignLegend from './DesignLegend';
import DeviceInspector from './DeviceInspector';
import DevicePalette from './DevicePalette';
import FloorBar from './FloorBar';
import SheetPanel from './SheetPanel';
import ZoneInspector from './ZoneInspector';
import { useDesignEditor } from './useDesignEditor';

interface DesignStudioProps {
  designId: number;
  initialDesign: BuildingDesign;
  initialShareToken: string | null;
  updatedAt: string | null;
  /**
   * 'demo' runs the studio against a document that only exists in this browser: every edit works,
   * but there is no stored row to save against, so the header offers "save a copy" instead.
   */
  mode?: 'persisted' | 'demo';
  /** What the demonstration contains, shown in the banner. Demo mode only. */
  demoSummary?: DemoDesignSummary | null;
  /** The published plan the demonstration was drawn from, credited in the banner. */
  demoSource?: BlueprintSource | null;
}

const SAVE_LABELS = {
  idle: 'Save',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Retry save',
} as const;

const AREA_KINDS: DesignAreaKind[] = [
  'car_park',
  'compound',
  'yard',
  'bin_store',
  'plant',
  'canopy',
  'loading_bay',
  'garden',
  'other',
];

/**
 * The design studio.
 *
 * Three columns: the catalogue, the drawing, and everything that edits what is selected. The
 * drawing stays the same size and transform as floors change, which is what makes a multi-storey
 * building readable — the ground floor and the first floor sit on top of each other by position,
 * not by convenience.
 */
export default function DesignStudio({
  designId,
  initialDesign,
  initialShareToken,
  updatedAt,
  mode = 'persisted',
  demoSummary = null,
  demoSource = null,
}: DesignStudioProps) {
  const router = useRouter();
  const editor = useDesignEditor({ designId, initialDesign, initialShareToken, mode });
  const [areaKind, setAreaKind] = useState<DesignAreaKind>('car_park');
  const [copying, setCopying] = useState(false);

  const isDemo = mode === 'demo';

  // A demonstration plan has no row of its own, so keeping the work means creating one and
  // handing the browser over to the real editor for it.
  const handleSaveCopy = async () => {
    setCopying(true);

    const createdId = await editor.saveCopy();

    setCopying(false);

    if (createdId) {
      router.push(`/designs/${createdId}`);
      router.refresh();
    }
  };

  const devicesByFloor = useMemo(() => {
    const counts: Record<string, number> = {};

    editor.design.devices.forEach((device) => {
      counts[device.floorId] = (counts[device.floorId] ?? 0) + 1;
    });

    return counts;
  }, [editor.design.devices]);

  const scene = useMemo(
    () =>
      buildFloorScene(editor.design, editor.floorId, {
        selectedDeviceId: editor.selectedDevice?.id ?? null,
      }),
    [editor.design, editor.floorId, editor.selectedDevice?.id],
  );

  // Includes vertical compartments passing through this storey, not just those drawn here.
  const floorZones = useMemo(
    () => (editor.floorId ? zonesOnFloor(editor.design.zones, editor.floorId) : []),
    [editor.design.zones, editor.floorId],
  );

  const selectedZoneDeviceCount = editor.selectedZone
    ? scene.zoneLegend.find((entry) => entry.zoneId === editor.selectedZone?.id)?.deviceCount ?? 0
    : 0;

  // Any compartment on a storey the selected zone touches can be its parent, except itself and
  // the compartments already nested inside it, which would make a cycle.
  const nestCandidates = useMemo(() => {
    const zone = editor.selectedZone;

    if (!zone) {
      return [];
    }

    return zonesOnFloor(editor.design.zones, zone.floorId)
      .filter(
        (candidate) =>
          candidate.id !== zone.id && !zoneIsAncestor(editor.design.zones, zone.id, candidate.id),
      )
      .map((candidate) => ({
        id: candidate.id,
        label: `${candidate.reference} · ${candidate.name}`,
      }));
  }, [editor.design.zones, editor.selectedZone]);

  const selectedArea =
    editor.selection?.type === 'area'
      ? editor.design.areas.find((area) => area.id === editor.selection?.id) ?? null
      : null;

  const lastUpdated = useMemo(() => {
    if (!updatedAt) {
      return null;
    }

    const parsed = new Date(updatedAt);

    return Number.isNaN(parsed.getTime()) ? updatedAt : parsed.toLocaleString();
  }, [updatedAt]);

  return (
    <main className="flex-1 space-y-3 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href="/designs"
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted print:hidden"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Designs
            </Link>
            <span className="text-xs text-muted-foreground print:hidden">
              {lastUpdated ? `Updated ${lastUpdated}` : 'Nothing saved yet'}
            </span>
          </div>

          <label className="mt-1 flex items-center gap-2">
            <Building2 className="h-5 w-5 shrink-0 text-muted-foreground print:hidden" aria-hidden />
            <input
              value={editor.design.name}
              onChange={(event) => editor.setDesignName(event.target.value)}
              aria-label="Design name"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-2xl font-semibold tracking-tight text-foreground outline-none focus:ring-0 print:text-xl"
            />
          </label>

          <p className="mt-1 text-sm text-muted-foreground">
            {editor.design.sheet.title}
            {editor.design.sheet.siteName ? ` · ${editor.design.sheet.siteName}` : ''}
            {editor.design.sheet.revision ? ` · Rev ${editor.design.sheet.revision}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 print:hidden">
          <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
            <ToolButton
              active={editor.tool === 'select'}
              onClick={() => editor.setTool('select')}
              label="Select and move"
            >
              <MousePointer2 className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton
              active={editor.tool === 'zone'}
              onClick={() => editor.setTool('zone')}
              label="Draw a zone"
            >
              <SquareDashed className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton
              active={editor.tool === 'area'}
              onClick={() => editor.setTool('area')}
              label="Draw an external area"
            >
              <Warehouse className="h-3.5 w-3.5" />
            </ToolButton>
          </div>

          {editor.tool === 'area' ? (
            <select
              value={areaKind}
              onChange={(event) => setAreaKind(event.target.value as DesignAreaKind)}
              aria-label="External area type"
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground"
            >
              {AREA_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {AREA_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
          ) : null}

          <button
            type="button"
            onClick={editor.undo}
            disabled={!editor.canUndo}
            title="Undo"
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={editor.redo}
            disabled={!editor.canRedo}
            title="Redo"
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => void editor.zoneAllRooms()}
            className="rounded-lg border border-border px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            Zone every room
          </button>

          {isDemo ? (
            <button
              type="button"
              onClick={() => void handleSaveCopy()}
              disabled={copying}
              title="Create your own design from this plan"
              className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CopyPlus className="h-3.5 w-3.5" />
              {copying
                ? 'Copying…'
                : editor.saveState === 'error'
                  ? 'Retry copy'
                  : 'Save a copy'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void editor.save()}
              disabled={editor.saveState === 'saving' || !editor.isDirty}
              className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" />
              {SAVE_LABELS[editor.saveState]}
            </button>
          )}
        </div>
      </header>

      {isDemo && demoSummary && demoSource ? (
        <DemoPlanBanner summary={demoSummary} source={demoSource} />
      ) : null}

      {editor.error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive print:hidden">
          {editor.error}
        </p>
      ) : null}

      <FloorBar
        floors={editor.floors}
        floorId={editor.floorId}
        zones={editor.design.zones}
        devicesByFloor={devicesByFloor}
        canDelete={editor.floors.length > 1}
        onSelect={editor.setFloor}
        onAdd={editor.addFloor}
        onDuplicate={editor.duplicateFloor}
        onDelete={editor.deleteFloor}
        onRename={(name) => editor.updateFloorDetails({ name })}
      />

      {/* Below xl there is no room for a third column, so the catalogue collapses into a
          disclosure above the drawing. Without it a laptop under 1280 px has no way to add a
          device at all. */}
      <details className="rounded-xl border border-border bg-card p-3 xl:hidden print:hidden">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">
          Device catalogue
          {editor.pendingKind ? (
            <span className="ml-2 rounded-full bg-foreground px-2 py-0.5 text-[11px] font-medium text-background">
              armed
            </span>
          ) : null}
        </summary>
        <div className="mt-2 overflow-y-auto" style={{ maxHeight: 320 }}>
          <DevicePalette pendingKind={editor.pendingKind} onArm={editor.armDeviceKind} />
        </div>
      </details>

      <div className="grid gap-3 xl:grid-cols-[240px_minmax(0,1fr)_320px]">
        <div
          className="hidden min-h-0 overflow-y-auto pr-1 xl:block print:hidden"
          style={{ maxHeight: 'calc(100vh - 220px)' }}
        >
          <DevicePalette pendingKind={editor.pendingKind} onArm={editor.armDeviceKind} />
        </div>

        <div className="min-w-0 space-y-2">
          <DesignCanvas
            design={editor.design}
            floorId={editor.floorId}
            tool={editor.tool}
            pendingKind={editor.pendingKind}
            areaKind={areaKind}
            selectedDeviceId={editor.selectedDevice?.id ?? null}
            selectedZoneId={editor.selectedZone?.id ?? null}
            onPlaceDevice={editor.placeDevice}
            onMoveDevice={(deviceId, point) => editor.dropDevice(deviceId, point)}
            onDrawZone={editor.drawZone}
            onDrawArea={editor.drawArea}
            onSelectDevice={(deviceId) =>
              editor.select(deviceId ? { type: 'device', id: deviceId } : null)
            }
            onSelectZone={(zoneId) => editor.select(zoneId ? { type: 'zone', id: zoneId } : null)}
            showGrid={editor.design.sheet.showGrid}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground print:hidden">
            <span>
              {editor.tool === 'zone'
                ? 'Drag a rectangle to draw a zone.'
                : editor.tool === 'area'
                  ? `Drag a rectangle to draw a ${AREA_KIND_LABELS[areaKind].toLowerCase()}.`
                  : editor.pendingKind
                    ? 'Click the plan to place the armed device.'
                    : 'Drag devices from the palette. Drag a placed device to move it.'}
            </span>
            <span>
              {scene.stats.roomCount} room(s) · {scene.stats.deviceCount} device(s) ·{' '}
              {scene.stats.floorAreaSquareMeters.toFixed(1)} m²
              {editor.coverage
                ? ` · ${Math.round(editor.coverage.ratio * 100)}% zone coverage`
                : ''}
            </span>
          </div>

          {editor.zoneMessage ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 print:hidden">
              <p>{editor.zoneMessage}</p>
              {editor.pendingNestedZone ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={editor.acceptNestedZone}
                    className="rounded-md bg-foreground px-2 py-1 text-[11px] font-semibold text-background"
                  >
                    Add inside {editor.pendingNestedZone.parentReference}
                  </button>
                  <button
                    type="button"
                    onClick={editor.dismissNestedZone}
                    className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
                  >
                    Dismiss
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {editor.coverage && !editor.coverage.complete && editor.coverage.uncoveredRooms.length > 0 ? (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 print:hidden">
              Not yet covered:{' '}
              {editor.coverage.uncoveredRooms
                .slice(0, 4)
                .map((room) => `${room.name} (${Math.round(room.coveredRatio * 100)}%)`)
                .join(', ')}
              {editor.coverage.uncoveredRooms.length > 4
                ? ` and ${editor.coverage.uncoveredRooms.length - 4} more`
                : ''}
              . Every part of the floor should belong to a zone.
            </p>
          ) : null}

          {editor.floors.length === 1 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground print:hidden">
              This building has one floor. Use <strong>Floor</strong> in the storey bar to add
              another, or <strong>Copy</strong> to repeat this layout upwards.
            </p>
          ) : null}
        </div>

        <aside className="space-y-3 print:hidden">
          {editor.selectedDevice ? (
            <DeviceInspector
              device={editor.selectedDevice}
              zones={floorZones}
              onLabelChange={(label) =>
                editor.setDeviceLabel(editor.selectedDevice!.id, label)
              }
              onKindChange={(kind) => editor.setDeviceKind(editor.selectedDevice!.id, kind)}
              onMountingChange={(mounting) =>
                editor.setDeviceMounting(editor.selectedDevice!.id, mounting)
              }
              onAddressChange={(address) =>
                editor.setDeviceAddress(editor.selectedDevice!.id, address)
              }
              onNotesChange={(notes) => editor.setDeviceNotes(editor.selectedDevice!.id, notes)}
              onZoneChange={(zoneId) => editor.setDeviceZone(editor.selectedDevice!.id, zoneId)}
              onRotate={() => editor.rotateSelectedDevice(15)}
              onDuplicate={editor.duplicateSelectedDevice}
              onDelete={editor.deleteSelectedDevice}
            />
          ) : null}

          {editor.selectedZone ? (
            <ZoneInspector
              zone={editor.selectedZone}
              deviceCount={selectedZoneDeviceCount}
              floors={editor.floors}
              nestCandidates={nestCandidates}
              onNestChange={editor.nestSelectedZone}
              onFloorsChange={editor.setSelectedZoneFloors}
              nestingError={editor.nestingError}
              isDrawingTarget={editor.zoneTargetId === editor.selectedZone.id}
              onToggleDrawTarget={() => {
                const isTarget = editor.zoneTargetId === editor.selectedZone!.id;

                editor.setZoneTarget(isTarget ? null : editor.selectedZone!.id);
                if (!isTarget) {
                  editor.setTool('zone');
                }
              }}
              onRemoveRegion={editor.removeSelectedZoneRegion}
              onNameChange={editor.renameSelectedZone}
              onReferenceChange={(reference) =>
                editor.updateSelectedZone({ reference })
              }
              onColourChange={editor.recolourSelectedZone}
              onOpacityChange={editor.setSelectedZoneOpacity}
              onNotesChange={(notes) =>
                editor.updateSelectedZone({ notes: notes.trim() || null })
              }
              onDuplicate={editor.duplicateSelectedZone}
              onDelete={editor.deleteSelectedZone}
            />
          ) : null}

          {selectedArea ? (
            <AreaInspector
              area={selectedArea}
              onNameChange={(name) => editor.updateSelectedArea({ name })}
              onKindChange={(kind) => editor.updateSelectedArea({ kind })}
              onColourChange={(colour) => editor.updateSelectedArea({ colour })}
              onDelete={editor.deleteSelectedArea}
            />
          ) : null}

          <DesignLegend
            scene={scene}
            selectedZoneId={editor.selectedZone?.id ?? null}
            onSelectZone={(zoneId) => editor.select({ type: 'zone', id: zoneId })}
          />

          <SheetPanel
            sheet={editor.design.sheet}
            shareToken={editor.shareToken}
            onSheetChange={editor.updateDesignSheet}
            onPublish={editor.publish}
            canShare={!isDemo}
          />
        </aside>
      </div>
    </main>
  );
}

function ToolButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`inline-flex items-center justify-center rounded-md px-2 py-1.5 transition ${
        active ? 'bg-foreground text-background' : 'text-foreground hover:bg-muted'
      }`}
    >
      {children}
    </button>
  );
}
