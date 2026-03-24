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
import { DeploymentDashboardPage } from './DeploymentDashboardPage';
import { DoraDashboardPage } from './DoraDashboardPage';
import { SecurityResultsPage } from './SecurityResultsPage';
import { FailedPipelinesPage } from './FailedPipelinesPage';
import { ApprovalsPage } from './ApprovalsPage';
import { BuildDashboardPage } from './BuildDashboardPage';
import { BuildStatusPage } from './BuildStatusPage';

const AppRoutes: React.FC = () => (
  <Routes>
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
    <Route path="/"                         element={<Navigate to="/login" replace />} />
  </Routes>
);

export const App: React.FC = () => {
  const location = useLocation();
  const isLogin  = location.pathname === '/login';

  if (isLogin) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*"      element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <>
      <AppHeader />
      <Box
        component="main"
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1b2a 100%)',
        }}
      >
        <AppRoutes />
      </Box>
    </>
  );
};

export default App;
