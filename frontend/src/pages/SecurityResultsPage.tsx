import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
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
import { httpClient } from '../services/httpClient';
import '../styles/DashboardPages.css';

// ---------------------------------------------------------------------------
// Types matching backend Pydantic models
// ---------------------------------------------------------------------------

type SastSeverity = 'BLOCKER' | 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';
type QualityGate  = 'OK' | 'WARN' | 'ERROR' | 'NONE';
type ZapRisk      = 'High' | 'Medium' | 'Low' | 'Informational';

interface SastIssue {
  key: string;
  severity: SastSeverity;
  message: string;
  component: string;
  line: number | null;
  rule: string;
}

interface SastResponse {
  issues: SastIssue[];
  quality_gate: QualityGate;
  total_issues: number;
  sonar_url: string | null;
}

interface ZapAlert {
  alert: string;
  risk: ZapRisk;
  description: string;
  solution: string;
  url: string;
  cweid: string | null;
}

interface DastResponse {
  alerts: ZapAlert[];
  total_alerts: number;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
  zap_url: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEVERITY_STYLE: Record<SastSeverity, { color: string; bg: string }> = {
  BLOCKER:  { color: '#dc2626', bg: 'rgba(239,68,68,0.08)'   },
  CRITICAL: { color: '#ea580c', bg: 'rgba(234,88,12,0.08)'   },
  MAJOR:    { color: '#d97706', bg: 'rgba(245,158,11,0.08)'  },
  MINOR:    { color: '#00897b', bg: 'rgba(0,150,136,0.08)'   },
  INFO:     { color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
};

const RISK_STYLE: Record<ZapRisk, { color: string; bg: string }> = {
  High:          { color: '#dc2626', bg: 'rgba(239,68,68,0.08)'   },
  Medium:        { color: '#d97706', bg: 'rgba(245,158,11,0.08)'  },
  Low:           { color: '#00897b', bg: 'rgba(0,150,136,0.08)'   },
  Informational: { color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
};

const QG_STYLE: Record<QualityGate, { color: string; label: string }> = {
  OK:   { color: '#16a34a', label: 'Passed' },
  WARN: { color: '#d97706', label: 'Warning' },
  ERROR:{ color: '#dc2626', label: 'Failed'  },
  NONE: { color: '#6b7280', label: 'Not Configured' },
};

function extractErrorMessage(err: unknown): string {
  const axiosErr = err as AxiosError<{ detail?: string }>;
  return axiosErr.response?.data?.detail ?? (err instanceof Error ? err.message : 'Failed to load security results');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SecurityResultsPage: React.FC = () => {
  const [sast, setSast]         = useState<SastResponse | null>(null);
  const [dast, setDast]         = useState<DastResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const fetchResults = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [sastRes, dastRes] = await Promise.all([
        httpClient.get<SastResponse>('/security/sast'),
        httpClient.get<DastResponse>('/security/dast'),
      ]);
      setSast(sastRes.data);
      setDast(dastRes.data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchResults(); }, []);

  const qg = sast ? QG_STYLE[sast.quality_gate] : QG_STYLE.NONE;

  return (
    <Box className="dash-root">
      <Card className="dash-card">
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} className="dash-title">
                Security Scan Results
              </Typography>
              <Typography variant="body2" className="dash-subtitle">
                SAST (SonarQube) and DAST (OWASP ZAP) findings with remediation guidance.
              </Typography>
            </Box>
            <Button
              startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon />}
              onClick={() => void fetchResults()}
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

          {loading && !sast ? (
            <Box display="flex" justifyContent="center" mt={6}>
              <CircularProgress sx={{ color: '#63b3ed' }} />
            </Box>
          ) : (
            <Grid container spacing={3} mt={1}>
              {/* SAST Panel */}
              <Grid item xs={12} md={6}>
                <Box className="dash-metric-card" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Typography variant="subtitle1" fontWeight={600} color="#1a202c">
                      SAST — SonarQube
                    </Typography>
                    <Box display="flex" gap={1} alignItems="center">
                      <Chip
                        label={`Quality Gate: ${qg.label}`}
                        size="small"
                        sx={{ color: qg.color, background: `${qg.color}20`, fontWeight: 700, fontSize: 10 }}
                      />
                      {sast?.sonar_url && (
                        <Button
                          size="small"
                          href={sast.sonar_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          endIcon={<OpenInNewIcon fontSize="small" />}
                          sx={{ color: '#00897b', textTransform: 'none', fontSize: 11 }}
                        >
                          Open
                        </Button>
                      )}
                    </Box>
                  </Box>

                  {sast && sast.issues.length > 0 ? (
                    <Box sx={{ overflowX: 'auto' }}>
                      <Table size="small">
                        <TableHead className="dash-table-head">
                          <TableRow>
                            <TableCell>Severity</TableCell>
                            <TableCell>Message</TableCell>
                            <TableCell>Component</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody className="dash-table-body">
                          {sast.issues.slice(0, 10).map((issue) => {
                            const style = SEVERITY_STYLE[issue.severity];
                            return (
                              <TableRow key={issue.key} className="dash-table-row">
                                <TableCell>
                                  <Chip
                                    label={issue.severity}
                                    size="small"
                                    sx={{ color: style.color, background: style.bg, fontSize: 10 }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption" color="#1a202c">{issue.message}</Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption" color="#6b7280" noWrap>
                                    {issue.component}{issue.line ? `:${issue.line}` : ''}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      {sast.total_issues > 10 && (
                        <Typography variant="caption" color="#9ca3af" mt={1} display="block">
                          Showing 10 of {sast.total_issues} issues. Open SonarQube for full report.
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="#9ca3af" fontStyle="italic">
                      {sast?.quality_gate === 'NONE'
                        ? 'SonarQube not configured. Set SONAR_HOST_URL and SONAR_TOKEN.'
                        : 'No issues found.'}
                    </Typography>
                  )}
                </Box>
              </Grid>

              {/* DAST Panel */}
              <Grid item xs={12} md={6}>
                <Box className="dash-metric-card" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Typography variant="subtitle1" fontWeight={600} color="#1a202c">
                      DAST — OWASP ZAP
                    </Typography>
                    <Box display="flex" gap={1} alignItems="center">
                      {dast && dast.total_alerts > 0 && (
                        <>
                          <Chip label={`High: ${dast.high_risk}`}   size="small" sx={{ color: '#f87171', background: 'rgba(248,113,113,0.12)', fontSize: 10 }} />
                          <Chip label={`Med: ${dast.medium_risk}`}  size="small" sx={{ color: '#fbbf24', background: 'rgba(251,191,36,0.12)',  fontSize: 10 }} />
                        </>
                      )}
                      {dast?.zap_url && (
                        <Button
                          size="small"
                          href={dast.zap_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          endIcon={<OpenInNewIcon fontSize="small" />}
                          sx={{ color: '#00897b', textTransform: 'none', fontSize: 11 }}
                        >
                          Open
                        </Button>
                      )}
                    </Box>
                  </Box>

                  {dast && dast.alerts.length > 0 ? (
                    <Box sx={{ overflowX: 'auto' }}>
                      <Table size="small">
                        <TableHead className="dash-table-head">
                          <TableRow>
                            <TableCell>Risk</TableCell>
                            <TableCell>Alert</TableCell>
                            <TableCell>URL</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody className="dash-table-body">
                          {dast.alerts.slice(0, 10).map((alert, i) => {
                            const style = RISK_STYLE[alert.risk];
                            return (
                              <TableRow key={i} className="dash-table-row">
                                <TableCell>
                                  <Chip
                                    label={alert.risk}
                                    size="small"
                                    sx={{ color: style.color, background: style.bg, fontSize: 10 }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption" color="#1a202c">{alert.alert}</Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption" color="#6b7280" noWrap sx={{ maxWidth: 120, display: 'block' }}>
                                    {alert.url}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="#9ca3af" fontStyle="italic">
                      {!dast?.zap_url
                        ? 'OWASP ZAP not configured. Set ZAP_BASE_URL and ZAP_API_KEY.'
                        : 'No alerts found.'}
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
