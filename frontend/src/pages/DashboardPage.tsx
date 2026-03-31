import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Chip, CircularProgress,
  Grid, IconButton, Link, Table, TableBody, TableCell,
  TableHead, TableRow, Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { httpClient } from '../services/httpClient';

interface PipelineRecord {
  id: string;
  repo: string;
  branch: string;
  status: string;
  pipeline_stage: number;
  detected_tech?: { language?: string; framework?: string; buildTool?: string };
  config?: { APP_NAME?: string; DEPLOY_TARGET?: string; LOCATION?: string; RESOURCE_GROUP?: string; [key: string]: unknown };
  deployed_url?: string | null;
  committed_at?: string;
  created_at?: number;
  [key: string]: unknown;
}

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  pending:  { color: '#d97706', bg: 'rgba(245,158,11,0.1)'  },
  running:  { color: '#009688', bg: 'rgba(0,150,136,0.1)'   },
  done:     { color: '#16a34a', bg: 'rgba(34,197,94,0.1)'   },
  failed:   { color: '#dc2626', bg: 'rgba(239,68,68,0.08)'  },
  rejected: { color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
};

const STAGE_LABEL: Record<number, string> = {
  0: '—', 1: 'Tech Detection', 2: 'Terraform',
  3: 'CI/CD Pipeline', 4: 'GitHub Actions', 5: 'Complete',
};

function timeAgo(ts: string | number | undefined): string {
  if (!ts) return '—';
  const ms = typeof ts === 'number' ? ts * 1000 : new Date(ts).getTime();
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface StatCardProps { label: string; value: number; color: string; bg: string; }
const StatCard: React.FC<StatCardProps> = ({ label, value, color, bg }) => (
  <Card sx={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
    <CardContent sx={{ p: '10px 14px !important' }}>
      <Typography fontSize={28} fontWeight={700} color={color} lineHeight={1}>{value}</Typography>
      <Typography fontSize={11} color="#6b7280" mt={0.5}>{label}</Typography>
      <Box sx={{ height: 3, borderRadius: 2, background: bg, mt: 1 }} />
    </CardContent>
  </Card>
);

export const DashboardPage: React.FC = () => {
  const [records, setRecords] = useState<PipelineRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await httpClient.get<unknown>('/sql/all_details');
      const raw = res.data;
      const data: PipelineRecord[] = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as any)?.data)
          ? (raw as any).data
          : [];
      setRecords(data);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const counts = {
    total:   records.length,
    pending: records.filter((r) => r.status === 'pending').length,
    running: records.filter((r) => r.status === 'running').length,
    done:    records.filter((r) => r.status === 'done').length,
    failed:  records.filter((r) => r.status === 'failed').length,
  };

  return (
    <Box sx={{
      height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 50%, #eef2ff 100%)',
      p: '10px 20px',
    }}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1} flexShrink={0}>
        <Box>
          <Typography fontWeight={700} fontSize="0.95rem" color="#000000">Dashboard</Typography>
          <Typography fontSize="0.72rem" color="#6b7280">Pipeline overview across all repositories</Typography>
        </Box>
        <IconButton size="small" onClick={() => void load()} disabled={loading} sx={{ color: '#009688' }}>
          {loading
            ? <CircularProgress size={16} sx={{ color: '#009688' }} />
            : <RefreshIcon fontSize="small" />}
        </IconButton>
      </Box>

      {/* Stat cards */}
      <Grid container spacing={1.5} mb={1.5} flexShrink={0}>
        <Grid item xs={6} sm={2.4}><StatCard label="Total"      value={counts.total}   color="#000000" bg="#e5e7eb" /></Grid>
        <Grid item xs={6} sm={2.4}><StatCard label="Pending"    value={counts.pending} color="#d97706" bg="rgba(245,158,11,0.2)" /></Grid>
        <Grid item xs={6} sm={2.4}><StatCard label="Running"    value={counts.running} color="#009688" bg="rgba(0,150,136,0.2)" /></Grid>
        <Grid item xs={6} sm={2.4}><StatCard label="Successful" value={counts.done}    color="#16a34a" bg="rgba(34,197,94,0.2)" /></Grid>
        <Grid item xs={6} sm={2.4}><StatCard label="Failed"     value={counts.failed}  color="#dc2626" bg="rgba(239,68,68,0.15)" /></Grid>
      </Grid>

      {/* Table */}
      <Card sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <CardContent sx={{ p: '8px 12px !important', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Typography fontWeight={600} fontSize="0.8rem" color="#000000" mb={0.75}>Recent Pipelines</Typography>

          {loading && records.length === 0 ? (
            <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
              <CircularProgress size={24} sx={{ color: '#009688' }} />
            </Box>
          ) : (
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {['Repository', 'Branch', 'Tech', 'Stage', 'Status', 'App Name', 'Deploy Target', 'Deployed URL', 'When'].map((h) => (
                      <TableCell key={h} sx={{
                        fontSize: 10, fontWeight: 600, color: '#6b7280', background: '#f9fafb',
                        borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase',
                        letterSpacing: '0.5px', py: '4px', px: '8px',
                      }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} sx={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, py: 3 }}>
                        No pipeline data found
                      </TableCell>
                    </TableRow>
                  ) : records.map((r) => {
                    const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.pending;
                    return (
                      <TableRow key={r.id} sx={{ '&:hover td': { background: 'rgba(0,150,136,0.03)' } }}>
                        <TableCell sx={{ fontSize: 11, fontWeight: 600, color: '#000', py: '4px', px: '8px', borderBottom: '1px solid #f3f4f6' }}>{r.repo}</TableCell>
                        <TableCell sx={{ py: '4px', px: '8px', borderBottom: '1px solid #f3f4f6' }}>
                          <Chip label={r.branch} size="small" sx={{ fontSize: 9, height: 18, color: '#009688', bgcolor: 'rgba(0,150,136,0.08)', border: '1px solid rgba(0,150,136,0.2)' }} />
                        </TableCell>
                        <TableCell sx={{ fontSize: 11, color: '#374151', py: '4px', px: '8px', borderBottom: '1px solid #f3f4f6' }}>
                          {r.detected_tech?.language ? `${r.detected_tech.language}${r.detected_tech.framework ? ` / ${r.detected_tech.framework}` : ''}` : '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 11, color: '#374151', py: '4px', px: '8px', borderBottom: '1px solid #f3f4f6' }}>
                          {STAGE_LABEL[r.pipeline_stage] ?? '—'}
                        </TableCell>
                        <TableCell sx={{ py: '4px', px: '8px', borderBottom: '1px solid #f3f4f6' }}>
                          <Chip label={r.status} size="small" sx={{ fontSize: 9, height: 18, fontWeight: 700, color: st.color, bgcolor: st.bg, border: `1px solid ${st.color}40` }} />
                        </TableCell>
                        <TableCell sx={{ fontSize: 11, color: '#374151', py: '4px', px: '8px', borderBottom: '1px solid #f3f4f6' }}>{r.config?.APP_NAME ?? '—'}</TableCell>
                        <TableCell sx={{ fontSize: 11, color: '#374151', py: '4px', px: '8px', borderBottom: '1px solid #f3f4f6' }}>{r.config?.DEPLOY_TARGET ?? '—'}</TableCell>
                        <TableCell sx={{ fontSize: 11, py: '4px', px: '8px', borderBottom: '1px solid #f3f4f6' }}>
                          {r.deployed_url
                            ? <Link href={r.deployed_url} target="_blank" rel="noopener noreferrer" sx={{ color: '#009688', display: 'flex', alignItems: 'center', gap: 0.3, fontSize: 11 }}>Open <OpenInNewIcon sx={{ fontSize: 11 }} /></Link>
                            : '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 11, color: '#6b7280', py: '4px', px: '8px', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                          {timeAgo(r.committed_at ?? r.created_at)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
