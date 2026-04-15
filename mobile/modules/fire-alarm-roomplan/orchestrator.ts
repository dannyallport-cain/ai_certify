import {
  buildAnalysisRequest,
  createAnalysisJobFromSession,
  defaultFireAlarmRecognitionPipelineConfig,
  exportPortableSessionPayload,
  mapFindingsToFloorplan,
} from './pipeline';
import type {
  FireAlarmAnalysisJob,
  FireAlarmAnalysisRequest,
  FireAlarmAnalysisResult,
  FireAlarmMediaAsset,
  FireAlarmPortableSessionPayload,
  FireAlarmRecognitionPipelineConfig,
} from './pipeline';
import type { FireAlarmScanSession } from './types';

export interface FireAlarmRecognitionAnalyzer {
  analyze: (
    request: FireAlarmAnalysisRequest,
  ) => Promise<Omit<FireAlarmAnalysisResult, 'summary' | 'reviewStatus'>>;
}

export interface FireAlarmRecognitionOrchestratorDependencies {
  analyzer: FireAlarmRecognitionAnalyzer;
  config?: Partial<FireAlarmRecognitionPipelineConfig>;
}

export class FireAlarmRecognitionOrchestrator {
  private readonly analyzer: FireAlarmRecognitionAnalyzer;

  private readonly config: Partial<FireAlarmRecognitionPipelineConfig>;

  constructor(dependencies: FireAlarmRecognitionOrchestratorDependencies) {
    this.analyzer = dependencies.analyzer;
    this.config = dependencies.config ?? defaultFireAlarmRecognitionPipelineConfig;
  }

  createJob(session: FireAlarmScanSession, mediaAssets: FireAlarmMediaAsset[] = []): FireAlarmAnalysisJob {
    return createAnalysisJobFromSession(session, mediaAssets, this.config);
  }

  buildRequest(job: FireAlarmAnalysisJob): FireAlarmAnalysisRequest {
    return buildAnalysisRequest(job);
  }

  async run(job: FireAlarmAnalysisJob): Promise<FireAlarmAnalysisResult> {
    const request = job.request ?? this.buildRequest(job);
    const rawResult = await this.analyzer.analyze(request);
    const mappedResult = mapFindingsToFloorplan(request, rawResult);

    job.result = mappedResult;
    job.status = 'completed';

    return mappedResult;
  }

  async analyzeSession(
    session: FireAlarmScanSession,
    mediaAssets: FireAlarmMediaAsset[] = [],
  ): Promise<{
    job: FireAlarmAnalysisJob;
    request: FireAlarmAnalysisRequest;
    result: FireAlarmAnalysisResult;
  }> {
    const job = this.createJob(session, mediaAssets);
    const request = this.buildRequest(job);
    const result = await this.run(job);

    return {
      job,
      request,
      result,
    };
  }

  exportPortablePayload(
    session: FireAlarmScanSession,
    options?: {
      analysis?: FireAlarmAnalysisResult | null;
      mediaAssets?: FireAlarmMediaAsset[];
      config?: Partial<FireAlarmRecognitionPipelineConfig>;
    },
  ): FireAlarmPortableSessionPayload {
    return exportPortableSessionPayload(session, {
      analysis: options?.analysis ?? null,
      mediaAssets: options?.mediaAssets ?? [],
      config: {
        ...this.config,
        ...options?.config,
      },
    });
  }
}