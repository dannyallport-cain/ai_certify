import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

type HeaderNavButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
};

export default function HeaderNavButton({ icon, onPress, disabled = false }: HeaderNavButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: 19,
        marginHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fffdf9',
        borderWidth: 1,
        borderColor: disabled ? '#e5ded7' : '#e7d8c9',
        opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
      })}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={20} color="#7c5a45" />
    </Pressable>
  );
}