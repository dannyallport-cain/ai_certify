import { router } from 'expo-router';
import { useJob } from '@/components/JobStateContext';
import HeaderNavButton from './HeaderNavButton';

export default function CaptureHeaderBackButton() {
  const { state, dispatch } = useJob();

  function handleBack() {
    if (state.wizard.activeCaptureType) {
      dispatch({
        type: 'SET_ACTIVE_CAPTURE',
        payload: { type: null, label: null, mode: 'consumer_unit', slotIndex: null },
      });
      router.push('/(tabs)/wizard');
      return;
    }

    router.back();
  }

  return <HeaderNavButton icon="chevron-back" onPress={handleBack} />;
}