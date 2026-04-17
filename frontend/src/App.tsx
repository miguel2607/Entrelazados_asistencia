import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './shared/context/AuthContext';
import { ProtectedRoute } from './shared/components/ProtectedRoute';
import { Layout } from './shared/components/Layout';

const LoginPage = lazy(() => import('./features/auth/LoginPage').then((module) => ({ default: module.LoginPage })));
const DashboardPage = lazy(() =>
  import('./features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage }))
);
const NinosPage = lazy(() => import('./features/ninos/NinosPage').then((module) => ({ default: module.NinosPage })));
const NinoDetallePage = lazy(() =>
  import('./features/ninos/NinoDetallePage').then((module) => ({ default: module.NinoDetallePage }))
);
const AcudientesPage = lazy(() =>
  import('./features/acudientes/AcudientesPage').then((module) => ({ default: module.AcudientesPage }))
);
const AsistenciaPage = lazy(() =>
  import('./features/asistencia/AsistenciaPage').then((module) => ({ default: module.AsistenciaPage }))
);
const ServiciosPage = lazy(() =>
  import('./features/servicios/ServiciosPage').then((module) => ({ default: module.ServiciosPage }))
);
const PaquetesPage = lazy(() =>
  import('./features/paquetes/PaquetesPage').then((module) => ({ default: module.PaquetesPage }))
);
const PlanesPage = lazy(() => import('./features/planes/PlanesPage').then((module) => ({ default: module.PlanesPage })));

function AppLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm font-semibold text-[#4b5563]">
      Cargando...
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<AppLoader />}>
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
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

