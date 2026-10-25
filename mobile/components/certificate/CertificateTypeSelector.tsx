import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MOBILE_CERTIFICATE_TYPES } from '@/services/certificates/types';

interface CertificateTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  /** Keyword from the ServiceM8 job that produced the current suggestion. */
  inferredFrom?: string | null;
}

/**
 * Picks what is actually being certified. The choice is stored on the draft, so
 * the certificate is issued as the type the surveyor is working to rather than
 * defaulting everything to an EICR.
 */
export function CertificateTypeSelector({
  value,
  onChange,
  inferredFrom,
}: CertificateTypeSelectorProps) {
  const selected = MOBILE_CERTIFICATE_TYPES.find(
    (option) => option.value.toUpperCase() === value.toUpperCase()
  );

  return (
    <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
      <Text className="mb-1 font-semibold text-gray-900">Certificate type</Text>
      <Text className="mb-3 text-sm text-gray-500">
        {inferredFrom
          ? `Suggested from the ServiceM8 job (matched “${inferredFrom}”). Change it if that is wrong.`
          : 'Choose the certificate this visit is producing.'}
      </Text>

      {MOBILE_CERTIFICATE_TYPES.map((option) => {
        const isSelected = selected?.value === option.value;

        return (
          <TouchableOpacity
            key={option.value}
            className={`mb-2 rounded-xl border p-3 ${
              isSelected ? 'border-brand bg-brand/5' : 'border-gray-200 bg-white'
            }`}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
          >
            <View className="flex-row items-center justify-between">
              <View className="mr-3 flex-1">
                <Text className="text-sm font-semibold text-gray-900">{option.label}</Text>
                <Text className="mt-0.5 text-xs text-gray-500">{option.description}</Text>
              </View>
              <Ionicons
                name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={isSelected ? '#0D47A1' : '#A0AEC0'}
              />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
