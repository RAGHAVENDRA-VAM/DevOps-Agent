import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CodeIcon from '@mui/icons-material/Code';
import BuildIcon from '@mui/icons-material/Build';
import LayersIcon from '@mui/icons-material/Layers';
import { useNavigate } from 'react-router-dom';
import { detectTechnologies, type TechStack } from '../services/techService';
import { createPipeline } from '../services/pipelineService';
import type { AxiosError } from 'axios';
import '../styles/TechDetectionPage.css';

type StepStatus = 'pending' | 'running' | 'done' | 'error';

interface PipelineStep {
  label: string;
  status: StepStatus;
}

const INITIAL_STEPS: PipelineStep[] = [
  { label: 'Scanning repository files',       status: 'pending' },
  { label: 'Detecting tech stack',             status: 'pending' },
  { label: 'Generating CI/CD pipeline YAML',  status: 'pending' },
  { label: 'Committing workflow to repository', status: 'pending' },
];

function extractErrorMessage(err: unknown): string {
  const axiosErr = err as AxiosError<{ detail?: string }>;
  return axiosErr.response?.data?.detail ?? (err instanceof Error ? err.message : 'An error occurred');
}

export const TechDetectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [tech, setTech]     = useState<TechStack | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [toast, setToast]   = useState(false);
  const [steps, setSteps]   = useState<PipelineStep[]>(INITIAL_STEPS);
  const hasRun              = useRef(false);

  const updateStep = (index: number, status: StepStatus): void => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, status } : s)));
  };

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const raw = sessionStorage.getItem('selectedRepo');
    if (!raw) { navigate('/repos'); return; }

    const { fullName, branch } = JSON.parse(raw) as { fullName: string; branch: string };

    const run = async (): Promise<void> => {
      try {
        updateStep(0, 'running');
        await new Promise((r) => setTimeout(r, 600));
        updateStep(0, 'done');

        updateStep(1, 'running');
        const detectedTech = await detectTechnologies(fullName, branch);
        setTech(detectedTech);
        updateStep(1, 'done');

        updateStep(2, 'running');
        await new Promise((r) => setTimeout(r, 500));
        updateStep(2, 'done');

        updateStep(3, 'running');
        await createPipeline({ repoFullName: fullName, branch, tech: detectedTech, enableSast: true, enableDast: true });
        updateStep(3, 'done');

        sessionStorage.setItem('detectedTech', JSON.stringify(detectedTech));
        setToast(true);
        setTimeout(() => navigate('/infrastructure-selection'), 2500);
      } catch (err) {
        const msg = extractErrorMessage(err);
        setError(msg);
        setSteps((prev) => {
          const idx = prev.findIndex((s) => s.status === 'running');
          return prev.map((s, i) => (i === idx ? { ...s, status: 'error' } : s));
        });
        setTimeout(() => navigate('/infrastructure-selection'), 3000);
      }
    };

    run();
  }, [navigate]);

  const stepIconClass = (status: StepStatus): string => `tech-step-icon ${status}`;

  return (
    <Box className="tech-root">
      <Box maxWidth={640} mx="auto">
        <Typography variant="h4" className="tech-title" gutterBottom>
          Pipeline Setup
        </Typography>
        <Typography variant="body2" className="tech-subtitle">
          Detecting your tech stack and creating the CI/CD pipeline automatically
        </Typography>

        <Box className="tech-steps-panel">
          {steps.map((step, i) => (
            <Box
              key={i}
              className="tech-step-row"
              sx={{ borderBottom: i < steps.length - 1 ? '1px solid #e5e7eb' : 'none' }}
            >
              <Box className={stepIconClass(step.status)}>
                {step.status === 'running' && <CircularProgress size={14} sx={{ color: '#009688' }} />}
                {step.status === 'done'    && <CheckCircleIcon sx={{ fontSize: 16, color: '#16a34a' }} />}
                {step.status === 'pending' && (
                  <Typography variant="caption" color="#9ca3af" fontWeight={700}>
                    {i + 1}
                  </Typography>
                )}
                {step.status === 'error' && (
                  <Typography variant="caption" color="#ef4444" fontWeight={700}>!</Typography>
                )}
              </Box>

              <Typography
                variant="body2"
                className={`tech-step-label ${step.status}`}
                fontWeight={step.status === 'running' ? 600 : 400}
                flex={1}
              >
                {step.label}
              </Typography>

              {step.status === 'running' && (
                <Typography variant="caption" className="tech-step-status-running">
                  In progress…
                </Typography>
              )}
              {step.status === 'done' && (
                <Typography variant="caption" className="tech-step-status-done">
                  Done
                </Typography>
              )}
            </Box>
          ))}
        </Box>

        {tech && (
          <Box className="tech-stack-panel">
            <Typography className="tech-stack-label">Detected Stack</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              <Chip icon={<CodeIcon sx={{ fontSize: 14 }} />} label={tech.language} className="tech-chip-language" />
              {tech.framework && (
                <Chip icon={<LayersIcon sx={{ fontSize: 14 }} />} label={tech.framework} className="tech-chip-framework" />
              )}
              {tech.buildTool && (
                <Chip icon={<BuildIcon sx={{ fontSize: 14 }} />} label={tech.buildTool} className="tech-chip-build" />
              )}
              {tech.hasDockerfile && <Chip label="Docker"    className="tech-chip-docker"    />}
              {tech.hasHelm       && <Chip label="Helm"      className="tech-chip-helm"      />}
              {tech.hasTerraform  && <Chip label="Terraform" className="tech-chip-terraform" />}
            </Stack>
          </Box>
        )}

        {error && (
          <Alert severity="error" className="tech-error-alert">
            {error} — Continuing to deployment selection…
          </Alert>
        )}
      </Box>

      <Snackbar
        open={toast}
        autoHideDuration={2500}
        onClose={() => setToast(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Box className="tech-toast-box">
          <CheckCircleIcon sx={{ color: '#10b981', fontSize: 22 }} />
          <Box>
            <Typography fontWeight={700} color="#000000" fontSize={14}>
              Pipeline Created Successfully!
            </Typography>
            <Typography variant="caption" color="#000000">
              CI/CD workflow committed to your repository
            </Typography>
          </Box>
        </Box>
      </Snackbar>
    </Box>
  );
};
