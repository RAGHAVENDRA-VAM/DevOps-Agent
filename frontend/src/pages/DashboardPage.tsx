import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Chip, CircularProgress, Grid, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import StorageIcon from '@mui/icons-material/Storage';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import BugReportIcon from '@mui/icons-material/BugReport';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import ApprovalIcon from '@mui/icons-material/Approval';
import { httpClient } from '../services/httpClient';
import { listApprovals } from '../services/approvalService';
import { fetchRepositories } from '../services/repoService';

interface SummaryCard {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  path: string;
  chip?: { label: string; color: string; bg: string };
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading]         = useState(true);
  const [repoCount, setRepoCount]     = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [runningCount, setRunningCount] = useState(0);
  const [failedCount, setFailedCount]   = useState(0);
  const [deployCount, setDeployCount]   = useState(0);

  useEffect(() => {
    Promise.allSettled([
      fetchRepositories().then((r) => setRepoCount(r.length)),
      listApprovals().then((a) => {
        setPendingCount(a.filter((x) => x.status === 'pending').length);
        setRunningCount(a.filter((x) => x.status === 'running').length);
        setDeployCount(a.filter((x) => x.status === 'done').length);
      }),
      httpClient.get<{ total: number }>('/pipelines/failed?days=7').then((r) => setFailedCount(r.data.total ?? 0)),
    ]).finally(() => setLoading(false));
  }, []);

  const cards: SummaryCard[] = [
    {
      title: 'Repositories',
      value: repoCount,
      subtitle: 'Connected GitHub repos',
      icon: <StorageIcon sx={{ fontSize: 28, color: '#00897b' }} />,
      color: '#00897b', bg: 'rgba(0,150,136,0.06)',
      path: '/repos',
    },
    {
      title: 'Pending Approvals',
      value: pendingCount,
      subtitle: 'Awaiting your approval',
      icon: <ApprovalIcon sx={{ fontSize: 28, color: '#d97706' }} />,
      color: '#d97706', bg: 'rgba(245,158,11,0.06)',
      path: '/approvals',
      chip: pendingCount > 0 ? { label: 'Action needed', color: '#d97706', bg: 'rgba(245,158,11,0.1)' } : undefined,
    },
    {
      title: 'Active Deployments',
      value: runningCount,
      subtitle: 'Pipelines currently running',
      icon: <RocketLaunchIcon sx={{ fontSize: 28, color: '#3b82f6' }} />,
      color: '#3b82f6', bg: 'rgba(59,130,246,0.06)',
      path: '/deployments',
    },
    {
      title: 'Successful Deploys',
      value: deployCount,
      subtitle: 'Completed deployments',
      icon: <CheckCircleIcon sx={{ fontSize: 28, color: '#16a34a' }} />,
      color: '#16a34a', bg: 'rgba(34,197,94,0.06)',
      path: '/deployments',
    },
    {
      title: 'Failed Pipelines',
      value: failedCount,
      subtitle: 'Last 7 days',
      icon: <ErrorIcon sx={{ fontSize: 28, color: '#dc2626' }} />,
      color: '#dc2626', bg: 'rgba(239,68,68,0.06)',
      path: '/failed-pipelines',
      chip: failedCount > 0 ? { label: 'Needs attention', color: '#dc2626', bg: 'rgba(239,68,68,0.1)' } : undefined,
    },
    {
      title: 'Build Monitor',
      value: '—',
      subtitle: 'Real-time build status',
      icon: <SpeedIcon sx={{ fontSize: 28, color: '#7c3aed' }} />,
      color: '#7c3aed', bg: 'rgba(139,92,246,0.06)',
      path: '/builds',
    },
    {
      title: 'DORA Metrics',
      value: '—',
      subtitle: 'Deployment frequency & MTTR',
      icon: <SpeedIcon sx={{ fontSize: 28, color: '#0284c7' }} />,
      color: '#0284c7', bg: 'rgba(14,165,233,0.06)',
      path: '/dora',
    },
    {
      title: 'Security Scans',
      value: '—',
      subtitle: 'SAST & DAST results',
      icon: <SecurityIcon sx={{ fontSize: 28, color: '#dc2626' }} />,
      color: '#dc2626', bg: 'rgba(239,68,68,0.06)',
      path: '/security',
    },
    {
      title: 'Failed Pipelines AI',
      value: '—',
      subtitle: 'AI-powered error analysis',
      icon: <BugReportIcon sx={{ fontSize: 28, color: '#d97706' }} />,
      color: '#d97706', bg: 'rgba(245,158,11,0.06)',
      path: '/failed-pipelines',
    },
  ];

  return (
    <Box sx={{
      height: '100%', overflow: 'hidden',
      background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 50%, #eef2ff 100%)',
      p: '10px 20px', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <Box mb={1} flexShrink={0}>
        <Typography fontWeight={700} fontSize="0.95rem" color="#000000">Dashboard</Typography>
        <Typography fontSize="0.75rem" color="#6b7280">Overview of your DevOps Agent platform</Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
          <CircularProgress size={28} sx={{ color: '#009688' }} />
        </Box>
      ) : (
        <Grid container spacing={1.5} sx={{ flex: 1, alignContent: 'flex-start' }}>
          {cards.map((card) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={card.title}>
              <Card
                onClick={() => navigate(card.path)}
                sx={{
                  cursor: 'pointer',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s',
                  '&:hover': {
                    borderColor: card.color,
                    boxShadow: `0 4px 16px rgba(0,0,0,0.1)`,
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardContent sx={{ p: '10px 12px !important' }}>
                  <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={0.75}>
                    <Box sx={{ p: 0.75, borderRadius: '8px', background: card.bg }}>
                      {card.icon}
                    </Box>
                    {card.chip && (
                      <Chip label={card.chip.label} size="small"
                        sx={{ fontSize: 9, height: 18, color: card.chip.color, bgcolor: card.chip.bg,
                          border: `1px solid ${card.chip.color}40` }} />
                    )}
                  </Box>
                  <Typography fontWeight={700} fontSize="1.4rem" color={card.color} lineHeight={1}>
                    {card.value}
                  </Typography>
                  <Typography fontWeight={600} fontSize="0.78rem" color="#000000" mt={0.25}>
                    {card.title}
                  </Typography>
                  <Typography fontSize="0.7rem" color="#6b7280" mt={0.25}>
                    {card.subtitle}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};
