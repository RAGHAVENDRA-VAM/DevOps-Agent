import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
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

  const fetchBuildStatus = async () => {
    try {
      setError(null);
      const status = await buildMonitorService.getBuildStatus(repoOwner, repoName);
      setBuildStatus(status);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch build status');
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

  const viewLogs = async (run: BuildRun) => {
    setSelectedRun(run);
    setLogsLoading(true);
    try {
      const runLogs = await buildMonitorService.getRunLogs(repoOwner, repoName, run.id);
      setLogs(runLogs);
    } catch (err: any) {
      setLogs('Failed to load logs: ' + (err.response?.data?.detail || err.message));
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
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Build Status - {repoOwner}/{repoName}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Refresh">
                <IconButton onClick={fetchBuildStatus} size="small">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              {isMonitoring ? (
                <Button
                  startIcon={<StopIcon />}
                  onClick={stopMonitoring}
                  variant="outlined"
                  color="error"
                  size="small"
                >
                  Stop
                </Button>
              ) : (
                <Button
                  startIcon={<PlayIcon />}
                  onClick={startMonitoring}
                  variant="contained"
                  size="small"
                >
                  Monitor
                </Button>
              )}
            </Stack>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {buildStatus && (
            <Box>
              {buildStatus.status === 'no_runs' ? (
                <Alert severity="info">No builds found for this repository</Alert>
              ) : (
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Latest Build
                    </Typography>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Chip
                        label={getStatusText(buildStatus.latest_run.status, buildStatus.latest_run.conclusion)}
                        color={getStatusColor(buildStatus.latest_run.status, buildStatus.latest_run.conclusion)}
                        size="small"
                      />
                      <Typography variant="body2">
                        {buildStatus.latest_run.workflow_name} on {buildStatus.latest_run.branch}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {buildStatus.latest_run.commit_sha}
                      </Typography>
                      <Button
                        startIcon={<ViewIcon />}
                        onClick={() => viewLogs(buildStatus.latest_run)}
                        size="small"
                        variant="outlined"
                      >
                        Logs
                      </Button>
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Recent Builds
                    </Typography>
                    <Stack spacing={1}>
                      {buildStatus.runs.slice(0, 5).map((run) => (
                        <Box key={run.id} display="flex" alignItems="center" gap={2}>
                          <Chip
                            label={getStatusText(run.status, run.conclusion)}
                            color={getStatusColor(run.status, run.conclusion)}
                            size="small"
                          />
                          <Typography variant="body2" sx={{ minWidth: 120 }}>
                            {run.workflow_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                            {run.branch}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60 }}>
                            {run.commit_sha}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            {new Date(run.updated_at).toLocaleString()}
                          </Typography>
                          <IconButton
                            onClick={() => viewLogs(run)}
                            size="small"
                            title="View logs"
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

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
          <Button onClick={() => setSelectedRun(null)}>Close</Button>
          {selectedRun && (
            <Button
              component="a"
              href={selectedRun.html_url}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
            >
              View on GitHub
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};