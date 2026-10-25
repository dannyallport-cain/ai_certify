import { useCallback, useRef, useState } from 'react';
import type { View } from 'react-native';

/**
 * KeyboardAvoidingView measures its own frame relative to its parent, while the
 * native keyboard reports screen coordinates. We therefore need to know how far
 * the container sits from the top of the screen (status bar plus any navigator
 * header) and feed that in as `keyboardVerticalOffset`. Measuring the container
 * itself keeps this correct for every navigator configuration without having to
 * re-derive header heights by hand.
 */
export function useKeyboardVerticalOffset() {
  const [offset, setOffset] = useState(0);
  const viewRef = useRef<View>(null);

  const measureOffset = useCallback(() => {
    viewRef.current?.measureInWindow((_x, y) => {
      const nextOffset = Number.isFinite(y) && y > 0 ? Math.round(y) : 0;
      setOffset((current) => (current === nextOffset ? current : nextOffset));
    });
  }, []);

  return { offset, viewRef, measureOffset };
}
