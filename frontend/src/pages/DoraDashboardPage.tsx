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
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { AxiosError } from 'axios';
import { httpClient } from '../services/httpClient';
import '../styles/DashboardPages.css';

type Band = 'elite' | 'high' | 'medium' | 'low';

interface DoraMetrics {
  deployment_frequency: Array<{ date: string; count: number }>;
  lead_time: Array<{ date: string; hours: number }>;
  change_failure_rate: Array<{ date: string; rate: number }>;
  mttr: Array<{ date: string; hours: number }>;
  deployment_frequency_band: Band;
  lead_time_band: Band;
  change_failure_rate_band: Band;
  mttr_band: Band;
}

const BAND_COLOR: Record<Band, { color: string; bg: string }> = {
  elite:  { color: '#16a34a', bg: 'rgba(34,197,94,0.1)'   },
  high:   { color: '#00897b', bg: 'rgba(0,150,136,0.1)'   },
  medium: { color: '#d97706', bg: 'rgba(245,158,11,0.1)'  },
  low:    { color: '#dc2626', bg: 'rgba(239,68,68,0.08)'  },
};

interface MetricCardProps {
  title: string;
  band: Band;
  description: string;
  dataPoints: number;
  unit: string;
  latestValue: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, band, description, dataPoints, unit, latestValue }) => {
  const { color, bg } = BAND_COLOR[band];
  return (
    <Box className="dash-metric-card" sx={{ p: 2.5, borderRadius: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
        <Typography variant="subtitle1" fontWeight={600} color="#1a202c">
          {title}
        </Typography>
        <Chip
          label={band.toUpperCase()}
          size="small"
          sx={{ color, background: bg, fontWeight: 700, border: `1px solid ${color}40`, fontSize: 10 }}
        />
      </Box>
      {dataPoints > 0 ? (
        <Typography variant="h5" fontWeight={700} color={color} mb={0.5}>
          {latestValue} <Typography component="span" variant="caption" color="#6b7280">{unit}</Typography>
        </Typography>
      ) : (
        <Typography variant="body2" color="#9ca3af" mb={0.5} fontStyle="italic">
          No data yet
        </Typography>
      )}
      <Typography variant="body2" color="#6b7280" fontSize={12}>
        {description}
      </Typography>
    </Box>
  );
};

function extractErrorMessage(err: unknown): string {
  const axiosErr = err as AxiosError<{ detail?: string }>;
  return axiosErr.response?.data?.detail ?? (err instanceof Error ? err.message : 'Failed to load DORA metrics');
}

export const DoraDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DoraMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchMetrics = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await httpClient.get<DoraMetrics>('/metrics/dora');
      setMetrics(res.data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchMetrics(); }, []);

  const latestDeployFreq = metrics?.deployment_frequency.at(-1)?.count ?? 0;
  const latestLeadTime   = metrics?.lead_time.at(-1)?.hours ?? 0;
  const latestCfr        = metrics?.change_failure_rate.at(-1)?.rate ?? 0;
  const latestMttr       = metrics?.mttr.at(-1)?.hours ?? 0;

  return (
    <Box className="dash-root">
      <Card className="dash-card">
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} className="dash-title">
                DORA Metrics
              </Typography>
              <Typography variant="body2" className="dash-subtitle">
                Deployment frequency, lead time, change failure rate, and MTTR across all repositories.
              </Typography>
            </Box>
            <Button
              startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon />}
              onClick={() => void fetchMetrics()}
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

          {loading && !metrics ? (
            <Box display="flex" justifyContent="center" mt={6}>
              <CircularProgress sx={{ color: '#009688' }} />
            </Box>
          ) : (
            <Grid container spacing={3} mt={1}>
              <Grid item xs={12} md={6}>
                <MetricCard
                  title="Deployment Frequency"
                  band={metrics?.deployment_frequency_band ?? 'low'}
                  description="How often code is deployed to production. Elite: multiple times per day."
                  dataPoints={metrics?.deployment_frequency.length ?? 0}
                  unit="deploys/day"
                  latestValue={String(latestDeployFreq)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <MetricCard
                  title="Lead Time for Changes"
                  band={metrics?.lead_time_band ?? 'low'}
                  description="Time from code commit to production. Elite: less than 1 hour."
                  dataPoints={metrics?.lead_time.length ?? 0}
                  unit="hours"
                  latestValue={latestLeadTime.toFixed(1)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <MetricCard
                  title="Change Failure Rate"
                  band={metrics?.change_failure_rate_band ?? 'low'}
                  description="Percentage of deployments causing failures. Elite: 0–5%."
                  dataPoints={metrics?.change_failure_rate.length ?? 0}
                  unit="%"
                  latestValue={(latestCfr * 100).toFixed(1)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <MetricCard
                  title="MTTR"
                  band={metrics?.mttr_band ?? 'low'}
                  description="Mean time to restore service after a failure. Elite: less than 1 hour."
                  dataPoints={metrics?.mttr.length ?? 0}
                  unit="hours"
                  latestValue={latestMttr.toFixed(1)}
                />
              </Grid>
            </Grid>
          )}

          {metrics && metrics.deployment_frequency.length === 0 && (
            <Alert severity="info" sx={{ mt: 3, bgcolor: 'rgba(0,150,136,0.06)', color: '#00695c', border: '1px solid rgba(0,150,136,0.2)' }}>
              No deployment data yet. Approve and run pipelines to start collecting DORA metrics.
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
