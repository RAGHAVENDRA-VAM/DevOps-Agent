import React, { useState } from 'react';
import {
  Box, Button, Chip, Grid, MenuItem,
  Stack, Step, StepLabel, Stepper, TextField, Typography,
} from '@mui/material';
import CloudIcon from '@mui/icons-material/Cloud';
import DnsIcon from '@mui/icons-material/Dns';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import '../styles/DeployConfigPage.css';

type InfraType = 'azure-web-app' | 'aks' | 'vm';

interface DeployConfig {
  type: InfraType;
  resourceGroup: string;
  name: string;
  region: string;
  sku?: string;
  nodeCount?: number;
  nodeSize?: string;
  size?: string;
  adminUser?: string;
}

interface TargetOption {
  type: InfraType;
  label: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  selectedClass: string;
}

const TARGETS: TargetOption[] = [
  {
    type: 'azure-web-app',
    label: 'Azure Web Apps',
    subtitle: 'PaaS · Managed · Auto-scale',
    description: 'Best for web APIs and apps. Fully managed, built-in SSL, custom domains.',
    icon: <CloudIcon sx={{ fontSize: 18 }} />,
    selectedClass: 'selected-blue',
  },
  {
    type: 'aks',
    label: 'Azure Kubernetes Service',
    subtitle: 'Containers · Orchestration · Scalable',
    description: 'Deploy containerized workloads on a managed Kubernetes cluster.',
    icon: <DnsIcon sx={{ fontSize: 18 }} />,
    selectedClass: 'selected-purple',
  },
  {
    type: 'vm',
    label: 'Virtual Machine',
    subtitle: 'IaaS · Full Control · Custom',
    description: 'Full OS-level control. Best for legacy apps or custom environments.',
    icon: <StorageIcon sx={{ fontSize: 18 }} />,
    selectedClass: 'selected-green',
  },
];

const AZURE_REGIONS = [
  'eastus', 'eastus2', 'westus', 'westus2', 'westus3',
  'centralus', 'northeurope', 'westeurope', 'uksouth',
  'southeastasia', 'australiaeast', 'japaneast',
];

const WEB_APP_SKUS = ['F1 (Free)', 'B1 (Basic)', 'B2 (Basic)', 'S1 (Standard)', 'S2 (Standard)', 'P1v3 (Premium)'];
const VM_SIZES     = ['Standard_B1s', 'Standard_B2s', 'Standard_B4ms', 'Standard_D2s_v3', 'Standard_D4s_v3'];

const fieldSx = {} as const;
export const DeployConfigPage: React.FC = () => {
  const navigate = useNavigate();
  const [infraType, setInfraType]         = useState<InfraType | null>(null);
  const [step, setStep]                   = useState(0);
  const [resourceGroup, setResourceGroup] = useState('');
  const [resourceName, setResourceName]   = useState('');
  const [region, setRegion]               = useState('eastus');
  const [sku, setSku]                     = useState('B1 (Basic)');
  const [nodeCount, setNodeCount]         = useState(2);
  const [nodeSize, setNodeSize]           = useState('Standard_D2s_v3');
  const [vmSize, setVmSize]               = useState('Standard_B2s');
  const [adminUser, setAdminUser]         = useState('azureuser');

  const canProceed = infraType !== null;
  const canDeploy  = resourceGroup.trim().length > 0 && resourceName.trim().length > 0;

  const handleDeploy = (): void => {
    if (!infraType) return;
    const config: DeployConfig = { type: infraType, resourceGroup, name: resourceName, region };
    if (infraType === 'azure-web-app') config.sku = sku.split(' ')[0];
    if (infraType === 'aks')  { config.nodeCount = nodeCount; config.nodeSize = nodeSize; }
    if (infraType === 'vm')   { config.size = vmSize; config.adminUser = adminUser; }
    sessionStorage.setItem('deployConfig', JSON.stringify(config));
    navigate('/provisioning');
  };

  const selected = TARGETS.find((t) => t.type === infraType);

  return (
    <Box className="deploy-root">
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <Box flexShrink={0} mb={0.25}>
          <Typography className="deploy-title">Configure Deployment</Typography>
          <Typography className="deploy-subtitle">Choose your Azure deployment target and provide resource details</Typography>
        </Box>

        {/* Stepper */}
        <Stepper activeStep={step} className="deploy-stepper" sx={{ mb: 0.75, flexShrink: 0 }}>
          {['Select Target', 'Resource Details'].map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        {/* Step 0 — Select Target */}
        {step === 0 && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Grid container spacing={1.5}>
              {TARGETS.map((t) => {
                const isSel = infraType === t.type;
                return (
                  <Grid item xs={12} md={4} key={t.type}>
                    <Box
                      onClick={() => setInfraType(t.type)}
                      className={`deploy-target-card${isSel ? ` ${t.selectedClass}` : ''}`}
                      role="button" tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setInfraType(t.type)}
                      aria-label={`Select ${t.label}`} aria-pressed={isSel}
                      sx={{ height: 'auto' }}
                    >
                      {isSel && <CheckCircleIcon className="deploy-check-icon" sx={{ color: 'inherit' }} />}
                      <Box sx={{ mb: 0.25 }}>{t.icon}</Box>
                      <Typography fontWeight={700} fontSize={11} color="#000000" mb={0.25}>{t.label}</Typography>
                      <Typography variant="caption" display="block" mb={0.25} color="#6b7280" fontSize={10}>{t.subtitle}</Typography>
                      <Typography fontSize={10} color="#6b7280">{t.description}</Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
            <Box display="flex" justifyContent="flex-end" mt={0.75} flexShrink={0}>
              <Button variant="contained" disabled={!canProceed} endIcon={<ArrowForwardIcon />}
                onClick={() => setStep(1)} className="deploy-btn-next">
                Next: Configure Resources
              </Button>
            </Box>
          </Box>
        )}

        {/* Step 1 — Resource Details */}
        {step === 1 && selected && (
          <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
            <Box className="deploy-selected-bar"
              sx={{ background: 'rgba(0,150,136,0.06)', border: '1px solid rgba(0,150,136,0.2)', flexShrink: 0 }}>
              <Box>{selected.icon}</Box>
              <Box>
                <Typography fontWeight={700} fontSize={12} color="#000000">{selected.label}</Typography>
                <Typography variant="caption" fontSize={10} color="#000000">{selected.subtitle}</Typography>
              </Box>
              <Chip label="Change" size="small" onClick={() => setStep(0)}
                sx={{ ml: 'auto', cursor: 'pointer', fontSize: 10, height: 20,
                  color: '#009688', border: '1px solid rgba(0,150,136,0.3)', bgcolor: 'rgba(0,150,136,0.08)' }} />
            </Box>

            <Box className="deploy-details-panel">
              <Typography className="deploy-details-label">Azure Resource Details</Typography>
              <Stack spacing={1}>
                {/* Row 1 */}
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Resource Group Name" value={resourceGroup}
                      onChange={(e) => setResourceGroup(e.target.value)}
                      placeholder="my-app-rg" required helperText="Will be created if it doesn't exist"
                      className="deploy-field" InputLabelProps={{ shrink: true }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Resource Name" value={resourceName}
                      onChange={(e) => setResourceName(e.target.value)}
                      placeholder="my-app-prod" required
                      className="deploy-field" InputLabelProps={{ shrink: true }} />
                  </Grid>
                </Grid>

                {/* Row 2: Azure Region + infra-specific fields */}
                {infraType === 'azure-web-app' && (
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth select label="Azure Region" value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        className="deploy-field" InputLabelProps={{ shrink: true }}>
                        {AZURE_REGIONS.map((r) => <MenuItem key={r} value={r} className="deploy-menu-item">{r}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth select label="App Service Plan SKU" value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        className="deploy-field" InputLabelProps={{ shrink: true }}>
                        {WEB_APP_SKUS.map((s) => <MenuItem key={s} value={s} className="deploy-menu-item">{s}</MenuItem>)}
                      </TextField>
                    </Grid>
                  </Grid>
                )}

                {infraType === 'aks' && (
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth select label="Azure Region" value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        className="deploy-field" InputLabelProps={{ shrink: true }}>
                        {AZURE_REGIONS.map((r) => <MenuItem key={r} value={r} className="deploy-menu-item">{r}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth label="Node Count" type="number" value={nodeCount}
                        onChange={(e) => setNodeCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        inputProps={{ min: 1, max: 10 }}
                        className="deploy-field" InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth select label="Node VM Size" value={nodeSize}
                        onChange={(e) => setNodeSize(e.target.value)}
                        className="deploy-field" InputLabelProps={{ shrink: true }}>
                        {VM_SIZES.map((s) => <MenuItem key={s} value={s} className="deploy-menu-item">{s}</MenuItem>)}
                      </TextField>
                    </Grid>
                  </Grid>
                )}

                {infraType === 'vm' && (
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth select label="Azure Region" value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        className="deploy-field" InputLabelProps={{ shrink: true }}>
                        {AZURE_REGIONS.map((r) => <MenuItem key={r} value={r} className="deploy-menu-item">{r}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth select label="VM Size" value={vmSize}
                        onChange={(e) => setVmSize(e.target.value)}
                        className="deploy-field" InputLabelProps={{ shrink: true }}>
                        {VM_SIZES.map((s) => <MenuItem key={s} value={s} className="deploy-menu-item">{s}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth label="Admin Username" value={adminUser}
                        onChange={(e) => setAdminUser(e.target.value)}
                        className="deploy-field" InputLabelProps={{ shrink: true }} />
                    </Grid>
                  </Grid>
                )}
              </Stack>
            </Box>

            <Box display="flex" justifyContent="space-between" mt={0.75} flexShrink={0}>
              <Button variant="outlined" onClick={() => setStep(0)} className="deploy-btn-back">Back</Button>
              <Button variant="contained" disabled={!canDeploy} onClick={handleDeploy}
                endIcon={<ArrowForwardIcon />} className="deploy-btn-next">
                Start Provisioning
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};
