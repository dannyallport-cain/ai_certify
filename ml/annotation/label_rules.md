# Annotation label rules for Fire Alarm RoomPlan

This document defines the initial annotation policy for the ML workspace described in `mobile/roomplan.md`.

The aim is to keep annotation practical, conservative, and aligned with the public mobile contract.

## 1. Approved coarse device classes

Use only these coarse public classes for v1:

- `panel`
- `sounder`
- `detector`
- `interface`
- `io_unit`
- `vad`
- `unknown`

If an object does not clearly fit one of the supported classes, label it as `unknown` or leave it unannotated according to the exclusion rules below.

## 2. General principles

1. Prefer correct coarse labels over overconfident fine-grained guesses.
2. Use visible evidence from the image, not assumptions from page context alone.
3. Weak labels from filenames, nearby text, OCR, or source metadata may assist review, but they do not override what is actually visible.
4. If manufacturer is not visible or not reliably inferable from approved evidence, set manufacturer to `Unknown`.
5. If rights or provenance of an asset are unresolved, it should not enter the training-approved annotation set.

## 3. Bounding box rules

- Draw a tight box around the visible device body.
- Include the main housing, visible bezel, beacon lens, grille, or panel face.
- Exclude large background areas.
- If a device is partially occluded, annotate only the visible extent with the best practical tight box.
- Do not draw a box around a room area when the device itself cannot be localized.

## 4. Visibility flags

Use these visibility values:

- `clear` — device is mostly visible and class evidence is strong
- `partial` — device is partly occluded, cropped, or angled but still classifiable
- `difficult` — very small, blurred, low-light, or otherwise weak evidence

If the object is too ambiguous even for `unknown`, skip annotation and leave it for reviewer discussion.

## 5. Class-specific guidance

### Detector
Label as `detector` when the item is primarily a fire detector or detector head, including common smoke, heat, or multisensor form factors.

Examples:
- ceiling smoke detector
- heat detector
- multisensor detector
- beam detector head if visible as the labeled device

Do not split v1 detector subtypes into separate public classes.

### Sounder
Label as `sounder` when the device is primarily an audible notification appliance without clear evidence that the visual alarm function is the main identity.

Examples:
- wall sounder
- horn-style sounder
- base sounder

If the device is clearly a combined sounder-beacon unit, use the VAD rules below.

### VAD
Label as `vad` for visual alarm devices and combined sounder-beacon units where the beacon / strobe function is clearly present or the device is commonly deployed as a visual alarm unit.

Examples:
- beacon only
- wall VAD
- ceiling VAD
- combined sounder beacon with visible lens

Rule of thumb:
- audible only -> `sounder`
- visible beacon only -> `vad`
- combined sounder + beacon -> `vad`

This matches the public type mapping in the RoomPlan plan.

### Panel
Label as `panel` for fire alarm control panels, repeaters, annunciators, or larger wall-mounted control faces where the primary identity is a panel-like control unit.

Examples:
- fire alarm control panel
- repeater panel
- network annunciator panel

If uncertain between panel and generic wall electrical equipment, use `unknown`.

### Interface
Label as `interface` for smaller interface modules whose primary identity is relay, monitored, or input interfacing rather than broader I/O control.

Examples:
- relay interface
- monitored interface
- input module

If the device appears to be a control-oriented I/O module instead, consider `io_unit`.

### IO unit
Label as `io_unit` for broader control or I/O units such as control modules, zone monitor units, or I/O controllers.

Examples:
- control module
- zone monitor
- I/O controller

If there is not enough visible evidence to distinguish `interface` from `io_unit`, choose the more conservative of:
- `interface` when it is a small module with connection purpose emphasized
- `unknown` when distinction is not supportable

### Unknown
Use `unknown` when:
- the device is likely a relevant fire alarm device but the class is unclear
- the object is too small or occluded for confident class assignment
- the item may belong to the fire alarm domain but does not fit the current public classes

Do not use `unknown` as a shortcut for low-effort annotation. Use it only when ambiguity is genuine.

## 6. Manufacturer labeling rules

Allowed shortlist for v1:

- Apollo
- Hochiki
- Gent
- Advanced
- Morley
- Notifier
- Kentec
- C-Tec
- Siemens
- Eaton
- Hyfire
- System Sensor
- Unknown

### Set manufacturer to `Unknown` when:
- branding is unreadable
- no logo or distinctive text is visible
- the crop is too small
- the source context suggests a brand but the image evidence is insufficient
- multiple brands could plausibly match

Do not force a shortlist manufacturer from weak context alone.

## 7. Handling partial devices

Annotate partial devices if:
- enough of the object is visible to support a coarse class
- the visible part corresponds to a real instance in scene
- the annotation would help recall in realistic mobile captures

Do not annotate:
- tiny fragments with no reliable device identity
- reflections instead of real devices
- printed pictures of devices inside brochures when the task expects real scene detection, unless the dataset export explicitly includes document imagery for bootstrap training

## 8. Combined sounder-beacon devices

For combined sounder-beacon units:

- use `vad` as the public class
- if subtype fields are available later, note combined sounder-beacon there
- do not create separate duplicate boxes for the sounder and the beacon of the same physical unit

## 9. Devices with unreadable manufacturer

If the device class is clear but the brand is not:

- annotate the device class normally
- set manufacturer to `Unknown`

A correct device-type annotation with unknown manufacturer is better than a guessed manufacturer.

## 10. Duplicates and repeated sources

The same product image or near-duplicate may appear in:

- multiple distributor pages
- PDFs and product pages
- resized or recompressed variants
- mirrored or slightly cropped copies

Rules:
- keep provenance for every collected asset
- dedupe for dataset splits and exports where practical
- do not let near-duplicates leak across train/validation/test
- if two copies differ only slightly, prefer the higher-quality and better-documented source for annotation

## 11. Exclusion rules

Do not annotate the following unless a later dataset explicitly expands scope:

- manual call points
- extinguishers
- emergency lighting
- general CCTV or security devices
- access control readers
- unrelated electrical accessories
- decorative ceiling fittings mistaken for detectors

If a reviewer is unsure whether an object is in scope, flag it for domain review.

## 12. Review workflow

Recommended roles:

- annotator
- verifier
- fire alarm domain reviewer

Suggested process:

1. annotator labels coarse class and manufacturer if visible
2. verifier checks box quality and label consistency
3. domain reviewer resolves ambiguous or high-impact cases

## 13. Final annotation policy reminders

- Public classes must remain aligned with `mobile/roomplan.md`.
- Internet-derived labels are bootstrap hints only.
- Every asset needs source approval before training use.
- Unclear-license sources must not be marked training-approved.
- When evidence is weak, prefer `unknown` over a confident mistake.