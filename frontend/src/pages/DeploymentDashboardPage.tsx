import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Link,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { AxiosError } from 'axios';
import { listApprovals, type Approval } from '../services/approvalService';
import '../styles/DashboardPages.css';

type DeployStatus = 'success' | 'failed' | 'running' | 'pending' | 'rejected';

const STATUS_STYLE: Record<DeployStatus, { bgcolor: string; color: string; border: string }> = {
  success:  { bgcolor: 'rgba(34,197,94,0.1)',   color: '#16a34a', border: '1px solid rgba(34,197,94,0.25)'   },
  failed:   { bgcolor: 'rgba(239,68,68,0.08)',  color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)'    },
  running:  { bgcolor: 'rgba(245,158,11,0.1)',  color: '#d97706', border: '1px solid rgba(245,158,11,0.25)'  },
  pending:  { bgcolor: 'rgba(0,150,136,0.1)',   color: '#00897b', border: '1px solid rgba(0,150,136,0.25)'   },
  rejected: { bgcolor: 'rgba(107,114,128,0.1)', color: '#6b7280', border: '1px solid rgba(107,114,128,0.2)' },
};

function statusLabel(status: string): DeployStatus {
  if (status === 'done') return 'success';
  if (status === 'failed') return 'failed';
  if (status === 'running') return 'running';
  if (status === 'rejected') return 'rejected';
  return 'pending';
}

function extractErrorMessage(err: unknown): string {
  const axiosErr = err as AxiosError<{ detail?: string }>;
  return axiosErr.response?.data?.detail ?? (err instanceof Error ? err.message : 'Failed to load deployments');
}

export const DeploymentDashboardPage: React.FC = () => {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const fetchDeployments = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await listApprovals();
      // Only show approvals that have been actioned (not purely pending)
      setApprovals(data.filter((a) => a.status !== 'pending'));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchDeployments(); }, []);

  return (
    <Box className="dash-root">
      <Card className="dash-card">
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} className="dash-title">
                Deployment Dashboard
              </Typography>
              <Typography variant="body2" className="dash-subtitle">
                Track deployment status across repositories with links to live endpoints.
              </Typography>
            </Box>
            <Button
              startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon />}
              onClick={() => void fetchDeployments()}
              disabled={loading}
              variant="outlined"
              size="small"
              className="dash-refresh-btn"
            >
              Refresh
            </Button>
          </Box>

          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading && approvals.length === 0 ? (
            <Box display="flex" justifyContent="center" mt={6}>
              <CircularProgress sx={{ color: '#009688' }} />
            </Box>
          ) : (
            <Box mt={2} sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead className="dash-table-head">
                  <TableRow>
                    <TableCell>Repository</TableCell>
                    <TableCell>Branch</TableCell>
                    <TableCell>Commit</TableCell>
                    <TableCell>Deploy Target</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Endpoint</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody className="dash-table-body">
                  {approvals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Typography variant="body2" color="#9ca3af" py={4} textAlign="center">
                          No deployments yet. Approve a pipeline from the Approvals page to see status here.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    approvals.map((row) => {
                      const ds = statusLabel(row.status);
                      const style = STATUS_STYLE[ds];
                      return (
                        <TableRow key={row.id} className="dash-table-row">
                          <TableCell>
                            <Typography variant="body2" fontWeight={600} color="#1a202c">{row.repo}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={row.branch} size="small" sx={{ bgcolor: 'rgba(0,150,136,0.1)', color: '#00897b', border: '1px solid rgba(0,150,136,0.2)', fontSize: 11 }} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="#6b7280" fontFamily="monospace">
                              {row.commit_sha}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="#6b7280">
                              {(row.config.DEPLOY_TARGET as string | undefined) ?? '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={ds} size="small" sx={{ ...style, fontWeight: 700, fontSize: 11 }} />
                          </TableCell>
                          <TableCell>
                            {row.deployed_url ? (
                              <Link
                                href={row.deployed_url.startsWith('http') ? row.deployed_url : `https://${row.deployed_url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ color: '#00897b', display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 13 }}
                              >
                                Open <OpenInNewIcon sx={{ fontSize: 13 }} />
                              </Link>
                            ) : (
                              <Typography variant="caption" color="#9ca3af">—</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
