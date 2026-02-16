import React from 'react';
import { AppBar, Toolbar, Typography, Box, Button } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';

export const AppHeader: React.FC = () => {
  const location = useLocation();

  const tabs = [
    { label: 'Repositories', path: '/repos' },
    { label: 'Deployments', path: '/deployments' },
    { label: 'Failed Pipelines', path: '/failed-pipelines' },
    { label: 'DORA', path: '/dora' },
    { label: 'Security', path: '/security' }
  ];

  return (
    <AppBar position="static" color="transparent" elevation={0}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
          DevOps Agent Platform
        </Typography>
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, mr: 2 }}>
          {tabs.map(tab => (
            <Button
              key={tab.path}
              component={RouterLink}
              to={tab.path}
              variant={location.pathname === tab.path ? 'contained' : 'text'}
              color="primary"
              size="small"
            >
              {tab.label}
            </Button>
          ))}
        </Box>
        <Button
          component={RouterLink}
          to="/login"
          color="secondary"
          size="small"
          variant="outlined"
        >
          Login
        </Button>
      </Toolbar>
    </AppBar>
  );
};

