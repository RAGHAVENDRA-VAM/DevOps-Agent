import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Link
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import DownloadIcon from '@mui/icons-material/Download';
import { useNavigate } from 'react-router-dom';
import {
  getWorkflowRuns,
  getWorkflowJobs,
  getWorkflowLogs,
  getWorkflowArtifacts,
  WorkflowRun,
  WorkflowJob,
  WorkflowLog,
  Artifact
} from '../services/buildService';

export const BuildStatusPage: React.FC = () => {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const selected = sessionStorage.getItem('selectedRepo');
    if (!selected) {
      navigate('/repos');
      return;
    }

    const { fullName, branch } = JSON.parse(selected);
    const [owner, repo] = fullName.split('/');

    // Fetch workflow runs
    getWorkflowRuns(owner, repo, branch)
      .then(data => {
        setRuns(data.runs);
        if (data.runs.length > 0) {
          loadRunDetails(owner, repo, data.runs[0]);
        }
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load workflow runs');
        setLoading(false);
      });
  }, [navigate]);

  const loadRunDetails = async (owner: string, repo: string, run: WorkflowRun) => {
    setSelectedRun(run);
    
    try {
      const [jobsData, logsData, artifactsData] = await Promise.all([
        getWorkflowJobs(owner, repo, run.id),
        getWorkflowLogs(owner, repo, run.id),
        getWorkflowArtifacts(owner, repo, run.id)
      ]);
      
      setJobs(jobsData.jobs);
      setLogs(logsData.logs);
      setArtifacts(artifactsData.artifacts);
    } catch (err) {
      console.error('Failed to load run details:', err);
    }
  };

  const getStatusIcon = (status: string, conclusion: string | null) => {
    if (status === 'completed') {
      return conclusion === 'success' ? (
        <CheckCircleIcon color="success" />
      ) : (
        <ErrorIcon color="error" />
      );
    }
    return <HourglassEmptyIcon color="warning" />;
  };

  const getStatusColor = (status: string, conclusion: string | null) => {
    if (status === 'completed') {
      return conclusion === 'success' ? 'success' : 'error';
    }
    return 'warning';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Build Status
      </Typography>

      {runs.length === 0 ? (
        <Alert severity="info">
          No workflow runs found. Create a pipeline first to see builds here.
        </Alert>
      ) : (
        <Box display="flex" gap={2}>
          {/* Left: Runs List */}
          <Card sx={{ width: '30%', maxHeight: '80vh', overflow: 'auto' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Runs
              </Typography>
              {runs.map(run => (
                <Card
                  key={run.id}
                  sx={{
                    mb: 1,
                    cursor: 'pointer',
                    border: selectedRun?.id === run.id ? '2px solid #1976d2' : 'none'
                  }}
                  onClick={() => {
                    const selected = sessionStorage.getItem('selectedRepo');
                    if (selected) {
                      const { fullName } = JSON.parse(selected);
                      const [owner, repo] = fullName.split('/');
                      loadRunDetails(owner, repo, run);
                    }
                  }}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      {getStatusIcon(run.status, run.conclusion)}
                      <Typography variant="body2" fontWeight="bold">
                        #{run.run_number}
                      </Typography>
                      <Chip
                        label={run.status}
                        size="small"
                        color={getStatusColor(run.status, run.conclusion) as any}
                      />
                    </Box>
                    <Typography variant="caption" display="block" noWrap>
                      {run.commit_message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {run.commit_sha} • {new Date(run.created_at).toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* Right: Run Details */}
          <Box sx={{ width: '70%' }}>
            {selectedRun && (
              <>
                {/* Run Info */}
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="h6">
                          {selectedRun.name} #{selectedRun.run_number}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedRun.commit_message}
                        </Typography>
                      </Box>
                      <Box display="flex" gap={1}>
                        <Chip
                          label={selectedRun.status}
                          color={getStatusColor(selectedRun.status, selectedRun.conclusion) as any}
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          href={selectedRun.html_url}
                          target="_blank"
                        >
                          View on GitHub
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

                {/* Jobs */}
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Jobs
                    </Typography>
                    {jobs.map(job => (
                      <Accordion key={job.id}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box display="flex" alignItems="center" gap={1} width="100%">
                            {getStatusIcon(job.status, job.conclusion)}
                            <Typography>{job.name}</Typography>
                            <Chip
                              label={job.status}
                              size="small"
                              color={getStatusColor(job.status, job.conclusion) as any}
                              sx={{ ml: 'auto' }}
                            />
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          {job.steps.map(step => (
                            <Box key={step.number} display="flex" alignItems="center" gap={1} mb={1}>
                              {getStatusIcon(step.status, step.conclusion)}
                              <Typography variant="body2">{step.name}</Typography>
                              <Chip
                                label={step.status}
                                size="small"
                                color={getStatusColor(step.status, step.conclusion) as any}
                              />
                            </Box>
                          ))}
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </CardContent>
                </Card>

                {/* Logs */}
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Logs
                    </Typography>
                    {logs.map(log => (
                      <Accordion key={log.job_id}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography>{log.job_name}</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box
                            component="pre"
                            sx={{
                              bgcolor: '#1e1e1e',
                              color: '#d4d4d4',
                              p: 2,
                              borderRadius: 1,
                              maxHeight: 400,
                              overflow: 'auto',
                              fontSize: 12,
                              fontFamily: 'monospace'
                            }}
                          >
                            {log.content}
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </CardContent>
                </Card>

                {/* Artifacts */}
                {artifacts.length > 0 && (
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Artifacts
                      </Typography>
                      {artifacts.map(artifact => (
                        <Box
                          key={artifact.id}
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                          p={1}
                          mb={1}
                          sx={{ bgcolor: '#f5f5f5', borderRadius: 1 }}
                        >
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {artifact.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {(artifact.size_in_bytes / 1024 / 1024).toFixed(2)} MB
                            </Typography>
                          </Box>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<DownloadIcon />}
                            onClick={() => {
                              sessionStorage.setItem('selectedArtifact', JSON.stringify(artifact));
                              navigate('/deployment-selection');
                            }}
                          >
                            Deploy
                          </Button>
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};
