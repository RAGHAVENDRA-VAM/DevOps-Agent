import { httpClient } from './httpClient';

export interface ApprovalConfig {
  TENANT_ID?: string;
  SUBSCRIPTION_ID?: string;
  RESOURCE_GROUP?: string;
  LOCATION?: string;
  APP_NAME?: string;
  DEPLOY_TARGET?: string;
  BRANCH?: string;
  ENABLE_SAST?: boolean;
  ENABLE_DAST?: boolean;
  [key: string]: unknown;
}

export interface DetectedTech {
  language?: string;
  framework?: string | null;
  buildTool?: string | null;
  hasDockerfile?: boolean;
  hasHelm?: boolean;
  hasTerraform?: boolean;
}

export interface Approval {
  id: string;
  repo: string;
  branch: string;
  commit_sha: string;
  commit_message: string;
  committed_by: string;
  committed_at: string;
  changed_files: string[];
  config: ApprovalConfig;
  detected_tech: DetectedTech;
  // 0=pending 1=tech-detection 2=terraform 3=cicd 4=monitoring 5=done
  pipeline_stage: number;
  // per-stage logs keyed by stage number string
  stage_logs: Record<string, string[]>;
  status: 'pending' | 'rejected' | 'running' | 'done' | 'failed';
  logs: string[];
  terraform_url: string | null;
  deployed_url: string | null;
  actions_run_url: string | null;
  created_at: number;
}

export const listApprovals = async (): Promise<Approval[]> => {
  const res = await httpClient.get<{ approvals: Approval[] }>('/approvals');
  return res.data.approvals;
};

export const approveRequest = async (id: string): Promise<void> => {
  await httpClient.post(`/approvals/${id}/approve`);
};

export const rejectRequest = async (id: string): Promise<void> => {
  await httpClient.post(`/approvals/${id}/reject`);
};

export const retryRequest = async (id: string): Promise<void> => {
  // Use retry endpoint which re-runs pipeline while preserving logs.
  await httpClient.post(`/approvals/${id}/retry`);
};

export const openLogStream = (id: string): EventSource => {
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
  return new EventSource(`${base}/approvals/${id}/logs`, { withCredentials: true });
};

export interface DebugState {
  token_set: boolean;
  token_preview: string;
  github_reachable: boolean;
  github_user: string;
  repos_visible: string[];
  repos_with_config_py: string[];
  seen_shas: Record<string, string>;
  total_approvals: number;
}

export const pollNow = async (): Promise<{ seen_repos: string[] }> => {
  const res = await httpClient.post<{ seen_repos: string[] }>('/approvals/poll-now');
  return res.data;
};

export const fetchDebugState = async (): Promise<DebugState> => {
  const res = await httpClient.get<DebugState>('/approvals/debug');
  return res.data;
};
