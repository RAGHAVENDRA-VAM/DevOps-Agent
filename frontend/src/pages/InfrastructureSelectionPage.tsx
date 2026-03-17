import React, { useState } from 'react';
import {
  Box, Typography, TextField, Button, Stack, Alert, Chip, Grid
} from '@mui/material';
import CloudIcon from '@mui/icons-material/Cloud';
import StorageIcon from '@mui/icons-material/Storage';
import DnsIcon from '@mui/icons-material/Dns';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { useNavigate } from 'react-router-dom';
import { httpClient } from '../services/httpClient';

type InfraType = 'azure-web-app' | 'aks' | 'vm';

interface DeployTarget {
  type: InfraType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  tags: string[];
}

const targets: DeployTarget[] = [
  {
    type: 'azure-web-app',
    label: 'Azure Web Apps',
    description: 'Fully managed platform for web applications. Auto-scaling, SSL, custom domains included.',
    icon: <CloudIcon sx={{ fontSize: 32 }} />,
    color: '#3b82f6',
    tags: ['Managed', 'Auto-scale', 'PaaS'],
  },
  {
    type: 'aks',
    label: 'Azure Kubernetes Service',
    description: 'Deploy containerized apps on a managed Kubernetes cluster with full orchestration.',
    icon: <DnsIcon sx={{ fontSize: 32 }} />,
    color: '#8b5cf6',
    tags: ['Kubernetes', 'Containers', 'Scalable'],
  },
  {
    type: 'vm',
    label: 'Virtual Machine',
    description: 'Full control over your infrastructure with a dedicated Azure Virtual Machine.',
    icon: <StorageIcon sx={{ fontSize: 32 }} />,
    color: '#10b981',
    tags: ['IaaS', 'Full Control', 'Custom'],
  },
];

export const InfrastructureSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<InfraType | null>(null);
  const [name, setName] = useState('');
  const [region, setRegion] = useState('eastus');
  const [nodeCount, setNodeCount] = useState(2);
  const [vmSize, setVmSize] = useState('Standard_B2s');
  const [sku, setSku] = useState('B1');
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProvision = async () => {
    if (!selected || !name) return;
    const repo = sessionStorage.getItem('selectedRepo');
    if (!repo) { setError('No repository selected'); return; }
    const { fullName, branch } = JSON.parse(repo);
    setIsProvisioning(true);
    setError(null);
    try {
      const config: any = { type: selected, name, region };
      if (selected === 'aks') config.nodeCount = nodeCount;
      if (selected === 'vm') config.size = vmSize;
      if (selected === 'azure-web-app') config.size = sku;
      const res = await httpClient.post('/infrastructure/provision', { repoFullName: fullName, branch, infrastructure: config });
      sessionStorage.setItem('infrastructure', JSON.stringify(res.data));
      navigate('/deployments');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to provision infrastructure');
    } finally {
      setIsProvisioning(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1b2a 100%)', p: 4 }}>
      <Box maxWidth={900} mx="auto">
        <Typography variant="h4" fontWeight={700} color="#e2e8f0" gutterBottom>
          Choose Deployment Target
        </Typography>
        <Typography variant="body2" color="rgba(148,163,184,0.7)" mb={4}>
          Select where you want to deploy your application on Azure
        </Typography>

        {/* Target Cards */}
        <Grid container spacing={2} mb={4}>
          {targets.map(t => {
            const isSelected = selected === t.type;
            return (
              <Grid item xs={12} md={4} key={t.type}>
                <Box
                  onClick={() => setSelected(t.type)}
                  sx={{
                    p: 3, borderRadius: 3, cursor: 'pointer', height: '100%',
                    border: `2px solid ${isSelected ? t.color : 'rgba(99,179,237,0.12)'}`,
                    background: isSelected ? `rgba(${t.color === '#3b82f6' ? '59,130,246' : t.color === '#8b5cf6' ? '139,92,246' : '16,185,129'},0.08)` : 'rgba(13,25,48,0.8)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    '&:hover': {
                      border: `2px solid ${t.color}`,
                      transform: 'translateY(-3px)',
                      boxShadow: `0 12px 30px rgba(0,0,0,0.4)`,
                    },
                  }}
                >
                  {isSelected && (
                    <CheckCircleIcon sx={{ position: 'absolute', top: 12, right: 12, color: t.color, fontSize: 20 }} />
                  )}
                  <Box sx={{ color: t.color, mb: 1.5 }}>{t.icon}</Box>
                  <Typography fontWeight={700} color="#e2e8f0" mb={1}>{t.label}</Typography>
                  <Typography variant="body2" color="rgba(148,163,184,0.7)" mb={2} fontSize={13}>
                    {t.description}
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                    {t.tags.map(tag => (
                      <Chip key={tag} label={tag} size="small" sx={{
                        height: 20, fontSize: 10,
                        bgcolor: `rgba(${t.color === '#3b82f6' ? '59,130,246' : t.color === '#8b5cf6' ? '139,92,246' : '16,185,129'},0.15)`,
                        color: t.color,
                        border: `1px solid ${t.color}33`,
                      }} />
                    ))}
                  </Stack>
                </Box>
              </Grid>
            );
          })}
        </Grid>

        {/* Config Form */}
        {selected && (
          <Box sx={{
            background: 'rgba(13,25,48,0.8)', border: '1px solid rgba(99,179,237,0.15)',
            borderRadius: 3, p: 3, backdropFilter: 'blur(10px)', mb: 3,
          }}>
            <Typography fontWeight={600} color="#e2e8f0" mb={2.5}>
              Configuration
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Resource Name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="my-app-prod"
                fullWidth
                required
                sx={fieldSx}
              />
              <TextField
                label="Azure Region"
                value={region}
                onChange={e => setRegion(e.target.value)}
                placeholder="eastus"
                fullWidth
                sx={fieldSx}
              />
              {selected === 'azure-web-app' && (
                <TextField label="App Service Plan SKU" value={sku} onChange={e => setSku(e.target.value)}
                  placeholder="B1" fullWidth sx={fieldSx} />
              )}
              {selected === 'aks' && (
                <TextField label="Node Count" type="number" value={nodeCount}
                  onChange={e => setNodeCount(parseInt(e.target.value) || 2)} fullWidth sx={fieldSx} />
              )}
              {selected === 'vm' && (
                <TextField label="VM Size" value={vmSize} onChange={e => setVmSize(e.target.value)}
                  placeholder="Standard_B2s" fullWidth sx={fieldSx} />
              )}
            </Stack>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
            {error}
          </Alert>
        )}

        <Box display="flex" justifyContent="flex-end" gap={2}>
          <Button
            variant="outlined"
            onClick={() => navigate('/repos')}
            sx={{ color: 'rgba(148,163,184,0.7)', borderColor: 'rgba(99,179,237,0.2)', '&:hover': { borderColor: '#63b3ed' } }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            disabled={!selected || !name || isProvisioning}
            onClick={handleProvision}
            startIcon={<RocketLaunchIcon />}
            sx={{
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              fontWeight: 700, px: 3,
              '&:hover': { background: 'linear-gradient(135deg, #2563eb, #7c3aed)' },
              '&:disabled': { background: 'rgba(99,179,237,0.1)', color: 'rgba(148,163,184,0.3)' },
            }}
          >
            {isProvisioning ? 'Provisioning...' : 'Provision & Deploy'}
          </Button>
        </Box>
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
  '& .MuiInputLabel-root': { color: 'rgba(148,163,184,0.7)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#63b3ed' },
};
