import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Link,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Button,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { httpClient } from '../services/httpClient';

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

export const FailedPipelinesPage: React.FC = () => {
  const [failedRuns, setFailedRuns] = useState<FailedRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRun, setExpandedRun] = useState<number | null>(null);

  const fetchFailedPipelines = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await httpClient.get('/pipelines/failed?days=7');
      setFailedRuns(res.data.failed_runs || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch failed pipelines');
      setFailedRuns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFailedPipelines();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" gutterBottom>
            Failed Pipelines
          </Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchFailedPipelines}
            variant="outlined"
            size="small"
          >
            Refresh
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          All failed pipeline runs from your repositories with AI-powered error analysis.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
            {error}
          </Alert>
        )}

        {failedRuns.length === 0 && !error && (
          <Alert severity="success" sx={{ mt: 2 }}>
            🎉 No failed pipelines in the last 7 days! All pipelines are passing.
          </Alert>
        )}

        {failedRuns.length > 0 && (
          <Box mt={3}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Repository</TableCell>
                  <TableCell>Workflow</TableCell>
                  <TableCell>Branch</TableCell>
                  <TableCell>Failed Job</TableCell>
                  <TableCell>Failed At</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {failedRuns.map(run => (
                  <React.Fragment key={run.id}>
                    <TableRow>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {run.repo}
                        </Typography>
                      </TableCell>
                      <TableCell>{run.workflow_name}</TableCell>
                      <TableCell>
                        <Chip label={run.branch} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={run.failed_job}
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(run.failed_at)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <IconButton
                            size="small"
                            onClick={() =>
                              setExpandedRun(expandedRun === run.id ? null : run.id)
                            }
                            title="View AI Analysis"
                          >
                            <ExpandMoreIcon
                              sx={{
                                transform:
                                  expandedRun === run.id ? 'rotate(180deg)' : 'rotate(0deg)',
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
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                    {expandedRun === run.id && (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ py: 0 }}>
                          <Accordion expanded={true} sx={{ boxShadow: 'none' }}>
                            <AccordionSummary sx={{ display: 'none' }} />
                            <AccordionDetails>
                              <Stack spacing={2}>
                                <Box>
                                  <Typography variant="subtitle2" gutterBottom color="primary">
                                    🤖 AI Analysis
                                  </Typography>
                                  <Alert severity="info" sx={{ mb: 2 }}>
                                    <Typography variant="body2" fontWeight="medium" gutterBottom>
                                      Reason:
                                    </Typography>
                                    <Typography variant="body2">
                                      {run.ai_reason || 'AI analysis not available'}
                                    </Typography>
                                  </Alert>
                                  <Alert severity="success">
                                    <Typography variant="body2" fontWeight="medium" gutterBottom>
                                      Resolution:
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      component="div"
                                      sx={{ whiteSpace: 'pre-line' }}
                                    >
                                      {run.ai_resolution || 'No resolution provided'}
                                    </Typography>
                                  </Alert>
                                </Box>

                                <Box>
                                  <Typography variant="subtitle2" gutterBottom>
                                    Error Excerpt:
                                  </Typography>
                                  <Box
                                    component="pre"
                                    sx={{
                                      bgcolor: '#1e1e1e',
                                      color: '#d4d4d4',
                                      p: 2,
                                      borderRadius: 1,
                                      fontSize: '0.75rem',
                                      maxHeight: 200,
                                      overflow: 'auto',
                                      fontFamily: 'monospace',
                                    }}
                                  >
                                    {run.error_excerpt || 'No error logs available'}
                                  </Box>
                                </Box>

                                <Box>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    component="a"
                                    href={run.run_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    startIcon={<OpenInNewIcon />}
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
  );
};
