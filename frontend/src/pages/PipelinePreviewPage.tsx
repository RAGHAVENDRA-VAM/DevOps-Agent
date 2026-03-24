import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { createPipeline, generatePipelinePreview } from '../services/pipelineService';

function extractErrorMessage(err: unknown): string {
  const axiosErr = err as AxiosError<{ detail?: string }>;
  return axiosErr.response?.data?.detail ?? (err instanceof Error ? err.message : 'An error occurred');
}

export const PipelinePreviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [yaml, setYaml]             = useState<string>('');
  const [enableSast, setEnableSast] = useState(true);
  const [enableDast, setEnableDast] = useState(true);
  const [loading, setLoading]       = useState(false);
  const [creating, setCreating]     = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState(false);

  const loadPreview = useCallback(async (): Promise<void> => {
    const selected = sessionStorage.getItem('selectedRepo');
    const tech     = sessionStorage.getItem('detectedTech');
    if (!selected || !tech) return;

    const { fullName, branch } = JSON.parse(selected) as { fullName: string; branch: string };
    setLoading(true);
    setError(null);
    try {
      const result = await generatePipelinePreview({
        repoFullName: fullName,
        branch,
        tech: JSON.parse(tech),
        enableSast,
        enableDast,
      });
      setYaml(result);
    } catch (err) {
      setError(extractErrorMessage(err));
      setYaml('');
    } finally {
      setLoading(false);
    }
  }, [enableSast, enableDast]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const handleCreate = async (): Promise<void> => {
    const selected = sessionStorage.getItem('selectedRepo');
    const tech     = sessionStorage.getItem('detectedTech');
    if (!selected || !tech) return;

    const { fullName, branch } = JSON.parse(selected) as { fullName: string; branch: string };
    setCreating(true);
    setError(null);
    try {
      await createPipeline({
        repoFullName: fullName,
        branch,
        tech: JSON.parse(tech),
        enableSast,
        enableDast,
      });
      setSuccess(true);
      setTimeout(() => navigate('/infrastructure-selection'), 1800);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Card sx={{ background: 'rgba(13,25,48,0.85)', border: '1px solid rgba(99,179,237,0.18)', borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} color="#e2e8f0" gutterBottom>
            Pipeline Preview
          </Typography>
          <Typography variant="body2" color="rgba(148,163,184,0.6)" gutterBottom>
            Review the generated CI/CD pipeline. Toggle security stages then click Approve &amp; Generate to commit.
          </Typography>

          <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} mb={2} flexWrap="wrap" gap={1}>
            <Box display="flex" gap={1} flexWrap="wrap">
              <FormControlLabel
                control={
                  <Switch
                    checked={enableSast}
                    onChange={(e) => setEnableSast(e.target.checked)}
                    sx={{ '& .MuiSwitch-thumb': { bgcolor: enableSast ? '#3b82f6' : undefined } }}
                  />
                }
                label={<Typography variant="body2" color="#94a3b8">SAST (SonarQube)</Typography>}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={enableDast}
                    onChange={(e) => setEnableDast(e.target.checked)}
                    sx={{ '& .MuiSwitch-thumb': { bgcolor: enableDast ? '#8b5cf6' : undefined } }}
                  />
                }
                label={<Typography variant="body2" color="#94a3b8">DAST (OWASP ZAP)</Typography>}
              />
            </Box>

            {success ? (
              <Box display="flex" alignItems="center" gap={1}>
                <CheckCircleIcon sx={{ color: '#34d399', fontSize: 20 }} />
                <Typography variant="body2" color="#34d399" fontWeight={600}>
                  Pipeline committed — redirecting…
                </Typography>
              </Box>
            ) : (
              <Button
                variant="contained"
                onClick={() => void handleCreate()}
                disabled={creating || loading || !yaml}
                startIcon={creating ? <CircularProgress size={14} color="inherit" /> : undefined}
                sx={{
                  background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
                  fontWeight: 700,
                  textTransform: 'none',
                  '&:disabled': { background: 'rgba(99,179,237,0.1)', color: 'rgba(148,163,184,0.3)' },
                }}
              >
                {creating ? 'Committing…' : 'Approve & Generate'}
              </Button>
            )}
          </Box>

          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
              <CircularProgress sx={{ color: '#63b3ed' }} />
            </Box>
          ) : (
            <Box
              component="pre"
              sx={{
                bgcolor: '#020817',
                color: '#e2e8f0',
                p: 2,
                borderRadius: 1,
                border: '1px solid rgba(99,179,237,0.12)',
                maxHeight: 520,
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: 13,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {yaml || '# Select a repository and tech stack to generate a preview.'}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
