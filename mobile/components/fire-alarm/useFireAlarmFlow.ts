import { useContext } from 'react';

import { FireAlarmFlowContext, type FireAlarmFlowValue } from './flow-context';

export function useFireAlarmFlow(): FireAlarmFlowValue {
  const context = useContext(FireAlarmFlowContext);

  if (!context) {
    throw new Error('useFireAlarmFlow must be used within FireAlarmFlowProvider');
  }

  return context;
}

export default useFireAlarmFlow;
