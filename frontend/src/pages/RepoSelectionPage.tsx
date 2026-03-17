import React, { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Chip, CircularProgress,
  InputAdornment, Avatar
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FolderIcon from '@mui/icons-material/Folder';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import { useNavigate } from 'react-router-dom';
import { fetchRepositories } from '../services/repoService';

interface Repo {
  id: number;
  name: string;
  full_name: string;
  default_branch: string;
  language?: string;
  private?: boolean;
}

const langColor: Record<string, string> = {
  python: '#3b82f6', javascript: '#f59e0b', typescript: '#3b82f6',
  java: '#ef4444', go: '#10b981', rust: '#f97316', ruby: '#ec4899',
  csharp: '#8b5cf6',
};

export const RepoSelectionPage: React.FC = () => {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRepositories()
      .then(setRepos)
      .catch(() => setRepos([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = repos.filter(r =>
    r.full_name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (repo: Repo) => {
    setSelected(repo.id);
    sessionStorage.setItem('selectedRepo', JSON.stringify({ fullName: repo.full_name, branch: repo.default_branch }));
    setTimeout(() => navigate('/deploy-config'), 300);
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1b2a 100%)', p: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight={700} color="#e2e8f0" gutterBottom>
          Select Repository
        </Typography>
        <Typography variant="body2" color="rgba(148,163,184,0.7)">
          Choose a repository to auto-detect its tech stack and generate a CI/CD pipeline
        </Typography>
      </Box>

      {/* Search + count */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search repositories..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'rgba(148,163,184,0.5)' }} /></InputAdornment>,
          }}
          sx={{
            maxWidth: 480,
            '& .MuiOutlinedInput-root': {
              color: '#e2e8f0',
              background: 'rgba(255,255,255,0.04)',
              '& fieldset': { borderColor: 'rgba(99,179,237,0.2)' },
              '&:hover fieldset': { borderColor: 'rgba(99,179,237,0.4)' },
              '&.Mui-focused fieldset': { borderColor: '#63b3ed' },
            },
            '& input::placeholder': { color: 'rgba(148,163,184,0.4)' },
          }}
        />
        <Chip
          label={loading ? 'Loading...' : `${filtered.length} repositories`}
          sx={{ background: 'rgba(99,179,237,0.1)', color: '#63b3ed', border: '1px solid rgba(99,179,237,0.2)' }}
        />
      </Box>

      {/* Repo Grid */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height={300}>
          <CircularProgress sx={{ color: '#63b3ed' }} />
        </Box>
      ) : (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 2,
          maxHeight: 'calc(100vh - 260px)',
          overflowY: 'auto',
          pr: 1,
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: 'rgba(99,179,237,0.3)', borderRadius: 3 },
        }}>
          {filtered.map(repo => {
            const lang = (repo.language || '').toLowerCase();
            const color = langColor[lang] || '#64748b';
            const isSelected = selected === repo.id;
            return (
              <Box
                key={repo.id}
                onClick={() => handleSelect(repo)}
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  border: `1px solid ${isSelected ? 'rgba(99,179,237,0.6)' : 'rgba(99,179,237,0.12)'}`,
                  background: isSelected ? 'rgba(99,179,237,0.08)' : 'rgba(13,25,48,0.8)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    border: '1px solid rgba(99,179,237,0.4)',
                    background: 'rgba(99,179,237,0.06)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
                  },
                }}
              >
                <Box display="flex" alignItems="flex-start" gap={1.5}>
                  <Avatar sx={{ bgcolor: 'rgba(99,179,237,0.1)', width: 36, height: 36 }}>
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
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                          <Typography variant="caption" color="rgba(148,163,184,0.6)">
                            {repo.language}
                          </Typography>
                        </Box>
                      )}
                      <Chip
                        label={repo.private ? 'Private' : 'Public'}
                        size="small"
                        sx={{
                          height: 18, fontSize: 10,
                          bgcolor: repo.private ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                          color: repo.private ? '#f87171' : '#34d399',
                          border: `1px solid ${repo.private ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                        }}
                      />
                    </Box>
                  </Box>
                </Box>
              </Box>
            );
          })}
          {filtered.length === 0 && !loading && (
            <Box gridColumn="1/-1" textAlign="center" py={8}>
              <Typography color="rgba(148,163,184,0.5)">No repositories found</Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};
