import { httpClient } from './httpClient';

export interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  branch: string;
  commit_sha: string;
  commit_message: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  run_number: number;
}

export interface WorkflowJob {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  html_url: string;
  steps: Array<{
    name: string;
    status: string;
    conclusion: string | null;
    number: number;
    started_at: string | null;
    completed_at: string | null;
  }>;
}

export interface WorkflowLog {
  job_id: number;
  job_name: string;
  content: string;
}

export interface Artifact {
  id: number;
  name: string;
  size_in_bytes: number;
  created_at: string;
  expired: boolean;
  expires_at: string;
  archive_download_url: string;
}

export const getWorkflowRuns = async (owner: string, repo: string, branch?: string) => {
  const params = new URLSearchParams();
  if (branch) params.append('branch', branch);
  
  const res = await httpClient.get(`/builds/${owner}/${repo}/runs?${params}`);
  return res.data as { runs: WorkflowRun[]; total: number };
};

export const getWorkflowRun = async (owner: string, repo: string, runId: number) => {
  const res = await httpClient.get(`/builds/${owner}/${repo}/runs/${runId}`);
  return res.data as WorkflowRun;
};

export const getWorkflowJobs = async (owner: string, repo: string, runId: number) => {
  const res = await httpClient.get(`/builds/${owner}/${repo}/runs/${runId}/jobs`);
  return res.data as { jobs: WorkflowJob[] };
};

export const getWorkflowLogs = async (owner: string, repo: string, runId: number) => {
  const res = await httpClient.get(`/builds/${owner}/${repo}/runs/${runId}/logs`);
  return res.data as { logs: WorkflowLog[] };
};

export const getWorkflowArtifacts = async (owner: string, repo: string, runId: number) => {
  const res = await httpClient.get(`/builds/${owner}/${repo}/runs/${runId}/artifacts`);
  return res.data as { artifacts: Artifact[]; total: number };
};
