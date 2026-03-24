import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import GitHubIcon from '@mui/icons-material/GitHub';
import Divider from '@mui/material/Divider';
import { startGithubLogin } from '../services/authService';
import '../styles/LoginPage.css';

interface FloatingNodeProps {
  style: React.CSSProperties;
}

const FloatingNode: React.FC<FloatingNodeProps> = ({ style }) => (
  <Box className="login-floating-node" style={style} />
);

const FLOATING_NODES: Array<{ top: string; left: string; animationDelay: string }> = [
  { top: '10%', left: '5%',  animationDelay: '0s'   },
  { top: '20%', left: '90%', animationDelay: '1s'   },
  { top: '50%', left: '3%',  animationDelay: '2s'   },
  { top: '70%', left: '92%', animationDelay: '0.5s' },
  { top: '85%', left: '15%', animationDelay: '1.5s' },
  { top: '15%', left: '50%', animationDelay: '2.5s' },
  { top: '90%', left: '60%', animationDelay: '3s'   },
  { top: '40%', left: '95%', animationDelay: '1.2s' },
];

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = (): void => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }
    setError('');
    startGithubLogin();
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleSignIn();
    }
  };

  return (
    <Box className="login-root">
      {/* Grid background */}
      <Box className="login-grid-bg" />

      {/* Glowing orbs */}
      <Box className="login-orb login-orb-blue" />
      <Box className="login-orb login-orb-purple" />
      <Box className="login-orb login-orb-green" />

      {/* Floating nodes */}
      {FLOATING_NODES.map((node, i) => (
        <FloatingNode
          key={i}
          style={{ top: node.top, left: node.left, animationDelay: node.animationDelay }}
        />
      ))}

      {/* Pipeline flow lines */}
      <Box className="login-lines">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="lineGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#63b3ed" stopOpacity="0" />
              <stop offset="50%"  stopColor="#63b3ed" stopOpacity="1" />
              <stop offset="100%" stopColor="#63b3ed" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="0"   y1="25%" x2="100%" y2="25%" stroke="url(#lineGrad1)" strokeWidth="1" />
          <line x1="0"   y1="50%" x2="100%" y2="50%" stroke="url(#lineGrad1)" strokeWidth="1" />
          <line x1="0"   y1="75%" x2="100%" y2="75%" stroke="url(#lineGrad1)" strokeWidth="1" />
          <line x1="20%" y1="0"   x2="20%"  y2="100%" stroke="url(#lineGrad1)" strokeWidth="1" />
          <line x1="50%" y1="0"   x2="50%"  y2="100%" stroke="url(#lineGrad1)" strokeWidth="1" />
          <line x1="80%" y1="0"   x2="80%"  y2="100%" stroke="url(#lineGrad1)" strokeWidth="1" />
        </svg>
      </Box>

      {/* Login card */}
      <Card className="login-card">
        <CardContent className="login-card-content">
          <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
            <Box className="login-logo-box">
              <RocketLaunchIcon sx={{ color: '#fff', fontSize: 32 }} />
            </Box>
            <Typography variant="h5" fontWeight={700} color="#e2e8f0" letterSpacing={0.5}>
              DevOps Agent
            </Typography>
            <Typography variant="body2" color="rgba(148,163,184,0.8)" mt={0.5}>
              Enterprise CI/CD Automation Platform
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" className="login-alert">
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Username"
            variant="outlined"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={handleKeyDown}
            className="login-field"
            sx={{ mb: 2 }}
            InputLabelProps={{ sx: { color: 'rgba(148,163,184,0.8)' } }}
          />

          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            className="login-field"
            sx={{ mb: 3 }}
            InputLabelProps={{ sx: { color: 'rgba(148,163,184,0.8)' } }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((prev) => !prev)}
                    edge="end"
                    sx={{ color: 'rgba(148,163,184,0.6)' }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            fullWidth
            variant="contained"
            onClick={handleSignIn}
            className="login-btn"
            sx={{ mb: 2 }}
          >
            Sign In
          </Button>

          <Divider sx={{ my: 1, borderColor: 'rgba(148,163,184,0.2)' }}>
            <Typography variant="caption" color="rgba(148,163,184,0.5)">
              OR
            </Typography>
          </Divider>

          <Button
            fullWidth
            variant="outlined"
            onClick={startGithubLogin}
            startIcon={<GitHubIcon />}
            className="login-github-btn"
            sx={{ mt: 1, mb: 2 }}
          >
            Login with GitHub
          </Button>

          <Typography
            variant="caption"
            color="rgba(100,116,139,0.7)"
            display="block"
            textAlign="center"
            mt={2}
          >
            Secured by OAuth 2.0 · Enterprise DevOps Platform
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};
