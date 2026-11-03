# Building design studio

The design studio is the second half of the fire alarm plan feature. Room capture answers *what the
building looks like*; the studio answers *what fire alarm system goes in it*.

A body can be scanned storey by storey with RoomPlan on the phone, published, and then worked up on
the web app: detectors dragged onto the measured plan, colour coded zone overlays drawn, external
areas such as car parks added by hand, and every device labelled for the printed sheet.

## Two separate surfaces

| Surface | Route | Purpose |
| --- | --- | --- |
| Zone plan (capture) | `/plan/[token]` | The original flow: a captured session rendered as a plan with hand-drawn zones and a legend. Now multi-floor. |
| Design studio | `/designs`, `/designs/[id]` | Editable building design with dragged devices, external areas and per-device labels. |
| Shared design | `/designs/share/[token]` | Read-only (optionally co-editable) link for a client or site contact. |

The capture side and the design side share the same symbol and geometry code, so a plan cannot look
different in the two places.

## Multi-floor capture

`FireAlarmFloorplanRoom.level` already existed; nothing read it. `plan3d/floors.ts` now groups
captured rooms by level:

- `resolveSessionLevels(session)` — the storeys present, bottom to top.
- `resolveSessionFloors(session)` — per-storey name, room count and device count, used by the floor
  tabs on `/plan/[token]`.
- `filterSessionForLevel(session, level)` — narrows a session to one storey. A device belongs to the
  storey that owns its room; a device with no room belongs to the capture origin (the lowest level).
- `generateFireAlarmPlan3D(session, { level })` — draws one storey. Omitting `level` draws every
  storey at once, which is the previous behaviour and what a single-floor capture still produces.

Zones gained an optional `level`. A zone with `level: null` applies to every storey, so zones drawn
before multi-floor support keep working. Zones drawn in the viewer are tagged with the storey on
screen.

## Design document

`lib/design/types.ts` is the whole model. Geometry is stored in metres on the floor plane in one
coordinate system shared by every storey, so a device at `(12, 4)` on the ground floor sits directly
below the same point on the first floor. Screen positions are never stored; they are derived by the
viewport.

```
BuildingDesign
├── floors[]   level, elevationMeters, heightMeters, rooms[]
├── zones[]    floorId, reference, colour, opacity, regions[]
├── devices[]  floorId, kind, position, label, mounting, zoneId, address, notes
└── areas[]    floorId, kind, name, colour, polygon   (car parks, compounds, yards…)
```

`sheet` holds the title block printed with the drawing (job reference, revision, company,
accreditation, what the legends show).

## Device catalogue and symbols

`lib/design/device-catalogue.ts` holds 42 generic device kinds across seven categories — detection,
call points, alarm devices, control equipment, interfaces, ancillaries and site features. No
manufacturer is named: the catalogue describes *what* a device is, and each entry carries the
standard its symbol follows (BS EN 54-7, BS EN 54-11, BS EN 54-23, BS 7273-4, ISO 7010 …).

`lib/design/symbols.ts` draws every symbol as renderer-agnostic primitives inside a 100 × 100 box,
in the conventions of ISO 6790 and BS 5839-1 zone plans:

- detectors are circles carrying their type letter (`S`, `H`, `M`, `CO`, `B`, `A`, `D` …);
- manual call points are squares with a broken glass;
- sounders and loudspeakers carry sound arcs, beacons and VADs carry the flash;
- control equipment is a rectangle with a lamp field;
- ancillary interfaces (damper, flow switch, valve monitor) use their own pictograms.

The same primitives are rendered by React on screen and by the SVG export, so screen and paper
match.

### Open source check

Before writing the symbols the usual sources were checked: no permissively licensed set of *fire
alarm plan* symbols exists. What is available is generic fire-alarm *icons* (Lucide's
`alarm-smoke`, assorted icon packs) — usable for buttons but not as plan symbols. ISO 6790 was
withdrawn in the 1990s and the Commons scans of it carry mixed licensing. The symbol set is
therefore drawn in-house against the conventions above, with the standard reference recorded per
device so a reviewer can check a symbol against the code.

## Drawing behaviour

- Devices are dragged from the palette with native HTML5 drag; clicking a palette item arms it for
  click-to-place instead, which is friendlier on a trackpad.
- A placed device can be dragged on the canvas; pointer capture means the drag survives leaving the
  symbol.
- The zone and area tools draw a rectangle by drag. Anything under 0.4 m in either direction is
  treated as a mis-click and discarded.
- Zones are semi-translucent by design: opacity is clamped to 5–60 % so the plan underneath stays
  readable.
- Every floor is fitted to the same transform, which is what keeps storeys registered when you
  switch between them.

`components/design/useDesignEditor.ts` holds the document and an undo stack of snapshots. Every
edit is a pure function in `lib/design/mutations.ts`, so the same rules apply on screen and when the
server validates a save.

## Zone designer

A zone is a **set of regions**, not one rectangle. Real compartments are L-shaped, wrap a stair core,
or cover two unconnected parts of a storey, so `DesignZone.regions` holds one or more closed polygons
and everything downstream (scene, legend, device roll-up, print) iterates over them.

Three rules, enforced in `lib/design/zones.ts` and applied by `addZoneRegion`:

- **Zones never overlap.** A drag that crosses another compartment contributes only its free
  remainder: the overlap is subtracted and the leftover pieces are added. A drag that sits entirely
  inside another zone is refused, with the reason shown under the plan.
- **Edges snap.** New edges snap within 0.35 m onto existing zone edges, so neighbouring compartments
  share an exact boundary instead of leaving a hairline sliver that reads as an uncovered strip.
- **Everything should be covered.** `floorCoverage` samples each room on a 0.25 m grid and reports the
  covered ratio per room and for the storey. The studio shows the percentage and names the rooms that
  are not yet fully zoned, so gaps are found before the plan is printed.

The inspector is the "current zone": **Add areas to this zone** arms it, and every subsequent drag is
added to that zone as another region — that is how a compartment is built up from several boxes,
connected or not. Parts are listed individually and can be removed one at a time; removing the last
part deletes the zone. Devices are re-sealed after every change, so a detector always belongs to the
compartment that contains it.

Stored designs written before this change carry a single `polygon`; the sanitiser reads it as a
one-region zone, so existing plans open unchanged.

### Zones inside zones

A lift shaft, stair core or riser is a real compartment in its own right, and it usually sits
*inside* another one: the shaft pierces a floor plate that would otherwise be a single zone. That
overlap is by design, so `DesignZone.parentZoneId` expresses it and the overlap rule is relaxed for
a parent and its descendants only — every other pair is still refused or clipped.

- **Nesting** — `nestZone(design, zoneId, parentZoneId)` puts a compartment inside another, and
  `nestZone(design, zoneId, null)` takes it back out. A zone that does not fit inside its proposed
  parent is refused with `not_contained`; a loop is refused with `cycle`. In the inspector, **Nested
  inside** offers the compartments on the same storey that are not already descendants.
- **Area and fill** — a nested compartment is not double counted: `zoneNetAreaSquareMeters` reports
  the plate as the plate minus its children, and the plate is drawn with a real hole (an SVG hole
  ring in its path) where the child sits, so the child's own colour shows through.
- **Devices** — sealing prefers the deepest compartment, so a detector in the shaft counts against
  the shaft and a detector on the landing counts against the plate. Moving a device re-seals it.
- **Deleting a parent** — its children are promoted to its own parent (usually top level) rather
  than deleted, because a shaft is still a compartment when the plate around it is redrawn.

### Vertical zones

A stair or shaft is one zone across several storeys, not one zone per floor: the reference, colour,
notes and device roll-up must stay together. `DesignZone.floorId` is the storey it was drawn on and
`spansFloorIds` lists the further storeys it reaches, set from the inspector's **Also covers
storeys** checkboxes via `setZoneFloors`.

- `zonesOnFloor(zones, floorId)` returns everything drawn on or spanning a storey, and every
  consumer — scene, coverage, snapping, conflict checks, device sealing, legend — queries through it,
  so a vertical zone appears, is selectable and claims devices on each of its storeys.
- `floorId` stays the home floor: the zone's regions are drawn there, and the same footprint is
  projected onto the other storeys. Adding regions on an upper storey is not offered, which keeps one
  unambiguous geometry for the whole shaft.
- Removing a storey drops it from `spansFloorIds`; the zone only disappears when its home floor is
  removed.

`DESIGN_SCHEMA_VERSION` is 2. A version 1 design has no `parentZoneId` and no `spansFloorIds`, which
the sanitiser supplies as `null` and `[]`, so old plans read as a flat set of top-level zones.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/designs` | Team's designs (summaries). |
| `POST` | `/api/designs` | Create blank, create from a supplied document, or create from a captured session. |
| `GET` | `/api/designs/[id]` | Full design document. |
| `PATCH` | `/api/designs/[id]` | Save the document, or `{ publish: true }` to issue/reuse the share token. |
| `DELETE` | `/api/designs/[id]` | Delete. |
| `POST` | `/api/mobile/designs` | Mobile publish: session in, editor URL and share URL out. |
| `GET` | `/api/mobile/designs` | Designs the phone can reopen. |
| `PUT` | `/api/mobile/designs` | Single design by id. |

Saves are validated by `lib/design/sanitise.ts` before they reach the database: floors, rooms,
zones, devices and areas are all rebuilt field by field, malformed entities are dropped rather than
rejecting the whole document, and sizes are capped (40 floors, 4000 devices, 400 polygon points).

The whole document lives in one `json` column, with denormalised counts alongside so the design list
does not have to parse every plan. Re-publishing a captured session updates the existing row rather
than creating a duplicate.

## Mobile → server → web

On the phone the hand-off is a button, not a hidden call: **Design it on the web** sits in the
*Continue the workflow* card on both plan screens (`mobile/app/room-plan/plan.tsx` and
`mobile/app/fire-alarm/plan.tsx`). It opens `SendDesignModal`, which previews how many storeys and
devices will be imported, offers the shared-link switch, then publishes and hands back the editor
link with an "Open the design studio" action.

```ts
import { publishDesign } from '@/services/roomplan/design-api';

const published = await publishDesign({ session, name: 'Riverside House' });
// published.editorUrl → open on the web app to place devices
```

`mobile/services/roomplan/design-api.ts` posts the session; the server groups its rooms by captured
level, builds the multi-floor design, seals each captured device into the zone of the room it was
found in, and returns the editor link.

Republishing the same session updates the existing design rather than creating a second one, so
re-scanning one storey refines the plan instead of duplicating it. A share token is only minted
when the surveyor asks for a shared link: the editor route needs a signed-in account, so the share
URL is the only link worth sending to a client. The modal prefers it when sharing and falls back to
the editor link for the surveyor's own device.

Zones drawn on the phone travel with the publish. `adoptCaptureZones` maps each one onto the storey
it was drawn on, keeps its reference, name, colour and note, and replaces the auto-generated room
zones for that storey — so marking out compartments before publishing is not wasted work. Devices
are re-sealed afterwards: one that falls inside a drawn compartment is assigned to it, and one
outside every compartment is left unassigned rather than kept in a room zone that no longer exists.

## Verifying

```bash
npx tsx scripts/smoke-design.ts       # or: npm run verify:design
npx tsc --noEmit                      # web
npx tsc --noEmit -p mobile/tsconfig.json
npm run build
cd mobile && npx expo export --platform ios   # proves the phone screens bundle
```

`scripts/smoke-design.ts` builds a two-storey capture, imports it, draws a zone, drops and relabels a
call point, draws a car park, round-trips the document through the sanitiser, adopts zones drawn on
the phone, asserts the exact request body the phone posts, exercises the zone designer (snapping, a
refused overlap, a multi-part zone, a clipped drag, coverage reporting and removing one part), and
checks the scene for each floor — 88 assertions covering the whole pipeline.

The zone designer cases additionally cover nesting: a shaft drawn inside a plate (its area, the hole
cut in the plate's fill, sealing to the deepest compartment, refusal of a child that overhangs and of
a nesting loop), that shaft running through a second storey (storey list, appearance on the upper
floor, device sealing there, legend storey count), and promotion of the child when the plate is
deleted. A nested, multi-storey design is also round-tripped through the sanitiser, and a tampered
document is proved to lose a nesting loop or a parent that does not exist rather than keeping it.

`mobile/services/roomplan/design-payload.ts` holds `buildPublishDesignBody` apart from the fetch
wrapper precisely so those last assertions are possible: the module has no native or secure-store
imports, so a plain runtime test can prove the phone sends the zones it drew instead of trusting the
code by inspection.

## Migration

`lib/db/migrations/20261029130000_add_fire_alarm_building_designs.sql` creates
`fire_alarm_building_designs` and is registered in `meta/_journal.json`.

## Demonstration plan

`/designs/demo` opens a finished two-storey zone plan in the real studio. It is the answer to "what
does this actually produce?" — a surveyor can drag a detector, redraw a compartment, open the
inspectors and read the legends without scanning a building first, and a new team member can learn
the editor on a drawing that is already correct.

| Route | Purpose |
| --- | --- |
| `/designs/demo` | The worked example, rendered by the same `DesignStudio` that edits stored designs. |
| `/designs` | Carries a card linking to it, including the live counts. |

### Where the drawing comes from

The geometry is measured, not invented. `lib/design/demo/blueprint.ts` holds the room schedule, zone
compartments, device positions and external areas as plain metres, together with the published plan
they were taken from (Cadbull, *School AutoCAD plan featuring 47 m² and 60 m² classroom layouts*,
file 271383 — classrooms 46.14–60.00 m², kitchen 34.80 m², staff room 25.29 m², director's office
10.86 m², corridors 2.80–3.90 m wide, 2.40 m service corridor):

- a 30 m × 14 m floor plate repeated over two storeys, `840 m²` in total;
- a 2.6 m spine corridor the length of the plate, rooms of 19–72 m² either side;
- a 3.6 m × 2.6 m stair core at the east end and a 1.2 m × 1.2 m riser in the plant room.

The source, publisher, reference and what was derived are exported as `DEMO_BLUEPRINT_SOURCE` and
printed in the banner, so a reviewer can check the room sizes against the plan they came from.

### What it demonstrates

`lib/design/demo/demo-plan.ts` turns the blueprint into a `BuildingDesign` with **deterministic ids**
(`zone-demo-z4`, `device-demo-ground-07`) so the document a visitor opens is the one the smoke test
asserts. Nothing is stored: the design is built in memory on each request.

- **13 compartment zones** — single-room zones, four multi-region compartments, one compartment
  nested inside another and one running through both storeys.
- **Nesting** — `Z6` is the riser, nested inside `Z4` (the south rooms), so the plate's fill is cut
  where the riser sits and the riser symbol seals to `Z6` rather than to `Z4`.
- **Vertical zone** — `Z7` is the stair: drawn once on the ground floor, `spansFloorIds` puts the
  same reference and colour on the first floor and claims the stair detectors there too.
- **93 devices** across every category: panel, repeater, power supply, optical and heat detection,
  CO and aspirating detection, call points, sounders, beacons, VADs, interfaces, a door hold-open
  unit, an AOV, exit signs, extinguishers, the riser, the yard call point and the assembly point.
  Addresses are generated per storey (`L1-…` on the ground floor, `L2-…` above).
- **3 external areas** on the ground floor drawing: a 14-space car park, a bin store and the muster
  point — the things RoomPlan cannot capture and a zone plan is expected to show.
- **100 % zone coverage** on both storeys, with the zone legend reporting net areas (`Z9` 102 m² over
  two parts) and the stair's two-storey reach.

### Labels

A zone plan annotates a symbol with a short reference, not with the device's full name: 55 symbols
on one storey print as `L1-07`, and the legend says what a circle with an `S` is. Only the devices
with no address of interest — the panel, the entrance call point, the riser — carry a worded label.
`demo-plan.ts` therefore falls back to the loop address when the blueprint does not name a device,
and the smoke test asserts no label exceeds 24 characters.

### Editing and saving

`DesignStudio` takes `mode="demo"`. In that mode there is no row to save against, so:

- the header shows **Save a copy** instead of **Save**, which `POST`s the current document to
  `/api/designs` and navigates to the new design — so a visitor who improves the plan keeps it as an
  ordinary design of their own;
- publishing is hidden in the plan sheet, because a shared link needs a stored row (the panel says
  so);
- everything else is the production editor: dragging, zoning, nesting, the storey bar, coverage
  reporting and undo.

### Verifying

```bash
npm run verify:demo     # 78 assertions
npx tsc --noEmit
```

`scripts/smoke-demo-plan.ts` builds the design and asserts what would be wrong on a printed plan: the
block really is 30 m × 14 m, every room is inside a compartment on both storeys, no two unrelated
compartments overlap, only the three yard devices sit outside a compartment, the riser symbol seals
to the riser and not to its parent, the first floor stair detector seals to the ground floor stair
zone, every device kind is in the catalogue, labels are short and addresses unique, both storeys share
one transform, the document survives the sanitiser with its nesting and spans intact, a tampered
document loses only the nonsense, and the plan is byte-identical when built twice.
