import { useMemo, useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useJob, type ImportedServiceM8Image, type WizardPhotoType } from '@/components/JobStateContext';
import { Callout } from '@/components/form/Callout';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  createDraftCertificate,
  mapImportedServiceM8ImagesToDraftPayload,
  uploadMobileImage,
} from '@/services/api';
import { useTheme } from '@/theme/useTheme';

const guidedPhotoSummary: { type: WizardPhotoType; label: string }[] = [
  { type: 'consumer_unit_external', label: 'Consumer unit' },
  { type: 'consumer_unit_internal', label: 'Consumer unit with front removed' },
  { type: 'bonding', label: 'Main protective bonding' },
];

const LANDLORD_GUIDANCE_SMOKE =
  'For rented homes in England, at least one smoke alarm should be installed on every storey used as living accommodation.';

const LANDLORD_GUIDANCE_CO =
  'A carbon monoxide alarm should be installed in any room used as living accommodation which contains a fixed combustion appliance, excluding a gas cooker.';

function buildMobileCaptureFolderHint() {
  return `mobile-${Date.now()}`;
}

function getImportedServiceM8ImageDisplayName(image: ImportedServiceM8Image) {
  return image.attachment.fileName || `Attachment ${image.attachment.uuid.slice(0, 8)}`;
}

export default function ReviewScreen() {
  const { palette } = useTheme();
  const { state, dispatch } = useJob();
  const [submitting, setSubmitting] = useState(false);
  const {
    selectedCustomer,
    gpsAddress,
    capturedImages,
    analysisResult,
    wizard,
    selectedServiceM8Job,
    selectedServiceM8JobDetail,
    importedServiceM8Images,
  } = state;

  const getImageFor = (type: WizardPhotoType, slotIndex?: number) =>
    capturedImages.find(
      (image) => image.type === type && (image.slotIndex ?? null) === (slotIndex ?? null),
    );

  const usesPhotoEvidence =
    wizard.dataEntryMode === 'guided_photo' || wizard.dataEntryMode === 'hybrid';

  const mandatoryGuidedPhotosComplete =
    !usesPhotoEvidence ||
    guidedPhotoSummary.every((item) => !!getImageFor(item.type)?.qualityAssessment?.isSufficient);

  const damagePhotoSummary = [
    {
      type: 'damaged_accessory' as const,
      label: 'Damaged socket, switch, or accessory',
      present: wizard.hasDamagedAccessory,
      image: getImageFor('damaged_accessory'),
    },
    {
      type: 'damaged_luminaire' as const,
      label: 'Damaged luminaire',
      present: wizard.hasDamagedLuminaire,
      image: getImageFor('damaged_luminaire'),
    },
  ].map((item) => ({
    ...item,
    accepted: !!item.image?.qualityAssessment?.isSufficient,
  }));

  const damagePromptsComplete =
    !usesPhotoEvidence ||
    damagePhotoSummary.every(
      (item) => item.present !== null && (item.present === false || item.accepted),
    );

  const isDomesticStyleInstallation =
    wizard.installationType === 'domestic' ||
    wizard.installationType === 'mixed_use' ||
    wizard.installationType === 'caravan';

  const requiresSmokeAndCoFlow =
    wizard.reportPurpose === 'private_rented_sector_eicr' ||
    wizard.reportPurpose === 'change_of_tenancy' ||
    wizard.occupancyType === 'tenanted';

  const minimumRecommendedSmokeAlarms = Math.max(1, wizard.storeyCount);
  const smokeAlarmCountMeetsGuidance =
    !requiresSmokeAndCoFlow || wizard.smokeDetectorCount >= minimumRecommendedSmokeAlarms;

  const smokePhotosComplete =
    !requiresSmokeAndCoFlow ||
    wizard.smokeDetectorCount === 0 ||
    Array.from(
      { length: wizard.smokeDetectorCount },
      (_, index) => !!getImageFor('smoke_detector', index)?.qualityAssessment?.isSufficient,
    ).every(Boolean);

  const coDetectorPhotoComplete = !!getImageFor('co_detector')?.qualityAssessment?.isSufficient;
  const coBranchComplete =
    !requiresSmokeAndCoFlow ||
    wizard.hasSolidFuelAppliance !== true ||
    (wizard.coDetectorTested && coDetectorPhotoComplete);

  const requiredPhotoChecklist = [
    ...guidedPhotoSummary.map((item) => {
      const image = getImageFor(item.type);
      return {
        key: item.type,
        label: item.label,
        required: true,
        complete: !!image?.qualityAssessment?.isSufficient,
        status: image
          ? image.qualityAssessment?.isSufficient
            ? `Accepted${image.qualityAssessment?.score ? ` • score ${image.qualityAssessment.score}` : ''}`
            : 'Retake required due to insufficient quality'
          : 'Capture required',
      };
    }),
    ...damagePhotoSummary
      .filter((item) => item.present === true)
      .map((item) => ({
        key: item.type,
        label: item.label,
        required: true,
        complete: item.accepted,
        status: item.image
          ? item.accepted
            ? `Accepted${item.image.qualityAssessment?.score ? ` • score ${item.image.qualityAssessment.score}` : ''}`
            : 'Retake required due to insufficient quality'
          : 'Capture required',
      })),
    ...Array.from({ length: wizard.smokeDetectorCount }, (_, index) => {
      const image = getImageFor('smoke_detector', index);
      const accepted = !!image?.qualityAssessment?.isSufficient;
      return {
        key: `smoke_detector_${index}`,
        label: `Smoke detector ${index + 1}`,
        required: requiresSmokeAndCoFlow,
        complete: !requiresSmokeAndCoFlow || accepted,
        status: !requiresSmokeAndCoFlow
          ? 'Not required'
          : image
            ? accepted
              ? `Accepted${image.qualityAssessment?.score ? ` • score ${image.qualityAssessment.score}` : ''}`
              : 'Retake required due to insufficient quality'
            : 'Capture required',
      };
    }),
    {
      key: 'co_detector',
      label: 'CO detector',
      required: wizard.hasSolidFuelAppliance === true,
      complete: wizard.hasSolidFuelAppliance !== true || coDetectorPhotoComplete,
      status:
        wizard.hasSolidFuelAppliance !== true
          ? 'Not required'
          : coDetectorPhotoComplete
            ? 'Accepted'
            : wizard.coDetectorTested
              ? 'Capture required'
              : 'Test detector, then capture photo',
    },
  ].filter((item) => item.required);

  const outstandingRequiredPhotos = requiredPhotoChecklist.filter((item) => !item.complete);

  const infrastructureQuestionsComplete =
    wizard.distributionBoardCount >= 1 &&
    wizard.hasRcdProtection !== null &&
    wizard.hasRcboProtection !== null &&
    wizard.hasSurgeProtectionDevice !== null &&
    wizard.hasEvCharger !== null &&
    wizard.hasSolarPv !== null &&
    wizard.hasAfddProtection !== null &&
    wizard.hasCommunalOrLandlordSupplies !== null &&
    (wizard.hasSolarPv !== true || wizard.hasBatteryStorage !== null);

  const wizardAnswersComplete =
    !!wizard.reportPurpose &&
    !!wizard.installationType &&
    !!wizard.occupancyType &&
    !!wizard.supplyPhase &&
    wizard.hasOutbuildingsOrAncillarySupplies !== null &&
    (!isDomesticStyleInstallation || wizard.consumerUnitMaterial !== null) &&
    infrastructureQuestionsComplete &&
    (!requiresSmokeAndCoFlow || wizard.hasSolidFuelAppliance !== null);

  const ready =
    !!selectedCustomer &&
    !!gpsAddress &&
    wizardAnswersComplete &&
    mandatoryGuidedPhotosComplete &&
    damagePromptsComplete &&
    smokeAlarmCountMeetsGuidance &&
    smokePhotosComplete &&
    coBranchComplete;

  const inspectionDateDisplay = useMemo(
    () => new Date(wizard.inspectionDate).toLocaleDateString('en-GB'),
    [wizard.inspectionDate],
  );

  const mappedImportedServiceM8Images = useMemo(
    () => mapImportedServiceM8ImagesToDraftPayload(importedServiceM8Images),
    [importedServiceM8Images],
  );

  const importedServiceM8EvidenceSummary = useMemo(
    () => ({
      importedImageCount: mappedImportedServiceM8Images.length,
      importedImageCountForConsumerUnit: mappedImportedServiceM8Images.filter(
        (image) => image.evidenceCategory === 'consumer_unit_image',
      ).length,
      importedImageCountForAuditEvidence: mappedImportedServiceM8Images.filter(
        (image) => image.evidenceCategory === 'audit_evidence',
      ).length,
      attachmentUuids: mappedImportedServiceM8Images.map((image) => image.attachmentUuid),
    }),
    [mappedImportedServiceM8Images],
  );

  const yesNo = (value: boolean | null) => (value === null ? 'Not answered' : value ? 'Yes' : 'No');

  // One row per wizard answer, so the review list stays a single map instead of
  // a wall of near-identical label/value pairs.
  const wizardAnswerRows: { label: string; value: string; tone?: 'success' | 'danger' }[] = [
    { label: 'Certificate route', value: wizard.dataEntryMode.replaceAll('_', ' ') },
    {
      label: 'Report purpose',
      value: wizard.reportPurpose ? wizard.reportPurpose.replaceAll('_', ' ') : 'Not set',
    },
    {
      label: 'Installation type',
      value: wizard.installationType ? wizard.installationType.replaceAll('_', ' ') : 'Not set',
    },
    {
      label: 'Occupancy profile',
      value: wizard.occupancyType ? wizard.occupancyType.replaceAll('_', ' ') : 'Not set',
    },
    {
      label: 'Supply phase',
      value: wizard.supplyPhase ? wizard.supplyPhase.replaceAll('_', ' ') : 'Not set',
    },
    {
      label: 'Ancillary supplies',
      value:
        wizard.hasOutbuildingsOrAncillarySupplies === null
          ? 'Not set'
          : wizard.hasOutbuildingsOrAncillarySupplies
            ? 'Yes'
            : 'No',
    },
    {
      label: 'Consumer unit material',
      value: wizard.consumerUnitMaterial
        ? wizard.consumerUnitMaterial.replaceAll('_', ' ')
        : 'Not set / skipped',
    },
    {
      label: 'Distribution boards / consumer units',
      value: String(wizard.distributionBoardCount),
    },
    { label: 'RCD protection present', value: yesNo(wizard.hasRcdProtection) },
    { label: 'RCBO protection present', value: yesNo(wizard.hasRcboProtection) },
    { label: 'Surge protection device present', value: yesNo(wizard.hasSurgeProtectionDevice) },
    { label: 'EV charger present', value: yesNo(wizard.hasEvCharger) },
    { label: 'Solar PV present', value: yesNo(wizard.hasSolarPv) },
    {
      label: 'Battery storage present',
      value:
        wizard.hasSolarPv !== true
          ? 'Skipped'
          : wizard.hasBatteryStorage === null
            ? 'Not answered'
            : wizard.hasBatteryStorage
              ? 'Yes'
              : 'No',
    },
    { label: 'AFDD protection present', value: yesNo(wizard.hasAfddProtection) },
    { label: 'Communal / landlord supplies present', value: yesNo(wizard.hasCommunalOrLandlordSupplies) },
    { label: 'Damaged socket / switch / accessory present', value: yesNo(wizard.hasDamagedAccessory) },
    { label: 'Damaged luminaire present', value: yesNo(wizard.hasDamagedLuminaire) },
    { label: 'Storeys used as living accommodation', value: String(wizard.storeyCount) },
    { label: 'Smoke alarms found', value: String(wizard.smokeDetectorCount) },
    {
      label: 'Storey-based smoke alarm guidance',
      value: smokeAlarmCountMeetsGuidance
        ? `Met (${wizard.smokeDetectorCount}/${minimumRecommendedSmokeAlarms})`
        : `Not met (${wizard.smokeDetectorCount}/${minimumRecommendedSmokeAlarms})`,
      tone: smokeAlarmCountMeetsGuidance ? 'success' : 'danger',
    },
    {
      label: 'Smoke detector photos',
      value: `${capturedImages.filter((image) => image.type === 'smoke_detector' && image.qualityAssessment?.isSufficient).length}/${wizard.smokeDetectorCount}`,
      tone: smokePhotosComplete ? 'success' : 'danger',
    },
    {
      label: 'Solid fuel appliance',
      value:
        wizard.hasSolidFuelAppliance === null
          ? 'Not set'
          : wizard.hasSolidFuelAppliance
            ? 'Yes'
            : 'No',
    },
    ...(wizard.hasSolidFuelAppliance === true
      ? [
          {
            label: 'CO detector tested',
            value: wizard.coDetectorTested ? 'Yes' : 'No',
            tone: wizard.coDetectorTested ? ('success' as const) : ('danger' as const),
          },
          {
            label: 'CO detector photo',
            value: coDetectorPhotoComplete ? 'Accepted' : 'Missing or insufficient',
            tone: coDetectorPhotoComplete ? ('success' as const) : ('danger' as const),
          },
        ]
      : []),
  ];

  async function handleSubmit() {
    if (!ready || !selectedCustomer || !gpsAddress) return;
    setSubmitting(true);
    try {
      const certificateNumberHint = buildMobileCaptureFolderHint();

      const uploadedCapturedImages = await Promise.all(
        capturedImages.map(async (image, index) => {
          const upload = await uploadMobileImage({
            imageUri: image.uri,
            category: 'certificate-photo',
            certificateNumber: certificateNumberHint,
            label: image.label ?? undefined,
            type: image.type ?? undefined,
            slotIndex: image.slotIndex ?? undefined,
          });

          return {
            order: index + 1,
            mode: image.mode,
            type: image.type ?? null,
            label: image.label ?? null,
            slotIndex: image.slotIndex ?? null,
            uri: upload.url,
            storageKey: upload.key,
            contentType: upload.contentType,
            qualityAssessment: image.qualityAssessment ?? null,
          };
        }),
      );

      const formData: Record<string, unknown> = {
        _createdFromMobile: true,
        dataEntryMode: wizard.dataEntryMode,
        reportPurpose: wizard.reportPurpose,
        installationType: wizard.installationType,
        occupancyType: wizard.occupancyType,
        supplyPhase: wizard.supplyPhase,
        hasOutbuildingsOrAncillarySupplies: wizard.hasOutbuildingsOrAncillarySupplies,
        consumerUnitMaterial: wizard.consumerUnitMaterial,
        distributionBoardCount: wizard.distributionBoardCount,
        hasRcdProtection: wizard.hasRcdProtection,
        hasRcboProtection: wizard.hasRcboProtection,
        hasSurgeProtectionDevice: wizard.hasSurgeProtectionDevice,
        hasEvCharger: wizard.hasEvCharger,
        hasSolarPv: wizard.hasSolarPv,
        hasBatteryStorage: wizard.hasBatteryStorage,
        hasAfddProtection: wizard.hasAfddProtection,
        hasCommunalOrLandlordSupplies: wizard.hasCommunalOrLandlordSupplies,
        storeyCount: wizard.storeyCount,
        smokeDetectorCount: wizard.smokeDetectorCount,
        hasSolidFuelAppliance: wizard.hasSolidFuelAppliance,
        coDetectorTested: wizard.coDetectorTested,
        mobileCapturedImages: uploadedCapturedImages,
        serviceM8: selectedServiceM8Job
          ? {
              job: selectedServiceM8Job,
              jobDetail: selectedServiceM8JobDetail,
              importedImages: mappedImportedServiceM8Images,
              evidenceSummary: importedServiceM8EvidenceSummary,
            }
          : null,
        consumerUnitImages: [
          ...uploadedCapturedImages.filter(
            (image) =>
              image.type === 'consumer_unit_external' || image.type === 'consumer_unit_internal',
          ),
          ...mappedImportedServiceM8Images.filter(
            (image) => image.evidenceCategory === 'consumer_unit_image',
          ),
        ],
        auditEvidenceImages: [...uploadedCapturedImages, ...mappedImportedServiceM8Images],
        wizardEvidenceSummary: {
          landlordGuidance: {
            smokeAlarmGuidance: LANDLORD_GUIDANCE_SMOKE,
            coAlarmGuidance: LANDLORD_GUIDANCE_CO,
            storeyCount: wizard.storeyCount,
            minimumRecommendedSmokeAlarms,
            smokeAlarmCountRecorded: wizard.smokeDetectorCount,
            smokeAlarmCountMeetsGuidance,
            solidFuelAppliancePresent: wizard.hasSolidFuelAppliance,
            coAlarmPhotoAccepted: coDetectorPhotoComplete,
            tenancyFlowApplied: requiresSmokeAndCoFlow,
          },
          guidedPhotos: guidedPhotoSummary.map((item) => {
            const image = getImageFor(item.type);
            return {
              type: item.type,
              label: item.label,
              captured: !!image,
              accepted: !!image?.qualityAssessment?.isSufficient,
              score: image?.qualityAssessment?.score ?? null,
            };
          }),
          damagePrompts: damagePhotoSummary.map((item) => ({
            type: item.type,
            label: item.label,
            present: item.present,
            captured: !!item.image,
            accepted: item.accepted,
            score: item.image?.qualityAssessment?.score ?? null,
          })),
          smokeDetectorPhotos: Array.from({ length: wizard.smokeDetectorCount }, (_, index) => {
            const image = getImageFor('smoke_detector', index);
            return {
              index,
              captured: !!image,
              accepted: !!image?.qualityAssessment?.isSufficient,
              score: image?.qualityAssessment?.score ?? null,
            };
          }),
          coDetectorPhotoCaptured: coDetectorPhotoComplete,
          serviceM8ImportedImages: importedServiceM8EvidenceSummary,
        },
      };

      if (analysisResult) {
        const safeAnalysisResult = analysisResult;
        formData.mainSwitchRating = safeAnalysisResult.mainSwitchRating;
        formData.numberOfCircuits = String(safeAnalysisResult.numberOfCircuits);
        formData.earthingArrangement = safeAnalysisResult.earthingArrangement;
        formData.supplyVoltage = safeAnalysisResult.voltage;
        formData._mobileCircuits = safeAnalysisResult.circuits;
      }

      const cert = await createDraftCertificate({
        customerId: selectedCustomer.id,
        siteAddress: gpsAddress,
        inspectionDate: wizard.inspectionDate,
        certificateType: wizard.certificateType,
        formData,
      });

      dispatch({ type: 'SET_CERTIFICATE', payload: cert });
      dispatch({
        type: 'SET_ACTIVE_CAPTURE',
        payload: { type: null, label: null, mode: 'consumer_unit', slotIndex: null },
      });
      router.replace('/(tabs)/success');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create certificate');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.canvas }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 }}
    >
      <View style={{ alignSelf: 'flex-start', marginBottom: 16 }}>
        <Button
          label="Back"
          icon="arrow-back"
          variant="ghost"
          size="small"
          onPress={() => router.back()}
        />
      </View>

      <AppText variant="title">Review certificate draft</AppText>
      <AppText variant="body" tone="muted" style={{ marginTop: 6, marginBottom: 24 }}>
        Check the certificate route, captured evidence and wizard answers before creating the draft
        EICR.
      </AppText>

      {selectedServiceM8Job ? (
        <Section
          title="ServiceM8 job"
          icon="briefcase-outline"
          done
          onEdit={() => router.push('/(tabs)/customer')}
        >
          <DetailRow
            label="Job"
            value={
              selectedServiceM8Job.generatedJobId
                ? `Job ${selectedServiceM8Job.generatedJobId}`
                : 'ServiceM8 job selected'
            }
          />
          {selectedServiceM8Job.status ? (
            <DetailRow label="Status" value={selectedServiceM8Job.status} />
          ) : null}
          {selectedServiceM8Job.address ? (
            <DetailRow label="Address" value={selectedServiceM8Job.address} />
          ) : null}
        </Section>
      ) : null}

      <Section
        title="Customer"
        icon="person-outline"
        done={!!selectedCustomer}
        onEdit={() => router.push('/(tabs)/customer')}
      >
        {selectedCustomer ? (
          <>
            <DetailRow label="Name" value={selectedCustomer.name} />
            {selectedCustomer.email ? (
              <DetailRow label="Email" value={selectedCustomer.email} />
            ) : null}
          </>
        ) : (
          <AppText variant="caption" tone="danger">
            Not selected
          </AppText>
        )}
      </Section>

      <Section
        title="Site address"
        icon="location-outline"
        done={!!gpsAddress}
        onEdit={() => router.push('/(tabs)/location')}
      >
        {gpsAddress ? (
          <AppText variant="body">{gpsAddress}</AppText>
        ) : (
          <AppText variant="caption" tone="danger">
            Not set
          </AppText>
        )}
      </Section>

      <Section
        title="Inspection date"
        icon="calendar-outline"
        done
        onEdit={() => router.push('/(tabs)/wizard')}
      >
        <AppText variant="body">{inspectionDateDisplay}</AppText>
      </Section>

      <Section
        title="Guided evidence photos"
        icon="camera-outline"
        done={mandatoryGuidedPhotosComplete}
        onEdit={() => router.push('/(tabs)/wizard')}
      >
        {!usesPhotoEvidence ? (
          <AppText variant="caption" tone="brand">
            Manual-only workflow selected. Guided photo evidence is optional for this draft.
          </AppText>
        ) : (
          <>
            <Callout
              tone={outstandingRequiredPhotos.length === 0 ? 'success' : 'warning'}
              inset
            >
              {outstandingRequiredPhotos.length === 0
                ? 'All currently required evidence photos are accepted.'
                : `${outstandingRequiredPhotos.length} required photo step(s) still need attention: ${outstandingRequiredPhotos
                    .map((item) => `${item.label} (${item.status})`)
                    .join('; ')}`}
            </Callout>

            <View style={{ marginTop: 10 }}>
              {guidedPhotoSummary.map((item) => {
                const image = getImageFor(item.type);
                const accepted = !!image?.qualityAssessment?.isSufficient;

                return (
                  <CheckLine
                    key={item.type}
                    ok={accepted}
                    label={item.label}
                    detail={
                      accepted
                        ? image?.qualityAssessment?.score
                          ? `score ${image.qualityAssessment.score}`
                          : 'accepted'
                        : 'retake required'
                    }
                  />
                );
              })}

              {damagePhotoSummary.map((item) => {
                const label = item.label;
                if (item.present === null) {
                  return (
                    <CheckLine key={item.type} ok={false} label={label} detail="presence not answered" muted />
                  );
                }

                if (item.present === false) {
                  return <CheckLine key={item.type} ok label={label} detail="not present" muted />;
                }

                return (
                  <CheckLine
                    key={item.type}
                    ok={item.accepted}
                    label={label}
                    detail={
                      item.accepted
                        ? item.image?.qualityAssessment?.score
                          ? `score ${item.image.qualityAssessment.score}`
                          : 'accepted'
                        : item.image
                          ? 'retake required'
                          : 'capture required'
                    }
                  />
                );
              })}
            </View>
          </>
        )}
      </Section>

      <Section
        title="Wizard answers"
        icon="list-outline"
        done={wizardAnswersComplete}
        onEdit={() => router.push('/(tabs)/wizard')}
      >
        {wizardAnswerRows.map((row) => (
          <DetailRow key={row.label} label={row.label} value={row.value} tone={row.tone} />
        ))}

        <AppText variant="caption" tone="soft" style={{ marginTop: 8 }}>
          {LANDLORD_GUIDANCE_SMOKE}
        </AppText>
        <AppText variant="caption" tone="soft" style={{ marginTop: 4 }}>
          {LANDLORD_GUIDANCE_CO}
        </AppText>
      </Section>

      {selectedServiceM8Job ? (
        <Section
          title="Imported ServiceM8 images"
          icon="cloud-download-outline"
          done
          onEdit={() => router.push('/(tabs)/customer')}
        >
          <DetailRow
            label="Images marked for inclusion"
            value={String(importedServiceM8Images.length)}
          />
          <AppText variant="caption" tone="soft" style={{ marginTop: 4 }}>
            Imported job photos are attached in the draft payload for consumer unit evidence and
            audit history.
          </AppText>

          {importedServiceM8Images.length > 0 ? (
            <View
              style={{
                marginTop: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: palette.line,
                backgroundColor: palette.surfaceAlt,
                padding: 12,
              }}
            >
              <AppText variant="bodyStrong" style={{ marginBottom: 8 }}>
                Included in draft payload
              </AppText>

              <DetailRow
                label="Consumer unit evidence"
                value={String(importedServiceM8EvidenceSummary.importedImageCountForConsumerUnit)}
              />
              <DetailRow
                label="Audit evidence only"
                value={String(importedServiceM8EvidenceSummary.importedImageCountForAuditEvidence)}
              />

              <View style={{ marginTop: 8 }}>
                {importedServiceM8Images.map((image) => (
                  <View
                    key={image.attachment.uuid}
                    style={{
                      marginBottom: 8,
                      borderRadius: 10,
                      backgroundColor: palette.surface,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <AppText variant="bodyStrong">
                      {getImportedServiceM8ImageDisplayName(image)}
                    </AppText>
                    <AppText variant="caption" tone="soft">
                      {`Attachment: ${image.attachment.uuid}`}
                    </AppText>
                    {image.attachment.mimeType ? (
                      <AppText variant="caption" tone="soft">
                        {`Type: ${image.attachment.mimeType}`}
                      </AppText>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </Section>
      ) : null}

      <Section
        title="All captured photos"
        icon="images-outline"
        done={capturedImages.length > 0}
        onEdit={() => router.push('/(tabs)/capture')}
      >
        <DetailRow label="Images captured" value={String(capturedImages.length)} />
        <AppText variant="caption" tone="soft" style={{ marginTop: 4 }}>
          Only photos that pass the in-app quality check count toward required evidence.
        </AppText>
      </Section>

      {analysisResult ? (
        <Section title="AI analysis" icon="analytics-outline" done>
          <DetailRow label="Main switch" value={String(analysisResult.mainSwitchRating)} />
          <DetailRow label="Circuits" value={String(analysisResult.numberOfCircuits)} />
          <DetailRow label="Earthing" value={String(analysisResult.earthingArrangement)} />
        </Section>
      ) : null}

      {!ready ? (
        <Callout tone="warning">
          Complete every mandatory wizard answer and, when using guided or hybrid capture, retake
          any insufficient required photos before submitting the draft certificate.
        </Callout>
      ) : null}

      <View style={{ marginTop: 8 }}>
        <Button
          label={submitting ? 'Creating draft…' : 'Create draft certificate'}
          icon="checkmark-circle-outline"
          size="large"
          loading={submitting}
          disabled={!ready || submitting}
          onPress={handleSubmit}
          block
        />
      </View>
    </ScrollView>
  );
}

interface SectionProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  done: boolean;
  onEdit?: () => void;
  children: React.ReactNode;
}

/** Review block: status icon, title, and a single Edit affordance. */
function Section({ title, icon, done, onEdit, children }: SectionProps) {
  const { palette } = useTheme();

  return (
    <Card style={{ marginBottom: 14 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Ionicons name={icon} size={18} color={done ? palette.success : palette.inkSoft} />
          <AppText variant="bodyStrong">{title}</AppText>
        </View>

        {onEdit ? (
          <Button label="Edit" variant="ghost" size="small" onPress={onEdit} />
        ) : null}
      </View>

      {children}
    </Card>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  tone?: 'success' | 'danger';
}

/** Label/value pair used throughout the review checklist. */
function DetailRow({ label, value, tone }: DetailRowProps) {
  const { palette } = useTheme();
  const valueColour =
    tone === 'success' ? palette.success : tone === 'danger' ? palette.danger : palette.ink;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        paddingVertical: 3,
      }}
    >
      <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
        {label}
      </AppText>
      <AppText variant="caption" style={{ flex: 1, textAlign: 'right', color: valueColour }}>
        {value}
      </AppText>
    </View>
  );
}

interface CheckLineProps {
  ok: boolean;
  label: string;
  detail: string;
  muted?: boolean;
}

/** One evidence line: tick or cross, the requirement, and its state. */
function CheckLine({ ok, label, detail, muted = false }: CheckLineProps) {
  const { palette } = useTheme();
  const colour = muted ? palette.inkSoft : ok ? palette.success : palette.danger;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 }}>
      <Ionicons name={ok ? 'checkmark-circle' : 'close-circle'} size={16} color={colour} />
      <AppText variant="caption" style={{ flex: 1, color: palette.ink }}>
        {label}
      </AppText>
      <AppText variant="caption" style={{ color: colour }}>
        {detail}
      </AppText>
    </View>
  );
}
