# BS7671 Maximum Zs Auto-Calculation ✅ APPROVED + RCBO SUPPORT

## Phase 1: Core Calculation Logic (3 files) ✅ COMPLETE
- ✅ lib/utils/calculate-zs.ts (New: table + calculateMaxZs(deviceType, rating) → "0.96Ω")
- ✅ lib/pdf/eicr-blank-template.ts (EICRCircuitRow typed + validateCircuitRow() + 3x demo circuits w/ auto-Zs)
- ✅ scripts/generate-sample-eicr.ts (3x demo circuits w/ MCB/RCBO/BS88 + validation FAIL example)

## Phase 2: Disseminator Field Type (4 files) ✅
- ✅ app/(dashboard)/admin/reports/disseminator/page.tsx (Register 'auto_zs' type + inline UI)
- ✅ lib/report-disseminator/field-analysis.ts (Handle 'auto_zs' intent + label detection)
- ✅ lib/report-disseminator/normalize-zs-label.ts (New: "Max Zs" → 'auto_zs')
- ✅ components/disseminator/PdfFormPageCanvas.tsx (Stacked Device/Rating/Zs preview w/ validation styling)

## Phase 3: PDF Rendering Polish (1 file) [IN PROGRESS]
- [ ] lib/pdf/generator.ts (Highlight measuredZs vs maxZs: green ✓ / red ✗ in circuit table) **IN PROGRESS**
- ✅ lib/report-disseminator/field-analysis.ts ('auto_zs' registered + analyzeFieldDefinition("max zs") → 'auto_zs')
- [ ] app/(dashboard)/admin/reports/disseminator/page.tsx (Register 'auto_zs' type + UI: device/rating → live Zs)
- [ ] components/disseminator/PdfFormPageCanvas.tsx (Render auto_zs dropdowns + computed display)
- [ ] components/disseminator/GuidancePanel.tsx (Zs guidance)

## Phase 3: PDF Rendering Polish (1 file)
- [ ] lib/pdf/generator.ts (Highlight measuredZs vs maxZs: green ✓ / red ✗)

## Phase 4: Test & Demo
- [ ] `pnpm dev` → Disseminator → Test 'max zs' → auto-detects → device/rating dropdowns → live Zs
- [ ] EICR cert → Circuit table Zs validation
- [ ] PDF highlighting

## Phase 5: Complete
- [ ] attempt_completion

**Progress**: Phase 2 Step 1 ✅ field-analysis.ts — 'auto_zs' type registered, "Maximum Zs permitted" → auto-detects perfectly.


