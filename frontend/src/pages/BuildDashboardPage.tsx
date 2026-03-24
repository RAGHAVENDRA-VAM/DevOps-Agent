import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  Grid,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { BuildMonitor } from '../components/BuildMonitor';

interface MonitoredRepo {
  owner: string;
  name: string;
  id: string;
}

export const BuildDashboardPage: React.FC = () => {
  const [monitoredRepos, setMonitoredRepos] = useState<MonitoredRepo[]>([]);
  const [newRepoOwner, setNewRepoOwner] = useState('');
  const [newRepoName, setNewRepoName] = useState('');

  // Load monitored repos from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('monitored_repos');
    if (saved) {
      try {
        setMonitoredRepos(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load monitored repos:', error);
      }
    }
  }, []);

  // Save monitored repos to localStorage
  useEffect(() => {
    localStorage.setItem('monitored_repos', JSON.stringify(monitoredRepos));
  }, [monitoredRepos]);

  const addRepository = () => {
    if (!newRepoOwner.trim() || !newRepoName.trim()) {
      return;
    }

    const id = `${newRepoOwner}/${newRepoName}`;
    if (monitoredRepos.some(repo => repo.id === id)) {
      return; // Already monitoring
    }

    setMonitoredRepos(prev => [...prev, {
      owner: newRepoOwner.trim(),
      name: newRepoName.trim(),
      id
    }]);

    setNewRepoOwner('');
    setNewRepoName('');
  };

  const removeRepository = (id: string) => {
    setMonitoredRepos(prev => prev.filter(repo => repo.id !== id));
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Build Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Monitor build status and view real-time logs for your repositories
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Add Repository to Monitor
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label="Repository Owner"
              value={newRepoOwner}
              onChange={(e) => setNewRepoOwner(e.target.value)}
              placeholder="e.g., microsoft"
              size="small"
            />
            <TextField
              label="Repository Name"
              value={newRepoName}
              onChange={(e) => setNewRepoName(e.target.value)}
              placeholder="e.g., vscode"
              size="small"
            />
            <Button
              startIcon={<AddIcon />}
              onClick={addRepository}
              variant="contained"
              disabled={!newRepoOwner.trim() || !newRepoName.trim()}
            >
              Add
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {monitoredRepos.length === 0 ? (
        <Alert severity="info">
          No repositories are being monitored. Add a repository above to get started.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {monitoredRepos.map((repo) => (
            <Grid item xs={12} lg={6} key={repo.id}>
              <Box position="relative">
                <BuildMonitor
                  repoOwner={repo.owner}
                  repoName={repo.name}
                />
                <Button
                  onClick={() => removeRepository(repo.id)}
                  size="small"
                  color="error"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    minWidth: 'auto',
                    px: 1
                  }}
                >
                  ×
                </Button>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};