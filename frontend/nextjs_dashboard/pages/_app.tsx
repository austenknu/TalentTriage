/**
 * Custom App component for TalentTriage
 * 
 * This component wraps all pages and provides global styles and theme configuration.
 */
import React from 'react';
import Head from 'next/head';
import { AppProps } from 'next/app';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CacheProvider, EmotionCache } from '@emotion/react';
import createEmotionCache from '@/utils/createEmotionCache';

// MUI theme customization
const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb', // Blue
    },
    secondary: {
      main: '#7c3aed', // Purple
    },
    success: {
      main: '#10b981', // Green
    },
    warning: {
      main: '#f59e0b', // Amber
    },
    error: {
      main: '#ef4444', // Red
    },
    background: {
      default: '#f9fafb',
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        },
      },
    },
  },
});

// Client-side cache, shared for the whole session of the user in the browser
const clientSideEmotionCache = createEmotionCache();

// Extended AppProps with EmotionCache
interface MyAppProps extends AppProps {
  emotionCache?: EmotionCache;
}

/**
 * Custom App component that wraps all pages
 */
export default function MyApp(props: MyAppProps) {
  const { Component, emotionCache = clientSideEmotionCache, pageProps } = props;

  return (
    <CacheProvider value={emotionCache}>
      <Head>
        <title>TalentTriage - AI Resume Screener</title>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
        <meta name="description" content="AI-powered resume screening and ranking system" />
        <link rel="icon" href="/favicon.ico" />
        {/* Import Inter font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" />
      </Head>
      <ThemeProvider theme={theme}>
        {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon */}
        <CssBaseline />
        <Component {...pageProps} />
      </ThemeProvider>
    </CacheProvider>
  );
}
