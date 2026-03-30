import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { buildMonitorService, BuildStatus, BuildRun } from '../services/buildMonitorService';

interface BuildMonitorProps {
  repoOwner: string;
  repoName: string;
}

const getStatusColor = (status: string, conclusion?: string) => {
  if (status === 'in_progress') return 'warning';
  if (status === 'queued') return 'info';
  if (status === 'completed') {
    if (conclusion === 'success') return 'success';
    if (conclusion === 'failure') return 'error';
  }
  return 'default';
};

const getStatusText = (status: string, conclusion?: string) => {
  if (status === 'in_progress') return 'Building';
  if (status === 'queued') return 'Queued';
  if (status === 'completed') {
    if (conclusion === 'success') return 'Success';
    if (conclusion === 'failure') return 'Failed';
    return 'Completed';
  }
  return status;
};

export const BuildMonitor: React.FC<BuildMonitorProps> = ({ repoOwner, repoName }) => {
  const [buildStatus, setBuildStatus] = useState<BuildStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [selectedRun, setSelectedRun] = useState<BuildRun | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchBuildStatus = async (): Promise<void> => {
    try {
      setError(null);
      const status = await buildMonitorService.getBuildStatus(repoOwner, repoName);
      setBuildStatus(status);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(axiosErr.response?.data?.detail ?? axiosErr.message ?? 'Failed to fetch build status');
    } finally {
      setLoading(false);
    }
  };

  const startMonitoring = () => {
    setIsMonitoring(true);
    buildMonitorService.connectToRepo(repoOwner, repoName);
    
    const unsubscribe = buildMonitorService.onStatusUpdate((update) => {
      setBuildStatus(prev => prev ? {
        ...prev,
        latest_run: update.run,
        runs: [update.run, ...prev.runs.filter(r => r.id !== update.run.id)].slice(0, 10)
      } : null);
    });

    return unsubscribe;
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    buildMonitorService.disconnect();
  };

  const viewLogs = async (run: BuildRun): Promise<void> => {
    setSelectedRun(run);
    setLogsLoading(true);
    try {
      const runLogs = await buildMonitorService.getRunLogs(repoOwner, repoName, run.id);
      setLogs(runLogs);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string };
      setLogs('Failed to load logs: ' + (axiosErr.response?.data?.detail ?? axiosErr.message ?? 'Unknown error'));
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchBuildStatus();
    return () => {
      buildMonitorService.disconnect();
    };
  }, [repoOwner, repoName]);

  if (loading) {
    return (
      <div className="rounded-card shadow-card bg-white/80 p-6 flex justify-center items-center min-h-[120px]">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-card shadow-card bg-white/80 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
          <h2 className="text-lg font-semibold text-primary-dark">Build Status - {repoOwner}/{repoName}</h2>
          <div className="flex gap-2">
            <Tooltip title="Refresh">
              <button
                onClick={fetchBuildStatus}
                aria-label="Refresh"
                className="rounded-full p-2 bg-gradient-to-tr from-primary to-primary-light text-white hover:from-teal hover:to-primary-light transition-colors shadow focus:outline-none focus:ring-2 focus:ring-teal"
              >
                <RefreshIcon fontSize="small" />
              </button>
            </Tooltip>
            {isMonitoring ? (
              <button
                onClick={stopMonitoring}
                className="rounded-button border border-red-500 text-red-600 px-3 py-1 bg-white hover:bg-red-50 transition-colors shadow-button text-sm flex items-center gap-1"
                aria-label="Stop Monitoring"
              >
                <StopIcon fontSize="small" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                onClick={startMonitoring}
                className="rounded-button bg-gradient-to-tr from-primary to-primary-light text-white px-3 py-1 hover:from-teal hover:to-primary-light transition-colors shadow-button text-sm flex items-center gap-1"
                aria-label="Start Monitoring"
              >
                <PlayIcon fontSize="small" />
                <span>Monitor</span>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-2">
            <div className="rounded bg-red-100 text-red-800 px-4 py-2 text-sm" role="alert">
              {error}
            </div>
          </div>
        )}

        {buildStatus && (
          buildStatus.status === 'no_runs' ? (
            <div className="rounded bg-blue-100 text-blue-800 px-4 py-2 text-sm" role="status">
              No builds found for this repository
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div>
                <div className="text-xs font-semibold text-primary-dark mb-1">Latest Build</div>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip
                    label={getStatusText(buildStatus.latest_run.status, buildStatus.latest_run.conclusion)}
                    color={getStatusColor(buildStatus.latest_run.status, buildStatus.latest_run.conclusion)}
                    size="small"
                  />
                  <span className="text-sm text-gray-800">{buildStatus.latest_run.workflow_name} on {buildStatus.latest_run.branch}</span>
                  <span className="text-xs text-gray-500">{buildStatus.latest_run.commit_sha}</span>
                  <button
                    onClick={() => viewLogs(buildStatus.latest_run)}
                    className="rounded-button border border-primary text-primary px-2 py-1 bg-white hover:bg-primary-light hover:text-white transition-colors shadow-button text-xs flex items-center gap-1"
                    aria-label="View Logs"
                  >
                    <ViewIcon fontSize="small" />
                    <span>Logs</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-primary-dark mb-1">Recent Builds</div>
                <div className="flex flex-col gap-1">
                  {buildStatus.runs.slice(0, 5).map((run) => (
                    <div key={run.id} className="flex flex-wrap items-center gap-2">
                      <Chip
                        label={getStatusText(run.status, run.conclusion)}
                        color={getStatusColor(run.status, run.conclusion)}
                        size="small"
                      />
                      <span className="text-sm text-gray-800 min-w-[120px]">{run.workflow_name}</span>
                      <span className="text-xs text-gray-500 min-w-[80px]">{run.branch}</span>
                      <span className="text-xs text-gray-500 min-w-[60px]">{run.commit_sha}</span>
                      <span className="text-xs text-gray-400">{new Date(run.updated_at).toLocaleString()}</span>
                      <IconButton
                        onClick={() => viewLogs(run)}
                        size="small"
                        title="View logs"
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        )}
      </div>

      <Dialog
        open={!!selectedRun}
        onClose={() => setSelectedRun(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Build Logs - {selectedRun?.workflow_name} #{selectedRun?.id}
        </DialogTitle>
        <DialogContent>
          {logsLoading ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress />
            </Box>
          ) : (
            <Box
              component="pre"
              sx={{
                bgcolor: '#1e1e1e',
                color: '#d4d4d4',
                p: 2,
                borderRadius: 1,
                fontSize: '0.75rem',
                maxHeight: 400,
                overflow: 'auto',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
              }}
            >
              {logs}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <button
            onClick={() => setSelectedRun(null)}
            className="rounded-button border border-gray-400 text-gray-700 px-3 py-1 bg-white hover:bg-gray-100 transition-colors shadow-button text-sm"
          >
            Close
          </button>
          {selectedRun && (
            <a
              href={selectedRun.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-button border border-primary text-primary px-3 py-1 bg-white hover:bg-primary-light hover:text-white transition-colors shadow-button text-sm ml-2"
            >
              View on GitHub
            </a>
          )}
        </DialogActions>
      </Dialog>
    </div>
  );
};