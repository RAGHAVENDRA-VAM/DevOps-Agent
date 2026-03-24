import React, { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { AxiosError } from 'axios';
import { httpClient } from '../services/httpClient';
import '../styles/DashboardPages.css';

interface FailedRun {
  id: number;
  repo: string;
  workflow_name: string;
  branch: string;
  commit_sha: string;
  failed_at: string;
  failed_job: string;
  error_excerpt: string;
  ai_reason: string;
  ai_resolution: string;
  run_url: string;
}

interface FailedPipelinesResponse {
  failed_runs: FailedRun[];
  total: number;
}

function extractErrorMessage(err: unknown): string {
  const axiosErr = err as AxiosError<{ detail?: string }>;
  return axiosErr.response?.data?.detail ?? (err instanceof Error ? err.message : 'Failed to fetch failed pipelines');
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

export const FailedPipelinesPage: React.FC = () => {
  const [failedRuns, setFailedRuns]   = useState<FailedRun[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [expandedId, setExpandedId]   = useState<number | null>(null);

  const fetchFailedPipelines = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await httpClient.get<FailedPipelinesResponse>('/pipelines/failed?days=7');
      setFailedRuns(res.data.failed_runs ?? []);
    } catch (err) {
      setError(extractErrorMessage(err));
      setFailedRuns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFailedPipelines(); }, []);

  const toggleExpand = (id: number): void =>
    setExpandedId((prev) => (prev === id ? null : id));

  if (loading) {
    return (
      <Box className="dash-root">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
          <CircularProgress sx={{ color: '#63b3ed' }} />
        </Box>
      </Box>
    );
  }

  return (
    <Box className="dash-root">
      <Card className="dash-card">
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1" fontWeight={700} className="dash-title">
              Failed Pipelines
            </Typography>
            <Button
              startIcon={<RefreshIcon />}
              onClick={fetchFailedPipelines}
              variant="outlined"
              size="small"
              className="dash-refresh-btn"
            >
              Refresh
            </Button>
          </Box>

          <Typography variant="body2" className="dash-subtitle" gutterBottom>
            All failed pipeline runs from your repositories with AI-powered error analysis.
          </Typography>

          {error && (
            <Alert
              severity="error"
              sx={{ mt: 2, mb: 2, bgcolor: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              {error}
            </Alert>
          )}

          {failedRuns.length === 0 && !error && (
            <Alert
              severity="success"
              sx={{ mt: 2, bgcolor: 'rgba(16,185,129,0.1)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)' }}
            >
              🎉 No failed pipelines in the last 7 days! All pipelines are passing.
            </Alert>
          )}

          {failedRuns.length > 0 && (
            <Box mt={3} sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead className="dash-table-head">
                  <TableRow>
                    <TableCell>Repository</TableCell>
                    <TableCell>Workflow</TableCell>
                    <TableCell>Branch</TableCell>
                    <TableCell>Failed Job</TableCell>
                    <TableCell>Failed At</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody className="dash-table-body">
                  {failedRuns.map((run) => (
                    <React.Fragment key={run.id}>
                      <TableRow className="dash-table-row">
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} color="#e2e8f0">
                            {run.repo}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="rgba(148,163,184,0.8)">
                            {run.workflow_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={run.branch}
                            size="small"
                            sx={{ bgcolor: 'rgba(99,179,237,0.1)', color: '#63b3ed', border: '1px solid rgba(99,179,237,0.2)' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={run.failed_job}
                            size="small"
                            sx={{ bgcolor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="rgba(148,163,184,0.6)">
                            {formatDate(run.failed_at)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <IconButton
                              size="small"
                              onClick={() => toggleExpand(run.id)}
                              title="View AI Analysis"
                              sx={{ color: '#63b3ed' }}
                              aria-label="Toggle AI analysis"
                              aria-expanded={expandedId === run.id}
                            >
                              <ExpandMoreIcon
                                sx={{
                                  transform: expandedId === run.id ? 'rotate(180deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s',
                                }}
                              />
                            </IconButton>
                            <IconButton
                              size="small"
                              component="a"
                              href={run.run_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View on GitHub"
                              sx={{ color: 'rgba(148,163,184,0.6)' }}
                              aria-label="Open run on GitHub"
                            >
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>

                      {expandedId === run.id && (
                        <TableRow>
                          <TableCell colSpan={6} sx={{ py: 0, bgcolor: 'rgba(13,25,48,0.5)' }}>
                            <Accordion expanded disableGutters sx={{ boxShadow: 'none', bgcolor: 'transparent' }}>
                              <AccordionSummary sx={{ display: 'none' }} />
                              <AccordionDetails sx={{ p: 2 }}>
                                <Stack spacing={2}>
                                  <Box>
                                    <Typography variant="subtitle2" color="#63b3ed" gutterBottom>
                                      🤖 AI Analysis
                                    </Typography>
                                    <Alert
                                      severity="info"
                                      sx={{ mb: 2, bgcolor: 'rgba(59,130,246,0.1)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)' }}
                                    >
                                      <Typography variant="body2" fontWeight={600} gutterBottom>
                                        Reason:
                                      </Typography>
                                      <Typography variant="body2">
                                        {run.ai_reason || 'AI analysis not available'}
                                      </Typography>
                                    </Alert>
                                    <Alert
                                      severity="success"
                                      sx={{ bgcolor: 'rgba(16,185,129,0.1)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.2)' }}
                                    >
                                      <Typography variant="body2" fontWeight={600} gutterBottom>
                                        Resolution:
                                      </Typography>
                                      <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-line' }}>
                                        {run.ai_resolution || 'No resolution provided'}
                                      </Typography>
                                    </Alert>
                                  </Box>

                                  <Box>
                                    <Typography variant="subtitle2" color="rgba(148,163,184,0.7)" gutterBottom>
                                      Error Excerpt:
                                    </Typography>
                                    <Box component="pre" className="dash-error-pre">
                                      {run.error_excerpt || 'No error logs available'}
                                    </Box>
                                  </Box>

                                  <Box>
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      component={Link}
                                      href={run.run_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      startIcon={<OpenInNewIcon />}
                                      className="dash-refresh-btn"
                                    >
                                      View Full Logs on GitHub
                                    </Button>
                                  </Box>
                                </Stack>
                              </AccordionDetails>
                            </Accordion>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
