import React from 'react';
import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import LogoutIcon from '@mui/icons-material/Logout';
import '../styles/AppHeader.css';

interface NavTab {
  label: string;
  path: string;
}

const NAV_TABS: NavTab[] = [
  { label: 'Dashboard',       path: '/dashboard'        },
  { label: 'Approvals',        path: '/approvals'        },
  { label: 'Repositories',     path: '/repos'            },
  { label: 'Deployments',      path: '/deployments'      },
  { label: 'Builds',           path: '/builds'           },
  { label: 'Failed Pipelines', path: '/failed-pipelines' },
  { label: 'DORA',             path: '/dora'             },
  { label: 'Security',         path: '/security'         },
];

export const AppHeader: React.FC = () => {
  const location = useLocation();
  const navigate  = useNavigate();

  if (location.pathname === '/login') return null;

  const handleLogout = (): void => {
    sessionStorage.clear();
    navigate('/login');
  };

  return (
    <AppBar position="fixed" elevation={0} className="header-root">
      <Toolbar>
        <Typography className="header-brand">
          DevOps Agent
        </Typography>

        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, mr: 2 }}>
          {NAV_TABS.map((tab) => (
            <Button
              key={tab.path}
              component={RouterLink}
              to={tab.path}
              size="small"
              className={`header-nav-btn ${location.pathname === tab.path ? 'active' : 'inactive'}`}
            >
              {tab.label}
            </Button>
          ))}
        </Box>

        <Button
          variant="outlined"
          size="small"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          className="header-logout-btn"
        >
          Logout
        </Button>
      </Toolbar>
    </AppBar>
  );
};
