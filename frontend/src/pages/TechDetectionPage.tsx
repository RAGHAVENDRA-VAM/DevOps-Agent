import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Typography, Chip, Stack, CircularProgress, Alert,
  Snackbar
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CodeIcon from '@mui/icons-material/Code';
import BuildIcon from '@mui/icons-material/Build';
import LayersIcon from '@mui/icons-material/Layers';
import { useNavigate } from 'react-router-dom';
import { detectTechnologies } from '../services/techService';
import { createPipeline } from '../services/pipelineService';

interface TechDetection {
  language: string;
  framework?: string;
  buildTool?: string;
  hasDockerfile: boolean;
  hasHelm: boolean;
  hasTerraform: boolean;
}

type Step = { label: string; status: 'pending' | 'running' | 'done' | 'error' };

export const TechDetectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [tech, setTech] = useState<TechDetection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  const hasRun = useRef(false);
  const [steps, setSteps] = useState<Step[]>([
    { label: 'Scanning repository files', status: 'pending' },
    { label: 'Detecting tech stack', status: 'pending' },
    { label: 'Generating CI/CD pipeline YAML', status: 'pending' },
    { label: 'Committing workflow to repository', status: 'pending' },
  ]);

  const updateStep = (index: number, status: Step['status']) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, status } : s));
  };

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const selected = sessionStorage.getItem('selectedRepo');
    if (!selected) { navigate('/repos'); return; }
    const { fullName, branch } = JSON.parse(selected);

    const run = async () => {
      try {
        updateStep(0, 'running');
        await new Promise(r => setTimeout(r, 600));
        updateStep(0, 'done');

        updateStep(1, 'running');
        const detectedTech = await detectTechnologies(fullName, branch);
        setTech(detectedTech);
        updateStep(1, 'done');

        updateStep(2, 'running');
        await new Promise(r => setTimeout(r, 500));
        updateStep(2, 'done');

        updateStep(3, 'running');
        await createPipeline({ repoFullName: fullName, branch, tech: detectedTech, enableSast: true, enableDast: true });
        updateStep(3, 'done');

        sessionStorage.setItem('detectedTech', JSON.stringify(detectedTech));
        setToast(true);
        setTimeout(() => navigate('/infrastructure-selection'), 2500);
      } catch (err: any) {
        const msg = err.response?.data?.detail || err.message || 'An error occurred';
        setError(msg);
        const runningIdx = steps.findIndex(s => s.status === 'running');
        if (runningIdx >= 0) updateStep(runningIdx, 'error');
        const detected = sessionStorage.getItem('detectedTech');
        setTimeout(() => navigate('/infrastructure-selection'), 3000);
      }
    };
    run();
  }, [navigate]);

  const stepColor = (status: Step['status']) => {
    if (status === 'done') return '#10b981';
    if (status === 'running') return '#63b3ed';
    if (status === 'error') return '#ef4444';
    return 'rgba(148,163,184,0.3)';
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1b2a 100%)', p: 4 }}>
      <Box maxWidth={640} mx="auto">
        <Typography variant="h4" fontWeight={700} color="#e2e8f0" gutterBottom>
          Pipeline Setup
        </Typography>
        <Typography variant="body2" color="rgba(148,163,184,0.7)" mb={4}>
          Detecting your tech stack and creating the CI/CD pipeline automatically
        </Typography>

        {/* Steps */}
        <Box sx={{
          background: 'rgba(13,25,48,0.8)', border: '1px solid rgba(99,179,237,0.15)',
          borderRadius: 3, p: 3, mb: 3, backdropFilter: 'blur(10px)',
        }}>
          {steps.map((step, i) => (
            <Box key={i} display="flex" alignItems="center" gap={2} py={1.5}
              sx={{ borderBottom: i < steps.length - 1 ? '1px solid rgba(99,179,237,0.07)' : 'none' }}>
              <Box sx={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                border: `2px solid ${stepColor(step.status)}`,
                background: step.status === 'done' ? 'rgba(16,185,129,0.1)' : 'transparent',
                transition: 'all 0.3s ease',
              }}>
                {step.status === 'running' && <CircularProgress size={14} sx={{ color: '#63b3ed' }} />}
                {step.status === 'done' && <CheckCircleIcon sx={{ fontSize: 16, color: '#10b981' }} />}
                {step.status === 'pending' && (
                  <Typography variant="caption" color="rgba(148,163,184,0.4)" fontWeight={700}>{i + 1}</Typography>
                )}
                {step.status === 'error' && <Typography variant="caption" color="#ef4444" fontWeight={700}>!</Typography>}
              </Box>
              <Typography
                variant="body2"
                color={step.status === 'pending' ? 'rgba(148,163,184,0.4)' : step.status === 'error' ? '#f87171' : '#e2e8f0'}
                fontWeight={step.status === 'running' ? 600 : 400}
              >
                {step.label}
              </Typography>
              {step.status === 'running' && (
                <Typography variant="caption" color="#63b3ed" ml="auto">In progress...</Typography>
              )}
              {step.status === 'done' && (
                <Typography variant="caption" color="#10b981" ml="auto">Done</Typography>
              )}
            </Box>
          ))}
        </Box>

        {/* Tech Stack Card */}
        {tech && (
          <Box sx={{
            background: 'rgba(13,25,48,0.8)', border: '1px solid rgba(99,179,237,0.15)',
            borderRadius: 3, p: 3, backdropFilter: 'blur(10px)',
          }}>
            <Typography variant="body2" color="rgba(148,163,184,0.7)" mb={2} fontWeight={600} letterSpacing={1} sx={{ textTransform: 'uppercase', fontSize: 11 }}>
              Detected Stack
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              <Chip icon={<CodeIcon sx={{ fontSize: 14 }} />} label={tech.language}
                sx={{ bgcolor: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)' }} />
              {tech.framework && (
                <Chip icon={<LayersIcon sx={{ fontSize: 14 }} />} label={tech.framework}
                  sx={{ bgcolor: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' }} />
              )}
              {tech.buildTool && (
                <Chip icon={<BuildIcon sx={{ fontSize: 14 }} />} label={tech.buildTool}
                  sx={{ bgcolor: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)' }} />
              )}
              {tech.hasDockerfile && (
                <Chip label="Docker" sx={{ bgcolor: 'rgba(14,165,233,0.15)', color: '#7dd3fc', border: '1px solid rgba(14,165,233,0.3)' }} />
              )}
              {tech.hasHelm && (
                <Chip label="Helm" sx={{ bgcolor: 'rgba(245,158,11,0.15)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.3)' }} />
              )}
              {tech.hasTerraform && (
                <Chip label="Terraform" sx={{ bgcolor: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' }} />
              )}
            </Stack>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2, bgcolor: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
            {error} — Continuing to deployment selection...
          </Alert>
        )}
      </Box>

      {/* Toast Notification */}
      <Snackbar
        open={toast}
        autoHideDuration={2500}
        onClose={() => setToast(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          background: 'linear-gradient(135deg, #065f46, #064e3b)',
          border: '1px solid rgba(16,185,129,0.4)',
          borderRadius: 2, px: 3, py: 1.5,
          boxShadow: '0 0 30px rgba(16,185,129,0.2)',
        }}>
          <CheckCircleIcon sx={{ color: '#10b981', fontSize: 22 }} />
          <Box>
            <Typography fontWeight={700} color="#ecfdf5" fontSize={14}>
              Pipeline Created Successfully!
            </Typography>
            <Typography variant="caption" color="rgba(167,243,208,0.8)">
              CI/CD workflow committed to your repository
            </Typography>
          </Box>
        </Box>
      </Snackbar>
    </Box>
  );
};
