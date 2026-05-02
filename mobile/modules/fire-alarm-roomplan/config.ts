import type { FireAlarmRecognitionPipelineConfig } from './pipeline';
import { defaultFireAlarmRecognitionPipelineConfig } from './pipeline';

export function createFireAlarmRecognitionPipelineConfig(
  overrides: Partial<FireAlarmRecognitionPipelineConfig> = {},
): FireAlarmRecognitionPipelineConfig {
  return {
    ...defaultFireAlarmRecognitionPipelineConfig,
    ...overrides,
  };
}
