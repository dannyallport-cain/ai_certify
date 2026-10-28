import { useContext } from 'react';

import { DrawerContext, type DrawerContextValue } from './drawer-context';

export function useDrawer(): DrawerContextValue {
  const context = useContext(DrawerContext);

  if (!context) {
    throw new Error('useDrawer must be used within DrawerProvider');
  }

  return context;
}

export default useDrawer;
