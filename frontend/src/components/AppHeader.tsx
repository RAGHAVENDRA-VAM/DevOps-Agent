import React from 'react';
import { AppBar, Toolbar, Typography, Box, Button } from '@mui/material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import LogoutIcon from '@mui/icons-material/Logout';

export const AppHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { label: 'Repositories', path: '/repos' },
    { label: 'Deployments', path: '/deployments' },
    { label: 'Failed Pipelines', path: '/failed-pipelines' },
    { label: 'DORA', path: '/dora' },
    { label: 'Security', path: '/security' }
  ];

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login');
  };

  // Hide header on login page
  if (location.pathname === '/login') return null;

  return (
    <AppBar position="static" elevation={0} sx={{
      background: 'rgba(10,14,26,0.95)',
      borderBottom: '1px solid rgba(99,179,237,0.12)',
      backdropFilter: 'blur(10px)',
    }}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, color: '#e2e8f0', letterSpacing: 0.5 }}>
          🚀 DevOps Agent
        </Typography>
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, mr: 2 }}>
          {tabs.map(tab => (
            <Button
              key={tab.path}
              component={RouterLink}
              to={tab.path}
              size="small"
              sx={{
                color: location.pathname === tab.path ? '#63b3ed' : 'rgba(148,163,184,0.7)',
                fontWeight: location.pathname === tab.path ? 700 : 400,
                borderBottom: location.pathname === tab.path ? '2px solid #63b3ed' : '2px solid transparent',
                borderRadius: 0,
                px: 1.5,
                '&:hover': { color: '#e2e8f0', background: 'transparent' },
              }}
            >
              {tab.label}
            </Button>
          ))}
        </Box>
        <Button
          color="error"
          size="small"
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{
            borderColor: 'rgba(239,68,68,0.4)',
            color: '#f87171',
            '&:hover': { borderColor: '#ef4444', background: 'rgba(239,68,68,0.08)' },
          }}
        >
          Logout
        </Button>
      </Toolbar>
    </AppBar>
  );
};

