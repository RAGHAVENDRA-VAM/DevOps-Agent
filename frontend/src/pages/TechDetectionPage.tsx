import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  CircularProgress,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { detectTechnologies } from '../services/techService';
import { createPipeline } from '../services/pipelineService';

interface TechDetection {
  language: string;
  framework?: string;
  buildTool?: string;
  hasDockerfile: boolean;
  hasHelm: boolean;
  hasTerraform: boolean;
}

export const TechDetectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [tech, setTech] = useState<TechDetection | null>(null);
  const [status, setStatus] = useState<'detecting' | 'creating' | 'done' | 'error'>('detecting');
  const [error, setError] = useState<string | null>(null);
  const hasCreatedPipeline = React.useRef(false);

  useEffect(() => {
    // Prevent duplicate execution
    if (hasCreatedPipeline.current) return;
    
    const selected = sessionStorage.getItem('selectedRepo');
    if (!selected) {
      navigate('/repos');
      return;
    }

    const { fullName, branch } = JSON.parse(selected);

    // Step 1: Detect technologies
    detectTechnologies(fullName, branch)
      .then(async (detectedTech) => {
        setTech(detectedTech);
        setStatus('creating');

        // Step 2: Auto-create pipeline immediately
        try {
          hasCreatedPipeline.current = true; // Mark as created
          await createPipeline({
            repoFullName: fullName,
            branch,
            tech: detectedTech,
            enableSast: true,
            enableDast: true,
          });

          // Store tech info and navigate to infrastructure selection
          sessionStorage.setItem('detectedTech', JSON.stringify(detectedTech));
          setStatus('done');
          
          // Small delay to show success, then navigate
          setTimeout(() => {
            navigate('/infrastructure-selection');
          }, 1000);
        } catch (err: any) {
          console.error('Failed to create pipeline:', err);
          setError(err.response?.data?.detail || 'Failed to create pipeline');
          setStatus('error');
          // Still navigate after showing error
          setTimeout(() => {
            sessionStorage.setItem('detectedTech', JSON.stringify(detectedTech));
            navigate('/infrastructure-selection');
          }, 3000);
        }
      })
      .catch((err) => {
        console.error('Failed to detect technologies:', err);
        setError('Failed to detect technologies. Please try again.');
        setStatus('error');
      });
  }, [navigate]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Technology Detection & Pipeline Creation
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Automatically detecting your repository stack and creating CI/CD pipeline...
        </Typography>

        {status === 'detecting' && (
          <Box mt={3} display="flex" flexDirection="column" alignItems="center" gap={2}>
            <CircularProgress />
            <Typography variant="body2">Scanning repository for technologies...</Typography>
          </Box>
        )}

        {status === 'creating' && tech && (
          <Box mt={3}>
            <Typography variant="body2" mb={2}>Detected stack:</Typography>
            <Stack direction="row" spacing={1} mb={2}>
              <Chip label={tech.language} color="primary" />
              {tech.framework && <Chip label={tech.framework} />}
              {tech.buildTool && <Chip label={tech.buildTool} />}
              {tech.hasDockerfile && (
                <Chip label="Dockerfile" color="success" variant="outlined" />
              )}
              {tech.hasHelm && <Chip label="Helm" color="success" variant="outlined" />}
              {tech.hasTerraform && (
                <Chip label="Terraform" color="success" variant="outlined" />
              )}
            </Stack>
            <Box display="flex" alignItems="center" gap={2} mt={2}>
              <CircularProgress size={20} />
              <Typography variant="body2">Creating CI/CD pipeline...</Typography>
            </Box>
          </Box>
        )}

        {status === 'done' && tech && (
          <Box mt={3}>
            <Alert severity="success" sx={{ mb: 2 }}>
              Pipeline created successfully! Redirecting to infrastructure selection...
            </Alert>
            <Stack direction="row" spacing={1}>
              <Chip label={tech.language} color="primary" />
              {tech.framework && <Chip label={tech.framework} />}
              {tech.buildTool && <Chip label={tech.buildTool} />}
            </Stack>
          </Box>
        )}

        {status === 'error' && (
          <Box mt={3}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error || 'An error occurred. Continuing to infrastructure selection...'}
            </Alert>
            {tech && (
              <Stack direction="row" spacing={1}>
                <Chip label={tech.language} color="primary" />
                {tech.framework && <Chip label={tech.framework} />}
                {tech.buildTool && <Chip label={tech.buildTool} />}
              </Stack>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

