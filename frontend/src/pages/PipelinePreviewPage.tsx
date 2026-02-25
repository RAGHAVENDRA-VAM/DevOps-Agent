import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControlLabel,
  Switch,
  Button
} from '@mui/material';
import { generatePipelinePreview, createPipeline } from '../services/pipelineService';

export const PipelinePreviewPage: React.FC = () => {
  const [yaml, setYaml] = useState<string>('');
  const [enableSast, setEnableSast] = useState(true);
  const [enableDast, setEnableDast] = useState(true);

  useEffect(() => {
    const selected = sessionStorage.getItem('selectedRepo');
    const tech = sessionStorage.getItem('detectedTech');
    if (!selected || !tech) return;
    const { fullName, branch } = JSON.parse(selected);
    generatePipelinePreview({
      repoFullName: fullName,
      branch,
      tech: JSON.parse(tech),
      enableSast,
      enableDast
    })
      .then(setYaml)
      .catch(() => setYaml('# Unable to generate preview. Check backend logs.'));
  }, [enableSast, enableDast]);

  const handleCreate = async () => {
    const selected = sessionStorage.getItem('selectedRepo');
    const tech = sessionStorage.getItem('detectedTech');
    if (!selected || !tech) return;
    const { fullName, branch } = JSON.parse(selected);
    await createPipeline({
      repoFullName: fullName,
      branch,
      tech: JSON.parse(tech),
      enableSast,
      enableDast
    });
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Pipeline Preview
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Review and approve the generated CI/CD pipeline. You can toggle security stages before
          committing.
        </Typography>

        <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} mb={2}>
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={enableSast}
                  onChange={e => setEnableSast(e.target.checked)}
                  color="primary"
                />
              }
              label="Enable SAST (SonarQube)"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={enableDast}
                  onChange={e => setEnableDast(e.target.checked)}
                  color="primary"
                />
              }
              label="Enable DAST (OWASP ZAP)"
            />
          </Box>
          <Button variant="contained" color="primary" onClick={handleCreate}>
            Approve & Generate
          </Button>
        </Box>

        <Box
          component="pre"
          sx={{
            bgcolor: '#050816',
            color: '#e0e0e0',
            p: 2,
            borderRadius: 2,
            maxHeight: 500,
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: 13
          }}
        >
          {yaml}
        </Box>
      </CardContent>
    </Card>
  );
};

