import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Image, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useJob } from '@/components/JobStateContext';
import { analyseImage } from '@/services/api';

export default function CaptureScreen() {
  const captureModes = ['consumer_unit', 'circuit_label'] as const;
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<'consumer_unit' | 'circuit_label'>('consumer_unit');
  const [analysing, setAnalysing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { state, dispatch } = useJob();

  if (!permission) return <View className="flex-1 bg-black" />;

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <Ionicons name="camera-outline" size={60} color="#9ca3af" />
        <Text className="text-lg font-semibold text-gray-800 mt-4 mb-2">Camera Access Required</Text>
        <Text className="text-gray-500 text-center mb-6">
          We need camera access to photograph the consumer unit.
        </Text>
        <TouchableOpacity className="bg-brand rounded-lg py-3 px-8" onPress={requestPermission}>
          <Text className="text-white font-semibold">Grant Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function takePicture() {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo) return;

      dispatch({ type: 'ADD_IMAGE', payload: { uri: photo.uri, mode } });

      setAnalysing(true);
      try {
        const result = await analyseImage(photo.uri, mode);
        dispatch({ type: 'SET_ANALYSIS', payload: result });
        Alert.alert(
          'Analysis Complete',
          `Detected ${result.numberOfCircuits} circuits. Main switch: ${result.mainSwitchRating}.`,
          [{ text: 'OK' }],
        );
      } catch {
        Alert.alert('Analysis Failed', 'Image captured but AI analysis failed. You can retry.');
      } finally {
        setAnalysing(false);
      }
    } catch {
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  }

  return (
    <View className="flex-1 bg-black">
      {/* Mode toggle */}
      <View className="flex-row bg-black/70 px-4 py-3 gap-2">
        {captureModes.map((m) => (
          <TouchableOpacity
            key={m}
            className={`flex-1 rounded-lg py-2 items-center ${mode === m ? 'bg-brand' : 'bg-white/20'}`}
            onPress={() => setMode(m)}
          >
            <Text className={`text-sm font-medium ${mode === m ? 'text-white' : 'text-white/70'}`}>
              {m === 'consumer_unit' ? 'Consumer Unit' : 'Circuit Label'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <CameraView ref={cameraRef} className="flex-1" facing="back" />

      {/* Captured thumbnails */}
      {state.capturedImages.length > 0 && (
        <ScrollView horizontal className="absolute bottom-28 left-0 right-0 px-4">
          {state.capturedImages.map((img, i) => (
            <View key={i} className="relative mr-2">
              <Image source={{ uri: img.uri }} className="w-16 h-16 rounded-lg" />
              <TouchableOpacity
                className="absolute -top-1 -right-1 bg-red-600 rounded-full w-5 h-5 items-center justify-center"
                onPress={() => dispatch({ type: 'REMOVE_IMAGE', payload: i })}
              >
                <Text className="text-white text-xs font-bold">×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Controls */}
      <View className="flex-row items-center justify-around px-8 pb-10 pt-4 bg-black">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="white" />
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

        <TouchableOpacity onPress={() => router.push('/(tabs)/location')}>
          <Ionicons name="arrow-forward" size={28} color={state.capturedImages.length > 0 ? 'white' : '#6b7280'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
