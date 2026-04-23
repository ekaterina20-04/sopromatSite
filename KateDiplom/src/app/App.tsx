import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { ErrorBoundary } from './providers/ErrorBoundary';
import { AppRouter } from './Router';
import './styles/global.css';

const chakraTheme = extendTheme({
  config: { initialColorMode: 'dark', useSystemColorMode: false },
  styles: { global: { body: { bg: 'transparent', color: 'white' } } },
  components: {
    Tooltip: {
      baseStyle: {
        bg: '#1e293b',
        color: '#f8fafc',
        border: '1px solid #334155',
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
      <ChakraProvider theme={chakraTheme}>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </ChakraProvider>
    </ErrorBoundary>
  );
}
