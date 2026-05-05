# Mobile App Audit and Parity Backlog

This document captures the current state of the mobile app, the intended workflow from the mobile docs, the gaps between them, and the prioritized backlog needed to reach production-quality stability.

## What the mobile app already has

### Navigation and task selection
- Home screen task chooser
- Guided certificate entry route
- Manual certificate entry route
- Fire alarm plan capture route
- Fire alarm diagnostics route
- Continue-current-certificate handling when a draft exists
- Hidden lower-level workflow routes to keep the tab bar cleaner
- Shared back/forward header helpers

### Certificate workflow
- Customer selection
- New customer creation
- GPS address detection
- Manual address entry
- Inspection date defaulting to today
- Guided/manual certificate mode selection
- Evidence capture
- Certificate review screen
- Draft certificate creation
- On-site certificate editing
- ServiceM8 customer/job import support
- ServiceM8 image import support

### Capture workflow
- Photo library fallback
- AI-assisted image analysis
- Capture quality assessment
- Preview / retake / confirm flow
- Wizard-linked capture targets
- Smoke detector and CO detector evidence handling

### RoomPlan workflow
- RoomPlan tab entry
- Review screen
- Export screen
- Manual device editing
- Local session persistence helper
- Local correction persistence helper
- Backend save hook for identified devices

### Diagnostics
- Fire alarm diagnostics screen
- Triage signals
- Ranked suggestions
- Fault cards
- Measurement guidance
- Rule-based fallback assistant

---

## What the mobile app still does not have

### Stability and error-free operation
- Durable persistence for wizard/job state across app restarts
- Mobile-safe persistence for RoomPlan sessions and corrections
- Unified error handling and recovery UI
- Standard retry and fallback patterns across all screens
- Stronger unsupported-device fallback behavior

### Workflow completeness
- Fully distinct guided and manual certificate routes
- Client-side inspection date override UI
- Exact guided photo sequence from the workflow document
- Commercial / industrial / marine branching
- Missing electrical branching fields in the wizard
- Fully enforced step-by-step capture flow
- Fully connected RoomPlan capture/review lifecycle

### Capture and RoomPlan
- Real in-app camera capture outside the current Expo Go limitation
- Stronger guided capture discipline
- Richer RoomPlan spatial review and export
- Better device/manufacturer inference from RoomPlan data
- Stronger unsupported-device UX for RoomPlan

### Navigation and structure
- Cleaner separation between top-level tasks and workflow sub-steps
- More practical forward-navigation behavior
- Consistent navigation patterns across all workflow screens

---

## Existing Elec-Mate capabilities not yet on mobile

These are present in the wider web/dashboard product but not in the mobile experience.

### Certificate catalogue and specialist workflows
- BS5839-1
- BS5266
- Fire extinguisher
- CP12 gas safety
- Dry riser
- Electrical EIC
- MEIWC
- Streamlined EICR web flow
- Full certificate browsing and management

### Customer management
- Full customer database browsing
- Dedicated customer detail pages
- Web-side customer management utilities

### Calculator suite
- Zs
- Fault current
- Disconnection time
- RCD testing
- Cable sizing
- Voltage drop
- Conduit fill
- Trunking fill
- Ring final continuity
- Insulation resistance
- Maximum demand
- Diversity
- Power factor

### Billing and subscriptions
- Stripe subscription management
- Billing history
- One-time purchases
- Stripe plan editing

### Admin and operations
- Admin dashboard
- User management
- Template management and preview
- Reports
- Stripe configuration
- Database management
- Admin activity and system health views

### ServiceM8 web integration
- Dedicated web connection management
- OAuth connect/disconnect flow
- Sync setting management

### Web dashboard and settings
- Dashboard overview
- Settings / security / general screens
- Web-only operational controls

---

## Prioritized backlog

### P0 — must fix first
1. Persist job state and wizard progress across restarts
2. Replace RoomPlan storage fallback with durable mobile-safe persistence
3. Standardize error handling and recovery UI
4. Add consistent loading, empty, and failure states
5. Improve unsupported-device and unsupported-environment fallbacks

### P1 — complete the current workflows
1. Split guided and manual certificate routes properly
2. Align wizard structure with the documented workflow boundary
3. Add inspection date override support
4. Implement the required capture sequence from the workflow doc
5. Add missing certificate branching fields
6. Add commercial / industrial / marine branches
7. Connect RoomPlan review/export to a full session lifecycle

### P2 — quality upgrades
1. Enable real in-app camera capture
2. Improve preview / retake / confirm flow
3. Strengthen RoomPlan review and edit UX
4. Clean up navigation and route separation
5. Make back/forward behavior consistent

### P3 — selective product parity
1. Decide which web-only capabilities genuinely need mobile equivalents
2. Determine whether calculators, billing, and admin remain web-only
3. Decide whether ServiceM8 needs a fuller mobile control surface
4. Review specialist certificate catalogue priority for mobile support
5. Evaluate a dedicated void property / end-of-tenancy inspection workflow for councils and housing associations, including room-by-room capture, defects, photos, meter readings, key handover details, and report generation

### P4 — later phase
1. Add ML-backed RoomPlan inference
2. Add correction feedback loops
3. Add richer offline and resume support
4. Expand helper tools only after the core workflows are stable
5. If demand is proven, productise void inspection reporting as a reusable mobile module for housing teams

---

## Summary

The mobile app is already useful for on-site workflow, but it is not finished.

The biggest gaps are:
- reliability and persistence,
- stricter workflow enforcement,
- real camera capture,
- fuller certificate branching,
- and selective parity with the broader web app.

This document is the working audit/backlog for finishing the mobile app.
