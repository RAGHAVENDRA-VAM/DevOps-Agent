import React from 'react';
import { Card, CardContent, Typography, Grid } from '@mui/material';

export const DoraDashboardPage: React.FC = () => {
  // Placeholder. In a real implementation, this page calls /api/metrics/dora
  // with time filters and repo selection, then renders charts.
  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          DORA Metrics
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Visualize deployment frequency, lead time for changes, change failure rate, and MTTR
          across repositories and environments.
        </Typography>
        <Grid container spacing={3} mt={1}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1">Deployment Frequency</Typography>
                <Typography variant="body2" color="text.secondary">
                  Line/bar chart placeholder. Integrate a chart library and bind to DORA API.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1">Lead Time for Changes</Typography>
                <Typography variant="body2" color="text.secondary">
                  Line chart placeholder for time-to-production per change.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1">Change Failure Rate</Typography>
                <Typography variant="body2" color="text.secondary">
                  Bar chart placeholder showing failed vs successful deployments.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1">MTTR</Typography>
                <Typography variant="body2" color="text.secondary">
                  Visualization placeholder for mean time to recovery.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

