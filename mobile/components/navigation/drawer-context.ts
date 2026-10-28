import { createContext } from 'react';

export interface DrawerContextValue {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export const DrawerContext = createContext<DrawerContextValue | null>(null);
