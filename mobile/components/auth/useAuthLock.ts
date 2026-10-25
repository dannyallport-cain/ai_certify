import { useContext } from 'react';
import { AuthLockContext, type AuthLockValue } from './authLockContext';

export function useAuthLock(): AuthLockValue {
  const value = useContext(AuthLockContext);

  if (!value) {
    throw new Error('useAuthLock must be used inside an AuthLockProvider');
  }

  return value;
}
