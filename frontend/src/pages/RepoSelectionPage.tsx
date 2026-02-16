import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Stack
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { fetchRepositories } from '../services/repoService';

interface Repo {
  id: number;
  name: string;
  full_name: string;
  default_branch: string;
}

export const RepoSelectionPage: React.FC = () => {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchRepositories()
      .then(setRepos)
      .catch(() => {
        setRepos([]);
      });
  }, []);

  const filtered = repos.filter(r =>
    r.full_name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (repo: Repo) => {
    sessionStorage.setItem(
      'selectedRepo',
      JSON.stringify({ fullName: repo.full_name, branch: repo.default_branch })
    );
    navigate('/tech-detection');
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Repository Selection
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Choose the repository and branch that you want the DevOps Agent to manage.
        </Typography>
        <Stack direction="row" spacing={2} mt={2} mb={2}>
          <TextField
            size="small"
            label="Search repositories"
            value={query}
            onChange={e => setQuery(e.target.value)}
            fullWidth
          />
          <Chip label={`${filtered.length} repositories`} />
        </Stack>
        <Box maxHeight={480} sx={{ overflowY: 'auto' }}>
          <List>
            {filtered.map(repo => (
              <ListItemButton key={repo.id} onClick={() => handleSelect(repo)}>
                <ListItemText
                  primary={repo.full_name}
                  secondary={`Default branch: ${repo.default_branch}`}
                />
              </ListItemButton>
            ))}
            {filtered.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No repositories found. Ensure you are logged in and GitHub access is configured
                correctly.
              </Typography>
            )}
          </List>
        </Box>
      </CardContent>
    </Card>
  );
};

