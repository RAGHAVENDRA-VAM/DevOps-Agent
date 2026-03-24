import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
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
  colorClass: string;
  selectedClass: string;
}

const TARGETS: TargetOption[] = [
  {
    type: 'azure-web-app',
    label: 'Azure Web Apps',
    subtitle: 'PaaS · Managed · Auto-scale',
    description: 'Best for web APIs and apps. Fully managed, built-in SSL, custom domains.',
    icon: <CloudIcon sx={{ fontSize: 28 }} />,
    colorClass: 'blue',
    selectedClass: 'selected-blue',
  },
  {
    type: 'aks',
    label: 'Azure Kubernetes Service',
    subtitle: 'Containers · Orchestration · Scalable',
    description: 'Deploy containerized workloads on a managed Kubernetes cluster.',
    icon: <DnsIcon sx={{ fontSize: 28 }} />,
    colorClass: 'purple',
    selectedClass: 'selected-purple',
  },
  {
    type: 'vm',
    label: 'Virtual Machine',
    subtitle: 'IaaS · Full Control · Custom',
    description: 'Full OS-level control. Best for legacy apps or custom environments.',
    icon: <StorageIcon sx={{ fontSize: 28 }} />,
    colorClass: 'green',
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

export const DeployConfigPage: React.FC = () => {
  const navigate = useNavigate();
  const [infraType, setInfraType]       = useState<InfraType | null>(null);
  const [step, setStep]                 = useState(0);
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

    const config: DeployConfig = {
      type: infraType,
      resourceGroup,
      name: resourceName,
      region,
    };

    if (infraType === 'azure-web-app') config.sku       = sku.split(' ')[0];
    if (infraType === 'aks')           { config.nodeCount = nodeCount; config.nodeSize = nodeSize; }
    if (infraType === 'vm')            { config.size = vmSize; config.adminUser = adminUser; }

    sessionStorage.setItem('deployConfig', JSON.stringify(config));
    navigate('/provisioning');
  };

  const selected = TARGETS.find((t) => t.type === infraType);

  return (
    <Box className="deploy-root">
      <Box maxWidth={860} mx="auto">
        <Box mb={4}>
          <Typography variant="h4" className="deploy-title">Configure Deployment</Typography>
          <Typography variant="body2" className="deploy-subtitle">
            Choose your Azure deployment target and provide resource details
          </Typography>
        </Box>

        <Stepper activeStep={step} className="deploy-stepper" sx={{ mb: 4 }}>
          {['Select Target', 'Resource Details'].map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step 0 — Select Target */}
        {step === 0 && (
          <>
            <Grid container spacing={2} mb={4}>
              {TARGETS.map((t) => {
                const isSel = infraType === t.type;
                return (
                  <Grid item xs={12} md={4} key={t.type}>
                    <Box
                      onClick={() => setInfraType(t.type)}
                      className={`deploy-target-card${isSel ? ` ${t.selectedClass}` : ''}`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setInfraType(t.type)}
                      aria-label={`Select ${t.label}`}
                      aria-pressed={isSel}
                    >
                      {isSel && (
                        <CheckCircleIcon className="deploy-check-icon" sx={{ color: 'inherit' }} />
                      )}
                      <Box sx={{ mb: 1.5 }}>{t.icon}</Box>
                      <Typography fontWeight={700} color="#e2e8f0" mb={0.5}>{t.label}</Typography>
                      <Typography variant="caption" display="block" mb={1}>{t.subtitle}</Typography>
                      <Typography variant="body2" color="rgba(148,163,184,0.65)" fontSize={12}>
                        {t.description}
                      </Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
            <Box display="flex" justifyContent="flex-end">
              <Button
                variant="contained"
                disabled={!canProceed}
                endIcon={<ArrowForwardIcon />}
                onClick={() => setStep(1)}
                className="deploy-btn-next"
              >
                Next: Configure Resources
              </Button>
            </Box>
          </>
        )}

        {/* Step 1 — Resource Details */}
        {step === 1 && selected && (
          <>
            <Box className="deploy-selected-bar" sx={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <Box>{selected.icon}</Box>
              <Box>
                <Typography fontWeight={700} color="#e2e8f0">{selected.label}</Typography>
                <Typography variant="caption" color="rgba(148,163,184,0.6)">{selected.subtitle}</Typography>
              </Box>
              <Chip
                label="Change"
                size="small"
                onClick={() => setStep(0)}
                sx={{ ml: 'auto', cursor: 'pointer', color: '#63b3ed', border: '1px solid rgba(99,179,237,0.3)', bgcolor: 'rgba(99,179,237,0.08)' }}
              />
            </Box>

            <Box className="deploy-details-panel">
              <Typography className="deploy-details-label">Azure Resource Details</Typography>
              <Stack spacing={2.5}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth label="Resource Group Name" value={resourceGroup}
                      onChange={(e) => setResourceGroup(e.target.value)}
                      placeholder="my-app-rg" required
                      helperText="Will be created if it doesn't exist"
                      className="deploy-field"
                      InputLabelProps={{ sx: { color: 'rgba(148,163,184,0.7)' } }}
                      FormHelperTextProps={{ sx: { color: 'rgba(148,163,184,0.4)' } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth label="Resource Name" value={resourceName}
                      onChange={(e) => setResourceName(e.target.value)}
                      placeholder="my-app-prod" required
                      className="deploy-field"
                      InputLabelProps={{ sx: { color: 'rgba(148,163,184,0.7)' } }}
                    />
                  </Grid>
                </Grid>

                <TextField
                  fullWidth select label="Azure Region" value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="deploy-field"
                  InputLabelProps={{ sx: { color: 'rgba(148,163,184,0.7)' } }}
                >
                  {AZURE_REGIONS.map((r) => (
                    <MenuItem key={r} value={r} className="deploy-menu-item">{r}</MenuItem>
                  ))}
                </TextField>

                <Divider className="deploy-divider" />

                {infraType === 'azure-web-app' && (
                  <TextField
                    fullWidth select label="App Service Plan SKU" value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="deploy-field"
                    InputLabelProps={{ sx: { color: 'rgba(148,163,184,0.7)' } }}
                  >
                    {WEB_APP_SKUS.map((s) => (
                      <MenuItem key={s} value={s} className="deploy-menu-item">{s}</MenuItem>
                    ))}
                  </TextField>
                )}

                {infraType === 'aks' && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth label="Node Count" type="number" value={nodeCount}
                        onChange={(e) => setNodeCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        inputProps={{ min: 1, max: 10 }}
                        className="deploy-field"
                        InputLabelProps={{ sx: { color: 'rgba(148,163,184,0.7)' } }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth select label="Node VM Size" value={nodeSize}
                        onChange={(e) => setNodeSize(e.target.value)}
                        className="deploy-field"
                        InputLabelProps={{ sx: { color: 'rgba(148,163,184,0.7)' } }}
                      >
                        {VM_SIZES.map((s) => (
                          <MenuItem key={s} value={s} className="deploy-menu-item">{s}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  </Grid>
                )}

                {infraType === 'vm' && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth select label="VM Size" value={vmSize}
                        onChange={(e) => setVmSize(e.target.value)}
                        className="deploy-field"
                        InputLabelProps={{ sx: { color: 'rgba(148,163,184,0.7)' } }}
                      >
                        {VM_SIZES.map((s) => (
                          <MenuItem key={s} value={s} className="deploy-menu-item">{s}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth label="Admin Username" value={adminUser}
                        onChange={(e) => setAdminUser(e.target.value)}
                        className="deploy-field"
                        InputLabelProps={{ sx: { color: 'rgba(148,163,184,0.7)' } }}
                      />
                    </Grid>
                  </Grid>
                )}
              </Stack>
            </Box>

            <Box display="flex" justifyContent="space-between" mt={3}>
              <Button
                variant="outlined"
                onClick={() => setStep(0)}
                className="deploy-btn-back"
              >
                Back
              </Button>
              <Button
                variant="contained"
                disabled={!canDeploy}
                onClick={handleDeploy}
                endIcon={<ArrowForwardIcon />}
                className="deploy-btn-next"
              >
                Start Provisioning
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};
