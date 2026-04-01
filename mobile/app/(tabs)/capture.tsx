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
import { useJob, type CaptureMode, type CapturedImage, type WizardPhotoType } from '@/components/JobStateContext';
import { analyseImage } from '@/services/api';

type CapturedPreview = {
  uri: string;
  mode: CaptureMode;
};

const wizardPhotoModeMap: Record<WizardPhotoType, CaptureMode> = {
  main_fuse: 'consumer_unit',
  meter: 'consumer_unit',
  consumer_unit_cover_on: 'consumer_unit',
  circuit_schedule: 'circuit_label',
  smoke_detector: 'consumer_unit',
  co_detector: 'consumer_unit',
};

const wizardPhotoTitleMap: Record<WizardPhotoType, string> = {
  main_fuse: 'Main Fuse',
  meter: 'Meter',
  consumer_unit_cover_on: 'Consumer Unit With Cover On',
  circuit_schedule: 'Circuit Schedule',
  smoke_detector: 'Smoke Detector',
  co_detector: 'CO Detector',
};

export default function CaptureScreen() {
  const captureModes = ['consumer_unit', 'circuit_label'] as const;
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<CaptureMode>('consumer_unit');
  const [analysing, setAnalysing] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState<CapturedPreview | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const { state, dispatch } = useJob();

  const activeCaptureMode = state.wizard.activeCaptureType
    ? wizardPhotoModeMap[state.wizard.activeCaptureType]
    : state.wizard.activeCaptureMode;

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

  const guidance = useMemo(() => {
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
  }, [activeCaptureMode]);

  if (!permission) return <View className="flex-1 bg-black" />;

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <Ionicons name="camera-outline" size={60} color="#9ca3af" />
        <Text className="text-lg font-semibold text-gray-800 mt-4 mb-2">Camera Access Required</Text>
        <Text className="text-gray-500 text-center mb-6">
          We need camera access to photograph the inspection evidence.
        </Text>
        <TouchableOpacity className="bg-brand rounded-lg py-3 px-8" onPress={requestPermission}>
          <Text className="text-white font-semibold">Grant Access</Text>
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

      setCapturedPreview({ uri: photo.uri, mode: activeCaptureMode });
    } catch {
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  }

  async function confirmPhoto() {
    if (!capturedPreview) return;

    const imagePayload: CapturedImage = {
      uri: capturedPreview.uri,
      mode: capturedPreview.mode,
      type: state.wizard.activeCaptureType ?? undefined,
      label:
        state.wizard.activeCaptureLabel ??
        (state.wizard.activeCaptureType ? wizardPhotoTitleMap[state.wizard.activeCaptureType] : undefined),
      slotIndex: state.wizard.activeCaptureSlotIndex ?? undefined,
    };

    dispatch({ type: 'ADD_IMAGE', payload: imagePayload });

    const shouldAnalyse = capturedPreview.mode === 'consumer_unit' || capturedPreview.mode === 'circuit_label';

    if (!shouldAnalyse) {
      setCapturedPreview(null);
      return;
    }

    setAnalysing(true);
    try {
      const result = await analyseImage(capturedPreview.uri, capturedPreview.mode);
      dispatch({ type: 'SET_ANALYSIS', payload: result });
      setCapturedPreview(null);
      Alert.alert(
        'Analysis Complete',
        `Detected ${result.numberOfCircuits} circuits. Main switch: ${result.mainSwitchRating}.`,
        [{ text: 'OK' }],
      );
    } catch {
      setCapturedPreview(null);
      Alert.alert('Analysis Failed', 'Image captured but AI analysis failed. You can retry.');
    } finally {
      setAnalysing(false);
    }
  }

  function retakePhoto() {
    setCapturedPreview(null);
  }

  function handleBack() {
    if (state.wizard.activeCaptureType) {
      router.push('/(tabs)/wizard');
      return;
    }
    router.back();
  }

  function handleContinue() {
    if (state.wizard.activeCaptureType) {
      router.push('/(tabs)/wizard');
      return;
    }
    router.push('/(tabs)/location');
  }

  const title = state.wizard.activeCaptureLabel
    ? state.wizard.activeCaptureLabel
    : activeCaptureMode === 'consumer_unit'
      ? 'Consumer Unit'
      : 'Circuit Label';

  return (
    <View className="flex-1 bg-black">
      {!state.wizard.activeCaptureType ? (
        <View className="flex-row bg-black/70 px-4 pt-3 pb-2 gap-2">
          {captureModes.map((m) => (
            <TouchableOpacity
              key={m}
              className={`flex-1 rounded-lg py-2 items-center ${mode === m ? 'bg-brand' : 'bg-white/20'}`}
              onPress={() => setMode(m)}
              disabled={analysing}
            >
              <Text className={`text-sm font-medium ${mode === m ? 'text-white' : 'text-white/70'}`}>
                {m === 'consumer_unit' ? 'Consumer Unit' : 'Circuit Label'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View className="bg-black/70 px-4 pt-3 pb-2">
          <Text className="text-white text-lg font-semibold">{title}</Text>
          <Text className="text-white/70 text-sm">
            Capture the requested evidence for the guided wizard.
          </Text>
        </View>
      )}

      <View className="bg-black/75 px-4 pb-3">
        <View className="flex-row items-center mb-2">
          <Ionicons name="flash" size={16} color="#facc15" />
          <Text className="text-yellow-300 text-xs font-semibold ml-2">
            Flash is set to auto to help with dark cupboards and labels
          </Text>
        </View>
        <View className="bg-white/10 rounded-2xl px-4 py-3">
          <Text className="text-white font-semibold mb-2">
            {activeCaptureMode === 'consumer_unit' ? `How to frame ${title.toLowerCase()}` : `How to frame ${title.toLowerCase()}`}
          </Text>
          {guidance.map((item) => (
            <View key={item} className="flex-row items-start mb-1.5">
              <Text className="text-brand mr-2">•</Text>
              <Text className="text-white/85 text-sm flex-1">{item}</Text>
            </View>
          ))}
          {activeTargetImage ? (
            <Text className="text-green-300 text-xs mt-2">Existing saved photo found for this required step.</Text>
          ) : null}
        </View>
      </View>

      <View className="flex-1 relative">
        <CameraView
          ref={cameraRef}
          className="flex-1"
          facing="back"
          enableTorch={false}
          flash="auto"
        />

        <View className="absolute inset-0 items-center justify-center pointer-events-none px-8">
          <View className="w-full max-w-[340px] aspect-[1.45] border-4 border-white rounded-3xl bg-transparent">
            <View className="absolute top-3 left-3 w-8 h-8 border-t-4 border-l-4 border-brand rounded-tl-lg" />
            <View className="absolute top-3 right-3 w-8 h-8 border-t-4 border-r-4 border-brand rounded-tr-lg" />
            <View className="absolute bottom-3 left-3 w-8 h-8 border-b-4 border-l-4 border-brand rounded-bl-lg" />
            <View className="absolute bottom-3 right-3 w-8 h-8 border-b-4 border-r-4 border-brand rounded-br-lg" />
          </View>
          <Text className="text-white text-center text-sm mt-4 bg-black/55 px-4 py-2 rounded-full overflow-hidden">
            Keep the subject centred and fill most of the frame
          </Text>
        </View>
      </View>

      {state.capturedImages.length > 0 && (
        <ScrollView horizontal className="absolute bottom-28 left-0 right-0 px-4">
          {state.capturedImages.map((img, i) => (
            <View key={`${img.uri}-${i}`} className="relative mr-2">
              <Image source={{ uri: img.uri }} className="w-16 h-16 rounded-lg" />
              <View className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5 rounded-b-lg">
                <Text className="text-white text-[9px]" numberOfLines={1}>
                  {img.label ?? img.type ?? img.mode}
                </Text>
              </View>
              <TouchableOpacity
                className="absolute -top-1 -right-1 bg-red-600 rounded-full w-5 h-5 items-center justify-center"
                onPress={() =>
                  img.type
                    ? dispatch({
                        type: 'REMOVE_IMAGE_BY_TARGET',
                        payload: { type: img.type, slotIndex: img.slotIndex ?? null },
                      })
                    : dispatch({ type: 'REMOVE_IMAGE', payload: i })
                }
              >
                <Text className="text-white text-xs font-bold">×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <View className="flex-row items-center justify-around px-8 pb-10 pt-4 bg-black">
        <TouchableOpacity onPress={handleBack} disabled={analysing}>
          <Ionicons name="arrow-back" size={28} color={analysing ? '#6b7280' : 'white'} />
        </TouchableOpacity>

        <TouchableOpacity
          className="w-18 h-18 rounded-full bg-white items-center justify-center"
          onPress={takePicture}
          disabled={analysing}
        >
          {analysing ? (
            <ActivityIndicator color="#BE0000" />
          ) : (
            <View className="w-16 h-16 rounded-full border-4 border-brand" />
          )}
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
              <Text className="text-white text-base font-medium">Retake</Text>
            </TouchableOpacity>
            <Text className="text-white text-lg font-semibold">Preview Capture</Text>
            <TouchableOpacity onPress={confirmPhoto} disabled={analysing}>
              <Text className={`text-base font-semibold ${analysing ? 'text-gray-500' : 'text-brand'}`}>
                Use Photo
              </Text>
            </TouchableOpacity>
          </View>

          {capturedPreview && (
            <Image
              source={{ uri: capturedPreview.uri }}
              className="flex-1 w-full"
              resizeMode="contain"
            />
          )}

          <View className="px-5 py-5 bg-black/90">
            <Text className="text-white font-semibold mb-2">Quick check before using this image</Text>
            <View className="bg-white/10 rounded-2xl px-4 py-3">
              <Text className="text-white/85 text-sm mb-1">• Is the image centred in the frame?</Text>
              <Text className="text-white/85 text-sm mb-1">• Is the whole board or label visible?</Text>
              <Text className="text-white/85 text-sm mb-1">• Is the image sharp and readable?</Text>
              <Text className="text-white/85 text-sm">• Would landscape framing make it easier to read?</Text>
            </View>

            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity
                className="flex-1 border border-white/25 rounded-xl py-4 items-center"
                onPress={retakePhoto}
                disabled={analysing}
              >
                <Text className="text-white font-semibold">Retake Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-brand rounded-xl py-4 items-center"
                onPress={confirmPhoto}
                disabled={analysing}
              >
                {analysing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold">Use This Photo</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
