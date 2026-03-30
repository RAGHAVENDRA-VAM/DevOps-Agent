import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { AppHeader } from '../components/AppHeader';
import { LoginPage } from './LoginPage';
import { RepoSelectionPage } from './RepoSelectionPage';
import { TechDetectionPage } from './TechDetectionPage';
import { PipelinePreviewPage } from './PipelinePreviewPage';
import { InfrastructureSelectionPage } from './InfrastructureSelectionPage';
import { DeployConfigPage } from './DeployConfigPage';
import { ProvisioningPage } from './ProvisioningPage';
import { DashboardPage } from './DashboardPage';
import { DeploymentDashboardPage } from './DeploymentDashboardPage';
import { DoraDashboardPage } from './DoraDashboardPage';
import { SecurityResultsPage } from './SecurityResultsPage';
import { FailedPipelinesPage } from './FailedPipelinesPage';
import { ApprovalsPage } from './ApprovalsPage';
import { BuildDashboardPage } from './BuildDashboardPage';
import { BuildStatusPage } from './BuildStatusPage';

const HEADER_HEIGHT = 64; // px — matches AppBar height

// Pages that should scroll (approvals has dynamic content)
const SCROLLABLE_ROUTES = ['/approvals'];

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/dashboard"              element={<DashboardPage />}              />
    <Route path="/approvals"               element={<ApprovalsPage />}              />
    <Route path="/repos"                    element={<RepoSelectionPage />}          />
    <Route path="/deploy-config"            element={<DeployConfigPage />}           />
    <Route path="/provisioning"             element={<ProvisioningPage />}           />
    <Route path="/tech-detection"           element={<TechDetectionPage />}          />
    <Route path="/pipeline-preview"         element={<PipelinePreviewPage />}        />
    <Route path="/infrastructure-selection" element={<InfrastructureSelectionPage />} />
    <Route path="/deployments"              element={<DeploymentDashboardPage />}    />
    <Route path="/failed-pipelines"         element={<FailedPipelinesPage />}        />
    <Route path="/dora"                     element={<DoraDashboardPage />}          />
    <Route path="/security"                 element={<SecurityResultsPage />}        />
    <Route path="/builds"                   element={<BuildDashboardPage />}         />
    <Route path="/build-status"             element={<BuildStatusPage />}            />
    <Route path="/"                         element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

export const App: React.FC = () => {
  const location = useLocation();
  const isLogin  = location.pathname === '/login';
  const isScrollable = SCROLLABLE_ROUTES.includes(location.pathname);

  if (isLogin) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*"      element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppHeader />
      <Box
        sx={{
          flex: 1,
          mt: `${HEADER_HEIGHT}px`,
          overflow: isScrollable ? 'auto' : 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <AppRoutes />
      </Box>
    </Box>
  );
};

export default App;
