import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useJob,
  type CaptureMode,
  type CapturedImage,
  type WizardPhotoType,
} from "@/components/JobStateContext";
import {
  analyseDetectorImage,
  analyseImage,
  isDetectorCaptureMode,
  type AnalysisResult,
} from "@/services/api";
import { buildAnalysisMessage, buildAnalysisSummary } from "@/lib/analysis-summary";
import { buildQualityAssessment } from "@/lib/photo-quality";

type CapturedPreview = {
  uri: string;
  mode: CaptureMode;
};

type CaptureRequirement = {
  title: string;
  description: string;
  reason: string;
  guidance: string[];
};

// Each photo type is analysed by the pipeline that can actually describe it.
// Detectors used to be mapped onto `consumer_unit`, which sent a photo of a
// smoke alarm through the distribution-board OCR pipeline.
const wizardPhotoModeMap: Record<WizardPhotoType, CaptureMode> = {
  consumer_unit_external: "consumer_unit",
  consumer_unit_internal: "consumer_unit",
  bonding: "consumer_unit",
  damaged_accessory: "consumer_unit",
  damaged_luminaire: "consumer_unit",
  smoke_detector: "smoke_detector",
  co_detector: "co_detector",
};

const captureRequirementMap: Record<WizardPhotoType, CaptureRequirement> = {
  consumer_unit_external: {
    title: "Consumer Unit",
    description: "Take a full photo of the consumer unit with the front cover in place.",
    reason: "This records the enclosure, condition, and location before removal.",
    guidance: ["Use landscape where possible.", "Fit the whole board in frame.", "Retake if any edge is cropped."],
  },
  consumer_unit_internal: {
    title: "Consumer Unit Internal View",
    description: "Take a clear internal photo after removing the front where safe.",
    reason: "This records device layout and visible wiring condition.",
    guidance: ["Keep the full internal view in frame.", "Avoid glare and shadows.", "Retake if devices are blurry."],
  },
  bonding: {
    title: "Bonding",
    description: "Take a photo of the bonding conductor and clamp.",
    reason: "This supports evidence of bonding arrangements.",
    guidance: ["Move close enough to show the clamp clearly.", "Keep the conductor centred.", "Use extra light if needed."],
  },
  damaged_accessory: {
    title: "Damaged Accessory",
    description: "Take a close photo of the damaged socket, switch, or accessory.",
    reason: "This records visible damage for the report.",
    guidance: ["Fill most of the frame with the accessory.", "Show the damage clearly.", "Retake if reflections hide the defect."],
  },
  damaged_luminaire: {
    title: "Damaged Luminaire",
    description: "Take a clear photo of the damaged fitting.",
    reason: "This records visible deterioration or damage.",
    guidance: ["Show both the fitting and the defect.", "Move closer if damage is too small.", "Retake if out of focus."],
  },
  smoke_detector: {
    title: "Smoke Detector",
    description: "Take a photo of the smoke detector.",
    reason: "This confirms presence and condition.",
    guidance: ["Keep the detector centred.", "Move close enough for a clear view.", "Retake if blurry."],
  },
  co_detector: {
    title: "CO Detector",
    description: "Take a photo of the CO detector.",
    reason: "This confirms presence of CO detection.",
    guidance: ["Capture the full detector square-on.", "Avoid glare.", "Retake if unclear."],
  },
};

function getImageDimensions(uri: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => reject(new Error("Unable to read image dimensions.")),
    );
  });
}

export default function CaptureScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [analysing, setAnalysing] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState<CapturedPreview | null>(null);
  const { state, dispatch } = useJob();

  const activeCaptureMode: CaptureMode = state.wizard.activeCaptureType
    ? wizardPhotoModeMap[state.wizard.activeCaptureType]
    : "consumer_unit";

  const activeRequirement = state.wizard.activeCaptureType ? captureRequirementMap[state.wizard.activeCaptureType] : null;
  const activeTitle = activeRequirement?.title ?? "Inspection Evidence";

  const guidance = useMemo(() => {
    if (activeRequirement) return activeRequirement.guidance;
    return [
      "Keep the subject centred inside the guide.",
      "Use landscape where possible.",
      "Retake if the image is blurry or cropped.",
    ];
  }, [activeRequirement]);

  const analysisSummary = useMemo(
    () => buildAnalysisSummary(state.analysisResult),
    [state.analysisResult],
  );

  function clearActiveCapture() {
    dispatch({
      type: "SET_ACTIVE_CAPTURE",
      payload: { type: null, label: null, mode: "consumer_unit", slotIndex: null },
    });
  }

  function setPreviewFromUri(uri: string) {
    setCapturedPreview({ uri, mode: activeCaptureMode });
  }

  async function takePicture() {
    if (analysing) return;

    Alert.alert(
      "Camera capture unavailable in Expo Go",
      "Live camera capture requires a development build for this Expo SDK version. Use the photo library button for now, or run a native iOS development build to enable in-app capture.",
    );
  }

  async function pickImage() {
    if (analysing) return;

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission required", "Photo library access is needed to upload an image.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        const safeUri =
          typeof asset.uri === "string" && asset.uri.startsWith("ph://")
            ? asset.uri.replace("ph://", "assets-library://asset/asset.JPG?id=")
            : asset.uri;

        setPreviewFromUri(safeUri);
      }
    } catch {
      Alert.alert("Error", "Failed to open the photo library. Please try again.");
    }
  }

  async function analysePreview(preview: CapturedPreview): Promise<{
    result: AnalysisResult | null;
    analysisError: string | null;
  }> {
    try {
      const result = isDetectorCaptureMode(preview.mode)
        ? await analyseDetectorImage(preview.uri, preview.mode)
        : await analyseImage(preview.uri, preview.mode);

      dispatch({ type: "SET_ANALYSIS", payload: result });
      return { result, analysisError: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Analysis failed";

      // A detector photo is evidence in its own right: an AI outage must not
      // stop the inspector recording the alarm. Board photos keep the stricter
      // behaviour, because the analysis is what that photo is captured for.
      if (isDetectorCaptureMode(preview.mode)) {
        return { result: null, analysisError: message };
      }

      throw error;
    }
  }

  async function confirmPhoto() {
    if (!capturedPreview) return;

    const preview = capturedPreview;
    setAnalysing(true);

    try {
      const { result, analysisError } = await analysePreview(preview);

      let dimensions: { width: number; height: number } | null = null;
      try {
        dimensions = await getImageDimensions(preview.uri);
      } catch {
        dimensions = null;
      }

      const qualityAssessment = buildQualityAssessment({
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
        mode: preview.mode,
        result,
        analysisError,
      });

      if (!qualityAssessment.isSufficient) {
        Alert.alert(
          "Photo quality looks insufficient",
          qualityAssessment.reasons.join("\n") || "Please retake this photo before continuing.",
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

      dispatch({ type: "ADD_IMAGE", payload: imagePayload });

      setCapturedPreview(null);

      if (state.wizard.activeCaptureType) {
        clearActiveCapture();
        router.push("/(tabs)/wizard");
      } else {
        router.push("/(tabs)/location");
      }

      if (result) {
        Alert.alert("Analysis Complete", buildAnalysisMessage(result));
      }
    } catch {
      Alert.alert("Analysis Failed", "Image captured but AI analysis failed. Please retake the photo.");
    } finally {
      setAnalysing(false);
    }
  }

  function retakePhoto() {
    setCapturedPreview(null);
  }

  function handleBack() {
    if (state.wizard.activeCaptureType) {
      clearActiveCapture();
      router.push("/(tabs)/wizard");
      return;
    }

    router.back();
  }

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F7FA] px-8">
        <View className="mb-5 h-20 w-20 items-center justify-center rounded-[28px] bg-[#E3F2FD]">
          <Ionicons name="camera-outline" size={36} color="#0D47A1" />
        </View>
        <Text className="mb-2 text-center text-2xl font-bold text-[#1A202C]">Camera access required</Text>
        <Text className="mb-6 text-center text-base leading-6 text-[#718096]">
          Enable camera access to capture inspection evidence in the mobile workflow.
        </Text>
        <TouchableOpacity className="rounded-[20px] bg-[#0D47A1] px-8 py-4" onPress={requestPermission}>
          <Text className="font-semibold text-[#FFFFFF]">Grant Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top", "bottom"]}>
      <View className="flex-1 bg-black">
        <CameraView style={{ flex: 1 }} active={!capturedPreview} facing="back" />

        <ScrollView
          className="absolute inset-0"
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="rounded-[28px] border border-white/10 bg-black/55 px-4 py-4">
            <View className="mb-3 flex-row items-start justify-between">
              <View className="mr-3 flex-1">
                <Text className="text-2xl font-bold text-white">{activeTitle}</Text>
                <Text className="mt-1 text-sm leading-5 text-white/75">
                  {activeRequirement?.description ?? "Capture a clear evidence photo for the inspection record."}
                </Text>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#0D47A1]/80">
                <Ionicons name="camera-outline" size={22} color="#FFFFFF" />
              </View>
            </View>

            {activeRequirement ? (
              <View className="mb-3 rounded-[20px] bg-[#0D47A1]/75 px-4 py-3">
                <Text className="font-semibold text-[#FFFFFF]">Why this photo matters</Text>
                <Text className="mt-1 text-sm leading-5 text-[#f3e9df]">{activeRequirement.reason}</Text>
              </View>
            ) : null}

            <View className="rounded-[20px] bg-white/10 px-4 py-3">
              <Text className="mb-2 font-semibold text-white">Framing guidance</Text>
              {guidance.map((item) => (
                <View key={item} className="mb-1 flex-row items-start">
                  <Text className="mr-2 text-[#BBDEFB]">•</Text>
                  <Text className="flex-1 text-sm text-white/85">{item}</Text>
                </View>
              ))}
            </View>
          </View>

          {analysisSummary ? (
            <View className="mt-4 rounded-[24px] border border-white/10 bg-black/55 px-4 py-4">
              <Text className="font-semibold text-white">{analysisSummary.title}</Text>
              <Text className="mt-2 text-sm leading-5 text-white/85">{analysisSummary.summary}</Text>
              {analysisSummary.lines.map((line) => (
                <View key={`${line.label}-${line.value}`} className="mt-1 flex-row items-start">
                  <Text className="mr-2 text-sm text-white/60">{line.label}:</Text>
                  <Text className="flex-1 text-sm text-white/85">{line.value}</Text>
                </View>
              ))}
              {analysisSummary.detail ? (
                <Text className="mt-2 text-xs leading-5 text-white/60">{analysisSummary.detail}</Text>
              ) : null}
            </View>
          ) : null}

          <View className="pointer-events-none items-center justify-center px-4 py-8">
            <View className="h-[220px] w-full max-w-[340px] rounded-[34px] border-2 border-white/70" />
            <Text className="mt-4 rounded-full bg-black/55 px-4 py-2 text-center text-sm text-white">
              Keep the subject centred and fill most of the guide
            </Text>
          </View>

          {state.capturedImages.length > 0 ? (
            <ScrollView horizontal className="mb-4" showsHorizontalScrollIndicator={false}>
              {state.capturedImages.map((img, index) => (
                <View key={`${img.uri}-${index}`} className="mr-3 rounded-2xl bg-black/55 p-2">
                  <Image source={{ uri: img.uri }} style={{ width: 64, height: 64, borderRadius: 12 }} />
                  <Text className="mt-2 max-w-[64px] text-center text-[11px] text-white/80" numberOfLines={2}>
                    {img.label ?? img.type ?? img.mode}
                  </Text>
                </View>
              ))}
            </ScrollView>
          ) : null}

          <View className="rounded-[30px] bg-black/70 px-4 py-4">
            {capturedPreview ? (
              <View className="items-center">
                <Image
                  source={{ uri: capturedPreview.uri }}
                  style={{ width: "100%", height: 220, borderRadius: 24, marginBottom: 16 }}
                  resizeMode="contain"
                />
                <View className="w-full flex-row gap-3">
                  <TouchableOpacity
                    className="flex-1 items-center rounded-[20px] border border-white/20 bg-white/10 px-4 py-4"
                    onPress={retakePhoto}
                    disabled={analysing}
                  >
                    <Text className="font-semibold text-white">Retake</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 items-center rounded-[20px] bg-[#0D47A1] px-4 py-4"
                    onPress={confirmPhoto}
                    disabled={analysing}
                  >
                    {analysing ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text className="font-semibold text-[#FFFFFF]">Use photo</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View>
                <View className="mb-4 flex-row items-center justify-between">
                  <TouchableOpacity
                    className="h-12 w-12 items-center justify-center rounded-full bg-white/10"
                    onPress={handleBack}
                  >
                    <Ionicons name="chevron-back" size={22} color="#ffffff" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="h-[74px] w-[74px] items-center justify-center rounded-full border-4 border-white bg-[#0D47A1]"
                    onPress={takePicture}
                  >
                    <View className="h-[54px] w-[54px] rounded-full bg-white" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="h-12 w-12 items-center justify-center rounded-full bg-white/10"
                    onPress={pickImage}
                  >
                    <Ionicons name="images-outline" size={22} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                <Text className="text-center text-sm text-white/75">
                  Take a new photo or choose one from the library.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
