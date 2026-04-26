import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './shared/context/AuthContext';
import { ProtectedRoute } from './shared/components/ProtectedRoute';
import { Layout } from './shared/components/Layout';
import { LoginPage } from './features/auth/LoginPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { NinosPage } from './features/ninos/NinosPage';
import { NinoDetallePage } from './features/ninos/NinoDetallePage';
import { AcudientesPage } from './features/acudientes/AcudientesPage';
import { AsistenciaPage } from './features/asistencia/AsistenciaPage';
import { ServiciosPage } from './features/servicios/ServiciosPage';
import { PaquetesPage } from './features/paquetes/PaquetesPage';
import { PlanesPage } from './features/planes/PlanesPage';

const PadresDashboardPage = lazy(() =>
  import('./features/padres/PadresDashboardPage').then((m) => ({ default: m.PadresDashboardPage }))
);
const PadresPage = lazy(() => import('./features/padres/PadresPage').then((m) => ({ default: m.PadresPage })));
const PapaDetallePage = lazy(() =>
  import('./features/padres/PapaDetallePage').then((m) => ({ default: m.PapaDetallePage }))
);
const AsistenciaPadresPage = lazy(() =>
  import('./features/padres/AsistenciaPadresPage').then((m) => ({ default: m.AsistenciaPadresPage }))
);
const PlanesPadresPage = lazy(() =>
  import('./features/padres/PlanesPadresPage').then((m) => ({ default: m.PlanesPadresPage }))
);
const AlertasImportantesPage = lazy(() =>
  import('./features/alertas/AlertasImportantesPage').then((m) => ({ default: m.AlertasImportantesPage }))
);

function PadresFallback() {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-[#6b7280]">
      <div className="h-9 w-9 border-4 border-[#2d1b69] border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-semibold uppercase tracking-widest">Cargando…</p>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="ninos" element={<NinosPage />} />
            <Route path="ninos/:id/detalle" element={<NinoDetallePage />} />
            <Route path="acudientes" element={<AcudientesPage />} />
            <Route path="asistencia" element={<AsistenciaPage />} />
            <Route path="servicios" element={<ServiciosPage />} />
            <Route path="paquetes" element={<PaquetesPage />} />
            <Route path="planes" element={<PlanesPage />} />
            <Route
              path="alertas"
              element={
                <Suspense fallback={<PadresFallback />}>
                  <AlertasImportantesPage />
                </Suspense>
              }
            />
            <Route
              path="padres"
              element={
                <Suspense fallback={<PadresFallback />}>
                  <PadresDashboardPage />
                </Suspense>
              }
            />
            <Route
              path="padres/gestion"
              element={
                <Suspense fallback={<PadresFallback />}>
                  <PadresPage />
                </Suspense>
              }
            />
            <Route
              path="padres/gestion/:id/detalle"
              element={
                <Suspense fallback={<PadresFallback />}>
                  <PapaDetallePage />
                </Suspense>
              }
            />
            <Route
              path="padres/asistencia"
              element={
                <Suspense fallback={<PadresFallback />}>
                  <AsistenciaPadresPage />
                </Suspense>
              }
            />
            <Route
              path="padres/planes"
              element={
                <Suspense fallback={<PadresFallback />}>
                  <PlanesPadresPage />
                </Suspense>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

