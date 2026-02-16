import React from 'react';
import { Card, CardContent, Typography, Grid } from '@mui/material';

export const SecurityResultsPage: React.FC = () => {
  // Placeholder view. Will bind to /api/security/sast and /api/security/dast.
  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Security Scan Results
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          View consolidated SAST (SonarQube) and DAST (OWASP ZAP) results with quality gates and
          remediation guidance.
        </Typography>
        <Grid container spacing={3} mt={1}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1">SAST (SonarQube)</Typography>
                <Typography variant="body2" color="text.secondary">
                  Summary of issues by severity, quality gate status, and links to SonarQube UI.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1">DAST (OWASP ZAP)</Typography>
                <Typography variant="body2" color="text.secondary">
                  Summary of active scan alerts, risk levels, and links to ZAP reports.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

