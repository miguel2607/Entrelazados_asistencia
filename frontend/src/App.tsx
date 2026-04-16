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
import { AsistenciaPapasPage } from './features/asistencia-papas/AsistenciaPapasPage';
import { ServiciosPage } from './features/servicios/ServiciosPage';
import { PaquetesPage } from './features/paquetes/PaquetesPage';
import { PlanesPage } from './features/planes/PlanesPage';
import { PapasPage } from './features/papas/PapasPage';
import { PapaDetallePage } from './features/papas/PapaDetallePage';
import { PlanesPapasPage } from './features/planes-papas/PlanesPapasPage';

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
            <Route path="papas" element={<PapasPage />} />
            <Route path="papas/:id/detalle" element={<PapaDetallePage />} />
            <Route path="asistencia-papas" element={<AsistenciaPapasPage />} />
            <Route path="servicios" element={<ServiciosPage />} />
            <Route path="paquetes" element={<PaquetesPage />} />
            <Route path="planes" element={<PlanesPage />} />
            <Route path="planes-papas" element={<PlanesPapasPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

