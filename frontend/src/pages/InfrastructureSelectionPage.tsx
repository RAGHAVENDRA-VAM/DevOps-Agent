import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Button,
  TextField,
  Stack,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { httpClient } from '../services/httpClient';

type InfrastructureType = 'vm' | 'kubernetes' | 'app-service';

interface InfrastructureConfig {
  type: InfrastructureType;
  name: string;
  region?: string;
  size?: string;
  nodeCount?: number;
}

export const InfrastructureSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [infraType, setInfraType] = useState<InfrastructureType>('app-service');
  const [config, setConfig] = useState<InfrastructureConfig>({
    type: 'app-service',
    name: '',
    region: 'eastus',
  });
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProvision = async () => {
    const selected = sessionStorage.getItem('selectedRepo');
    if (!selected) {
      setError('No repository selected');
      return;
    }

    const { fullName, branch } = JSON.parse(selected);
    setIsProvisioning(true);
    setError(null);

    try {
      const res = await httpClient.post('/infrastructure/provision', {
        repoFullName: fullName,
        branch,
        infrastructure: config,
      });

      sessionStorage.setItem('infrastructure', JSON.stringify(res.data));
      navigate('/deployments');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to provision infrastructure');
    } finally {
      setIsProvisioning(false);
    }
  };

  const updateConfig = (updates: Partial<InfrastructureConfig>) => {
    setConfig({ ...config, ...updates });
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Infrastructure Deployment
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Select the target infrastructure where your application will be deployed.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
            {error}
          </Alert>
        )}

        <FormControl component="fieldset" sx={{ mt: 3, mb: 3 }}>
          <FormLabel component="legend">Infrastructure Type</FormLabel>
          <RadioGroup
            value={infraType}
            onChange={e => {
              const newType = e.target.value as InfrastructureType;
              setInfraType(newType);
              updateConfig({ type: newType });
            }}
          >
            <FormControlLabel
              value="app-service"
              control={<Radio />}
              label="Azure App Service (Managed Web App)"
            />
            <FormControlLabel
              value="kubernetes"
              control={<Radio />}
              label="Kubernetes (AKS/EKS)"
            />
            <FormControlLabel value="vm" control={<Radio />} label="Virtual Machine" />
          </RadioGroup>
        </FormControl>

        <Stack spacing={2} sx={{ mt: 3 }}>
          <TextField
            label="Resource Name"
            value={config.name}
            onChange={e => updateConfig({ name: e.target.value })}
            placeholder="my-app-dev"
            required
            fullWidth
          />

          {infraType === 'app-service' && (
            <>
              <TextField
                label="Region"
                value={config.region || 'eastus'}
                onChange={e => updateConfig({ region: e.target.value })}
                placeholder="eastus"
                fullWidth
              />
              <TextField
                label="App Service Plan SKU"
                value={config.size || 'B1'}
                onChange={e => updateConfig({ size: e.target.value })}
                placeholder="B1"
                fullWidth
              />
            </>
          )}

          {infraType === 'kubernetes' && (
            <>
              <TextField
                label="Region"
                value={config.region || 'eastus'}
                onChange={e => updateConfig({ region: e.target.value })}
                placeholder="eastus"
                fullWidth
              />
              <TextField
                label="Node Count"
                type="number"
                value={config.nodeCount || 2}
                onChange={e => updateConfig({ nodeCount: parseInt(e.target.value) || 2 })}
                fullWidth
              />
            </>
          )}

          {infraType === 'vm' && (
            <>
              <TextField
                label="Region"
                value={config.region || 'eastus'}
                onChange={e => updateConfig({ region: e.target.value })}
                placeholder="eastus"
                fullWidth
              />
              <TextField
                label="VM Size"
                value={config.size || 'Standard_B1s'}
                onChange={e => updateConfig({ size: e.target.value })}
                placeholder="Standard_B1s"
                fullWidth
              />
            </>
          )}
        </Stack>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button variant="outlined" onClick={() => navigate('/repos')}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleProvision}
            disabled={!config.name || isProvisioning}
          >
            {isProvisioning ? 'Provisioning...' : 'Provision & Deploy'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
