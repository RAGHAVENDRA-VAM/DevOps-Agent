import React, { useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FolderIcon from '@mui/icons-material/Folder';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import { useNavigate } from 'react-router-dom';
import { fetchRepositories, type Repository } from '../services/repoService';
import '../styles/RepoSelectionPage.css';

const LANG_COLOR: Record<string, string> = {
  python:     '#3b82f6',
  javascript: '#f59e0b',
  typescript: '#3b82f6',
  java:       '#ef4444',
  go:         '#10b981',
  rust:       '#f97316',
  ruby:       '#ec4899',
  csharp:     '#8b5cf6',
};

export const RepoSelectionPage: React.FC = () => {
  const [repos, setRepos]       = useState<Repository[]>([]);
  const [query, setQuery]       = useState('');
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRepositories()
      .then(setRepos)
      .catch(() => setRepos([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = repos.filter((r) =>
    r.full_name.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSelect = (repo: Repository): void => {
    setSelected(repo.id);
    sessionStorage.setItem(
      'selectedRepo',
      JSON.stringify({ fullName: repo.full_name, branch: repo.default_branch }),
    );
    setTimeout(() => navigate('/deploy-config'), 300);
  };

  return (
    <Box className="repo-root">
      <Box className="repo-header">
        <Typography variant="h5" className="repo-title" gutterBottom>
          Select Repository
        </Typography>
        <Typography variant="body2" className="repo-subtitle">
          Choose a repository to auto-detect its tech stack and generate a CI/CD pipeline
        </Typography>
      </Box>

      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search repositories…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="repo-search"
          sx={{ maxWidth: 480 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'rgba(148,163,184,0.5)' }} />
              </InputAdornment>
            ),
          }}
        />
        <Chip
          label={loading ? 'Loading…' : `${filtered.length} repositories`}
          className="repo-count-chip"
        />
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height={300}>
          <CircularProgress sx={{ color: '#63b3ed' }} />
        </Box>
      ) : (
        <Box className="repo-grid">
          {filtered.map((repo) => {
            const lang  = (repo.language ?? '').toLowerCase();
            const color = LANG_COLOR[lang] ?? '#64748b';
            const isSelected = selected === repo.id;

            return (
              <Box
                key={repo.id}
                onClick={() => handleSelect(repo)}
                className={`repo-card${isSelected ? ' selected' : ''}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSelect(repo)}
                aria-label={`Select repository ${repo.full_name}`}
              >
                <Box display="flex" alignItems="flex-start" gap={1.5}>
                  <Avatar className="repo-avatar">
                    <FolderIcon sx={{ color: '#63b3ed', fontSize: 20 }} />
                  </Avatar>
                  <Box flex={1} minWidth={0}>
                    <Typography fontWeight={600} color="#e2e8f0" noWrap fontSize={14}>
                      {repo.full_name}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1} mt={0.8} flexWrap="wrap">
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <CallSplitIcon sx={{ fontSize: 12, color: 'rgba(148,163,184,0.5)' }} />
                        <Typography variant="caption" color="rgba(148,163,184,0.6)">
                          {repo.default_branch}
                        </Typography>
                      </Box>
                      {repo.language && (
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <Box
                            className="repo-lang-dot"
                            sx={{ bgcolor: color }}
                          />
                          <Typography variant="caption" color="rgba(148,163,184,0.6)">
                            {repo.language}
                          </Typography>
                        </Box>
                      )}
                      <Chip
                        label={repo.private ? 'Private' : 'Public'}
                        size="small"
                        className={repo.private ? 'repo-badge-private' : 'repo-badge-public'}
                      />
                    </Box>
                  </Box>
                </Box>
              </Box>
            );
          })}

          {filtered.length === 0 && (
            <Box className="repo-empty">
              <Typography color="rgba(148,163,184,0.5)">No repositories found</Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};
