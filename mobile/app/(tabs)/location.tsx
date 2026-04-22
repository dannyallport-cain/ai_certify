import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useJob } from '@/components/JobStateContext';

export default function LocationScreen() {
  const [loading, setLoading] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const { state, dispatch } = useJob();

  const syncManualAddressFromGps = useCallback(() => {
    if (state.gpsAddress && !manualAddress.trim()) {
      setManualAddress(state.gpsAddress);
    }
  }, [manualAddress, state.gpsAddress]);

  useEffect(() => {
    syncManualAddressFromGps();
  }, [syncManualAddressFromGps]);

  async function detectLocation() {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is needed to auto-fill the address.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const [place] = await Location.reverseGeocodeAsync(loc.coords);

      const parts = [
        place.streetNumber,
        place.street,
        place.city,
        place.region,
        place.postalCode,
      ].filter(Boolean);
      const address = parts.join(', ');

      dispatch({
        type: 'SET_GPS',
        payload: { address, coords: { latitude: loc.coords.latitude, longitude: loc.coords.longitude } },
      });
    } catch (error) {
      // console.warn('Location detection failed', error); // Debug log disabled for production
      Alert.alert('Location Error', 'Could not determine location. Please enter manually.');
    } finally {
      setLoading(false);
    }
  }

  function saveManual() {
    const address = manualAddress.trim() || state.gpsAddress?.trim() || '';

    if (!address) {
      Alert.alert('Required', 'Please enter a site address.');
      return;
    }

    dispatch({
      type: 'SET_GPS',
      payload: { address, coords: state.gpsCoords ?? { latitude: 0, longitude: 0 } },
    });
    setManualAddress(address);
  }

  return (
    <View className="flex-1 bg-white px-6 pt-8">
      <Text className="text-2xl font-bold text-gray-900 mb-2">Site Address</Text>
      <Text className="text-gray-500 mb-6">Confirm the inspection address for the certificate.</Text>

      {/* GPS detect */}
      <TouchableOpacity
        className="flex-row items-center bg-brand/10 border border-brand rounded-xl px-4 py-4 mb-6"
        onPress={detectLocation}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#0D47A1" className="mr-3" />
        ) : (
          <Ionicons name="locate" size={24} color="#0D47A1" style={{ marginRight: 12 }} />
        )}
        <View>
          <Text className="font-semibold text-brand">Use GPS Location</Text>
          <Text className="text-gray-500 text-sm">Automatically detect address</Text>
        </View>
      </TouchableOpacity>

      {/* Current value */}
      {state.gpsAddress ? (
        <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <Text className="text-green-700 font-semibold mb-1">Current Address</Text>
          <Text className="text-green-900">{state.gpsAddress}</Text>
        </View>
      ) : null}

      {/* Manual entry */}
      <Text className="text-gray-700 font-medium mb-2">Or enter manually</Text>
      <TextInput
        className="border border-gray-300 rounded-xl px-4 py-3 mb-3 text-base"
        placeholder="123 High Street, London, SW1A 1AA"
        value={manualAddress}
        onChangeText={setManualAddress}
        multiline
      />
      <TouchableOpacity
        className="bg-gray-800 rounded-xl py-3 items-center mb-8"
        onPress={saveManual}
      >
        <Text className="text-white font-semibold">Use This Address</Text>
      </TouchableOpacity>

      {state.gpsAddress ? (
        <TouchableOpacity
          className="bg-brand rounded-xl py-4 items-center"
          onPress={() => router.push('/(tabs)/customer')}
        >
          <Text className="text-white font-bold text-base">Next: Select Customer</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}