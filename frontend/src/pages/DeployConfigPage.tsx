import React, { useState } from 'react';
import {
  Box, Typography, TextField, Button, Stack, Chip, Grid,
  Stepper, Step, StepLabel, Divider, MenuItem
} from '@mui/material';
import CloudIcon from '@mui/icons-material/Cloud';
import DnsIcon from '@mui/icons-material/Dns';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';

type InfraType = 'azure-web-app' | 'aks' | 'vm';

const targets = [
  {
    type: 'azure-web-app' as InfraType,
    label: 'Azure Web Apps',
    subtitle: 'PaaS · Managed · Auto-scale',
    description: 'Best for web APIs and apps. Fully managed, built-in SSL, custom domains.',
    icon: <CloudIcon sx={{ fontSize: 28 }} />,
    color: '#3b82f6',
  },
  {
    type: 'aks' as InfraType,
    label: 'Azure Kubernetes Service',
    subtitle: 'Containers · Orchestration · Scalable',
    description: 'Deploy containerized workloads on a managed Kubernetes cluster.',
    icon: <DnsIcon sx={{ fontSize: 28 }} />,
    color: '#8b5cf6',
  },
  {
    type: 'vm' as InfraType,
    label: 'Virtual Machine',
    subtitle: 'IaaS · Full Control · Custom',
    description: 'Full OS-level control. Best for legacy apps or custom environments.',
    icon: <StorageIcon sx={{ fontSize: 28 }} />,
    color: '#10b981',
  },
];

const AZURE_REGIONS = [
  'eastus', 'eastus2', 'westus', 'westus2', 'westus3',
  'centralus', 'northeurope', 'westeurope', 'uksouth',
  'southeastasia', 'australiaeast', 'japaneast',
];

const WEB_APP_SKUS = ['F1 (Free)', 'B1 (Basic)', 'B2 (Basic)', 'S1 (Standard)', 'S2 (Standard)', 'P1v3 (Premium)'];
const VM_SIZES = ['Standard_B1s', 'Standard_B2s', 'Standard_B4ms', 'Standard_D2s_v3', 'Standard_D4s_v3'];

export const DeployConfigPage: React.FC = () => {
  const navigate = useNavigate();
  const [infraType, setInfraType] = useState<InfraType | null>(null);
  const [step, setStep] = useState(0); // 0=select target, 1=fill details

  // Common fields
  const [resourceGroup, setResourceGroup] = useState('');
  const [resourceName, setResourceName] = useState('');
  const [region, setRegion] = useState('eastus');

  // Web App specific
  const [sku, setSku] = useState('B1 (Basic)');

  // AKS specific
  const [nodeCount, setNodeCount] = useState(2);
  const [nodeSize, setNodeSize] = useState('Standard_D2s_v3');

  // VM specific
  const [vmSize, setVmSize] = useState('Standard_B2s');
  const [adminUser, setAdminUser] = useState('azureuser');

  const canProceed = infraType !== null;
  const canDeploy = resourceGroup.trim() && resourceName.trim();

  const handleNext = () => setStep(1);

  const handleDeploy = () => {
    const config: any = {
      type: infraType,
      resourceGroup,
      name: resourceName,
      region,
    };
    if (infraType === 'azure-web-app') config.sku = sku.split(' ')[0];
    if (infraType === 'aks') { config.nodeCount = nodeCount; config.nodeSize = nodeSize; }
    if (infraType === 'vm') { config.vmSize; config.adminUser; config.size = vmSize; }

    sessionStorage.setItem('deployConfig', JSON.stringify(config));
    navigate('/provisioning');
  };

  const selected = targets.find(t => t.type === infraType);

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1b2a 100%)', p: 4 }}>
      <Box maxWidth={860} mx="auto">

        {/* Header */}
        <Box mb={4}>
          <Typography variant="h4" fontWeight={700} color="#e2e8f0">
            Configure Deployment
          </Typography>
          <Typography variant="body2" color="rgba(148,163,184,0.7)" mt={0.5}>
            Choose your Azure deployment target and provide resource details
          </Typography>
        </Box>

        {/* Stepper */}
        <Stepper activeStep={step} sx={{ mb: 4 }}>
          {['Select Target', 'Resource Details'].map((label) => (
            <Step key={label}>
              <StepLabel sx={{
                '& .MuiStepLabel-label': { color: 'rgba(148,163,184,0.6)' },
                '& .MuiStepLabel-label.Mui-active': { color: '#e2e8f0', fontWeight: 700 },
                '& .MuiStepLabel-label.Mui-completed': { color: '#10b981' },
                '& .MuiStepIcon-root': { color: 'rgba(99,179,237,0.2)' },
                '& .MuiStepIcon-root.Mui-active': { color: '#3b82f6' },
                '& .MuiStepIcon-root.Mui-completed': { color: '#10b981' },
              }}>
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step 0 — Select Target */}
        {step === 0 && (
          <>
            <Grid container spacing={2} mb={4}>
              {targets.map(t => {
                const isSel = infraType === t.type;
                return (
                  <Grid item xs={12} md={4} key={t.type}>
                    <Box onClick={() => setInfraType(t.type)} sx={{
                      p: 3, borderRadius: 3, cursor: 'pointer', height: '100%',
                      border: `2px solid ${isSel ? t.color : 'rgba(99,179,237,0.12)'}`,
                      background: isSel ? `${t.color}14` : 'rgba(13,25,48,0.8)',
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.2s',
                      position: 'relative',
                      '&:hover': { border: `2px solid ${t.color}`, transform: 'translateY(-2px)', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' },
                    }}>
                      {isSel && <CheckCircleIcon sx={{ position: 'absolute', top: 12, right: 12, color: t.color, fontSize: 20 }} />}
                      <Box sx={{ color: t.color, mb: 1.5 }}>{t.icon}</Box>
                      <Typography fontWeight={700} color="#e2e8f0" mb={0.5}>{t.label}</Typography>
                      <Typography variant="caption" color={t.color} display="block" mb={1}>{t.subtitle}</Typography>
                      <Typography variant="body2" color="rgba(148,163,184,0.65)" fontSize={12}>{t.description}</Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
            <Box display="flex" justifyContent="flex-end">
              <Button
                variant="contained" disabled={!canProceed}
                endIcon={<ArrowForwardIcon />}
                onClick={handleNext}
                sx={{
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', fontWeight: 700, px: 4,
                  '&:hover': { background: 'linear-gradient(135deg, #2563eb, #7c3aed)' },
                  '&:disabled': { background: 'rgba(99,179,237,0.1)', color: 'rgba(148,163,184,0.3)' },
                }}
              >
                Next: Configure Resources
              </Button>
            </Box>
          </>
        )}

        {/* Step 1 — Resource Details */}
        {step === 1 && selected && (
          <>
            {/* Selected target summary */}
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 2, p: 2, mb: 3,
              background: `${selected.color}10`, border: `1px solid ${selected.color}33`,
              borderRadius: 2,
            }}>
              <Box sx={{ color: selected.color }}>{selected.icon}</Box>
              <Box>
                <Typography fontWeight={700} color="#e2e8f0">{selected.label}</Typography>
                <Typography variant="caption" color="rgba(148,163,184,0.6)">{selected.subtitle}</Typography>
              </Box>
              <Chip label="Selected" size="small" onClick={() => setStep(0)}
                sx={{ ml: 'auto', bgcolor: `${selected.color}20`, color: selected.color, border: `1px solid ${selected.color}44`, cursor: 'pointer' }} />
            </Box>

            <Box sx={{
              background: 'rgba(13,25,48,0.8)', border: '1px solid rgba(99,179,237,0.15)',
              borderRadius: 3, p: 3, backdropFilter: 'blur(10px)',
            }}>
              <Typography fontWeight={600} color="#e2e8f0" mb={2.5} fontSize={13}
                sx={{ textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(148,163,184,0.6)' }}>
                Azure Resource Details
              </Typography>

              <Stack spacing={2.5}>
                {/* Common fields */}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Resource Group Name" value={resourceGroup}
                      onChange={e => setResourceGroup(e.target.value)}
                      placeholder="my-app-rg" required helperText="Will be created if it doesn't exist"
                      sx={fieldSx} InputLabelProps={{ sx: { color: 'rgba(148,163,184,0.7)' } }}
                      FormHelperTextProps={{ sx: { color: 'rgba(148,163,184,0.4)' } }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Resource Name" value={resourceName}
                      onChange={e => setResourceName(e.target.value)}
                      placeholder="my-app-prod" required
                      sx={fieldSx} InputLabelProps={{ sx: { color: 'rgba(148,163,184,0.7)' } }} />
                  </Grid>
                </Grid>

                <TextField fullWidth select label="Azure Region" value={region}
                  onChange={e => setRegion(e.target.value)} sx={fieldSx}
                  InputLabelProps={{ sx: { color: 'rgba(148,163,184,0.7)' } }}>
                  {AZURE_REGIONS.map(r => (
                    <MenuItem key={r} value={r} sx={{ bgcolor: '#0d1b2a', color: '#e2e8f0', '&:hover': { bgcolor: 'rgba(99,179,237,0.1)' } }}>{r}</MenuItem>
                  ))}
                </TextField>

                <Divider sx={{ borderColor: 'rgba(99,179,237,0.1)' }} />

                {/* Web App specific */}
                {infraType === 'azure-web-app' && (
                  <TextField fullWidth select label="App Service Plan SKU" value={sku}
                    onChange={e => setSku(e.target.value)} sx={fieldSx}
                    InputLabelProps={{ sx: { color: 'rgba(148,163,184,0.7)' } }}>
                    {WEB_APP_SKUS.map(s => (
                      <MenuItem key={s} value={s} sx={{ bgcolor: '#0d1b2a', color: '#e2e8f0', '&:hover': { bgcolor: 'rgba(99,179,237,0.1)' } }}>{s}</MenuItem>
                    ))}
                  </TextField>
                )}

                {/* AKS specific */}
                {infraType === 'aks' && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Node Count" type="number" value={nodeCount}
                        onChange={e => setNodeCount(Math.max(1, parseInt(e.target.value) || 1))}
                        inputProps={{ min: 1, max: 10 }} sx={fieldSx}
                        InputLabelProps={{ sx: { color: 'rgba(148,163,184,0.7)' } }} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth select label="Node VM Size" value={nodeSize}
                        onChange={e => setNodeSize(e.target.value)} sx={fieldSx}
                        InputLabelProps={{ sx: { color: 'rgba(148,163,184,0.7)' } }}>
                        {VM_SIZES.map(s => (
                          <MenuItem key={s} value={s} sx={{ bgcolor: '#0d1b2a', color: '#e2e8f0', '&:hover': { bgcolor: 'rgba(99,179,237,0.1)' } }}>{s}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  </Grid>
                )}

                {/* VM specific */}
                {infraType === 'vm' && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth select label="VM Size" value={vmSize}
                        onChange={e => setVmSize(e.target.value)} sx={fieldSx}
                        InputLabelProps={{ sx: { color: 'rgba(148,163,184,0.7)' } }}>
                        {VM_SIZES.map(s => (
                          <MenuItem key={s} value={s} sx={{ bgcolor: '#0d1b2a', color: '#e2e8f0', '&:hover': { bgcolor: 'rgba(99,179,237,0.1)' } }}>{s}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Admin Username" value={adminUser}
                        onChange={e => setAdminUser(e.target.value)} sx={fieldSx}
                        InputLabelProps={{ sx: { color: 'rgba(148,163,184,0.7)' } }} />
                    </Grid>
                  </Grid>
                )}
              </Stack>
            </Box>

            <Box display="flex" justifyContent="space-between" mt={3}>
              <Button variant="outlined" onClick={() => setStep(0)}
                sx={{ color: 'rgba(148,163,184,0.7)', borderColor: 'rgba(99,179,237,0.2)', '&:hover': { borderColor: '#63b3ed' } }}>
                Back
              </Button>
              <Button variant="contained" disabled={!canDeploy} onClick={handleDeploy}
                endIcon={<ArrowForwardIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', fontWeight: 700, px: 4,
                  '&:hover': { background: 'linear-gradient(135deg, #2563eb, #7c3aed)' },
                  '&:disabled': { background: 'rgba(99,179,237,0.1)', color: 'rgba(148,163,184,0.3)' },
                }}>
                Start Provisioning
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    color: '#e2e8f0',
    background: 'rgba(255,255,255,0.03)',
    '& fieldset': { borderColor: 'rgba(99,179,237,0.2)' },
    '&:hover fieldset': { borderColor: 'rgba(99,179,237,0.4)' },
    '&.Mui-focused fieldset': { borderColor: '#63b3ed' },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: '#63b3ed' },
  '& .MuiSelect-icon': { color: 'rgba(148,163,184,0.5)' },
};
