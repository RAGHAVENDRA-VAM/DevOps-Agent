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

export class BuildMonitorService {
  private ws: WebSocket | null = null;
  private listeners: ((update: BuildStatusUpdate) => void)[] = [];

  async getBuildStatus(repoOwner: string, repoName: string): Promise<BuildStatus> {
    const res = await httpClient.get(`/builds/${repoOwner}/${repoName}/status`);
    return res.data;
  }

  async getRunLogs(repoOwner: string, repoName: string, runId: number): Promise<string> {
    const res = await httpClient.get(`/builds/${repoOwner}/${repoName}/runs/${runId}/logs`);
    return res.data.logs;
  }

  connectToRepo(repoOwner: string, repoName: string): void {
    if (this.ws) {
      this.ws.close();
    }

    const wsUrl = `ws://localhost:4000/api/builds/ws/${repoOwner}/${repoName}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      try {
        const update: BuildStatusUpdate = JSON.parse(event.data);
        this.listeners.forEach(listener => listener(update));
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (this.ws?.readyState === WebSocket.CLOSED) {
          this.connectToRepo(repoOwner, repoName);
        }
      }, 5000);
    };
  }

  onStatusUpdate(listener: (update: BuildStatusUpdate) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners = [];
  }
}

export const buildMonitorService = new BuildMonitorService();