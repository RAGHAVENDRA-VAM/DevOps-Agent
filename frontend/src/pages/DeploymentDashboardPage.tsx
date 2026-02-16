import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Link
} from '@mui/material';

export const DeploymentDashboardPage: React.FC = () => {
  // Placeholder table; data is provided by backend /api/deployments in real implementation.
  const rows: Array<{
    id: string;
    repo: string;
    env: string;
    status: 'success' | 'failed' | 'running';
    url?: string;
  }> = [];

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Deployment Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Track deployment status across environments, with quick links to logs and runtime
          endpoints.
        </Typography>

        <Table size="small" sx={{ mt: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>Deployment</TableCell>
              <TableCell>Repository</TableCell>
              <TableCell>Environment</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Endpoint</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">
                    No deployments yet. Generate a pipeline and trigger a deployment to see
                    runtime status here.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {rows.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.id}</TableCell>
                <TableCell>{row.repo}</TableCell>
                <TableCell>{row.env}</TableCell>
                <TableCell>
                  <Chip
                    label={row.status}
                    color={
                      row.status === 'success'
                        ? 'success'
                        : row.status === 'failed'
                        ? 'error'
                        : 'warning'
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {row.url && (
                    <Link href={row.url} target="_blank" rel="noreferrer">
                      Open
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

