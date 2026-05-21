import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { ErrorBoundary } from './providers/ErrorBoundary';
import { ThemeProvider } from './providers/ThemeProvider';
import { AppRouter } from './Router';
import './styles/global.css';

const chakraTheme = extendTheme({
  config: { initialColorMode: 'dark', useSystemColorMode: false },
  styles: { global: { body: { bg: 'transparent', color: 'var(--color-text)' } } },
  components: {
    Tooltip: {
      baseStyle: {
        bg: 'var(--color-bg-card)',
        color: 'var(--color-text)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        fontSize: '0.8rem',
        maxW: '260px',
        px: 3,
        py: 2,
      },
    },
  },
});

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ChakraProvider theme={chakraTheme}>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </ChakraProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
