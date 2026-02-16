import { httpClient } from './httpClient';

interface PipelinePreviewRequest {
  repoFullName: string;
  branch: string;
  tech: unknown;
  enableSast: boolean;
  enableDast: boolean;
}

interface PipelineCreateRequest {
  repoFullName: string;
  branch: string;
  tech: unknown;
  enableSast: boolean;
  enableDast: boolean;
}

export const generatePipelinePreview = async (payload: PipelinePreviewRequest) => {
  const res = await httpClient.post('/pipelines/preview', payload);
  return res.data.yaml as string;
};

export const createPipeline = async (payload: PipelineCreateRequest) => {
  const res = await httpClient.post('/pipelines/create', payload);
  return res.data;
};

