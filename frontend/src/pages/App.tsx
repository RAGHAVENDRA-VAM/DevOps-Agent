import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Container } from '@mui/material';
import { LoginPage } from './LoginPage';
import { RepoSelectionPage } from './RepoSelectionPage';
import { TechDetectionPage } from './TechDetectionPage';
import { PipelinePreviewPage } from './PipelinePreviewPage';
import { InfrastructureSelectionPage } from './InfrastructureSelectionPage';
import { DeploymentDashboardPage } from './DeploymentDashboardPage';
import { DoraDashboardPage } from './DoraDashboardPage';
import { SecurityResultsPage } from './SecurityResultsPage';
import { FailedPipelinesPage } from './FailedPipelinesPage';
import { AppHeader } from '../components/AppHeader';

export const App: React.FC = () => {
  return (
    <>
      <AppHeader />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/repos" element={<RepoSelectionPage />} />
          <Route path="/tech-detection" element={<TechDetectionPage />} />
          <Route path="/pipeline-preview" element={<PipelinePreviewPage />} />
          <Route path="/infrastructure-selection" element={<InfrastructureSelectionPage />} />
          <Route path="/deployments" element={<DeploymentDashboardPage />} />
          <Route path="/failed-pipelines" element={<FailedPipelinesPage />} />
          <Route path="/dora" element={<DoraDashboardPage />} />
          <Route path="/security" element={<SecurityResultsPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Container>
    </>
  );
};

export default App;

