import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './Layout';

const CalculatorPage = lazy(() => import('@pages/calculator'));
const TheoryPage = lazy(() => import('@pages/theory'));
const ScenariosPage = lazy(() => import('@pages/scenarios'));
const TrainerPage = lazy(() => import('@pages/trainer'));

function PageLoader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        color: 'var(--color-text-muted)',
        fontSize: '1rem',
      }}
    >
      Загрузка...
    </div>
  );
}

export function AppRouter() {
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to="/calculator" replace />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="/theory" element={<TheoryPage />} />
          <Route path="/scenarios" element={<ScenariosPage />} />
          <Route path="/trainer" element={<TrainerPage />} />
          <Route path="*" element={<Navigate to="/calculator" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
