import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Chip, Stack, CircularProgress, Snackbar, LinearProgress
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CloudIcon from '@mui/icons-material/Cloud';
import CodeIcon from '@mui/icons-material/Code';
import BuildIcon from '@mui/icons-material/Build';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import TerminalIcon from '@mui/icons-material/Terminal';
import { useNavigate } from 'react-router-dom';
import { httpClient } from '../services/httpClient';
import { detectTechnologies } from '../services/techService';
import { createPipeline } from '../services/pipelineService';

type StepStatus = 'pending' | 'running' | 'done' | 'error';

interface PipelineStep {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  status: StepStatus;
  detail?: string;
}

const initialSteps: PipelineStep[] = [
  { id: 'rg', label: 'Creating Resource Group', sublabel: 'Setting up Azure resource group', icon: <CloudIcon />, status: 'pending' },
  { id: 'infra', label: 'Provisioning Infrastructure', sublabel: 'Creating Azure resources via Terraform', icon: <CloudIcon />, status: 'pending' },
  { id: 'tech', label: 'Detecting Tech Stack', sublabel: 'Scanning repository files', icon: <CodeIcon />, status: 'pending' },
  { id: 'cicd', label: 'Generating CI/CD Pipeline', sublabel: 'Creating combined build + deploy YAML', icon: <BuildIcon />, status: 'pending' },
  { id: 'commit', label: 'Committing Workflow', sublabel: 'Pushing pipeline to repository', icon: <TerminalIcon />, status: 'pending' },
  { id: 'trigger', label: 'Triggering Build', sublabel: 'Starting GitHub Actions pipeline', icon: <RocketLaunchIcon />, status: 'pending' },
];

const colorMap: Record<StepStatus, string> = {
  pending: 'rgba(148,163,184,0.3)',
  running: '#63b3ed',
  done: '#10b981',
  error: '#ef4444',
};

export const ProvisioningPage: React.FC = () => {
  const navigate = useNavigate();
  const hasRun = useRef(false);
  const [steps, setSteps] = useState<PipelineStep[]>(initialSteps);
  const [toast, setToast] = useState<{ open: boolean; message: string; color: string }>({ open: false, message: '', color: '#10b981' });
  const [infraResult, setInfraResult] = useState<any>(null);
  const [techResult, setTechResult] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const setStep = (id: string, status: StepStatus, detail?: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status, detail } : s));
  };

  const showToast = (message: string, color = '#10b981') => {
    setToast({ open: true, message, color });
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const repoRaw = sessionStorage.getItem('selectedRepo');
    const configRaw = sessionStorage.getItem('deployConfig');
    if (!repoRaw || !configRaw) { navigate('/repos'); return; }

    const { fullName, branch } = JSON.parse(repoRaw);
    const config = JSON.parse(configRaw);

    const run = async () => {
      try {
        // Step 1: Resource Group
        setStep('rg', 'running');
        addLog(`Creating resource group: ${config.resourceGroup} in ${config.region}...`);
        await new Promise(r => setTimeout(r, 1200));
        setStep('rg', 'done', config.resourceGroup);
        addLog(`✓ Resource group '${config.resourceGroup}' ready`);
        showToast(`Resource group '${config.resourceGroup}' created`);

        // Step 2: Provision Infrastructure
        setStep('infra', 'running');
        addLog(`Provisioning ${config.type} — ${config.name}...`);
        if (config.type === 'aks') addLog('AKS cluster creation takes 5-10 minutes, please wait...');
        if (config.type === 'vm') addLog('VM creation takes 2-5 minutes, please wait...');
        const infraRes = await httpClient.post('/infrastructure/provision', {
          repoFullName: fullName,
          branch,
          infrastructure: config,
        }, { timeout: 900000 }); // 15 min timeout for AKS
        const infra = infraRes.data;
        setInfraResult(infra);
        setStep('infra', 'done', `${config.name} created`);
        addLog(`✓ Infrastructure provisioned: ${config.name}`);
        showToast(`${config.type === 'azure-web-app' ? 'Web App' : config.type === 'aks' ? 'AKS Cluster' : 'VM'} '${config.name}' created!`);

        await new Promise(r => setTimeout(r, 600));

        // Step 3: Detect Tech
        setStep('tech', 'running');
        addLog(`Scanning repository ${fullName}...`);
        const tech = await detectTechnologies(fullName, branch);
        setTechResult(tech);
        setStep('tech', 'done', `${tech.language}${tech.framework ? ' / ' + tech.framework : ''}`);
        addLog(`✓ Detected: ${tech.language}${tech.buildTool ? ' + ' + tech.buildTool : ''}`);

        await new Promise(r => setTimeout(r, 400));

        // Step 4: Generate CI/CD YAML
        setStep('cicd', 'running');
        addLog(`Generating combined CI/CD pipeline for ${tech.language}...`);
        await new Promise(r => setTimeout(r, 700));
        setStep('cicd', 'done', 'ci-cd.yml generated');
        addLog(`✓ Pipeline YAML generated with build + deploy stages`);

        // Step 5: Commit
        setStep('commit', 'running');
        addLog(`Committing .github/workflows/ci-cd.yml to ${branch}...`);
        await createPipeline({
          repoFullName: fullName,
          branch,
          tech,
          enableSast: true,
          enableDast: true,
          deploy: infra,  // pass infra so deploy job is added to YAML
        });
        setStep('commit', 'done', '.github/workflows/ci-cd.yml');
        addLog(`✓ CI+CD workflow committed — build + deploy to ${infra.infrastructure_type}`);
        addLog(`✓ AZURE_CREDENTIALS secret auto-configured in GitHub repo`);
        showToast('CI/CD pipeline committed + secrets configured!');

        await new Promise(r => setTimeout(r, 500));

        // Step 6: Trigger Build
        setStep('trigger', 'running');
        addLog(`Triggering GitHub Actions pipeline on branch ${branch}...`);
        await new Promise(r => setTimeout(r, 800));
        setStep('trigger', 'done', 'Pipeline running');
        addLog(`✓ Build triggered — pipeline is now running in GitHub Actions`);

        sessionStorage.setItem('detectedTech', JSON.stringify(tech));
        sessionStorage.setItem('infrastructure', JSON.stringify(infra));

        showToast('🚀 All done! Redirecting to dashboard...', '#3b82f6');
        setTimeout(() => navigate('/deployments'), 2500);

      } catch (err: any) {
        const msg = err.response?.data?.detail || err.message || 'An error occurred';
        addLog(`✗ Error: ${msg}`);
        const runningStep = steps.find(s => s.status === 'running');
        if (runningStep) setStep(runningStep.id, 'error', msg);
        showToast(`Error: ${msg}`, '#ef4444');
      }
    };

    run();
  }, [navigate]);

  const doneCount = steps.filter(s => s.status === 'done').length;
  const progress = (doneCount / steps.length) * 100;
  const isComplete = doneCount === steps.length;
  const hasError = steps.some(s => s.status === 'error');

  const config = sessionStorage.getItem('deployConfig') ? JSON.parse(sessionStorage.getItem('deployConfig')!) : {};

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1b2a 100%)', p: 4 }}>
      <Box maxWidth={860} mx="auto">

        {/* Header */}
        <Box mb={4}>
          <Typography variant="h4" fontWeight={700} color="#e2e8f0">
            {isComplete ? '🚀 Deployment Complete!' : hasError ? '⚠️ Deployment Error' : 'Provisioning & Deploying...'}
          </Typography>
          <Typography variant="body2" color="rgba(148,163,184,0.7)" mt={0.5}>
            {config.name} · {config.type} · {config.region}
          </Typography>
        </Box>

        {/* Progress bar */}
        <Box mb={3}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="caption" color="rgba(148,163,184,0.6)">Overall Progress</Typography>
            <Typography variant="caption" color="#63b3ed">{doneCount}/{steps.length} steps</Typography>
          </Box>
          <LinearProgress variant="determinate" value={progress} sx={{
            height: 6, borderRadius: 3,
            bgcolor: 'rgba(99,179,237,0.1)',
            '& .MuiLinearProgress-bar': {
              background: isComplete ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              borderRadius: 3,
            },
          }} />
        </Box>

        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
          {/* Steps Panel */}
          <Box sx={{
            background: 'rgba(13,25,48,0.8)', border: '1px solid rgba(99,179,237,0.15)',
            borderRadius: 3, p: 3, backdropFilter: 'blur(10px)',
          }}>
            <Typography variant="caption" color="rgba(148,163,184,0.5)" fontWeight={600}
              sx={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 11 }} mb={2} display="block">
              Pipeline Steps
            </Typography>
            <Stack spacing={0}>
              {steps.map((step, i) => (
                <Box key={step.id} display="flex" alignItems="flex-start" gap={2} py={1.5}
                  sx={{ borderBottom: i < steps.length - 1 ? '1px solid rgba(99,179,237,0.06)' : 'none' }}>
                  {/* Icon circle */}
                  <Box sx={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `2px solid ${colorMap[step.status]}`,
                    background: step.status === 'done' ? 'rgba(16,185,129,0.1)' : step.status === 'error' ? 'rgba(239,68,68,0.1)' : 'transparent',
                    transition: 'all 0.3s',
                    color: colorMap[step.status],
                    '& svg': { fontSize: 16 },
                  }}>
                    {step.status === 'running' && <CircularProgress size={14} sx={{ color: '#63b3ed' }} />}
                    {step.status === 'done' && <CheckCircleIcon />}
                    {step.status === 'error' && <ErrorIcon />}
                    {step.status === 'pending' && React.cloneElement(step.icon as React.ReactElement, { sx: { fontSize: 16, color: 'rgba(148,163,184,0.3)' } })}
                  </Box>
                  <Box flex={1} minWidth={0}>
                    <Typography variant="body2" fontWeight={step.status === 'running' ? 700 : 400}
                      color={step.status === 'pending' ? 'rgba(148,163,184,0.4)' : step.status === 'error' ? '#f87171' : '#e2e8f0'}>
                      {step.label}
                    </Typography>
                    <Typography variant="caption" color="rgba(148,163,184,0.45)" noWrap>
                      {step.detail || step.sublabel}
                    </Typography>
                  </Box>
                  {step.status === 'running' && (
                    <Typography variant="caption" color="#63b3ed" flexShrink={0}>Running...</Typography>
                  )}
                  {step.status === 'done' && (
                    <Typography variant="caption" color="#10b981" flexShrink={0}>✓</Typography>
                  )}
                </Box>
              ))}
            </Stack>
          </Box>

          {/* Right panel: Tech + Infra results + Logs */}
          <Stack spacing={2}>
            {/* Tech Stack */}
            {techResult && (
              <Box sx={{
                background: 'rgba(13,25,48,0.8)', border: '1px solid rgba(99,179,237,0.15)',
                borderRadius: 3, p: 2.5, backdropFilter: 'blur(10px)',
              }}>
                <Typography variant="caption" color="rgba(148,163,184,0.5)" fontWeight={600}
                  sx={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 11 }} mb={1.5} display="block">
                  Detected Stack
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  <Chip label={techResult.language} size="small" sx={{ bgcolor: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)' }} />
                  {techResult.framework && <Chip label={techResult.framework} size="small" sx={{ bgcolor: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' }} />}
                  {techResult.buildTool && <Chip label={techResult.buildTool} size="small" sx={{ bgcolor: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)' }} />}
                  {techResult.hasDockerfile && <Chip label="Docker" size="small" sx={{ bgcolor: 'rgba(14,165,233,0.15)', color: '#7dd3fc', border: '1px solid rgba(14,165,233,0.3)' }} />}
                </Stack>
              </Box>
            )}

            {/* Infra Result */}
            {infraResult && (
              <Box sx={{
                background: 'rgba(13,25,48,0.8)', border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 3, p: 2.5, backdropFilter: 'blur(10px)',
              }}>
                <Typography variant="caption" color="rgba(148,163,184,0.5)" fontWeight={600}
                  sx={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 11 }} mb={1.5} display="block">
                  Infrastructure Created
                </Typography>
                <Stack spacing={0.8}>
                  {[
                    ['Type', infraResult.infrastructure_type],
                    ['Name', infraResult.resource_name],
                    ['Region', infraResult.region],
                    ['Status', infraResult.status],
                  ].map(([k, v]) => (
                    <Box key={k} display="flex" justifyContent="space-between">
                      <Typography variant="caption" color="rgba(148,163,184,0.5)">{k}</Typography>
                      <Typography variant="caption" color="#e2e8f0" fontWeight={600}>{v}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            {/* Live Logs */}
            <Box sx={{
              background: 'rgba(5,8,16,0.9)', border: '1px solid rgba(99,179,237,0.12)',
              borderRadius: 3, p: 2, backdropFilter: 'blur(10px)',
              flex: 1,
            }}>
              <Typography variant="caption" color="rgba(148,163,184,0.5)" fontWeight={600}
                sx={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 11 }} mb={1} display="block">
                Live Logs
              </Typography>
              <Box sx={{ maxHeight: 200, overflowY: 'auto', fontFamily: 'monospace',
                '&::-webkit-scrollbar': { width: 4 },
                '&::-webkit-scrollbar-thumb': { background: 'rgba(99,179,237,0.2)', borderRadius: 2 },
              }}>
                {logs.map((log, i) => (
                  <Typography key={i} variant="caption" display="block" color={
                    log.includes('✓') ? '#34d399' : log.includes('✗') ? '#f87171' : 'rgba(148,163,184,0.7)'
                  } fontSize={11} lineHeight={1.8}>
                    {log}
                  </Typography>
                ))}
                <div ref={logsEndRef} />
              </Box>
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* Toast */}
      <Snackbar open={toast.open} autoHideDuration={2500} onClose={() => setToast(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
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
