import { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  Modal,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useJob,
  type CaptureMode,
  type CapturedImage,
  type PhotoQualityAssessment,
  type WizardPhotoType,
} from '@/components/JobStateContext';
import { analyseImage, type AnalysisResult } from '@/services/api';

type CapturedPreview = {
  uri: string;
  mode: CaptureMode;
};

type CaptureRequirement = {
  title: string;
  description: string;
  reason: string;
  guidance: string[];
  qualityHints: string[];
};

const wizardPhotoModeMap: Record<WizardPhotoType, CaptureMode> = {
  consumer_unit_external: 'consumer_unit',
  consumer_unit_internal: 'consumer_unit',
  bonding: 'consumer_unit',
  damaged_accessory: 'consumer_unit',
  damaged_luminaire: 'consumer_unit',
  smoke_detector: 'consumer_unit',
  co_detector: 'consumer_unit',
};

const captureRequirementMap: Record<WizardPhotoType, CaptureRequirement> = {
  consumer_unit_external: {
    title: 'Consumer Unit',
    description: 'Take a full photo of the consumer unit with the front cover in place.',
    reason: 'This shows the condition, location, enclosure type, and any visible damage before removing the front.',
    guidance: [
      'Hold the phone in landscape for a wider shot.',
      'Fit the whole consumer unit in frame.',
      'Avoid cutting off the top, bottom, or sides.',
      'Step back slightly if the enclosure edges are cropped.',
    ],
    qualityHints: [
      'The full board should be visible.',
      'Labels and protective devices should not be blurry.',
      'Use extra light if the cupboard is dark.',
    ],
  },
  consumer_unit_internal: {
    title: 'Consumer Unit With Front Removed',
    description: 'Take a clear photo of the consumer unit with the front removed, where safe and appropriate.',
    reason: 'This provides evidence of internal condition, device layout, and visible wiring arrangements.',
    guidance: [
      'Keep the entire opened consumer unit in frame.',
      'Ensure devices and labelling are visible.',
      'Keep the phone steady and avoid glare on devices.',
      'Retake if the image is soft or any part is cropped.',
    ],
    qualityHints: [
      'The device layout should be readable.',
      'Avoid deep shadows over the breakers or terminals.',
      'Retake if the internal view is obscured or blurred.',
    ],
  },
  bonding: {
    title: 'Bonding',
    description: 'Take a photo showing the main protective bonding connection and clamp.',
    reason: 'This helps confirm presence and condition of bonding arrangements.',
    guidance: [
      'Centre the bonding conductor and clamp in frame.',
      'Move close enough to show clamp detail clearly.',
      'Include enough surrounding context to identify the connection point.',
      'Use additional light if the area is dark.',
    ],
    qualityHints: [
      'The clamp and conductor should be clearly visible.',
      'Avoid motion blur on close-up images.',
      'Retake if the bonding connection cannot be identified.',
    ],
  },
  damaged_accessory: {
    title: 'Damaged Socket, Switch, or Accessory',
    description: 'Take a close photo of any damaged socket, switch, or similar accessory.',
    reason: 'This records visible damage and supports observations and coding.',
    guidance: [
      'Fill most of the frame with the damaged item.',
      'Show the full accessory and the damaged area.',
      'Take more than one retake if cracking or burning is hard to see.',
      'Keep the phone square to the accessory face.',
    ],
    qualityHints: [
      'The damage should be obvious in the image.',
      'Avoid reflections hiding the defect.',
      'Retake if scorch marks, cracks, or missing parts are unclear.',
    ],
  },
  damaged_luminaire: {
    title: 'Damaged Luminaire',
    description: 'Take a clear photo of any damaged luminaire or fitting.',
    reason: 'This records visible damage, deterioration, and suitability concerns.',
    guidance: [
      'Capture the full fitting and the damaged detail.',
      'Step back slightly if the fitting is cut off.',
      'Move closer if the damage is too small to see.',
      'Use steady framing to avoid blur.',
    ],
    qualityHints: [
      'The fitting and the damage should both be visible.',
      'Retake if the defect is too small or out of focus.',
      'Use more light if the fitting is in a dark area.',
    ],
  },
  smoke_detector: {
    title: 'Smoke Detector',
    description: 'Take a photo of the smoke detector.',
    reason: 'This confirms presence and condition of smoke detection equipment.',
    guidance: [
      'Keep the detector centred in frame.',
      'Move close enough to show the detector clearly.',
      'Avoid strong backlight from windows or downlights.',
      'Retake if the detector is too small to inspect.',
    ],
    qualityHints: [
      'The detector should be easy to identify.',
      'Retake if the device edges are soft or blurry.',
      'Ensure the full detector is visible.',
    ],
  },
  co_detector: {
    title: 'CO Detector',
    description: 'Take a photo of the CO detector after testing.',
    reason: 'This confirms the detector is present and supports the solid fuel branch evidence.',
    guidance: [
      'Capture the full CO detector square-on.',
      'Move closer until labels and test button area are clear.',
      'Avoid glare from flash or strong lighting.',
      'Retake if the detector is not obvious in frame.',
    ],
    qualityHints: [
      'The detector should be recognisable at a glance.',
      'Retake if the image is dark or soft.',
      'Keep the full detector in view.',
    ],
  },
};

function getBrandModel(result: AnalysisResult | null | undefined) {
  return [result?.consumerUnit?.brand, result?.consumerUnit?.model].filter(Boolean).join(' ');
}

function getTextDetectionCount(result: AnalysisResult | null | undefined) {
  return Array.isArray(result?.textDetections) ? result.textDetections.length : 0;
}

function getObservationCount(result: AnalysisResult | null | undefined) {
  return Array.isArray(result?.observations) ? result.observations.length : 0;
}

function buildAnalysisMessage(result: AnalysisResult) {
  const summary = result.summary || 'Analysis completed successfully.';
  const brandModel = getBrandModel(result);
  const textCount = getTextDetectionCount(result);
  const needsHumanReview = result.needsHumanReview ? 'Yes' : 'No';

  return [
    summary,
    brandModel ? `Consumer unit: ${brandModel}` : null,
    `Extracted text items: ${textCount}`,
    `Needs human review: ${needsHumanReview}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function getImageDimensions(uri: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => reject(new Error('Unable to read image dimensions.')),
    );
  });
}

function buildQualityAssessment(params: {
  width: number | null;
  height: number | null;
  mode: CaptureMode;
  result: AnalysisResult | null;
  targetType?: WizardPhotoType | null;
}): PhotoQualityAssessment {
  const { width, height, mode, result, targetType } = params;
  const reasons: string[] = [];
  let score = 100;
  const isLandscape = typeof width === 'number' && typeof height === 'number' ? width >= height : false;
  const textCount = Array.isArray(result?.textDetections) ? result.textDetections.length : 0;
  const hasUsefulTextDetection = textCount >= (mode === 'circuit_label' ? 3 : 1);
  const needsHumanReview = !!result?.needsHumanReview;

  if (typeof width !== 'number' || typeof height !== 'number') {
    score -= 25;
    reasons.push('The app could not confirm the image dimensions.');
  } else {
    if (width < 1200 || height < 900) {
      score -= 35;
      reasons.push('The image resolution looks low. Move closer and retake with a steadier hand.');
    }

    if (!isLandscape) {
      score -= 15;
      reasons.push('Landscape framing is recommended so the full subject is easier to review.');
    }
  }

  if (!hasUsefulTextDetection && mode !== 'consumer_unit') {
    score -= 25;
    reasons.push('Very little readable text was detected. Move closer until labels can be read.');
  }

  if (
    targetType &&
    ['bonding', 'damaged_accessory', 'damaged_luminaire', 'smoke_detector', 'co_detector'].includes(targetType)
  ) {
    if (typeof width === 'number' && typeof height === 'number') {
      const longestSide = Math.max(width, height);
      if (longestSide < 1400) {
        score -= 15;
        reasons.push('Move closer so the detail fills more of the frame.');
      }
    }

    if (textCount === 0 && !needsHumanReview) {
      score -= 10;
      reasons.push('The subject may be too small or unclear. Try a closer, steadier photo.');
    }
  }

  if (targetType === 'consumer_unit_external' || targetType === 'consumer_unit_internal') {
    if (typeof width === 'number' && typeof height === 'number' && !isLandscape) {
      score -= 10;
      reasons.push('A landscape photo is preferred so the whole consumer unit fits clearly in frame.');
    }
  }

  if (needsHumanReview) {
    score -= 15;
    reasons.push('The AI flagged this image for human review, which can indicate blur, glare, or incomplete framing.');
  }

  const isSufficient = score >= 70 && reasons.length <= 2;

  return {
    isSufficient,
    score: Math.max(0, Math.min(100, score)),
    reasons,
    checks: {
      width,
      height,
      isLandscape,
      hasUsefulTextDetection,
      needsHumanReview,
    },
  };
}

export default function CaptureScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [analysing, setAnalysing] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState<CapturedPreview | null>(null);
  const [previewQuality, setPreviewQuality] = useState<PhotoQualityAssessment | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const { state, dispatch } = useJob();

  const activeCaptureMode = state.wizard.activeCaptureType
    ? wizardPhotoModeMap[state.wizard.activeCaptureType]
    : 'consumer_unit';

  const activeTargetImage = useMemo(
    () =>
      state.wizard.activeCaptureType
        ? state.capturedImages.find(
            (image) =>
              image.type === state.wizard.activeCaptureType &&
              (image.slotIndex ?? null) === (state.wizard.activeCaptureSlotIndex ?? null),
          ) ?? null
        : null,
    [state.capturedImages, state.wizard.activeCaptureSlotIndex, state.wizard.activeCaptureType],
  );

  const activeRequirement = state.wizard.activeCaptureType ? captureRequirementMap[state.wizard.activeCaptureType] : null;

  const guidance = useMemo(() => {
    if (activeRequirement) {
      return activeRequirement.guidance;
    }

    if (activeCaptureMode === 'consumer_unit') {
      return [
        'Hold the phone in landscape for a wider, flatter shot.',
        'Centre the full subject inside the guide frame.',
        'Move closer if labels are hard to read.',
        'Move back if the edges are cut off.',
      ];
    }

    return [
      'Use landscape where possible for longer labels.',
      'Centre the label and keep it flat in frame.',
      'Move closer until text is sharp and readable.',
      'Move back slightly if any text is cropped.',
    ];
  }, [activeCaptureMode, activeRequirement]);

  const analysisSummary = useMemo(() => {
    if (!state.analysisResult) return null;

    return {
      summary: state.analysisResult.summary || 'No summary returned.',
      brandModel: getBrandModel(state.analysisResult),
      textCount: getTextDetectionCount(state.analysisResult),
      observationCount: getObservationCount(state.analysisResult),
      needsHumanReview: !!state.analysisResult.needsHumanReview,
    };
  }, [state.analysisResult]);

  if (!permission) return <View className="flex-1 bg-black" />;

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Ionicons name="camera-outline" size={60} color="#9ca3af" />
        <Text className="mt-4 mb-2 text-lg font-semibold text-gray-800">Camera Access Required</Text>
        <Text className="mb-6 text-center text-gray-500">
          We need camera access to photograph the inspection evidence.
        </Text>
        <TouchableOpacity className="rounded-lg bg-brand px-8 py-3" onPress={requestPermission}>
          <Text className="font-semibold text-white">Grant Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function takePicture() {
    if (!cameraRef.current || analysing) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        shutterSound: false,
      });

      if (!photo?.uri) return;

      setPreviewQuality(null);
      setCapturedPreview({ uri: photo.uri, mode: activeCaptureMode });
    } catch {
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  }

  async function confirmPhoto() {
    if (!capturedPreview) return;

    setAnalysing(true);

    try {
      let result: AnalysisResult | null = null;
      if (capturedPreview.mode === 'consumer_unit' || capturedPreview.mode === 'circuit_label') {
        result = await analyseImage(capturedPreview.uri, capturedPreview.mode);
        dispatch({ type: 'SET_ANALYSIS', payload: result });
      }

      let dimensions: { width: number; height: number } | null = null;
      try {
        dimensions = await getImageDimensions(capturedPreview.uri);
      } catch {
        dimensions = null;
      }

      const qualityAssessment = buildQualityAssessment({
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
        mode: capturedPreview.mode,
        result,
        targetType: state.wizard.activeCaptureType,
      });

      setPreviewQuality(qualityAssessment);

      if (!qualityAssessment.isSufficient) {
        Alert.alert(
          'Photo quality looks insufficient',
          qualityAssessment.reasons.join('\n') || 'Please retake this photo before continuing.',
          [{ text: 'OK' }],
        );
        return;
      }

      const imagePayload: CapturedImage = {
        uri: capturedPreview.uri,
        mode: capturedPreview.mode,
        type: state.wizard.activeCaptureType ?? undefined,
        label: state.wizard.activeCaptureLabel ?? activeRequirement?.title ?? undefined,
        slotIndex: state.wizard.activeCaptureSlotIndex ?? undefined,
        qualityAssessment,
      };

      dispatch({ type: 'ADD_IMAGE', payload: imagePayload });
      if (state.wizard.activeCaptureType) {
        clearActiveCapture();
      }
      setCapturedPreview(null);
      setPreviewQuality(null);

      if (result) {
        Alert.alert('Analysis Complete', buildAnalysisMessage(result), [{ text: 'OK' }]);
      }
    } catch {
      Alert.alert('Analysis Failed', 'Image captured but AI analysis failed. Please retake the photo.');
    } finally {
      setAnalysing(false);
    }
  }

  function retakePhoto() {
    setCapturedPreview(null);
    setPreviewQuality(null);
  }

  function clearActiveCapture() {
    dispatch({
      type: 'SET_ACTIVE_CAPTURE',
      payload: { type: null, label: null, mode: 'consumer_unit', slotIndex: null },
    });
  }

  function handleBack() {
    if (state.wizard.activeCaptureType) {
      clearActiveCapture();
      router.push('/(tabs)/wizard');
      return;
    }
    router.back();
  }

  function handleContinue() {
    if (state.wizard.activeCaptureType) {
      clearActiveCapture();
      router.push('/(tabs)/wizard');
      return;
    }
    router.push('/(tabs)/location');
  }

  const title = activeRequirement?.title ?? 'Inspection Evidence';

  return (
    <View className="flex-1 bg-black">
      <View className="bg-black/70 px-4 pt-3 pb-2">
        <Text className="text-lg font-semibold text-white">{title}</Text>
        <Text className="text-sm text-white/70">
          {activeRequirement?.description ?? 'Capture a clear evidence photo for the inspection record.'}
        </Text>
      </View>

      <View className="bg-black/75 px-4 pb-3">
        {activeRequirement ? (
          <View className="mb-3 rounded-2xl border border-white/10 bg-brand/20 px-4 py-3">
            <Text className="font-semibold text-white">Why this photo matters</Text>
            <Text className="mt-1 text-sm text-white/85">{activeRequirement.reason}</Text>
          </View>
        ) : null}

        <View className="mb-2 flex-row items-center">
          <Ionicons name="flash" size={16} color="#facc15" />
          <Text className="ml-2 text-xs font-semibold text-yellow-300">
            Flash is set to auto to help with dark cupboards and labels
          </Text>
        </View>

        <View className="rounded-2xl bg-white/10 px-4 py-3">
          <Text className="mb-2 font-semibold text-white">{`How to frame ${title.toLowerCase()}`}</Text>
          {guidance.map((item) => (
            <View key={item} className="mb-1.5 flex-row items-start">
              <Text className="mr-2 text-brand">•</Text>
              <Text className="flex-1 text-sm text-white/85">{item}</Text>
            </View>
          ))}

          {activeRequirement?.qualityHints.map((item) => (
            <View key={item} className="mb-1.5 flex-row items-start">
              <Text className="mr-2 text-yellow-300">•</Text>
              <Text className="flex-1 text-sm text-white/85">{item}</Text>
            </View>
          ))}

          {activeTargetImage?.qualityAssessment?.isSufficient ? (
            <Text className="mt-2 text-xs text-green-300">A previously saved acceptable photo exists for this step.</Text>
          ) : null}
        </View>
      </View>

      {analysisSummary ? (
        <View className="mx-4 mt-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="font-semibold text-white">Latest analysis</Text>
            {analysisSummary.needsHumanReview ? (
              <Text className="text-xs font-semibold text-amber-300">Needs review</Text>
            ) : null}
          </View>
          <Text className="text-sm text-white/90">{analysisSummary.summary}</Text>
          {analysisSummary.brandModel ? (
            <Text className="mt-2 text-sm text-white/80">Consumer unit: {analysisSummary.brandModel}</Text>
          ) : null}
          <View className="mt-3 flex-row gap-2">
            <View className="flex-1 rounded-xl bg-black/30 px-3 py-2">
              <Text className="text-[11px] uppercase text-white/60">Text</Text>
              <Text className="mt-1 font-semibold text-white">{analysisSummary.textCount}</Text>
            </View>
            <View className="flex-1 rounded-xl bg-black/30 px-3 py-2">
              <Text className="text-[11px] uppercase text-white/60">Observations</Text>
              <Text className="mt-1 font-semibold text-white">{analysisSummary.observationCount}</Text>
            </View>
          </View>
        </View>
      ) : null}

      <View className="relative flex-1 bg-black">
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          active={!capturedPreview}
          facing="back"
          enableTorch={false}
          flash="auto"
        />

        <View className="absolute inset-0 items-center justify-center px-8" pointerEvents="none">
          <View className="aspect-[1.45] w-full max-w-[340px] rounded-3xl border-4 border-white bg-transparent">
            <View className="absolute top-3 left-3 h-8 w-8 rounded-tl-lg border-t-4 border-l-4 border-brand" />
            <View className="absolute top-3 right-3 h-8 w-8 rounded-tr-lg border-t-4 border-r-4 border-brand" />
            <View className="absolute bottom-3 left-3 h-8 w-8 rounded-bl-lg border-b-4 border-l-4 border-brand" />
            <View className="absolute bottom-3 right-3 h-8 w-8 rounded-br-lg border-b-4 border-r-4 border-brand" />
          </View>
          <Text className="mt-4 overflow-hidden rounded-full bg-black/55 px-4 py-2 text-center text-sm text-white">
            Keep the subject centred and fill most of the frame
          </Text>
        </View>
      </View>

      {state.capturedImages.length > 0 && (
        <ScrollView horizontal className="absolute bottom-28 left-0 right-0 px-4">
          {state.capturedImages.map((img, i) => (
            <View key={`${img.uri}-${i}`} className="relative mr-2">
              <Image source={{ uri: img.uri }} className="h-16 w-16 rounded-lg" />
              <View className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-black/70 px-1 py-0.5">
                <Text className="text-[9px] text-white" numberOfLines={1}>
                  {img.label ?? img.type ?? img.mode}
                </Text>
              </View>
              {img.qualityAssessment ? (
                <View
                  className={`absolute left-1 top-1 rounded-full px-1.5 py-0.5 ${img.qualityAssessment.isSufficient ? 'bg-green-600' : 'bg-red-600'}`}
                >
                  <Text className="text-[8px] font-semibold text-white">{img.qualityAssessment.score}</Text>
                </View>
              ) : null}
              <TouchableOpacity
                className="absolute -top-1 -right-1 h-5 w-5 items-center justify-center rounded-full bg-red-600"
                onPress={() =>
                  img.type
                    ? dispatch({
                        type: 'REMOVE_IMAGE_BY_TARGET',
                        payload: { type: img.type, slotIndex: img.slotIndex ?? null },
                      })
                    : dispatch({ type: 'REMOVE_IMAGE', payload: i })
                }
              >
                <Text className="text-xs font-bold text-white">×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <View className="flex-row items-center justify-around bg-black px-8 pt-4 pb-10">
        <TouchableOpacity onPress={handleBack} disabled={analysing}>
          <Ionicons name="arrow-back" size={28} color={analysing ? '#6b7280' : 'white'} />
        </TouchableOpacity>

        <TouchableOpacity
          className="h-18 w-18 items-center justify-center rounded-full bg-white"
          onPress={takePicture}
          disabled={analysing}
        >
          {analysing ? <ActivityIndicator color="#BE0000" /> : <View className="h-16 w-16 rounded-full border-4 border-brand" />}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleContinue} disabled={analysing}>
          <Ionicons
            name="arrow-forward"
            size={28}
            color={!analysing && state.capturedImages.length > 0 ? 'white' : '#6b7280'}
          />
        </TouchableOpacity>
      </View>

      <Modal visible={!!capturedPreview} animationType="slide" presentationStyle="fullScreen">
        <View className="flex-1 bg-black">
          <View className="flex-row items-center justify-between px-5 pt-14 pb-4">
            <TouchableOpacity onPress={retakePhoto} disabled={analysing}>
              <Text className="text-base font-medium text-white">Retake</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-white">Preview Capture</Text>
            <TouchableOpacity onPress={confirmPhoto} disabled={analysing}>
              <Text className={`text-base font-semibold ${analysing ? 'text-gray-500' : 'text-brand'}`}>Use Photo</Text>
            </TouchableOpacity>
          </View>

          {capturedPreview && <Image source={{ uri: capturedPreview.uri }} className="flex-1 w-full" resizeMode="contain" />}

          <View className="bg-black/90 px-5 py-5">
            <Text className="mb-2 font-semibold text-white">Quick check before using this image</Text>
            <View className="rounded-2xl bg-white/10 px-4 py-3">
              <Text className="mb-1 text-sm text-white/85">• Is the requested item fully visible?</Text>
              <Text className="mb-1 text-sm text-white/85">• Is the image sharp enough to inspect?</Text>
              <Text className="mb-1 text-sm text-white/85">• Is any damage, bonding, or labelling easy to see?</Text>
              <Text className="text-sm text-white/85">• Would a brighter or more landscape shot be clearer?</Text>
            </View>

            {previewQuality ? (
              <View
                className={`mt-4 rounded-2xl border px-4 py-3 ${previewQuality.isSufficient ? 'border-green-500 bg-green-500/15' : 'border-red-500 bg-red-500/15'}`}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="font-semibold text-white">
                    {previewQuality.isSufficient ? 'Photo quality accepted' : 'Photo quality insufficient'}
                  </Text>
                  <Text className="text-sm font-semibold text-white">Score {previewQuality.score}</Text>
                </View>
                {previewQuality.reasons.length > 0 ? (
                  <View className="mt-2">
                    {previewQuality.reasons.map((reason) => (
                      <Text key={reason} className="mb-1 text-sm text-white/85">
                        • {reason}
                      </Text>
                    ))}
                  </View>
                ) : (
                  <Text className="mt-2 text-sm text-white/85">The image passed the current quality checks.</Text>
                )}
              </View>
            ) : null}

            <View className="mt-4 flex-row gap-3">
              <TouchableOpacity
                className="flex-1 items-center rounded-xl border border-white/25 py-4"
                onPress={retakePhoto}
                disabled={analysing}
              >
                <Text className="font-semibold text-white">Retake Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center rounded-xl bg-brand py-4"
                onPress={confirmPhoto}
                disabled={analysing}
              >
                {analysing ? <ActivityIndicator color="white" /> : <Text className="font-semibold text-white">Run Quality Check</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
