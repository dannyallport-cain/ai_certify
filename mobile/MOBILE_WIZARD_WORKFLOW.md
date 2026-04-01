# Mobile Wizard Workflow

This document defines the guided field workflow for the mobile app so it can be changed without hunting through screen logic.

## Goal

Provide a single guided wizard that walks an engineer through a consistent capture flow for a domestic inspection / EICR draft.

## Current Wizard Intent

The wizard should guide the user through these stages in order:

1. Customer
2. Address / GPS
3. Inspection date
4. Required electrical photos
5. Consumer unit material
6. Smoke detector questions and photo capture
7. Solid fuel / CO detector questions and photo capture
8. Review and draft creation

---

## Step-by-step workflow

### 1) Customer
Prompt the engineer to:

- select an existing customer, or
- create a new customer

Preferred prompt:
- `Enter customer name`

Secondary optional fields:
- email
- phone

Current implementation path:
- `/(tabs)/customer`

---

### 2) Address / GPS
Prompt the engineer to:

- use GPS to detect site address, or
- manually enter the address

Preferred prompt:
- `Confirm site address`

Current implementation path:
- `/(tabs)/location`

---

### 3) Inspection date
Default the inspection date to today's date automatically.

Behavior:
- prefill with today's date
- allow future enhancement for manual override if needed
- clearly show the selected date in the wizard summary

Preferred prompt:
- `Inspection date`
- default value: today's date

Current status:
- draft certificate creation already defaults to today's date server-side
- wizard should also display this date client-side

---

### 4) Required electrical image prompts
The wizard should ask for the following images in order:

1. Main fuse
2. Meter
3. Consumer unit with cover on
4. Circuit schedule

For each image step, the UI should:

- explain what to capture
- show framing guidance
- allow retake
- show preview before confirmation
- mark the step complete after confirmation

Suggested capture prompt structure:
- title
- short reason
- framing checklist
- capture button
- retake / confirm actions

Suggested labels:
- `Take a photo of the main fuse`
- `Take a photo of the meter`
- `Take a photo of the consumer unit with the cover on`
- `Take a photo of the circuit schedule`

Current implementation path:
- `/(tabs)/capture`

---

### 5) Consumer unit material
Ask:

- `Is the consumer unit metal or plastic?`

Suggested response options:
- Metal
- Plastic
- Not sure

This should later be included in certificate form data.

---

### 6) Smoke detectors
Ask:

- `How many smoke detectors are present?`

Behavior:
- require quantity input
- then prompt for that number of smoke detector photos
- each detector photo should be individually confirmed

Suggested prompts:
- `Enter smoke detector quantity`
- `Take photo of smoke detector 1`
- `Take photo of smoke detector 2`
- etc.

---

### 7) Solid fuel appliance / CO detector
Ask:

- `Is there a solid fuel burning appliance?`

If `No`:
- skip the CO detector branch

If `Yes`:
- prompt the engineer to:
  - test the CO detector
  - take a photo of the CO detector

Suggested prompts:
- `Test the CO detector now`
- `Take a photo of the CO detector`

---

### 8) Review and draft creation
Show a summary of:

- customer
- address
- inspection date
- completed image tasks
- consumer unit material
- smoke detector quantity
- solid fuel appliance answer
- CO detector capture status if applicable

Then allow the engineer to continue to review and create the draft certificate.

Current implementation path:
- `/(tabs)/review`

---

## Recommended data model additions

These fields are recommended for persistent wizard state:

```ts
type WizardPhotoType =
  | 'main_fuse'
  | 'meter'
  | 'consumer_unit_cover_on'
  | 'circuit_schedule'
  | 'smoke_detector'
  | 'co_detector';

type WizardAnswers = {
  inspectionDate: string;
  consumerUnitMaterial: 'metal' | 'plastic' | 'not_sure' | null;
  smokeDetectorCount: number;
  hasSolidFuelAppliance: boolean | null;
  coDetectorTested: boolean;
};

type WizardPhoto = {
  uri: string;
  type: WizardPhotoType;
  label: string;
};
```

---

## UX rules

The wizard should:

- always show the current step and next step
- allow going back without losing progress
- show completion state per step
- use today's date by default
- keep camera guidance visible before capture
- show image preview after every capture
- keep the workflow simple enough for on-site use with one hand

---

## Near-term implementation plan

### Phase 1
- add a `Start Guided Wizard` button on the mobile home screen
- add a wizard screen with:
  - checklist
  - today's date
  - required prompts
  - navigation links into existing screens

### Phase 2
- persist wizard-specific answers in shared job state
- support typed image categories instead of generic captured images only
- attach wizard answers to certificate `formData`

### Phase 3
- replace simple navigation prompts with fully enforced step-by-step capture
- support smoke detector quantity-driven repeated photo prompts
- support solid fuel conditional branch and CO detector evidence
