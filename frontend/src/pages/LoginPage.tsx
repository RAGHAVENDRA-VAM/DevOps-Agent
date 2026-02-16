import React from 'react';
import { Box, Button, Card, CardContent, Typography } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import { startGithubLogin } from '../services/authService';

export const LoginPage: React.FC = () => {
  const handleLogin = () => {
    startGithubLogin();
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
      <Card sx={{ maxWidth: 480, width: '100%' }}>
        <CardContent>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Sign in with GitHub
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Connect your GitHub account to let the DevOps Agent discover repositories,
            generate CI/CD pipelines, and orchestrate deployments.
          </Typography>
          <Box mt={3}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              startIcon={<GitHubIcon />}
              onClick={handleLogin}
            >
              Continue with GitHub
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

