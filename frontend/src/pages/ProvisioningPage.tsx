import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  LinearProgress,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CloudIcon from '@mui/icons-material/Cloud';
import CodeIcon from '@mui/icons-material/Code';
import BuildIcon from '@mui/icons-material/Build';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import TerminalIcon from '@mui/icons-material/Terminal';
import { useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { httpClient } from '../services/httpClient';
import { detectTechnologies, type TechStack } from '../services/techService';
import { createPipeline } from '../services/pipelineService';
import '../styles/ProvisioningPage.css';

type StepStatus = 'pending' | 'running' | 'done' | 'error';

interface PipelineStep {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  status: StepStatus;
  detail?: string;
}

interface InfraResult {
  infrastructure_type: string;
  resource_name: string;
  resource_group: string;
  region: string;
  status: string;
  [key: string]: unknown;
}

interface ToastState {
  open: boolean;
  message: string;
  color: string;
}

interface DeployConfig {
  resourceGroup: string;
  name: string;
  type: string;
  region: string;
}

const INITIAL_STEPS: PipelineStep[] = [
  { id: 'rg',      label: 'Creating Resource Group',     sublabel: 'Setting up Azure resource group',          icon: <CloudIcon />,         status: 'pending' },
  { id: 'infra',   label: 'Provisioning Infrastructure', sublabel: 'Creating Azure resources via Terraform',   icon: <CloudIcon />,         status: 'pending' },
  { id: 'tech',    label: 'Detecting Tech Stack',        sublabel: 'Scanning repository files',                icon: <CodeIcon />,          status: 'pending' },
  { id: 'cicd',    label: 'Generating CI/CD Pipeline',   sublabel: 'Creating combined build + deploy YAML',    icon: <BuildIcon />,         status: 'pending' },
  { id: 'commit',  label: 'Committing Workflow',         sublabel: 'Pushing pipeline to repository',           icon: <TerminalIcon />,      status: 'pending' },
  { id: 'trigger', label: 'Triggering Build',            sublabel: 'Starting GitHub Actions pipeline',         icon: <RocketLaunchIcon />,  status: 'pending' },
];

function extractErrorMessage(err: unknown): string {
  const axiosErr = err as AxiosError<{ detail?: string }>;
  return axiosErr.response?.data?.detail ?? (err instanceof Error ? err.message : 'An error occurred');
}

export const ProvisioningPage: React.FC = () => {
  const navigate = useNavigate();
  const hasRun      = useRef(false);
  const logsEndRef  = useRef<HTMLDivElement>(null);

  const [steps, setSteps]           = useState<PipelineStep[]>(INITIAL_STEPS);
  const [toast, setToast]           = useState<ToastState>({ open: false, message: '', color: '#10b981' });
  const [infraResult, setInfraResult] = useState<InfraResult | null>(null);
  const [techResult, setTechResult]   = useState<TechStack | null>(null);
  const [logs, setLogs]             = useState<string[]>([]);

  const addLog = (msg: string): void =>
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const setStepStatus = (id: string, status: StepStatus, detail?: string): void =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status, detail } : s)));

  const showToast = (message: string, color = '#10b981'): void =>
    setToast({ open: true, message, color });

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const repoRaw   = sessionStorage.getItem('selectedRepo');
    const configRaw = sessionStorage.getItem('deployConfig');
    if (!repoRaw || !configRaw) { navigate('/repos'); return; }

    const { fullName, branch } = JSON.parse(repoRaw) as { fullName: string; branch: string };
    const config = JSON.parse(configRaw) as DeployConfig;

    const run = async (): Promise<void> => {
      try {
        // Step 1: Resource Group
        setStepStatus('rg', 'running');
        addLog(`Creating resource group: ${config.resourceGroup} in ${config.region}…`);
        await new Promise((r) => setTimeout(r, 1200));
        setStepStatus('rg', 'done', config.resourceGroup);
        addLog(`✓ Resource group '${config.resourceGroup}' ready`);
        showToast(`Resource group '${config.resourceGroup}' created`);

        // Step 2: Provision Infrastructure
        setStepStatus('infra', 'running');
        addLog(`Provisioning ${config.type} — ${config.name}…`);
        if (config.type === 'aks') addLog('AKS cluster creation takes 5-10 minutes, please wait…');
        if (config.type === 'vm')  addLog('VM creation takes 2-5 minutes, please wait…');

        const infraRes = await httpClient.post<InfraResult>(
          '/infrastructure/provision',
          { repoFullName: fullName, branch, infrastructure: config },
          { timeout: 900_000 },
        );
        const infra = infraRes.data;
        setInfraResult(infra);
        setStepStatus('infra', 'done', `${config.name} created`);
        addLog(`✓ Infrastructure provisioned: ${config.name}`);
        showToast(`'${config.name}' created successfully!`);

        await new Promise((r) => setTimeout(r, 600));

        // Step 3: Detect Tech
        setStepStatus('tech', 'running');
        addLog(`Scanning repository ${fullName}…`);
        const tech = await detectTechnologies(fullName, branch);
        setTechResult(tech);
        setStepStatus('tech', 'done', `${tech.language}${tech.framework ? ' / ' + tech.framework : ''}`);
        addLog(`✓ Detected: ${tech.language}${tech.buildTool ? ' + ' + tech.buildTool : ''}`);

        await new Promise((r) => setTimeout(r, 400));

        // Step 4: Generate CI/CD YAML
        setStepStatus('cicd', 'running');
        addLog(`Generating combined CI/CD pipeline for ${tech.language}…`);
        await new Promise((r) => setTimeout(r, 700));
        setStepStatus('cicd', 'done', 'ci-cd.yml generated');
        addLog('✓ Pipeline YAML generated with build + deploy stages');

        // Step 5: Commit
        setStepStatus('commit', 'running');
        addLog(`Committing .github/workflows/ci.yml to ${branch}…`);
        await createPipeline({
          repoFullName: fullName,
          branch,
          tech,
          enableSast: true,
          enableDast: true,
          deploy: infra as Record<string, unknown>,
        });
        setStepStatus('commit', 'done', '.github/workflows/ci.yml');
        addLog(`✓ CI+CD workflow committed — build + deploy to ${infra.infrastructure_type}`);
        addLog('✓ AZURE_CREDENTIALS secret auto-configured in GitHub repo');
        showToast('CI/CD pipeline committed + secrets configured!');

        await new Promise((r) => setTimeout(r, 500));

        // Step 6: Trigger Build
        setStepStatus('trigger', 'running');
        addLog(`Triggering GitHub Actions pipeline on branch ${branch}…`);
        await new Promise((r) => setTimeout(r, 800));
        setStepStatus('trigger', 'done', 'Pipeline running');
        addLog('✓ Build triggered — pipeline is now running in GitHub Actions');

        sessionStorage.setItem('detectedTech', JSON.stringify(tech));
        sessionStorage.setItem('infrastructure', JSON.stringify(infra));

        showToast('🚀 All done! Deployment started — stay on this page to view details.', '#3b82f6');
        // Previously this redirected to /deployments. We keep the user here so the
        // deployment URL and logs are visible inline and clickable.
      } catch (err) {
        const msg = extractErrorMessage(err);
        addLog(`✗ Error: ${msg}`);
        setSteps((prev) => {
          const running = prev.find((s) => s.status === 'running');
          return prev.map((s) => (s.id === running?.id ? { ...s, status: 'error', detail: msg } : s));
        });
        showToast(`Error: ${msg}`, '#ef4444');
      }
    };

    run();
  }, [navigate]);

  const doneCount  = steps.filter((s) => s.status === 'done').length;
  const progress   = (doneCount / steps.length) * 100;
  const isComplete = doneCount === steps.length;

  const config = sessionStorage.getItem('deployConfig')
    ? (JSON.parse(sessionStorage.getItem('deployConfig')!) as DeployConfig)
    : null;

  return (
    <Box className="prov-root">
      <Box maxWidth={860} mx="auto">
        <Box mb={4}>
          <Typography variant="h4" className="prov-title">
            {isComplete ? '🚀 Deployment Complete!' : steps.some((s) => s.status === 'error') ? '⚠️ Deployment Error' : 'Provisioning & Deploying…'}
          </Typography>
          {config && (
            <Typography variant="body2" className="prov-subtitle">
              {config.name} · {config.type} · {config.region}
            </Typography>
          )}
        </Box>

        <Box mb={3}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="caption" color="rgba(148,163,184,0.6)">Overall Progress</Typography>
            <Typography variant="caption" color="#63b3ed">{doneCount}/{steps.length} steps</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            className={`prov-progress${isComplete ? ' complete' : ''}`}
          />
        </Box>

        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
          {/* Steps Panel */}
          <Box className="prov-panel">
            <Typography className="prov-panel-label">Pipeline Steps</Typography>
            <Stack spacing={0}>
              {steps.map((step, i) => (
                <Box
                  key={step.id}
                  display="flex"
                  alignItems="flex-start"
                  gap={2}
                  py={1.5}
                  sx={{ borderBottom: i < steps.length - 1 ? '1px solid rgba(99,179,237,0.06)' : 'none' }}
                >
                  <Box className={`prov-step-icon ${step.status}`}>
                    {step.status === 'running' && <CircularProgress size={14} sx={{ color: '#63b3ed' }} />}
                    {step.status === 'done'    && <CheckCircleIcon sx={{ fontSize: 16, color: '#10b981' }} />}
                    {step.status === 'error'   && <ErrorIcon sx={{ fontSize: 16, color: '#ef4444' }} />}
                    {step.status === 'pending' && React.cloneElement(step.icon as React.ReactElement, { sx: { fontSize: 16, color: 'rgba(148,163,184,0.3)' } })}
                  </Box>
                  <Box flex={1} minWidth={0}>
                    <Typography
                      variant="body2"
                      fontWeight={step.status === 'running' ? 700 : 400}
                      color={step.status === 'pending' ? 'rgba(148,163,184,0.4)' : step.status === 'error' ? '#f87171' : '#e2e8f0'}
                    >
                      {step.label}
                    </Typography>
                    <Typography variant="caption" color="rgba(148,163,184,0.45)" noWrap>
                      {step.detail ?? step.sublabel}
                    </Typography>
                  </Box>
                  {step.status === 'running' && (
                    <Typography variant="caption" color="#63b3ed" flexShrink={0}>Running…</Typography>
                  )}
                  {step.status === 'done' && (
                    <Typography variant="caption" color="#10b981" flexShrink={0}>✓</Typography>
                  )}
                </Box>
              ))}
            </Stack>
          </Box>

          {/* Right panel */}
          <Stack spacing={2}>
            {techResult && (
              <Box className="prov-panel">
                <Typography className="prov-panel-label">Detected Stack</Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  <Chip label={techResult.language}  size="small" className="prov-chip-language"  />
                  {techResult.framework  && <Chip label={techResult.framework}  size="small" className="prov-chip-framework" />}
                  {techResult.buildTool  && <Chip label={techResult.buildTool}  size="small" className="prov-chip-build"     />}
                  {techResult.hasDockerfile && <Chip label="Docker" size="small" className="prov-chip-docker" />}
                </Stack>
              </Box>
            )}

            {infraResult && (
              <Box className="prov-infra-panel">
                <Typography className="prov-panel-label">Infrastructure Created</Typography>
                <Stack spacing={0.8}>
                  {(
                    [
                      ['Type',   infraResult.infrastructure_type],
                      ['Name',   infraResult.resource_name],
                      ['Region', infraResult.region],
                      ['Status', infraResult.status],
                    ] as [string, string][]
                  ).map(([k, v]) => (
                    <Box key={k} display="flex" justifyContent="space-between">
                      <Typography variant="caption" color="rgba(148,163,184,0.5)">{k}</Typography>
                      <Typography variant="caption" color="#e2e8f0" fontWeight={600}>{v}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            <Box className="prov-logs-panel">
              <Typography className="prov-panel-label">Live Logs</Typography>
              <Box className="prov-logs-scroll">
                {logs.map((log, i) => (
                  <Typography
                    key={i}
                    variant="caption"
                    display="block"
                    color={log.includes('✓') ? '#34d399' : log.includes('✗') ? '#f87171' : 'rgba(148,163,184,0.7)'}
                    fontSize={11}
                    lineHeight={1.8}
                  >
                    {log}
                  </Typography>
                ))}
                <div ref={logsEndRef} />
              </Box>
            </Box>
          </Stack>
        </Box>
      </Box>

      <Snackbar
        open={toast.open}
        autoHideDuration={2500}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          background: `linear-gradient(135deg, ${toast.color}22, ${toast.color}11)`,
          border: `1px solid ${toast.color}55`,
          borderRadius: 2, px: 3, py: 1.5,
          boxShadow: `0 0 30px ${toast.color}33`,
        }}>
          <CheckCircleIcon sx={{ color: toast.color, fontSize: 20 }} />
          <Typography fontWeight={700} color="#ecfdf5" fontSize={14}>{toast.message}</Typography>
        </Box>
      </Snackbar>
    </Box>
  );
};
