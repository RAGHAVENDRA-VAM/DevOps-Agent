import { httpClient } from './httpClient';
import type { TechStack } from './techService';

export interface PipelinePreviewRequest {
  repoFullName: string;
  branch: string;
  tech: TechStack;
  enableSast: boolean;
  enableDast: boolean;
}

export interface PipelineCreateRequest extends PipelinePreviewRequest {
  deploy?: Record<string, unknown>;
}

export interface PipelineCreateResponse {
  status: string;
  repo: string;
  branch: string;
  workflow_path: string;
  secrets_configured: boolean;
}

export const generatePipelinePreview = async (
  payload: PipelinePreviewRequest,
): Promise<string> => {
  const res = await httpClient.post<{ yaml: string }>('/pipelines/preview', payload);
  return res.data.yaml;
};

export const createPipeline = async (
  payload: PipelineCreateRequest,
): Promise<PipelineCreateResponse> => {
  const res = await httpClient.post<PipelineCreateResponse>('/pipelines/create', payload);
  return res.data;
};
