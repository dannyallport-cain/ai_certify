import { useCallback, useEffect, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { SectionCard } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useJob } from '@/components/JobStateContext';
import { useTheme } from '@/theme/useTheme';

export default function LocationScreen() {
  const { palette } = useTheme();
  const { state, dispatch } = useJob();
  const [isDetecting, setIsDetecting] = useState(false);
  const [manualAddress, setManualAddress] = useState('');

  const syncManualAddressFromGps = useCallback(() => {
    if (state.gpsAddress && !manualAddress.trim()) {
      setManualAddress(state.gpsAddress);
    }
  }, [manualAddress, state.gpsAddress]);

  useEffect(() => {
    syncManualAddressFromGps();
  }, [syncManualAddressFromGps]);

  async function detectLocation() {
    setIsDetecting(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location access is needed to fill the address.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const [place] = await Location.reverseGeocodeAsync(position.coords);

      const address = [
        place.streetNumber,
        place.street,
        place.city,
        place.region,
        place.postalCode,
      ]
        .filter(Boolean)
        .join(', ');

      dispatch({
        type: 'SET_GPS',
        payload: {
          address,
          coords: { latitude: position.coords.latitude, longitude: position.coords.longitude },
        },
      });
    } catch {
      Alert.alert('Location error', 'Could not read the location. Enter it manually.');
    } finally {
      setIsDetecting(false);
    }
  }

  function saveManualAddress() {
    const address = manualAddress.trim() || state.gpsAddress?.trim() || '';

    if (!address) {
      Alert.alert('Address required', 'Enter the site address to continue.');
      return;
    }

    dispatch({
      type: 'SET_GPS',
      payload: { address, coords: state.gpsCoords ?? { latitude: 0, longitude: 0 } },
    });
    setManualAddress(address);
  }

  return (
    <Screen bottomGap={28}>
      <SectionCard title="Site address" hint="Used on the certificate.">
        <Button
          label={isDetecting ? 'Detecting…' : 'Use GPS location'}
          icon="locate-outline"
          accent="indigo"
          variant="soft"
          loading={isDetecting}
          onPress={() => void detectLocation()}
          block
        />

        {state.gpsAddress ? (
          <View
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              backgroundColor: palette.successSoft,
            }}
          >
            <AppText variant="label" tone="success">
              CURRENT ADDRESS
            </AppText>
            <AppText variant="body" style={{ marginTop: 4 }}>
              {state.gpsAddress}
            </AppText>
          </View>
        ) : null}
      </SectionCard>

      <View style={{ height: 13 }} />

      <SectionCard title="Or type it" hint="Street, town, postcode.">
        <TextInput
          value={manualAddress}
          onChangeText={setManualAddress}
          placeholder="123 High Street, London, SW1A 1AA"
          placeholderTextColor={palette.inkSoft}
          multiline
          textAlignVertical="top"
          style={{
            borderWidth: 1,
            borderColor: palette.line,
            backgroundColor: palette.surface,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: palette.ink,
            fontSize: 14,
            minHeight: 76,
          }}
        />

        <View style={{ marginTop: 12, gap: 10 }}>
          <Button label="Use this address" icon="checkmark" accent="indigo" onPress={saveManualAddress} block />

          {state.gpsAddress ? (
            <Button
              label="Next: customer"
              icon="arrow-forward"
              accent="indigo"
              variant="outline"
              onPress={() => router.push('/(tabs)/customer')}
              block
            />
          ) : null}
        </View>
      </SectionCard>
    </Screen>
  );
}
