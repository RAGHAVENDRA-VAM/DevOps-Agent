import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00bcd4'
    },
    secondary: {
      main: '#ff9800'
    },
    background: {
      default: '#0b1020',
      paper: '#151a2c'
    }
  },
  shape: {
    borderRadius: 10
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 999
        }
      }
    }
  }
});

