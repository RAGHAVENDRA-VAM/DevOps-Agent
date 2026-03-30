import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Chip, CircularProgress, LinearProgress,
  Snackbar, Stack, Typography,
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
  id: string; label: string; sublabel: string;
  icon: React.ReactNode; status: StepStatus; detail?: string;
}

interface InfraResult {
  infrastructure_type: string; resource_name: string;
  resource_group: string; region: string; status: string;
  [key: string]: unknown;
}

interface ToastState { open: boolean; message: string; color: string; }
interface DeployConfig { resourceGroup: string; name: string; type: string; region: string; }

const INITIAL_STEPS: PipelineStep[] = [
  { id: 'rg',      label: 'Creating Resource Group',     sublabel: 'Setting up Azure resource group',        icon: <CloudIcon />,        status: 'pending' },
  { id: 'infra',   label: 'Provisioning Infrastructure', sublabel: 'Creating Azure resources via Terraform', icon: <CloudIcon />,        status: 'pending' },
  { id: 'tech',    label: 'Detecting Tech Stack',        sublabel: 'Scanning repository files',              icon: <CodeIcon />,         status: 'pending' },
  { id: 'cicd',    label: 'Generating CI/CD Pipeline',   sublabel: 'Creating build + deploy YAML',           icon: <BuildIcon />,        status: 'pending' },
  { id: 'commit',  label: 'Committing Workflow',         sublabel: 'Pushing pipeline to repository',         icon: <TerminalIcon />,     status: 'pending' },
  { id: 'trigger', label: 'Triggering Build',            sublabel: 'Starting GitHub Actions pipeline',       icon: <RocketLaunchIcon />, status: 'pending' },
];

function extractErrorMessage(err: unknown): string {
  const axiosErr = err as AxiosError<{ detail?: string }>;
  return axiosErr.response?.data?.detail ?? (err instanceof Error ? err.message : 'An error occurred');
}

export const ProvisioningPage: React.FC = () => {
  const navigate    = useNavigate();
  const hasRun      = useRef(false);
  const logsEndRef  = useRef<HTMLDivElement>(null);

  const [steps, setSteps]             = useState<PipelineStep[]>(INITIAL_STEPS);
  const [toast, setToast]             = useState<ToastState>({ open: false, message: '', color: '#10b981' });
  const [infraResult, setInfraResult] = useState<InfraResult | null>(null);
  const [techResult, setTechResult]   = useState<TechStack | null>(null);
  const [logs, setLogs]               = useState<string[]>([]);

  const addLog        = (msg: string) => setLogs((p) => [...p, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  const setStepStatus = (id: string, status: StepStatus, detail?: string) =>
    setSteps((p) => p.map((s) => s.id === id ? { ...s, status, detail } : s));
  const showToast = (message: string, color = '#10b981') => setToast({ open: true, message, color });

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

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
        setStepStatus('rg', 'running');
        addLog(`Creating resource group: ${config.resourceGroup} in ${config.region}…`);
        await new Promise((r) => setTimeout(r, 1200));
        setStepStatus('rg', 'done', config.resourceGroup);
        addLog(`✓ Resource group '${config.resourceGroup}' ready`);
        showToast(`Resource group '${config.resourceGroup}' created`);

        setStepStatus('infra', 'running');
        addLog(`Provisioning ${config.type} — ${config.name}…`);
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
        setStepStatus('tech', 'running');
        addLog(`Scanning repository ${fullName}…`);
        const tech = await detectTechnologies(fullName, branch);
        setTechResult(tech);
        setStepStatus('tech', 'done', `${tech.language}${tech.framework ? ' / ' + tech.framework : ''}`);
        addLog(`✓ Detected: ${tech.language}${tech.buildTool ? ' + ' + tech.buildTool : ''}`);

        await new Promise((r) => setTimeout(r, 400));
        setStepStatus('cicd', 'running');
        addLog(`Generating CI/CD pipeline for ${tech.language}…`);
        await new Promise((r) => setTimeout(r, 700));
        setStepStatus('cicd', 'done', 'ci-cd.yml generated');
        addLog('✓ Pipeline YAML generated');

        setStepStatus('commit', 'running');
        addLog(`Committing .github/workflows/ci.yml to ${branch}…`);
        await createPipeline({ repoFullName: fullName, branch, tech, enableSast: true, enableDast: true, deploy: infra as Record<string, unknown> });
        setStepStatus('commit', 'done', '.github/workflows/ci.yml');
        addLog(`✓ Workflow committed — deploy to ${infra.infrastructure_type}`);
        showToast('CI/CD pipeline committed!');

        await new Promise((r) => setTimeout(r, 500));
        setStepStatus('trigger', 'running');
        addLog(`Triggering GitHub Actions on branch ${branch}…`);
        await new Promise((r) => setTimeout(r, 800));
        setStepStatus('trigger', 'done', 'Pipeline running');
        addLog('✓ Build triggered in GitHub Actions');
        sessionStorage.setItem('detectedTech', JSON.stringify(tech));
        sessionStorage.setItem('infrastructure', JSON.stringify(infra));
        showToast('🚀 All done! Deployment started.', '#009688');
      } catch (err) {
        const msg = extractErrorMessage(err);
        addLog(`✗ Error: ${msg}`);
        setSteps((prev) => {
          const running = prev.find((s) => s.status === 'running');
          return prev.map((s) => s.id === running?.id ? { ...s, status: 'error', detail: msg } : s);
        });
        showToast(`Error: ${msg}`, '#ef4444');
      }
    };
    run();
  }, [navigate]);

  const doneCount  = steps.filter((s) => s.status === 'done').length;
  const progress   = (doneCount / steps.length) * 100;
  const isComplete = doneCount === steps.length;
  const config     = sessionStorage.getItem('deployConfig')
    ? (JSON.parse(sessionStorage.getItem('deployConfig')!) as DeployConfig) : null;

  return (
    <Box className="prov-root">
      <Box maxWidth={860} mx="auto" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <Box flexShrink={0} mb={0.5}>
          <Typography className="prov-title">
            {isComplete ? '🚀 Deployment Complete!' : steps.some((s) => s.status === 'error') ? '⚠️ Deployment Error' : 'Provisioning & Deploying…'}
          </Typography>
          {config && (
            <Typography className="prov-subtitle">{config.name} · {config.type} · {config.region}</Typography>
          )}
        </Box>

        {/* Progress */}
        <Box flexShrink={0} mb={1}>
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="caption" fontSize={10} color="#6b7280">Overall Progress</Typography>
            <Typography variant="caption" fontSize={10} color="#009688">{doneCount}/{steps.length} steps</Typography>
          </Box>
          <LinearProgress variant="determinate" value={progress}
            className={`prov-progress${isComplete ? ' complete' : ''}`} />
        </Box>

        {/* Main grid */}
        <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5, minHeight: 0 }}>

          {/* Steps panel */}
          <Box className="prov-panel" sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Typography className="prov-panel-label">Pipeline Steps</Typography>
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              {steps.map((step) => (
                <Box key={step.id} className="prov-step-row">
                  <Box className={`prov-step-icon ${step.status}`}>
                    {step.status === 'running' && <CircularProgress size={11} sx={{ color: '#009688' }} />}
                    {step.status === 'done'    && <CheckCircleIcon sx={{ fontSize: 13, color: '#16a34a' }} />}
                    {step.status === 'error'   && <ErrorIcon sx={{ fontSize: 13, color: '#dc2626' }} />}
                    {step.status === 'pending' && React.cloneElement(step.icon as React.ReactElement, { sx: { fontSize: 11, color: '#9ca3af' } })}
                  </Box>
                  <Box flex={1} minWidth={0}>
                    <Typography fontSize={12} fontWeight={step.status === 'running' ? 700 : 400}
                      color={step.status === 'pending' ? '#9ca3af' : step.status === 'error' ? '#dc2626' : '#000000'}>
                      {step.label}
                    </Typography>
                    <Typography variant="caption" fontSize={10} color="#6b7280" noWrap display="block">
                      {step.detail ?? step.sublabel}
                    </Typography>
                  </Box>
                  {step.status === 'running' && <Typography variant="caption" fontSize={10} color="#009688" flexShrink={0}>Running…</Typography>}
                  {step.status === 'done'    && <Typography variant="caption" fontSize={10} color="#16a34a" flexShrink={0}>✓</Typography>}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Right column */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minHeight: 0 }}>
            {techResult && (
              <Box className="prov-panel" flexShrink={0}>
                <Typography className="prov-panel-label">Detected Stack</Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                  <Chip label={techResult.language} size="small" className="prov-chip-language" />
                  {techResult.framework  && <Chip label={techResult.framework}  size="small" className="prov-chip-framework" />}
                  {techResult.buildTool  && <Chip label={techResult.buildTool}  size="small" className="prov-chip-build" />}
                  {techResult.hasDockerfile && <Chip label="Docker" size="small" className="prov-chip-docker" />}
                </Stack>
              </Box>
            )}

            {infraResult && (
              <Box className="prov-infra-panel" flexShrink={0}>
                <Typography className="prov-panel-label">Infrastructure Created</Typography>
                {(['Type', 'Name', 'Region', 'Status'] as const).map((k, i) => {
                  const vals = [infraResult.infrastructure_type, infraResult.resource_name, infraResult.region, infraResult.status];
                  return (
                    <Box key={k} display="flex" justifyContent="space-between" py={0.25}>
                      <Typography variant="caption" fontSize={11} color="#6b7280">{k}</Typography>
                      <Typography variant="caption" fontSize={11} color="#000000" fontWeight={600}>{vals[i]}</Typography>
                    </Box>
                  );
                })}
              </Box>
            )}

            <Box className="prov-logs-panel">
              <Typography className="prov-panel-label">Live Logs</Typography>
              <Box className="prov-logs-scroll">
                {logs.map((log, i) => (
                  <Typography key={i} variant="caption" display="block" fontSize={11} lineHeight={1.7}
                    color={log.includes('✓') ? '#86efac' : log.includes('✗') ? '#fca5a5' : '#e2e8f0'}>
                    {log}
                  </Typography>
                ))}
                <div ref={logsEndRef} />
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      <Snackbar open={toast.open} autoHideDuration={2500}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          background: '#ffffff', border: `1px solid ${toast.color}`,
          borderRadius: 2, px: 2, py: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <CheckCircleIcon sx={{ color: toast.color, fontSize: 16 }} />
          <Typography fontWeight={600} color="#000000" fontSize={13}>{toast.message}</Typography>
        </Box>
      </Snackbar>
    </Box>
  );
};
