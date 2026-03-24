import { httpClient } from './httpClient';

export interface BuildRun {
  id: number;
  status: string;
  conclusion?: string;
  workflow_name: string;
  branch: string;
  commit_sha: string;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface BuildStatus {
  status: string;
  latest_run: BuildRun;
  runs: BuildRun[];
}

export interface BuildStatusUpdate {
  type: 'status_update';
  run: BuildRun;
}

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'wss://localhost:4000/api';

function isBuildStatusUpdate(value: unknown): value is BuildStatusUpdate {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<string, unknown>)['type'] === 'status_update' &&
    typeof (value as Record<string, unknown>)['run'] === 'object'
  );
}

export class BuildMonitorService {
  private ws: WebSocket | null = null;
  private listeners: Array<(update: BuildStatusUpdate) => void> = [];

  async getBuildStatus(repoOwner: string, repoName: string): Promise<BuildStatus> {
    const res = await httpClient.get<BuildStatus>(`/builds/${repoOwner}/${repoName}/status`);
    return res.data;
  }

  async getRunLogs(repoOwner: string, repoName: string, runId: number): Promise<string> {
    const res = await httpClient.get<{ logs: string }>(
      `/builds/${repoOwner}/${repoName}/runs/${runId}/logs`,
    );
    return res.data.logs;
  }

  connectToRepo(repoOwner: string, repoName: string): void {
    this.ws?.close();

    // Use wss:// (secure WebSocket) — falls back to env var
    const wsUrl = `${WS_BASE_URL}/builds/ws/${repoOwner}/${repoName}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const parsed: unknown = JSON.parse(event.data);
        if (!isBuildStatusUpdate(parsed)) {
          console.warn('Unexpected WebSocket message shape:', parsed);
          return;
        }
        this.listeners.forEach((listener) => listener(parsed));
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      setTimeout(() => {
        if (this.ws?.readyState === WebSocket.CLOSED) {
          this.connectToRepo(repoOwner, repoName);
        }
      }, 5_000);
    };
  }

  onStatusUpdate(listener: (update: BuildStatusUpdate) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
    this.listeners = [];
  }
}

export const buildMonitorService = new BuildMonitorService();
