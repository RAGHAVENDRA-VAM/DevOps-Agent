import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Alert,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { startGithubLogin } from '../services/authService';

// Animated floating node component
const FloatingNode: React.FC<{ style: React.CSSProperties }> = ({ style }) => (
  <Box
    sx={{
      position: 'absolute',
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: 'rgba(99,179,237,0.6)',
      boxShadow: '0 0 10px rgba(99,179,237,0.8)',
      animation: 'float 6s ease-in-out infinite',
      ...style,
    }}
  />
);

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleDummyLogin = () => {
    if (!username || !password) {
      setError('Please enter username and password.');
      return;
    }
    // Dummy auth - accept any credentials
    setError('');
    startGithubLogin();
  };

  const nodes = [
    { top: '10%', left: '5%', animationDelay: '0s' },
    { top: '20%', left: '90%', animationDelay: '1s' },
    { top: '50%', left: '3%', animationDelay: '2s' },
    { top: '70%', left: '92%', animationDelay: '0.5s' },
    { top: '85%', left: '15%', animationDelay: '1.5s' },
    { top: '15%', left: '50%', animationDelay: '2.5s' },
    { top: '90%', left: '60%', animationDelay: '3s' },
    { top: '40%', left: '95%', animationDelay: '1.2s' },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1b2a 40%, #0a1628 70%, #050d1a 100%)',
        overflow: 'hidden',
        '@keyframes float': {
          '0%, 100%': { transform: 'translateY(0px)', opacity: 0.6 },
          '50%': { transform: 'translateY(-20px)', opacity: 1 },
        },
        '@keyframes pulse': {
          '0%, 100%': { opacity: 0.3 },
          '50%': { opacity: 0.7 },
        },
        '@keyframes dash': {
          to: { strokeDashoffset: -100 },
        },
      }}
    >
      {/* Grid background */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(99,179,237,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,179,237,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Glowing orbs */}
      <Box sx={{
        position: 'absolute', top: '15%', left: '10%', width: 300, height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)',
        animation: 'pulse 4s ease-in-out infinite',
      }} />
      <Box sx={{
        position: 'absolute', bottom: '15%', right: '10%', width: 400, height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
        animation: 'pulse 5s ease-in-out infinite',
        animationDelay: '2s',
      }} />
      <Box sx={{
        position: 'absolute', top: '50%', left: '50%', width: 500, height: 500,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 70%)',
        animation: 'pulse 6s ease-in-out infinite',
        animationDelay: '1s',
      }} />

      {/* Floating nodes */}
      {nodes.map((n, i) => (
        <FloatingNode key={i} style={{ top: n.top, left: n.left, animationDelay: n.animationDelay }} />
      ))}

      {/* Pipeline flow lines */}
      <Box sx={{ position: 'absolute', inset: 0, opacity: 0.15 }}>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="lineGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#63b3ed" stopOpacity="0" />
              <stop offset="50%" stopColor="#63b3ed" stopOpacity="1" />
              <stop offset="100%" stopColor="#63b3ed" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="0" y1="25%" x2="100%" y2="25%" stroke="url(#lineGrad1)" strokeWidth="1" />
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="url(#lineGrad1)" strokeWidth="1" />
          <line x1="0" y1="75%" x2="100%" y2="75%" stroke="url(#lineGrad1)" strokeWidth="1" />
          <line x1="20%" y1="0" x2="20%" y2="100%" stroke="url(#lineGrad1)" strokeWidth="1" />
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="url(#lineGrad1)" strokeWidth="1" />
          <line x1="80%" y1="0" x2="80%" y2="100%" stroke="url(#lineGrad1)" strokeWidth="1" />
        </svg>
      </Box>

      {/* Login Card */}
      <Card
        sx={{
          width: '100%',
          maxWidth: 440,
          position: 'relative',
          zIndex: 10,
          background: 'rgba(13, 25, 48, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(99,179,237,0.2)',
          borderRadius: 3,
          boxShadow: '0 0 40px rgba(99,179,237,0.1), 0 25px 50px rgba(0,0,0,0.5)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Logo & Title */}
          <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
            <Box
              sx={{
                width: 60, height: 60, borderRadius: 2,
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mb: 2,
                boxShadow: '0 0 20px rgba(59,130,246,0.4)',
              }}
            >
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
            <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
              {error}
            </Alert>
          )}

          {/* Username */}
          <TextField
            fullWidth
            label="Username"
            variant="outlined"
            value={username}
            onChange={e => setUsername(e.target.value)}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: '#e2e8f0',
                '& fieldset': { borderColor: 'rgba(99,179,237,0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(99,179,237,0.6)' },
                '&.Mui-focused fieldset': { borderColor: '#63b3ed' },
              },
              '& .MuiInputLabel-root': { color: 'rgba(148,163,184,0.8)' },
              '& .MuiInputLabel-root.Mui-focused': { color: '#63b3ed' },
            }}
          />

          {/* Password */}
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            variant="outlined"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleDummyLogin()}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: 'rgba(148,163,184,0.6)' }}>
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                color: '#e2e8f0',
                '& fieldset': { borderColor: 'rgba(99,179,237,0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(99,179,237,0.6)' },
                '&.Mui-focused fieldset': { borderColor: '#63b3ed' },
              },
              '& .MuiInputLabel-root': { color: 'rgba(148,163,184,0.8)' },
              '& .MuiInputLabel-root.Mui-focused': { color: '#63b3ed' },
            }}
          />

          {/* Sign In Button */}
          <Button
            fullWidth
            variant="contained"
            onClick={handleDummyLogin}
            sx={{
              mb: 2, py: 1.3, fontWeight: 700, fontSize: 15,
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              boxShadow: '0 0 20px rgba(59,130,246,0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                boxShadow: '0 0 30px rgba(59,130,246,0.5)',
              },
            }}
          >
            Sign In
          </Button>

          <Typography variant="caption" color="rgba(100,116,139,0.7)" display="block" textAlign="center" mt={2}>
            Secured by OAuth 2.0 · Enterprise DevOps Platform
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};
