import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      light:   '#26a69a',
      main:    '#00897b',
      dark:    '#00695c',
      contrastText: '#fff',
    },
    secondary: {
      main: '#6b7280',
      contrastText: '#fff',
    },
    success: {
      main: '#22c55e',
      dark: '#16a34a',
    },
    background: {
      default: '#f8fafc',
      paper:   '#ffffff',
    },
    text: {
      primary:   '#000000',
      secondary: '#000000',
      disabled:  '#6b7280',
    },
    divider: '#e5e7eb',
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 8, fontWeight: 600 },
        containedPrimary: {
          background: 'linear-gradient(135deg, #00897b, #00796b)',
          '&:hover': { background: 'linear-gradient(135deg, #00796b, #00695c)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 4px 24px 0 rgba(0,0,0,0.08)',
          border: '1px solid #f3f4f6',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& fieldset': { borderColor: '#d1d5db' },
          '&:hover fieldset': { borderColor: '#009688' },
          '&.Mui-focused fieldset': { borderColor: '#009688', boxShadow: '0 0 0 3px rgba(0,150,136,0.15)' },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(90deg, #00897b 0%, #00796b 100%)',
          boxShadow: '0 2px 8px rgba(0,105,92,0.2)',
        },
      },
    },
  },
});
